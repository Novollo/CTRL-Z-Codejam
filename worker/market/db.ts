// D1 helpers: read rows and turn them into the app shapes in shared/types.ts.
// JSON columns are TEXT, booleans are 0/1 (see shared/db/migrations).

import { PICKUP_DEADLINE_MIN } from "@shared/constants";
import type { Buyer, Listing, Order, PickupPass, Restaurant } from "@shared/types";
import { storyMinToMs, walkMinutes } from "./rules";

/** The stage order is "ready in 4 minutes" when Ctrl+Z is tapped (booklet 8.2 example, admin reset). Story minutes. */
export const MINUTES_UNTIL_READY = 4;

type Row = Record<string, unknown>;

const json = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const toRestaurant = (r: Row): Restaurant => ({
  id: r.id as string,
  name: r.name as string,
  address: r.address as string,
  lat: r.lat as number,
  lng: r.lng as number,
  photo_url: r.photo_url as string,
  logo_url: (r.logo_url as string) ?? "",
  default_category: r.default_category as Restaurant["default_category"],
  default_tags: json(r.default_tags, []),
  default_diet: json(r.default_diet, { vegetarian: "unsure", vegan: "unsure", halal: "unsure", gluten_free: "unsure" }),
});

export const toOrder = (r: Row): Order => ({
  id: r.id as string,
  restaurant_id: r.restaurant_id as string,
  items: json(r.items, []),
  food_price: r.food_price as number,
  fees: json(r.fees, { service_fee: 0, delivery_fee: 0, tax: 0 }),
  total: r.total as number,
  type: r.type as Order["type"],
  status: r.status as Order["status"],
  ready_at: (r.ready_at as number | null) ?? null,
  pickup_code: r.pickup_code as string,
});

export const toListing = (r: Row): Listing => ({
  id: r.id as string,
  order_id: r.order_id as string,
  status: r.status as Listing["status"],
  start_price: r.start_price as number,
  floor_price: r.floor_price as number,
  drop_speed: r.drop_speed as Listing["drop_speed"],
  opens_at: (r.opens_at as number | null) ?? null,
  closes_at: (r.closes_at as number | null) ?? null,
  fallback: r.fallback as Listing["fallback"],
  tags: json(r.tags, []),
  diet: json(r.diet, { vegetarian: "unsure", vegan: "unsure", halal: "unsure", gluten_free: "unsure" }),
  may_contain: json(r.may_contain, []),
  title: r.title as string,
  selling_line: r.selling_line as string,
  reason: r.reason as string,
  agent_source: r.agent_source as Listing["agent_source"],
  locked_by: (r.locked_by as string | null) ?? null,
  lock_until: (r.lock_until as number | null) ?? null,
  sold_price: (r.sold_price as number | null) ?? null,
  buyer_id: (r.buyer_id as string | null) ?? null,
});

export const toBuyer = (r: Row): Buyer => ({
  id: r.id as string,
  token: r.token as string,
  name: r.name as string,
  notify_on: r.notify_on === 1,
  spot: (r.spot as Buyer["spot"]) ?? null,
  lat: (r.lat as number | null) ?? null,
  lng: (r.lng as number | null) ?? null,
  max_walk_min: r.max_walk_min as number,
  food_types: json(r.food_types, []),
  diet: json(r.diet, []),
  max_price: r.max_price as number,
  telegram_chat_id: (r.telegram_chat_id as string | null) ?? null,
});

// ---- Reads ----

export async function getOrder(db: D1Database, id: string): Promise<Order | null> {
  const row = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<Row>();
  return row ? toOrder(row) : null;
}

export async function getRestaurant(db: D1Database, id: string): Promise<Restaurant | null> {
  const row = await db.prepare("SELECT * FROM restaurants WHERE id = ?").bind(id).first<Row>();
  return row ? toRestaurant(row) : null;
}

export async function getListing(db: D1Database, id: string): Promise<Listing | null> {
  const row = await db.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first<Row>();
  return row ? toListing(row) : null;
}

export async function getBuyer(db: D1Database, id: string): Promise<Buyer | null> {
  const row = await db.prepare("SELECT * FROM buyers WHERE id = ?").bind(id).first<Row>();
  return row ? toBuyer(row) : null;
}

/** The buyer behind a token header, or null. */
export async function getBuyerByToken(db: D1Database, token: string | undefined): Promise<Buyer | null> {
  if (!token) return null;
  const row = await db.prepare("SELECT * FROM buyers WHERE token = ?").bind(token).first<Row>();
  return row ? toBuyer(row) : null;
}

/** Buyers with pings on. */
export async function getActiveBuyers(db: D1Database): Promise<Buyer[]> {
  const { results } = await db.prepare("SELECT * FROM buyers WHERE notify_on = 1").all<Row>();
  return results.map(toBuyer);
}

/** spot → minutes for one restaurant. */
export async function getWalkTable(db: D1Database, restaurantId: string): Promise<Map<string, number>> {
  const { results } = await db
    .prepare("SELECT spot, minutes FROM walk_times WHERE restaurant_id = ?")
    .bind(restaurantId)
    .all<{ spot: string; minutes: number }>();
  return new Map(results.map((r) => [r.spot, r.minutes]));
}

/** Listings the clock runs for: live, locked, or in the free window. */
export const ACTIVE_STATUSES = ["live", "locked", "free"] as const;

export async function getActiveListings(db: D1Database): Promise<Listing[]> {
  const { results } = await db
    .prepare("SELECT * FROM listings WHERE status IN ('live', 'locked', 'free')")
    .all<Row>();
  return results.map(toListing);
}

/** The draft or active listing for an order (newest first), for S1. */
export async function getOpenListingForOrder(db: D1Database, orderId: string): Promise<Listing | null> {
  const row = await db
    .prepare(
      "SELECT * FROM listings WHERE order_id = ? AND status IN ('draft', 'live', 'locked', 'free') ORDER BY opens_at IS NULL, opens_at DESC, rowid DESC LIMIT 1",
    )
    .bind(orderId)
    .first<Row>();
  return row ? toListing(row) : null;
}

// ---- Writes and composed reads ----

/** ready_at in the future. If it is missing or already past while still preparing, it becomes 4 story min from now. */
export async function freshReadyAt(db: D1Database, order: Order, now: number, speed: number): Promise<number> {
  if (order.ready_at != null && order.ready_at > now) return order.ready_at;
  const readyAt = now + storyMinToMs(MINUTES_UNTIL_READY, speed);
  await db.prepare("UPDATE orders SET ready_at = ? WHERE id = ?").bind(readyAt, order.id).run();
  return readyAt;
}

/** The pickup pass (B5), only for the buyer who won this listing. Pick up by = paid_at + 30 story min (R6). */
export async function getPass(db: D1Database, listingId: string, buyerId: string, speed: number): Promise<PickupPass | null> {
  const listing = await getListing(db, listingId);
  if (!listing || listing.status !== "sold" || listing.buyer_id !== buyerId) return null;
  const order = await getOrder(db, listing.order_id);
  const restaurant = order ? await getRestaurant(db, order.restaurant_id) : null;
  const buyer = await getBuyer(db, buyerId);
  if (!order || !restaurant || !buyer) return null;
  const payment = await db
    .prepare("SELECT paid_at FROM payments WHERE listing_id = ? AND buyer_id = ? AND status = 'paid' ORDER BY rowid DESC LIMIT 1")
    .bind(listingId, buyerId)
    .first<{ paid_at: number | null }>();
  const paidAt = payment?.paid_at ?? Date.now();
  return {
    listing_id: listing.id,
    restaurant_name: restaurant.name,
    restaurant_address: restaurant.address,
    walk_min: walkMinutes(buyer, restaurant, await getWalkTable(db, restaurant.id)),
    pickup_code: order.pickup_code,
    name_on_order: buyer.name,
    pickup_by: paidAt + storyMinToMs(PICKUP_DEADLINE_MIN, speed),
  };
}
