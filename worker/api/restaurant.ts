// Restaurant tablet routes (round 4): the order list, "Mark ready", "Picked up".
import { Hono } from "hono";
import type { Env } from "../env";
import { market } from "../market";
import { MOCK_RESTAURANT_QUEUE } from "@shared/mocks/data";
import type { OkResponse } from "@shared/api";
import { reply } from "./util";

/** The decoration orders on the tablet: their buttons quietly succeed (lead, round 4). */
const MOCK_IDS = new Set(MOCK_RESTAURANT_QUEUE(0).map((o) => o.order_id));
const mockOk = (id: string) => MOCK_IDS.has(id);

export const restaurant = new Hono<{ Bindings: Env }>();

/** GET /api/restaurant/:id/orders → RestaurantOrdersResponse (real orders + the mock queue for Five Guys) */
restaurant.get("/restaurant/:id/orders", async (c) => reply(c, await market(c.env).restaurantOrders(c.req.param("id"))));

/** POST /api/restaurant/orders/:id/ready: same as /admin "Mark order ready" */
restaurant.post("/restaurant/orders/:id/ready", async (c) =>
  mockOk(c.req.param("id")) ? c.json<OkResponse>({ ok: true }) : reply(c, await market(c.env).orderReady(c.req.param("id"))),
);

/** POST /api/restaurant/orders/:id/picked-up (409 unless the order is ready) */
restaurant.post("/restaurant/orders/:id/picked-up", async (c) =>
  mockOk(c.req.param("id")) ? c.json<OkResponse>({ ok: true }) : reply(c, await market(c.env).pickedUp(c.req.param("id"))),
);
