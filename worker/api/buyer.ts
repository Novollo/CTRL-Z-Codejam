// Buyer routes: profile, offer card, buy, "Not now", pickup pass. Calls send the x-buyer-token header.
import { Hono } from "hono";
import type { BuyerProfile, BuyerProfileInput, CreateBuyerResponse, OkResponse, PassResponse } from "@shared/api";
import { BUYER_DIETS, CAMPUS_SPOTS, FOOD_TYPES } from "@shared/catalog";
import { BUYER_MAX_PRICE, roundPrice } from "@shared/constants";
import type { Buyer } from "@shared/types";
import type { Env } from "../env";
import { market, notifyBuyerChanged } from "../market";
import { getPass } from "../market/db";
import { demoSpeed } from "../market/rules";
import { body, caller, error, newId, originOf, reply } from "./util";

export const buyer = new Hono<{ Bindings: Env }>();

const ok: OkResponse = { ok: true };

/** Profile without the secret token. */
export const toProfile = ({ token: _token, ...profile }: Buyer): BuyerProfile => profile;

/** Clean the fields that were sent. Returns the D1 columns to write (JSON as TEXT, booleans as 0/1). */
function profileColumns(input: Partial<BuyerProfileInput>): Record<string, string | number | null> {
  const cols: Record<string, string | number | null> = {};
  if (typeof input.name === "string") cols.name = input.name.trim().slice(0, 40);
  if (input.notify_on !== undefined) cols.notify_on = input.notify_on ? 1 : 0;
  if (input.spot !== undefined) cols.spot = CAMPUS_SPOTS.some((s) => s.key === input.spot) ? input.spot : null;
  if (input.max_walk_min !== undefined) cols.max_walk_min = Math.min(60, Math.max(1, Math.round(Number(input.max_walk_min) || 10)));
  if (Array.isArray(input.food_types)) cols.food_types = JSON.stringify(input.food_types.filter((t) => FOOD_TYPES.some((f) => f.key === t)));
  if (Array.isArray(input.diet)) cols.diet = JSON.stringify(input.diet.filter((d) => BUYER_DIETS.some((x) => x.key === d)));
  if (input.max_price !== undefined) {
    const price = Number(input.max_price);
    cols.max_price = roundPrice(Math.min(BUYER_MAX_PRICE.max, Math.max(BUYER_MAX_PRICE.min, Number.isFinite(price) ? price : BUYER_MAX_PRICE.default)));
  }
  return cols;
}

/** Matching runs again for this buyer. A failure here must not fail the profile save. */
const rematch = (env: Env, buyerId: string) => notifyBuyerChanged(env, buyerId).catch((e) => console.error("notifyBuyerChanged failed", e));

/** POST /api/buyers → { id, token } */
buyer.post("/buyers", async (c) => {
  const cols = profileColumns(await body<BuyerProfileInput>(c));
  if (!cols.name) return error(c, 400, "name is required");
  const id = newId("b_");
  const token = crypto.randomUUID();
  await c.env.DB
    .prepare(
      `INSERT INTO buyers (id, token, name, notify_on, spot, max_walk_min, food_types, diet, max_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, token, cols.name, cols.notify_on ?? 0, cols.spot ?? null, cols.max_walk_min ?? 10,
      cols.food_types ?? "[]", cols.diet ?? "[]", cols.max_price ?? BUYER_MAX_PRICE.default,
    )
    .run();
  await rematch(c.env, id);
  return c.json<CreateBuyerResponse>({ id, token }, 201);
});

/** GET /api/buyers/:id (token) → the profile, so a reload keeps it */
buyer.get("/buyers/:id", async (c) => {
  const me = await caller(c);
  if (!me || me.id !== c.req.param("id")) return error(c, 401, "wrong or missing buyer token");
  return c.json<BuyerProfile>(toProfile(me));
});

/** PATCH /api/buyers/:id (token) → toggle and criteria */
buyer.patch("/buyers/:id", async (c) => {
  const me = await caller(c);
  if (!me || me.id !== c.req.param("id")) return error(c, 401, "wrong or missing buyer token");
  const cols = profileColumns(await body<BuyerProfileInput>(c));
  if (cols.name === "") delete cols.name;
  const keys = Object.keys(cols);
  if (keys.length > 0) {
    await c.env.DB
      .prepare(`UPDATE buyers SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
      .bind(...keys.map((k) => cols[k]), me.id)
      .run();
    await rematch(c.env, me.id);
  }
  return c.json(ok);
});

/** GET /api/listings/:id (token) → B3 card for this buyer */
buyer.get("/listings/:id", async (c) => {
  const me = await caller(c);
  if (!me) return error(c, 401, "wrong or missing buyer token");
  return reply(c, await market(c.env).cardFor(c.req.param("id"), me.id));
});

/** POST /api/listings/:id/buy (token) → lock + Stripe Checkout, the free pass, or 409 taken */
buyer.post("/listings/:id/buy", async (c) => {
  const me = await caller(c);
  if (!me) return error(c, 401, "wrong or missing buyer token");
  return reply(c, await market(c.env).buy(c.req.param("id"), me.id, originOf(c)));
});

/** POST /api/listings/:id/dismiss (token) → "Not now": this offer never pings this buyer again */
buyer.post("/listings/:id/dismiss", async (c) => {
  const me = await caller(c);
  if (!me) return error(c, 401, "wrong or missing buyer token");
  const listingId = c.req.param("id");
  await c.env.DB.batch([
    c.env.DB
      .prepare("INSERT OR IGNORE INTO pings (listing_id, buyer_id, channel, reason, sent_at, dismissed) SELECT ?, ?, 'web', '', ?, 1 WHERE EXISTS (SELECT 1 FROM listings WHERE id = ?)")
      .bind(listingId, me.id, Date.now(), listingId),
    c.env.DB.prepare("UPDATE pings SET dismissed = 1 WHERE listing_id = ? AND buyer_id = ?").bind(listingId, me.id),
  ]);
  return c.json(ok);
});

/** GET /api/listings/:id/pass (token) → B5. 404 unless this buyer won the listing. */
buyer.get("/listings/:id/pass", async (c) => {
  const me = await caller(c);
  if (!me) return error(c, 401, "wrong or missing buyer token");
  const pass = await getPass(c.env.DB, c.req.param("id"), me.id, demoSpeed(c.env));
  if (!pass) return error(c, 404, "no pickup pass for this buyer");
  return c.json<PassResponse>(pass);
});

