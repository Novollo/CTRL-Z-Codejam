// Stripe test (track D).
//   node worker/agent/run-test.mjs worker/stripe/test-stripe.ts
// 1. createCheckout makes ONE real Stripe test-mode session and checks that its URL opens.
// 2. parseStripeWebhook is checked with events signed locally by a made-up secret (no Stripe call).
// Needs STRIPE_SECRET_KEY (sk_test_...) in .dev.vars.

import type { Env } from "../env";
import { testEnv } from "../agent/test-env";
import { createCheckout, hmacSha256Hex, parseStripeWebhook } from "./index";

let failed = 0;
const check = (name: string, ok: boolean, info = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  " + info : ""}`);
};

async function signedRequest(secret: string, event: unknown, opts: { age?: number; tamper?: boolean } = {}) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000) - (opts.age ?? 0);
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  const sent = opts.tamper ? body.replace("lst_demo", "lst_evil") : body;
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": `t=${t},v1=${sig}` },
    body: sent,
  });
}

async function throws(p: Promise<unknown>) {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}

async function main() {
  const { env, dispose } = await testEnv();
  try {
    console.log("== createCheckout (Stripe test mode) ==");
    const { url, session_id } = await createCheckout(env, {
      listing_id: "lst_demo",
      buyer_id: "b_demo",
      amount: 11.6,
      title: "Fresh Five Guys combo, untouched",
      origin: "http://localhost:5173",
    });
    check("session created", session_id.startsWith("cs_test_"), session_id.slice(0, 16) + "…");
    check("URL is a Stripe Checkout page", url.startsWith("https://checkout.stripe.com/"));
    const page = await fetch(url);
    check("URL opens", page.ok, `HTTP ${page.status}`);
    console.log(`  Open it in a browser to see it: ${url}`);
    check("live key refused", await throws(createCheckout({ ...env, STRIPE_SECRET_KEY: "sk_live_x" }, { listing_id: "x", buyer_id: "y", amount: 1, title: "t", origin: "http://x" })));

    console.log("\n== parseStripeWebhook (locally signed events) ==");
    const secret = "whsec_local_test_only";
    const testEnvWithSecret: Env = { ...env, STRIPE_WEBHOOK_SECRET: secret };
    const paid = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", payment_status: "paid", amount_total: 1160, metadata: { listing_id: "lst_demo", buyer_id: "b_demo" } } },
    };
    const result = await parseStripeWebhook(testEnvWithSecret, await signedRequest(secret, paid));
    check("paid session → listing", JSON.stringify(result) === JSON.stringify({ listing_id: "lst_demo", buyer_id: "b_demo", session_id: "cs_test_123", amount: 11.6 }), JSON.stringify(result));
    check("other event → null", (await parseStripeWebhook(testEnvWithSecret, await signedRequest(secret, { type: "payment_intent.created", data: { object: {} } }))) === null);
    const unpaid = { ...paid, data: { object: { ...paid.data.object, payment_status: "unpaid" } } };
    check("unpaid session → null", (await parseStripeWebhook(testEnvWithSecret, await signedRequest(secret, unpaid))) === null);
    check("tampered body → throws", await throws(parseStripeWebhook(testEnvWithSecret, await signedRequest(secret, paid, { tamper: true }))));
    check("wrong secret → throws", await throws(parseStripeWebhook(testEnvWithSecret, await signedRequest("whsec_other", paid))));
    check("old timestamp → throws", await throws(parseStripeWebhook(testEnvWithSecret, await signedRequest(secret, paid, { age: 3600 }))));
    check("no header → throws", await throws(parseStripeWebhook(testEnvWithSecret, new Request("http://x", { method: "POST", body: "{}" }))));

    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
  } finally {
    await dispose();
  }
}

await main();
