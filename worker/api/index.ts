// Track C: the real HTTP API (booklet 10.4 + lead additions in shared/api.ts). Mounted at /api by worker/index.ts.
import { Hono } from "hono";
import type { HealthResponse } from "@shared/api";
import type { Env } from "../env";
import { admin } from "./admin";
import { buyer } from "./buyer";
import { seller } from "./seller";
import { webhooks } from "./webhooks";

export const api = new Hono<{ Bindings: Env }>();

// Health: proves the Worker and the database are up.
api.get("/health", async (c) => {
  let restaurants = 0;
  try {
    const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM restaurants").first<{ n: number }>();
    restaurants = row?.n ?? 0;
  } catch {
    // database not set up yet
  }
  return c.json<HealthResponse>({ ok: true, restaurants, mode: "real" });
});

api.route("/", seller);
api.route("/", buyer);
api.route("/", webhooks);
api.route("/admin", admin);

api.onError((err, c) => {
  console.error("api error", err);
  return c.json({ error: "server error" }, 500);
});

api.all("*", (c) => c.json({ error: "not found" }, 404));
