// Seller routes: S1 order, Ctrl+Z (undo → agent → draft), publish, edit, stop.
import { Hono } from "hono";
import type { AgentInput } from "@shared/agent";
import type { ListingPatchRequest, OrderResponse, PublishRequest, UndoResponse } from "@shared/api";
import { ALLOWED_TAGS, DEFAULT_FALLBACK } from "@shared/catalog";
import type { FoodType } from "@shared/catalog";
import { FLOOR_STEP } from "@shared/constants";
import type { Env } from "../env";
import { runSellerAgent } from "../agent";
import { market } from "../market";
import { freshReadyAt, getActiveBuyers, getOpenListingForOrder, getOrder, getRestaurant, getWalkTable } from "../market/db";
import { clipFloor, demoSpeed, floorRange, walkMinutes } from "../market/rules";
import { body, error, newId, originOf, reply } from "./util";

export const seller = new Hono<{ Bindings: Env }>();

/** GET /api/orders/:id → S1 */
seller.get("/orders/:id", async (c) => {
  const order = await getOrder(c.env.DB, c.req.param("id"));
  if (!order) return error(c, 404, "order not found");
  const restaurant = await getRestaurant(c.env.DB, order.restaurant_id);
  if (!restaurant) return error(c, 404, "restaurant not found");
  const listing = await getOpenListingForOrder(c.env.DB, order.id);
  return c.json<OrderResponse>({ order, restaurant, listing_id: listing?.id ?? null });
});

/** POST /api/orders/:id/undo → the agent drafts a listing → S3 */
seller.post("/orders/:id/undo", async (c) => {
  const db = c.env.DB;
  const order = await getOrder(db, c.req.param("id"));
  if (!order) return error(c, 404, "order not found");
  if (order.status !== "preparing") return error(c, 409, "order is not preparing"); // R1
  const listed = await db
    .prepare("SELECT 1 FROM listings WHERE order_id = ? AND status IN ('live', 'locked', 'free', 'sold', 'closed', 'donated') LIMIT 1")
    .bind(order.id)
    .first();
  if (listed) return error(c, 409, "order is already listed");
  const restaurant = await getRestaurant(db, order.restaurant_id);
  if (!restaurant) return error(c, 404, "restaurant not found");

  // Agent input (booklet 8.2). "Nearby" = pings on and within their walk time.
  const now = Date.now();
  const speed = demoSpeed(c.env);
  const readyAt = await freshReadyAt(db, order, now, speed);
  const [buyers, walkTable] = await Promise.all([getActiveBuyers(db), getWalkTable(db, restaurant.id)]);
  const nearby = buyers.filter((b) => {
    const walk = walkMinutes(b, restaurant, walkTable);
    return walk != null && walk <= b.max_walk_min;
  });
  const input: AgentInput = {
    restaurant: restaurant.name,
    items: order.items.map((i) => (i.description ? `${i.name}: ${i.description}` : i.name)), // round 2: what's in it
    food_price: order.food_price,
    minutes_until_ready: Math.max(0, Math.round(((readyAt - now) * speed) / 60_000)),
    active_nearby: nearby.length,
    active_nearby_liking_category: nearby.filter(
      (b) => b.food_types.length === 0 || b.food_types.includes(restaurant.default_category as FoodType),
    ).length,
    allowed_tags: [...ALLOWED_TAGS],
  };

  const agentMode = await market(c.env).getAgentMode();
  const result = await runSellerAgent(c.env, input, restaurant, agentMode);

  // The agent already applies 8.5. Clip again so the floor fits the S3 range exactly.
  const start = Math.min(result.start_price, order.food_price);
  const floor = clipFloor(result.floor_price, order.food_price, start);
  const range = floorRange(order.food_price);
  const id = newId("lst_");
  await db
    .prepare(
      `INSERT INTO listings (id, order_id, status, start_price, floor_price, drop_speed, opens_at, closes_at, fallback,
         tags, diet, may_contain, title, selling_line, reason, agent_source)
       VALUES (?, ?, 'draft', ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, order.id, start, floor, result.drop_speed, DEFAULT_FALLBACK,
      JSON.stringify(result.tags), JSON.stringify(result.diet), JSON.stringify(result.may_contain),
      result.title, result.selling_line, result.reason, result.agent_source,
    )
    .run();

  return c.json<UndoResponse>({
    listing_id: id,
    title: result.title,
    selling_line: result.selling_line,
    reason: result.reason,
    tags: result.tags,
    may_contain: result.may_contain,
    diet: result.diet,
    start_price: start,
    floor_price: floor,
    floor_min: range.min,
    floor_max: range.max,
    floor_step: FLOOR_STEP,
    drop_speed: result.drop_speed,
    fallback: DEFAULT_FALLBACK,
    order_type: order.type,
    agent_source: result.agent_source,
  });
});

/** POST /api/listings/:id/publish  { floor_price, fallback } → live */
seller.post("/listings/:id/publish", async (c) => {
  const b = await body<PublishRequest>(c);
  return reply(c, await market(c.env).publish(c.req.param("id"), Number(b.floor_price), b.fallback ?? DEFAULT_FALLBACK, originOf(c)));
});

/** PATCH /api/listings/:id  { floor_price?, fallback? } */
seller.patch("/listings/:id", async (c) => {
  const b = await body<ListingPatchRequest>(c);
  return reply(c, await market(c.env).patchListing(c.req.param("id"), { floor_price: b.floor_price, fallback: b.fallback }));
});

/** POST /api/listings/:id/stop */
seller.post("/listings/:id/stop", async (c) => reply(c, await market(c.env).stop(c.req.param("id"))));
