# worker/stripe: Track D

Stripe Checkout in test mode (booklet B4, 9.4) and the webhook check. Plain `fetch`, no SDK.
Keys: `STRIPE_SECRET_KEY` (must start with `sk_test_`, anything else is refused), `STRIPE_WEBHOOK_SECRET`.

- `createCheckout` → one Checkout Session: CAD, amount in cents, `success_url = origin + PAGE.paid(id)`,
  `cancel_url = origin + PAGE.join`, `metadata.listing_id` + `metadata.buyer_id`. Throws if Stripe says no.
- `parseStripeWebhook` → checks `Stripe-Signature` (HMAC-SHA256 with Web Crypto, 5 min window). Returns
  `{ listing_id, buyer_id, session_id, amount }` for a paid `checkout.session.completed`, `null` for every other event,
  and throws on a missing or bad signature. Give it the raw request (body not read yet). Route: answer 400 when it throws.

## Test

```bash
node worker/agent/run-test.mjs worker/stripe/test-stripe.ts
```

Makes one real test-mode session and checks its URL opens (it prints the URL, open it and pay with 4242 4242 4242 4242).
The webhook part signs sample events locally with a made-up secret, so it needs no Stripe setup.

## Lead: connect the webhook (after deploy)

1. Stripe dashboard, **test mode** → Developers → Webhooks → Add endpoint.
2. URL: `https://ctrlz-eats.stalerole.workers.dev/api/stripe/webhook`. Event: `checkout.session.completed` (only this one).
3. Copy the signing secret (`whsec_...`) into `.dev.vars` as `STRIPE_WEBHOOK_SECRET`, then `npm run secrets:upload`
   (or `npx wrangler secret put STRIPE_WEBHOOK_SECRET`).
4. Check: buy on the live site, pay with 4242 4242 4242 4242, and the dashboard shows the webhook answered 200.
