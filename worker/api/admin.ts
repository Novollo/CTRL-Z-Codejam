// Demo control for /admin (booklet 10.2, 12): reset, mark order ready, mark paid, AGENT_MODE, joined buyers.
import { Hono } from "hono";
import type { AdminStateResponse, AgentModeRequest, MarkPaidRequest, OkResponse } from "@shared/api";
import { DEMO_ORDER_ID } from "@shared/constants";
import type { Env } from "../env";
import { market } from "../market";
import { getOrder, toBuyer } from "../market/db";
import { demoSpeed } from "../market/rules";
import { toProfile } from "./buyer";
import { body, error, reply } from "./util";

export const admin = new Hono<{ Bindings: Env }>();

const ok: OkResponse = { ok: true };

/** POST /api/admin/reset: wipe listings, pings, payments; the order is "Preparing" again. Buyers stay. */
admin.post("/reset", async (c) => {
  await market(c.env).reset();
  return c.json(ok);
});

/** POST /api/admin/order-ready  { order_id? } (default: the stage order) */
admin.post("/order-ready", async (c) => {
  const b = await body<{ order_id: string }>(c);
  return reply(c, await market(c.env).orderReady(b.order_id || DEMO_ORDER_ID));
});

/** POST /api/admin/mark-paid  { listing_id }: Stripe did not open (12.3) */
admin.post("/mark-paid", async (c) => {
  const b = await body<MarkPaidRequest>(c);
  if (!b.listing_id) return error(c, 400, "listing_id is required");
  return reply(c, await market(c.env).markPaid(b.listing_id));
});

/** GET /api/admin/state */
admin.get("/state", async (c) => {
  const [agentMode, order, buyers] = await Promise.all([
    market(c.env).getAgentMode(),
    getOrder(c.env.DB, DEMO_ORDER_ID),
    c.env.DB.prepare("SELECT * FROM buyers ORDER BY rowid").all<Record<string, unknown>>(),
  ]);
  return c.json<AdminStateResponse>({
    agent_mode: agentMode,
    demo_speed: demoSpeed(c.env),
    order_status: order?.status ?? "preparing",
    buyers: buyers.results.map((r) => toProfile(toBuyer(r))),
  });
});

/** POST /api/admin/agent-mode  { agent_mode: "live" | "default" } */
admin.post("/agent-mode", async (c) => {
  const b = await body<AgentModeRequest>(c);
  if (b.agent_mode !== "live" && b.agent_mode !== "default") return error(c, 400, 'agent_mode must be "live" or "default"');
  await market(c.env).setAgentMode(b.agent_mode);
  return c.json(ok);
});
