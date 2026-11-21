// API STUBS: every path from booklet 10.4, returning mock data in the contract shapes.
// Track C replaces these with the real API (same paths, same shapes). Nothing here writes to the database.

import { Hono } from "hono";
import type {
  AdminStateResponse, BuyResponse, CreateBuyerResponse, HealthResponse, ListingCardResponse,
  ListingPatchRequest, ListingPatchResponse, OkResponse, OrderResponse, PublishRequest, PublishResponse,
  StopResponse, UndoResponse, BuyerProfile,
} from "@shared/api";
import { DEFAULT_DEMO_SPEED, LISTING_AFTER_READY_MIN, LOCK_SEC, PICKUP_DEADLINE_MIN } from "@shared/constants";
import type { AgentMode } from "@shared/constants";
import {
  MOCK_BUYER, MOCK_BUYER_ID, MOCK_BUYER_TOKEN, MOCK_ORDER_RESPONSE, MOCK_REASON, MOCK_UNDO,
  mockListingCard, mockPickupPass,
} from "@shared/mocks/data";
import type { Env } from "../env";

export const api = new Hono<{ Bindings: Env }>();

const speed = (env: Env) => Number(env.DEMO_SPEED) || DEFAULT_DEMO_SPEED;
const ok: OkResponse = { ok: true };

// ---- Health: proves the Worker and the database are up ----
api.get("/health", async (c) => {
  let restaurants = 0;
  try {
    const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM restaurants").first<{ n: number }>();
    restaurants = row?.n ?? 0;
  } catch {
    // database not set up yet
  }
  return c.json<HealthResponse>({ ok: true, restaurants, mode: "mock" });
});

// ---- Seller ----
api.get("/orders/:id", (c) => c.json<OrderResponse>(MOCK_ORDER_RESPONSE));

api.post("/orders/:id/undo", (c) => c.json<UndoResponse>(MOCK_UNDO));

api.post("/listings/:id/publish", async (c) => {
  await c.req.json<PublishRequest>().catch(() => null);
  const now = Date.now();
  const storyTotalSec = (4 + LISTING_AFTER_READY_MIN) * 60; // ready in 4 min + 20 min
  return c.json<PublishResponse>({
    listing_id: c.req.param("id"),
    status: "live",
    price: MOCK_UNDO.start_price,
    opens_at: now,
    closes_at: now + (storyTotalSec * 1000) / speed(c.env),
    seconds_left: storyTotalSec,
  });
});

api.patch("/listings/:id", async (c) => {
  const body = (await c.req.json<ListingPatchRequest>().catch(() => ({}))) as ListingPatchRequest;
  return c.json<ListingPatchResponse>({
    listing_id: c.req.param("id"),
    floor_price: body.floor_price ?? MOCK_UNDO.floor_price,
    fallback: body.fallback ?? MOCK_UNDO.fallback,
  });
});

api.post("/listings/:id/stop", (c) => c.json<StopResponse>({ listing_id: c.req.param("id"), status: "stopped" }));

// ---- Buyer ----
api.post("/buyers", (c) => c.json<CreateBuyerResponse>({ id: MOCK_BUYER_ID, token: MOCK_BUYER_TOKEN }, 201));
api.get("/buyers/:id", (c) => c.json<BuyerProfile>(MOCK_BUYER));
api.patch("/buyers/:id", (c) => c.json(ok));

api.get("/listings/:id", (c) =>
  c.json<ListingCardResponse>({ listing: mockListingCard(11.6, 14 * 60 + 5), reason: MOCK_REASON }),
);

// The stub always wins the lock. "Checkout" goes back to /join with ?mock_paid=<listingId> (no real Stripe yet).
api.post("/listings/:id/buy", (c) => {
  const id = c.req.param("id");
  return c.json<BuyResponse>({
    kind: "locked",
    checkout_url: `/join?mock_paid=${encodeURIComponent(id)}`,
    lock_until: Date.now() + LOCK_SEC * 1000,
    price: 11.6,
  });
});

api.post("/listings/:id/dismiss", (c) => c.json(ok));

// ---- Webhooks (tracks C and D) ----
api.post("/stripe/webhook", (c) => c.json(ok));
api.post("/telegram/webhook", (c) => c.json(ok));

// ---- Admin ----
api.post("/admin/reset", (c) => c.json(ok));
api.post("/admin/order-ready", (c) => c.json(ok));
api.post("/admin/mark-paid", (c) => c.json(ok));
api.get("/admin/state", (c) =>
  c.json<AdminStateResponse>({
    agent_mode: (c.env.AGENT_MODE as AgentMode) ?? "live",
    demo_speed: speed(c.env),
    order_status: "preparing",
    buyers: [MOCK_BUYER],
  }),
);
api.post("/admin/agent-mode", (c) => c.json(ok));

// Handy for building B5 without the live run: GET /api/mock/pass
api.get("/mock/pass", (c) =>
  c.json(mockPickupPass(Date.now() + (PICKUP_DEADLINE_MIN * 60 * 1000) / speed(c.env))),
);

api.all("*", (c) => c.json({ error: "not found" }, 404));

