// Track F (lead approved, Nov 21): POST /api/orders/import. The Chrome extension sends an order read from a
// delivery site (DoorDash first). We create a normal "preparing" pickup order, so the usual flow runs:
// undo → publish → /ws. Only the restaurant name, item names, quantities and prices arrive here.
import { Hono } from "hono";
import type { ImportOrderRequest, ImportOrderResponse } from "@shared/api";
import { DEMO_RESTAURANT_ID, makePickupCode } from "@shared/constants";
import type { OrderItem } from "@shared/types";
import type { Env } from "../env";
import { MINUTES_UNTIL_READY } from "../market/db";
import { demoSpeed, storyMinToMs } from "../market/rules";
import { body, error, newId } from "./util";

export const importOrder = new Hono<{ Bindings: Env }>();

/** "Tim Hortons", "tim hortons!" and "Tim  Hortons" all become "timhortons". */
const simple = (name: string) => name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** A seeded (or earlier imported) restaurant with this name, or a new row that copies the demo restaurant's place. */
async function restaurantFor(db: D1Database, name: string): Promise<string> {
  const { results } = await db.prepare("SELECT id, name FROM restaurants").all<{ id: string; name: string }>();
  const key = simple(name);
  const match = results.find((r) => simple(r.name) === key);
  if (match) return match.id;

  // Unknown restaurant: keep its real name, borrow the demo restaurant's location and walk times so pings still go out.
  const id = `r_x_${key.slice(0, 24) || "shop"}`;
  await db.batch([
    db
      .prepare(
        `INSERT INTO restaurants (id, name, address, lat, lng, photo_url, logo_url, default_category, default_tags, default_diet)
         SELECT ?, ?, 'Near McGill campus', lat, lng, '', '', default_category, '[]',
                '{"vegetarian":"unsure","vegan":"unsure","halal":"unsure","gluten_free":"unsure"}'
           FROM restaurants WHERE id = ?`,
      )
      .bind(id, name, DEMO_RESTAURANT_ID),
    db
      .prepare("INSERT INTO walk_times (spot, restaurant_id, minutes) SELECT spot, ?, minutes FROM walk_times WHERE restaurant_id = ?")
      .bind(id, DEMO_RESTAURANT_ID),
  ]);
  return id;
}

/** POST /api/orders/import → { order_id, restaurant_id } */
importOrder.post("/orders/import", async (c) => {
  const b = await body<ImportOrderRequest>(c);
  const name = String(b.restaurant_name ?? "").trim().slice(0, 60);
  const items: OrderItem[] = (Array.isArray(b.items) ? b.items : [])
    .map((i) => {
      const qty = Math.max(1, Math.round(Number(i?.qty) || 1));
      const itemName = String(i?.name ?? "").trim().slice(0, 80);
      const price = Math.round(Math.max(0, Number(i?.price) || 0) * 100) / 100; // dollars, to the cent
      return { name: qty > 1 ? `${qty} x ${itemName}` : itemName, price, description: "" };
    })
    .filter((i) => i.name && i.price > 0)
    .slice(0, 20);
  if (!name) return error(c, 400, "restaurant_name is required");
  if (items.length === 0) return error(c, 400, "at least one item with a price is required");

  const foodPrice = Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100; // R7: food only, no fees
  const db = c.env.DB;
  const restaurantId = await restaurantFor(db, name);
  const orderId = newId("ord_");
  const readyAt = Date.now() + storyMinToMs(MINUTES_UNTIL_READY, demoSpeed(c.env));
  await db
    .prepare(
      `INSERT INTO orders (id, restaurant_id, items, food_price, fees, total, type, status, ready_at, pickup_code, customer_name)
       VALUES (?, ?, ?, ?, ?, ?, 'pickup', 'preparing', ?, ?, 'Demo customer')`,
    )
    .bind(
      orderId, restaurantId, JSON.stringify(items), foodPrice,
      JSON.stringify({ service_fee: 0, delivery_fee: 0, tax: 0 }), foodPrice, readyAt, makePickupCode(),
    )
    .run();

  return c.json<ImportOrderResponse>({ order_id: orderId, restaurant_id: restaurantId });
});
