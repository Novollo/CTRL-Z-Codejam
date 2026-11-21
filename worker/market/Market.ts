// Market Durable Object: the one referee (booklet 10). One instance: idFromName("market").
//
// - D1 is the source of truth for listings, buyers, pings and payments. Market keeps no listing state of its own,
//   so it can sleep and wake up safely. Every change that must be "first one wins" is ONE conditional UPDATE
//   (`... WHERE status = 'live'`) and Market only acts when that UPDATE changed a row.
// - Screens connect over /ws (hibernatable WebSockets, tagged "seller:<orderId>" or "buyer:<buyerId>").
// - The price clock is an alarm every PRICE_TICK_SEC story seconds while any listing is live, locked or free.
// - The API calls the public methods below over RPC (see worker/market/index.ts).

import { DurableObject } from "cloudflare:workers";
import { FALLBACKS } from "@shared/catalog";
import type { Fallback } from "@shared/catalog";
import { PAGE } from "@shared/api";
import type {
  ApiError, BuyResponse, BuyTakenResponse, ListingCardResponse, ListingPatchRequest, ListingPatchResponse,
  OkResponse, PublishResponse, StopResponse,
} from "@shared/api";
import {
  DEMO_ORDER_ID, FREE_WINDOW_MIN, LISTING_AFTER_READY_MIN, LOCK_SEC, PICKUP_DEADLINE_MIN, PRICE_TICK_SEC, formatPrice,
} from "@shared/constants";
import type { AgentMode } from "@shared/constants";
import type { ListingClosedMsg, LiveMessage } from "@shared/messages";
import type { Buyer, Listing, ListingCard, Order, PickupPass, Restaurant } from "@shared/types";
import type { Env } from "../env";
import { editTelegramPing, sendTelegramPing } from "../telegram";
import { createCheckout } from "../stripe";
import {
  MINUTES_UNTIL_READY, freshReadyAt, getActiveBuyers, getActiveListings, getBuyer, getListing, getOpenListingForOrder,
  getOrder, getPass, getRestaurant, getWalkTable,
} from "./db";
import { clipFloor, demoSpeed, matchReason, priceAt, storyMinToMs, storySecondsLeft, walkMinutes } from "./rules";

/** What an RPC method returns: the HTTP status and JSON body the API should send. */
export interface Reply<T> {
  status: number;
  body: T | ApiError | BuyTakenResponse;
}

/** A listing with its order and restaurant. */
interface Ctx {
  listing: Listing;
  order: Order;
  restaurant: Restaurant;
}

const ok: OkResponse = { ok: true };
const fail = (status: number, error: string): Reply<never> => ({ status, body: { error } });

export class Market extends DurableObject<Env> {
  /** R7: the price never rises, even when the seller raises the floor. Listing id → last price sent. */
  private lastPrice = new Map<string, number>();

  private get db() {
    return this.env.DB;
  }
  private get speed() {
    return demoSpeed(this.env);
  }

  // =========================================================================
  // Live connections (/ws)
  // =========================================================================

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const orderId = url.searchParams.get("order") || DEMO_ORDER_ID;
    const buyerId = url.searchParams.get("id");
    if (role !== "seller" && !(role === "buyer" && buyerId)) return new Response("Use ?role=seller&order= or ?role=buyer&id=", { status: 400 });

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [role === "seller" ? `seller:${orderId}` : `buyer:${buyerId}`]);

    const greet = role === "seller" ? this.greetSeller(server, orderId) : this.greetBuyer(server, buyerId!);
    this.ctx.waitUntil(greet.catch((e) => console.error("greet failed", e)));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(): Promise<void> {
    // Screens only listen. Actions come over HTTP.
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close(1000, "bye");
    } catch {
      // already closed
    }
  }

  /** A seller screen connected: send the order status and, if a listing runs, its price, reach and lock. */
  private async greetSeller(ws: WebSocket, orderId: string): Promise<void> {
    const order = await getOrder(this.db, orderId);
    if (!order) return;
    sendOne(ws, { type: "order.status", order_id: order.id, status: order.status });
    const listing = await getOpenListingForOrder(this.db, orderId);
    if (!listing || listing.status === "draft") return;
    const now = Date.now();
    sendOne(ws, { type: "listing.tick", listing_id: listing.id, price: this.price(listing, now), seconds_left: this.secondsLeft(listing, now) });
    sendOne(ws, { type: "listing.reach", listing_id: listing.id, reached: await this.reachCount(listing.id) });
    if (listing.status === "locked" && listing.lock_until) {
      sendOne(ws, { type: "listing.locked", listing_id: listing.id, lock_until: listing.lock_until });
    }
  }

  /** A buyer screen connected: re-open cards they already have, then check for new matches. */
  private async greetBuyer(ws: WebSocket, buyerId: string): Promise<void> {
    const buyer = await getBuyer(this.db, buyerId);
    if (!buyer) return;
    const now = Date.now();
    const { results } = await this.db
      .prepare(
        `SELECT p.listing_id, p.reason FROM pings p JOIN listings l ON l.id = p.listing_id
         WHERE p.buyer_id = ? AND p.dismissed = 0 AND l.status IN ('live', 'locked', 'free')`,
      )
      .bind(buyerId)
      .all<{ listing_id: string; reason: string }>();
    for (const row of results) {
      const c = await this.load(row.listing_id);
      if (!c) continue;
      const walk = walkMinutes(buyer, c.restaurant, await getWalkTable(this.db, c.restaurant.id));
      sendOne(ws, { type: "ping", listing: this.card(c, now, walk), reason: row.reason });
    }
    await this.matchBuyer(buyerId);
  }

  private send(tag: string, msg: LiveMessage): void {
    for (const ws of this.ctx.getWebSockets(tag)) sendOne(ws, msg);
  }

  /** Seller of this listing + every buyer with the card open (pinged and not "Not now"). */
  private async sendToWatchers(c: Ctx, sellerMsg: LiveMessage | null, buyerMsg: LiveMessage | null, skipBuyer?: string): Promise<void> {
    if (sellerMsg) this.send(`seller:${c.order.id}`, sellerMsg);
    if (!buyerMsg) return;
    for (const id of await this.cardHolders(c.listing.id)) if (id !== skipBuyer) this.send(`buyer:${id}`, buyerMsg);
  }

  private async cardHolders(listingId: string): Promise<string[]> {
    const { results } = await this.db
      .prepare("SELECT DISTINCT buyer_id FROM pings WHERE listing_id = ? AND dismissed = 0")
      .bind(listingId)
      .all<{ buyer_id: string }>();
    return results.map((r) => r.buyer_id);
  }

  // =========================================================================
  // RPC: seller (booklet 10.4)
  // =========================================================================

  /** POST /api/listings/:id/publish: draft → live. The clock starts. */
  async publish(listingId: string, floor: number, fallback: Fallback, origin: string): Promise<Reply<PublishResponse>> {
    const c = await this.load(listingId);
    if (!c) return fail(404, "listing not found");
    if (c.listing.status !== "draft") return fail(409, "listing is not a draft");
    if (c.order.status !== "preparing") return fail(409, "order is not preparing"); // R1

    const now = Date.now();
    const readyAt = await freshReadyAt(this.db, c.order, now, this.speed);
    const closesAt = readyAt + storyMinToMs(LISTING_AFTER_READY_MIN, this.speed); // R5
    const floorPrice = clipFloor(floor, c.order.food_price, c.listing.start_price);
    const fb = isFallback(fallback) ? fallback : c.listing.fallback;

    const res = await this.db
      .prepare("UPDATE listings SET status = 'live', floor_price = ?, fallback = ?, opens_at = ?, closes_at = ? WHERE id = ? AND status = 'draft'")
      .bind(floorPrice, fb, now, closesAt, listingId)
      .run();
    if (res.meta.changes !== 1) return fail(409, "listing is not a draft");

    if (origin) await this.ctx.storage.put("origin", origin); // for Telegram "Buy now" links
    await this.startClock(now); // first tick right away

    const live: Listing = { ...c.listing, status: "live", floor_price: floorPrice, fallback: fb, opens_at: now, closes_at: closesAt };
    return {
      status: 200,
      body: { listing_id: listingId, status: "live", price: this.price(live, now), opens_at: now, closes_at: closesAt, seconds_left: this.secondsLeft(live, now) },
    };
  }

  /** PATCH /api/listings/:id: floor (clipped to 30–70%) or fallback, until the listing ends. */
  async patchListing(listingId: string, patch: ListingPatchRequest): Promise<Reply<ListingPatchResponse>> {
    const c = await this.load(listingId);
    if (!c) return fail(404, "listing not found");
    if (!["draft", "live", "locked"].includes(c.listing.status)) return fail(409, "listing has ended");

    const floor = patch.floor_price === undefined ? c.listing.floor_price : clipFloor(Number(patch.floor_price), c.order.food_price, c.listing.start_price);
    const fallback = patch.fallback !== undefined && isFallback(patch.fallback) ? patch.fallback : c.listing.fallback;
    await this.db
      .prepare("UPDATE listings SET floor_price = ?, fallback = ? WHERE id = ? AND status IN ('draft', 'live', 'locked')")
      .bind(floor, fallback, listingId)
      .run();
    return { status: 200, body: { listing_id: listingId, floor_price: floor, fallback } };
  }

  /** POST /api/listings/:id/stop: "Stop listing". The order goes back to normal. */
  async stop(listingId: string): Promise<Reply<StopResponse>> {
    const c = await this.load(listingId);
    if (!c) return fail(404, "listing not found");
    const res = await this.db
      .prepare("UPDATE listings SET status = 'stopped', locked_by = NULL, lock_until = NULL WHERE id = ? AND status IN ('draft', 'live', 'locked', 'free')")
      .bind(listingId)
      .run();
    if (res.meta.changes !== 1) return fail(409, "listing has ended");
    await this.expirePendingPayments(listingId);
    this.lastPrice.delete(listingId);
    const msg: ListingClosedMsg = { type: "listing.closed", listing_id: listingId, fallback: c.listing.fallback, outcome: "stopped" };
    await this.sendToWatchers(c, msg, msg);
    return { status: 200, body: { listing_id: listingId, status: "stopped" } };
  }

  // =========================================================================
  // RPC: buyer
  // =========================================================================

  /** POST /api/listings/:id/buy (booklet 9.4). The first tap wins. */
  async buy(listingId: string, buyerId: string, origin: string): Promise<Reply<BuyResponse>> {
    let c = await this.load(listingId);
    if (!c) return fail(404, "listing not found");
    const now = Date.now();
    if (c.listing.status === "locked" && (c.listing.lock_until ?? 0) <= now) {
      await this.unlock(c, now); // the lock ran out a moment ago
      c = (await this.load(listingId))!;
    }
    const { listing } = c;

    // Free window (9.5): the first tap goes straight to the pickup pass. No lock, no payment.
    if (listing.status === "free") {
      const res = await this.db
        .prepare("UPDATE listings SET status = 'sold', sold_price = 0, buyer_id = ? WHERE id = ? AND status = 'free'")
        .bind(buyerId, listingId)
        .run();
      if (res.meta.changes !== 1) return { status: 409, body: { error: "taken", lock_until: null } };
      const pass = await this.finishSale(c, buyerId, 0, null, now);
      return pass ? { status: 200, body: { kind: "free", pass } } : fail(500, "pass not found");
    }

    if (listing.status === "locked") return { status: 409, body: { error: "taken", lock_until: listing.lock_until } };
    if (listing.status === "sold") return { status: 409, body: { error: "taken", lock_until: null } };
    if (listing.status !== "live") return fail(410, "listing has ended");

    const price = this.price(listing, now);
    const lockUntil = now + LOCK_SEC * 1000; // real time, never sped up (R8)
    const res = await this.db
      .prepare("UPDATE listings SET status = 'locked', locked_by = ?, lock_until = ? WHERE id = ? AND status = 'live'")
      .bind(buyerId, lockUntil, listingId)
      .run();
    if (res.meta.changes !== 1) {
      const now2 = await getListing(this.db, listingId);
      return { status: 409, body: { error: "taken", lock_until: now2?.lock_until ?? null } };
    }

    await this.db
      .prepare("INSERT INTO payments (listing_id, buyer_id, amount, stripe_session_id, status, paid_at) VALUES (?, ?, ?, NULL, 'pending', NULL)")
      .bind(listingId, buyerId, price)
      .run();

    let checkout: { url: string; session_id: string };
    try {
      checkout = await createCheckout(this.env, { listing_id: listingId, buyer_id: buyerId, amount: price, title: listing.title, origin });
    } catch (e) {
      // Stripe failed: release the lock at once (nobody else saw it yet) and answer a clean 5xx.
      console.error("createCheckout failed", e);
      await this.db.batch([
        this.db.prepare("UPDATE listings SET status = 'live', locked_by = NULL, lock_until = NULL WHERE id = ? AND status = 'locked' AND locked_by = ?").bind(listingId, buyerId),
        this.db.prepare("UPDATE payments SET status = 'expired' WHERE listing_id = ? AND buyer_id = ? AND status = 'pending'").bind(listingId, buyerId),
      ]);
      return fail(502, "payment is not available right now");
    }
    await this.db
      .prepare("UPDATE payments SET stripe_session_id = ? WHERE rowid = (SELECT rowid FROM payments WHERE listing_id = ? AND buyer_id = ? ORDER BY rowid DESC LIMIT 1)")
      .bind(checkout.session_id, listingId, buyerId)
      .run()
      .catch(() => null); // session id already used (placeholder ids repeat): not needed to confirm the sale

    const locked: LiveMessage = { type: "listing.locked", listing_id: listingId, lock_until: lockUntil };
    await this.sendToWatchers(c, locked, locked);
    return { status: 200, body: { kind: "locked", checkout_url: checkout.url, lock_until: lockUntil, price } };
  }

  /** GET /api/listings/:id: the offer card for one buyer (B3 from a Telegram link). */
  async cardFor(listingId: string, buyerId: string): Promise<Reply<ListingCardResponse>> {
    const c = await this.load(listingId);
    const buyer = await getBuyer(this.db, buyerId);
    if (!c || !buyer) return fail(404, "listing not found");
    if (!["live", "locked", "free"].includes(c.listing.status)) return fail(410, "listing has ended");
    const now = Date.now();
    const walk = walkMinutes(buyer, c.restaurant, await getWalkTable(this.db, c.restaurant.id));
    const ping = await this.db
      .prepare("SELECT reason FROM pings WHERE listing_id = ? AND buyer_id = ? AND reason != '' LIMIT 1")
      .bind(listingId, buyerId)
      .first<{ reason: string }>();
    const card = this.card(c, now, walk);
    const reason = ping?.reason ?? matchReason({ ...buyer, notify_on: true }, c.listing, card.price, walk, true) ?? "";
    return { status: 200, body: { listing: card, reason, buyer_id: buyerId } };
  }

  /** Re-run matching for one buyer (profile changed, booklet 9.3). Exported as notifyBuyerChanged. */
  async buyerChanged(buyerId: string): Promise<void> {
    await this.matchBuyer(buyerId);
  }

  // =========================================================================
  // RPC: payment (Stripe webhook and /admin "Mark paid")
  // =========================================================================

  /** Payment done → sold. Ignored if someone else holds or bought the listing (lead decision 21). */
  async paid(listingId: string, buyerId: string, sessionId: string | null, amount: number | null): Promise<Reply<OkResponse>> {
    const c = await this.load(listingId);
    if (!c) return fail(404, "listing not found");
    const { listing } = c;
    const mine = listing.status === "locked" && listing.locked_by === buyerId;
    if (!mine && listing.status !== "live") return fail(409, "listing is not locked by this buyer");

    const now = Date.now();
    const pending = await this.db
      .prepare("SELECT amount FROM payments WHERE listing_id = ? AND buyer_id = ? ORDER BY rowid DESC LIMIT 1")
      .bind(listingId, buyerId)
      .first<{ amount: number }>();
    const price = pending?.amount ?? amount ?? this.price(listing, now);

    const res = await this.db
      .prepare(
        `UPDATE listings SET status = 'sold', sold_price = ?, buyer_id = ?, locked_by = NULL, lock_until = NULL
         WHERE id = ? AND (status = 'live' OR (status = 'locked' AND locked_by = ?))`,
      )
      .bind(price, buyerId, listingId, buyerId)
      .run();
    if (res.meta.changes !== 1) return fail(409, "listing is not locked by this buyer");
    await this.finishSale(c, buyerId, price, sessionId, now);
    return { status: 200, body: ok };
  }

  /** /admin "Mark paid": pays for whoever holds the lock. */
  async markPaid(listingId: string): Promise<Reply<OkResponse>> {
    const listing = await getListing(this.db, listingId);
    if (!listing) return fail(404, "listing not found");
    if (listing.status !== "locked" || !listing.locked_by) return fail(409, "nobody is paying for this listing");
    return this.paid(listingId, listing.locked_by, null, null);
  }

  // =========================================================================
  // RPC: admin
  // =========================================================================

  /** Wipe listings, pings and payments. Orders back to "preparing", ready in 4 story minutes. */
  async reset(): Promise<void> {
    const readyAt = Date.now() + storyMinToMs(MINUTES_UNTIL_READY, this.speed);
    await this.db.batch([
      this.db.prepare("DELETE FROM payments"),
      this.db.prepare("DELETE FROM pings"),
      this.db.prepare("DELETE FROM listings"),
      this.db.prepare("UPDATE orders SET status = 'preparing', ready_at = ?").bind(readyAt),
    ]);
    this.lastPrice.clear();
    await this.ctx.storage.deleteAlarm();
    const { results } = await this.db.prepare("SELECT id FROM orders").all<{ id: string }>();
    for (const { id } of results) this.send(`seller:${id}`, { type: "order.status", order_id: id, status: "preparing" });
  }

  /** /admin "Mark order ready". */
  async orderReady(orderId: string): Promise<Reply<OkResponse>> {
    const order = await getOrder(this.db, orderId);
    if (!order) return fail(404, "order not found");
    await this.markOrderReady(order, Date.now());
    return { status: 200, body: ok };
  }

  /** Runtime AGENT_MODE (the /admin switch). env.AGENT_MODE is the starting value. */
  async getAgentMode(): Promise<AgentMode> {
    const stored = await this.ctx.storage.get<AgentMode>("agent_mode");
    return stored ?? (this.env.AGENT_MODE === "default" ? "default" : "live");
  }

  async setAgentMode(mode: AgentMode): Promise<void> {
    await this.ctx.storage.put("agent_mode", mode);
  }

  // =========================================================================
  // The clock (booklet 9.1, 9.2, 9.4, 9.5)
  // =========================================================================

  private get tickMs(): number {
    return Math.max(200, Math.round((PRICE_TICK_SEC * 1000) / this.speed));
  }

  /** Make sure the alarm fires at `at` or sooner. */
  private async startClock(at: number): Promise<void> {
    const current = await this.ctx.storage.getAlarm();
    if (current == null || current > at) await this.ctx.storage.setAlarm(at);
  }

  async alarm(): Promise<void> {
    let active = true;
    try {
      active = await this.tick();
    } catch (e) {
      console.error("tick failed", e);
    }
    if (active) await this.ctx.storage.setAlarm(Date.now() + this.tickMs);
  }

  /** One price tick for every running listing. Returns true while any listing still runs. */
  private async tick(): Promise<boolean> {
    const now = Date.now();
    let active = false;
    for (const listing of await getActiveListings(this.db)) {
      const c = await this.load(listing.id, listing);
      if (c && (await this.tickListing(c, now))) active = true;
    }
    return active;
  }

  /** Returns true while the listing still runs after this tick. */
  private async tickListing(c: Ctx, now: number): Promise<boolean> {
    // The food became ready on its own (ready_at reached).
    if (c.order.status === "preparing" && c.order.ready_at != null && c.order.ready_at <= now) {
      await this.markOrderReady(c.order, now);
      const fresh = await this.load(c.listing.id);
      if (!fresh) return false;
      c = fresh;
    }

    // Nobody paid within the lock (9.4.5): back on the market at the current price.
    if (c.listing.status === "locked" && (c.listing.lock_until ?? 0) <= now) {
      await this.unlock(c, now);
      c = (await this.load(c.listing.id))!;
    }

    // Time is up (never while somebody is paying).
    if (c.listing.status !== "locked" && (c.listing.closes_at ?? 0) <= now) {
      const stillRuns = await this.close(c, now);
      if (!stillRuns) return false;
      c = (await this.load(c.listing.id))!;
    }

    const price = this.price(c.listing, now);
    const tick: LiveMessage = { type: "listing.tick", listing_id: c.listing.id, price, seconds_left: this.secondsLeft(c.listing, now) };
    await this.sendToWatchers(c, tick, tick);

    if (c.listing.status === "live" || c.listing.status === "free") await this.matchListing(c, now, price);
    return true;
  }

  private async unlock(c: Ctx, now: number): Promise<void> {
    const res = await this.db
      .prepare("UPDATE listings SET status = 'live', locked_by = NULL, lock_until = NULL WHERE id = ? AND status = 'locked' AND lock_until <= ?")
      .bind(c.listing.id, now)
      .run();
    if (res.meta.changes !== 1) return;
    await this.expirePendingPayments(c.listing.id);
    const live: Listing = { ...c.listing, status: "live", locked_by: null, lock_until: null };
    const msg: LiveMessage = { type: "listing.unlocked", listing_id: c.listing.id, lock_until: null, price: this.price(live, now) };
    await this.sendToWatchers(c, msg, msg);
  }

  /** End of the listing without a sale (9.5). Returns true if it goes on (the free window opened). */
  private async close(c: Ctx, now: number): Promise<boolean> {
    const { listing, order } = c;
    const base = { type: "listing.closed", listing_id: listing.id, fallback: listing.fallback } as const;

    if (listing.status === "free") {
      // The free window ended and nobody took it: the seller gets the pickup message.
      if (!(await this.setStatus(listing.id, "free", "closed"))) return true;
      await this.ended(c, { ...base, outcome: "free_expired", pickup_code: order.pickup_code });
      return false;
    }

    if (listing.fallback === "free") {
      // A new 10-minute window at $0. closes_at now holds the end of the free window.
      const freeUntil = now + storyMinToMs(FREE_WINDOW_MIN, this.speed);
      const res = await this.db
        .prepare("UPDATE listings SET status = 'free', closes_at = ? WHERE id = ? AND status = 'live'")
        .bind(freeUntil, listing.id)
        .run();
      if (res.meta.changes !== 1) return false;
      const msg: ListingClosedMsg = { ...base, outcome: "free_window", free_until: freeUntil };
      await this.sendToWatchers(c, msg, msg);
      return true;
    }

    if (listing.fallback === "donate") {
      if (await this.setStatus(listing.id, "live", "donated")) await this.ended(c, { ...base, outcome: "donated" });
      return false;
    }

    if (await this.setStatus(listing.id, "live", "closed")) {
      await this.ended(c, { ...base, outcome: "pickup_self", pickup_code: order.pickup_code });
    }
    return false;
  }

  /** Tell the seller how it ended. Buyers with the card get the same message WITHOUT the pickup code. */
  private async ended(c: Ctx, msg: ListingClosedMsg): Promise<void> {
    this.lastPrice.delete(c.listing.id);
    const { pickup_code: _code, ...forBuyers } = msg;
    await this.sendToWatchers(c, msg, forBuyers);
  }

  private async setStatus(listingId: string, from: Listing["status"], to: Listing["status"]): Promise<boolean> {
    const res = await this.db.prepare("UPDATE listings SET status = ? WHERE id = ? AND status = ?").bind(to, listingId, from).run();
    return res.meta.changes === 1;
  }

  /** The order is ready: tell the seller, and the listing closes 20 story minutes from now (R5). */
  private async markOrderReady(order: Order, now: number): Promise<void> {
    const res = await this.db
      .prepare("UPDATE orders SET status = 'ready', ready_at = ? WHERE id = ? AND status = 'preparing'")
      .bind(now, order.id)
      .run();
    if (res.meta.changes !== 1) return;
    await this.db
      .prepare("UPDATE listings SET closes_at = ? WHERE order_id = ? AND status IN ('live', 'locked')")
      .bind(now + storyMinToMs(LISTING_AFTER_READY_MIN, this.speed), order.id)
      .run();
    this.send(`seller:${order.id}`, { type: "order.status", order_id: order.id, status: "ready" });
  }

  // =========================================================================
  // Sale
  // =========================================================================

  /** After the listing row says "sold": record the payment, send listing.sold, edit Telegram pings. */
  private async finishSale(c: Ctx, buyerId: string, price: number, sessionId: string | null, now: number): Promise<PickupPass | null> {
    const listingId = c.listing.id;
    const updated = await this.db
      .prepare(
        `UPDATE payments SET status = 'paid', paid_at = ?, amount = ?, stripe_session_id = COALESCE(?, stripe_session_id)
         WHERE rowid = (SELECT rowid FROM payments WHERE listing_id = ? AND buyer_id = ? ORDER BY rowid DESC LIMIT 1)`,
      )
      .bind(now, price, sessionId, listingId, buyerId)
      .run()
      .catch(() => null);
    if (!updated || updated.meta.changes !== 1) {
      await this.db
        .prepare("INSERT INTO payments (listing_id, buyer_id, amount, stripe_session_id, status, paid_at) VALUES (?, ?, ?, NULL, 'paid', ?)")
        .bind(listingId, buyerId, price, now)
        .run();
    }
    this.lastPrice.delete(listingId);

    const pass = await getPass(this.db, listingId, buyerId, this.speed);
    const pickupBy = pass?.pickup_by ?? now + storyMinToMs(PICKUP_DEADLINE_MIN, this.speed);
    const sold: LiveMessage = { type: "listing.sold", listing_id: listingId, sold_price: price, pickup_by: pickupBy };
    // The pickup code goes ONLY to the winning buyer (lead decision 6).
    this.send(`buyer:${buyerId}`, { ...sold, pass: pass ?? undefined });
    await this.sendToWatchers(c, sold, sold, buyerId);

    // Telegram: "Gone — grabbed at $8.40" for everyone else who got the ping there.
    const { results } = await this.db
      .prepare(
        `SELECT b.telegram_chat_id AS chat_id, p.telegram_message_id AS message_id FROM pings p JOIN buyers b ON b.id = p.buyer_id
         WHERE p.listing_id = ? AND p.channel = 'telegram' AND p.telegram_message_id IS NOT NULL AND p.buyer_id != ? AND b.telegram_chat_id IS NOT NULL`,
      )
      .bind(listingId, buyerId)
      .all<{ chat_id: string; message_id: number }>();
    await Promise.all(
      results.map((r) =>
        editTelegramPing(this.env, r.chat_id, r.message_id, `Gone — grabbed at ${formatPrice(price)}`).catch((e) => console.error("editTelegramPing failed", e)),
      ),
    );
    return pass;
  }

  private async expirePendingPayments(listingId: string): Promise<void> {
    await this.db.prepare("UPDATE payments SET status = 'expired' WHERE listing_id = ? AND status = 'pending'").bind(listingId).run();
  }

  // =========================================================================
  // Matching and pings (booklet 9.3)
  // =========================================================================

  /** Ping every buyer that matches this listing now and was never pinged for it. */
  private async matchListing(c: Ctx, now: number, price: number): Promise<void> {
    const [buyers, walkTable, pinged] = await Promise.all([
      getActiveBuyers(this.db),
      getWalkTable(this.db, c.restaurant.id),
      this.pingedBuyers(c.listing.id),
    ]);
    let sent = 0;
    for (const buyer of buyers) {
      if (pinged.has(buyer.id)) continue; // rule 2 (also covers "Not now")
      const walk = walkMinutes(buyer, c.restaurant, walkTable);
      const reason = matchReason(buyer, c.listing, price, walk, c.listing.status === "free");
      if (reason && (await this.ping(c, buyer, reason, walk, now))) sent++;
    }
    if (sent > 0) await this.sendReach(c);
  }

  /** Check one buyer against every running listing. */
  private async matchBuyer(buyerId: string): Promise<void> {
    const buyer = await getBuyer(this.db, buyerId);
    if (!buyer || !buyer.notify_on) return;
    const now = Date.now();
    for (const listing of await getActiveListings(this.db)) {
      if (listing.status === "locked") continue;
      const c = await this.load(listing.id, listing);
      if (!c || (await this.pingedBuyers(listing.id)).has(buyerId)) continue;
      const walk = walkMinutes(buyer, c.restaurant, await getWalkTable(this.db, c.restaurant.id));
      const price = this.price(listing, now);
      const reason = matchReason(buyer, listing, price, walk, listing.status === "free");
      if (reason && (await this.ping(c, buyer, reason, walk, now))) await this.sendReach(c);
    }
  }

  /** One ping per offer per person: on the open web page if there is one, else on Telegram. */
  private async ping(c: Ctx, buyer: Buyer, reason: string, walk: number | null, now: number): Promise<boolean> {
    const onWeb = this.ctx.getWebSockets(`buyer:${buyer.id}`).length > 0;
    const channel = onWeb ? "web" : buyer.telegram_chat_id ? "telegram" : null;
    if (!channel) return false; // page closed and no Telegram: try again on a later tick

    const res = await this.db
      .prepare("INSERT OR IGNORE INTO pings (listing_id, buyer_id, channel, reason, sent_at, dismissed) VALUES (?, ?, ?, ?, ?, 0)")
      .bind(c.listing.id, buyer.id, channel, reason, now)
      .run();
    if (res.meta.changes !== 1) return false;

    const card = this.card(c, now, walk);
    if (channel === "web") {
      this.send(`buyer:${buyer.id}`, { type: "ping", listing: card, reason });
      return true;
    }
    const origin = (await this.ctx.storage.get<string>("origin")) ?? "";
    try {
      const messageId = await sendTelegramPing(this.env, buyer.telegram_chat_id!, card, reason, origin + PAGE.buy(c.listing.id, buyer.token));
      if (messageId != null) {
        await this.db
          .prepare("UPDATE pings SET telegram_message_id = ? WHERE listing_id = ? AND buyer_id = ? AND channel = 'telegram'")
          .bind(messageId, c.listing.id, buyer.id)
          .run();
      }
    } catch (e) {
      console.error("sendTelegramPing failed", e);
    }
    return true;
  }

  private async pingedBuyers(listingId: string): Promise<Set<string>> {
    const { results } = await this.db
      .prepare("SELECT DISTINCT buyer_id FROM pings WHERE listing_id = ?")
      .bind(listingId)
      .all<{ buyer_id: string }>();
    return new Set(results.map((r) => r.buyer_id));
  }

  private async reachCount(listingId: string): Promise<number> {
    return (await this.pingedBuyers(listingId)).size;
  }

  private async sendReach(c: Ctx): Promise<void> {
    this.send(`seller:${c.order.id}`, { type: "listing.reach", listing_id: c.listing.id, reached: await this.reachCount(c.listing.id) });
  }

  // =========================================================================
  // Small helpers
  // =========================================================================

  private async load(listingId: string, known?: Listing): Promise<Ctx | null> {
    const listing = known ?? (await getListing(this.db, listingId));
    if (!listing) return null;
    const order = await getOrder(this.db, listing.order_id);
    if (!order) return null;
    const restaurant = await getRestaurant(this.db, order.restaurant_id);
    return restaurant ? { listing, order, restaurant } : null;
  }

  /** The live price: 0 in the free window, else the falling line, never above the last price sent (R7). */
  private price(listing: Listing, now: number): number {
    if (listing.status === "free") return 0;
    const price = Math.min(priceAt(listing, now, this.speed), this.lastPrice.get(listing.id) ?? Infinity);
    this.lastPrice.set(listing.id, price);
    return price;
  }

  private secondsLeft(listing: Listing, now: number): number {
    return storySecondsLeft(listing.closes_at ?? now, now, this.speed);
  }

  private card(c: Ctx, now: number, walk: number | null): ListingCard {
    const { listing, order, restaurant } = c;
    return {
      listing_id: listing.id,
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address,
      photo_url: restaurant.photo_url,
      title: listing.title,
      selling_line: listing.selling_line,
      tags: listing.tags,
      may_contain: listing.may_contain,
      food_price: order.food_price,
      price: this.price(listing, now),
      seconds_left: this.secondsLeft(listing, now),
      status: listing.status === "locked" || listing.status === "free" ? listing.status : "live",
      lock_until: listing.status === "locked" ? listing.lock_until : null,
      walk_min: walk,
    };
  }
}

function sendOne(ws: WebSocket, msg: LiveMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // the screen went away
  }
}

const isFallback = (value: unknown): value is Fallback => FALLBACKS.some((f) => f.key === value);
