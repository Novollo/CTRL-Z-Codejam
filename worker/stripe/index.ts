// Track D: Stripe Checkout in test mode (booklet B4, 9.4) and the webhook check.
// Plain fetch to the Stripe API (no SDK). Test keys only (sk_test_...).

import { PAGE } from "@shared/api";
import type { CreateCheckout, ParseStripeWebhook } from "../integrations";

const STRIPE_API = "https://api.stripe.com/v1";
/** Prices are Canadian dollars (McGill, Montréal). */
const CURRENCY = "cad";
/** Stripe's own replay window for webhook signatures. */
const SIGNATURE_TOLERANCE_SEC = 300;

/** Creates a Checkout Session for the locked price. The buyer comes back to /join?paid=<id> or /join. */
export const createCheckout: CreateCheckout = async (env, { listing_id, buyer_id, amount, title, origin }) => {
  const key = env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY must be a test key (sk_test_...)");

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": CURRENCY,
    "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)), // cents
    "line_items[0][price_data][product_data][name]": title,
    success_url: origin + PAGE.paid(listing_id),
    cancel_url: origin + PAGE.join,
    client_reference_id: listing_id,
    "metadata[listing_id]": listing_id,
    "metadata[buyer_id]": buyer_id,
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.id || !data.url) throw new Error(`Stripe checkout failed (${res.status}): ${data.error?.message ?? "no url"}`);
  return { url: data.url, session_id: data.id };
};

/**
 * Checks the Stripe-Signature header (HMAC-SHA256 with STRIPE_WEBHOOK_SECRET), then reads the event.
 * Returns the paid listing for a paid `checkout.session.completed`, null for any other event.
 * Throws on a missing or bad signature (the route should answer 400).
 */
export const parseStripeWebhook: ParseStripeWebhook = async (env, request) => {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  const body = await request.text();
  await verifySignature(body, request.headers.get("stripe-signature"), secret);

  const event = JSON.parse(body) as {
    type?: string;
    data?: { object?: { id?: string; payment_status?: string; amount_total?: number; metadata?: Record<string, string> } };
  };
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data?.object;
  if (!session || session.payment_status !== "paid") return null;
  const listing_id = session.metadata?.listing_id;
  const buyer_id = session.metadata?.buyer_id;
  if (!listing_id || !buyer_id || !session.id) return null;
  return { listing_id, buyer_id, session_id: session.id, amount: (session.amount_total ?? 0) / 100 };
};

async function verifySignature(body: string, header: string | null, secret: string): Promise<void> {
  if (!header) throw new Error("missing Stripe-Signature header");
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2).map((s) => s.trim());
    if (k === "t") timestamp = v;
    if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) throw new Error("bad Stripe-Signature header");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SEC) throw new Error("Stripe signature too old");

  const expected = await hmacSha256Hex(secret, `${timestamp}.${body}`);
  if (!signatures.some((s) => timingSafeEqual(s, expected))) throw new Error("bad Stripe signature");
}

/** Hex HMAC-SHA256 with Web Crypto. Exported for the test script. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
