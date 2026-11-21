// Worker entry. Owned by the lead.
// - /api/*  → HTTP API from worker/api (today: stubs with mock data; track C replaces them)
// - /ws     → live connection, handed to the one Market Durable Object
// - else    → the React app (static files in web/dist, served by Cloudflare assets)

import { Hono } from "hono";
import type { Env } from "./env";
import { api } from "./api";

export { Market } from "./market";

const app = new Hono<{ Bindings: Env }>();

app.route("/api", api);

app.get("/ws", (c) => {
  if (c.req.header("Upgrade") !== "websocket") return c.text("Expected a WebSocket", 426);
  const market = c.env.MARKET.get(c.env.MARKET.idFromName("market"));
  return market.fetch(c.req.raw);
});

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
