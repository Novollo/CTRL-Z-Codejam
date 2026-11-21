// Track D replaces these placeholders with Stripe Checkout (test mode) + webhook. Same names, same types.
import { PAGE } from "@shared/api";
import type { CreateCheckout, ParseStripeWebhook } from "../integrations";

/** Placeholder: skips Stripe and sends the buyer straight to the paid page. */
export const createCheckout: CreateCheckout = async (_env, { listing_id, origin }) => ({
  url: origin + PAGE.paid(listing_id),
  session_id: `mock_${listing_id}`,
});

/** Placeholder: ignores every event. */
export const parseStripeWebhook: ParseStripeWebhook = async () => null;
