// Restaurant tablet routes (round 4): the order list, "Mark ready", "Picked up".
import { Hono } from "hono";
import type { Env } from "../env";
import { market } from "../market";
import { reply } from "./util";

export const restaurant = new Hono<{ Bindings: Env }>();

/** GET /api/restaurant/:id/orders → RestaurantOrdersResponse (real orders + the mock queue for Five Guys) */
restaurant.get("/restaurant/:id/orders", async (c) => reply(c, await market(c.env).restaurantOrders(c.req.param("id"))));

/** POST /api/restaurant/orders/:id/ready: same as /admin "Mark order ready" */
restaurant.post("/restaurant/orders/:id/ready", async (c) => reply(c, await market(c.env).orderReady(c.req.param("id"))));

/** POST /api/restaurant/orders/:id/picked-up (409 unless the order is ready) */
restaurant.post("/restaurant/orders/:id/picked-up", async (c) => reply(c, await market(c.env).pickedUp(c.req.param("id"))));
