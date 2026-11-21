// Webhooks. The routes are track C's; the parsing and bot logic are track D's (worker/integrations.ts).
import { Hono } from "hono";
import type { OkResponse } from "@shared/api";
import type { Env } from "../env";
import { market } from "../market";
import { parseStripeWebhook } from "../stripe";
import { handleTelegramUpdate } from "../telegram";
import { error } from "./util";

export const webhooks = new Hono<{ Bindings: Env }>();

const ok: OkResponse = { ok: true };

/** POST /api/stripe/webhook: payment done → sold (booklet 9.4.4). */
webhooks.post("/stripe/webhook", async (c) => {
  let paid: Awaited<ReturnType<typeof parseStripeWebhook>>;
  try {
    paid = await parseStripeWebhook(c.env, c.req.raw);
  } catch (e) {
    console.error("stripe webhook rejected", e);
    return error(c, 400, "bad signature");
  }
  if (paid) {
    const r = await market(c.env).paid(paid.listing_id, paid.buyer_id, paid.session_id, paid.amount);
    if (r.status !== 200) console.warn("payment ignored", paid.listing_id, r.body); // late payment (lead decision 21)
  }
  return c.json(ok); // always 200 for a valid event, so Stripe stops retrying
});

/** POST /api/telegram/webhook: bot commands, buttons and location updates. */
webhooks.post("/telegram/webhook", async (c) => {
  const update = await c.req.json().catch(() => null);
  if (update) {
    try {
      await handleTelegramUpdate(c.env, update);
    } catch (e) {
      console.error("telegram update failed", e);
    }
  }
  return c.json(ok); // always 200, or Telegram keeps resending the update
});
