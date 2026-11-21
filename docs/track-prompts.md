# Track plan and starting prompts

Four agents build in parallel, one per track, each on its own branch (booklet 13). The lead merges in the order **C → D → A → B** and runs the full flow.

| Track | Branch | Builds | Folders | Done when |
| --- | --- | --- | --- | --- |
| A. Seller app | `track-a-seller` | S1–S5b, chef animation | `web/src/seller` | The full seller flow runs on mock events |
| B. Buyer web + stage | `track-b-buyer` | B1–B5, B-lost, B-hold, `/buy/:id`, `/stage`, `/admin` UI | `web/src/buyer`, `web/src/stage` | The full buyer flow runs on mock events |
| C. Market engine | `track-c-market` | Durable Object, price clock, matching, lock, timers, fallbacks, real API | `worker/market`, `worker/api` | A test script runs a listing from publish to sold |
| D. Integrations | `track-d-integrations` | OpenAI agent + checks + defaults, Stripe Checkout + webhook, Telegram bot | `worker/agent`, `worker/stripe`, `worker/telegram` | Each works alone against the contract |

Gates (booklet 13.5): **H7** tracks done · **H9.5** first full run on real phones · **H11.5** looks final · **H14** code freeze.

## Setup every agent does first

```text
cd into your own copy of the repo (a git worktree or a clone of Novollo/CTRL-Z-Codejam).
git switch <your branch>        (git pull first if the branch already has commits)
source ~/.nvm/nvm.sh && nvm use (Node 22)
npm install && npm run db:local
npm run dev                      → http://localhost:5173 (web) + http://localhost:8787 (worker)
```

Rules for all: read `CLAUDE.md` and `docs/booklet.md` fully. Use `/shared` exactly and never change it. Need a contract change? Write it in `docs/contract-requests.md` and stop. Run `npm run typecheck` before handing over. Commit often and push **your branch only** (`git push origin <branch>`). Never push `main`, never deploy. No new npm packages without the lead. Icons: small inline SVG line icons (2 px stroke), since Lucide isn't installed.

---

## Track A: Seller app

```text
You are building track A (Seller app) of Ctrl+Z Eats, a hackathon app.
Read CLAUDE.md, then /docs/booklet.md fully. Your sections are 5 and 11.
Work on branch track-a-seller. You may only change files in web/src/seller (the page component is SellerApp.tsx, route /seller).
Use the shared contract in /shared exactly. Do not change /shared.
Use mock data until the real API exists: the stub API and the /ws mock replay already answer.

How the screens get data:
- S1: apiCall<OrderResponse>("GET", API.order(DEMO_ORDER_ID)). Show the order exactly as booklet S1 (Demo app tag, progress bar, lines, fees, greyed Cancel, "Ctrl+Z this order").
- S2: show while POST API.undo(DEMO_ORDER_ID) runs (at least ~1.5 s so the animation is seen, at most 5 s). Three lines appear one by one.
- S3: UndoResponse fills the sheet. Floor −/+ in floor_step, clamped to floor_min..floor_max. Fallback default "free". Delivery warning only if order_type is "delivery". "List it" → POST API.publish(listing_id) with { floor_price, fallback }.
- S4: open connectLive({ role: "seller", orderId: DEMO_ORDER_ID }, onMessage) from web/src/lib/live.ts ONLY after publish (the mock replay starts when you connect).
  listing.tick → big mono price + "mm:ss left" + ring; listing.reach → "Sent to N people nearby"; listing.locked/unlocked → optional small state.
  Edit floor / Change fallback → PATCH API.listing(id). "Stop listing" → confirm "Stop and keep your order?" → POST API.stop(id) → back to S1.
- S5a on listing.sold: "You got $X back." with sold_price; "You undid N% of your mistake." = round(sold_price / order.total * 100); pickup time from pickup_by. The seller never sees the buyer's pickup code.
- S5b on listing.closed, by outcome/fallback (booklet table). pickup_self shows listing.closed.pickup_code.
Design: Tailwind token classes (bg-forest, text-leaf, bg-mint, text-ink, text-stone, border-line, bg-amber, font-mono, text-h1/h2/h3/body/small, rounded-card, h-bottom). Screen 390×844. One bright green button per screen. Mascot images (/mascot/*.png from MASCOT_POSES) may not exist yet: use a placeholder of the same size. CSS-only animation.
Test fast with /seller?speed=30, or /seller?mock=local (no server).
Keep it simple: no feature that is not in the booklet. Exact on-screen text from the booklet.
When done, list what you built, how to run it, and anything you assumed.
Done means: the full seller flow (S1 → S2 → S3 → S4 → S5a, and S5b) runs on mock events.
```

## Track B: Buyer web + stage

```text
You are building track B (Buyer web + stage + admin UI) of Ctrl+Z Eats, a hackathon app.
Read CLAUDE.md, then /docs/booklet.md fully. Your sections are 6, 11 and 12.
Work on branch track-b-buyer. You may only change files in web/src/buyer and web/src/stage (admin UI in web/src/stage/admin).
Pages: /join → JoinPage.tsx, /buy/:listingId?t= → BuyPage.tsx, /stage → StagePage.tsx, /admin → AdminPage.tsx.
Use the shared contract in /shared exactly. Do not change /shared. Use the stub API and the /ws mock replay until the real API exists.

How the screens get data:
- B1: "I'm in" → POST API.buyers() with BuyerProfileInput → save id + token in localStorage ("ctrlz.buyer_id", "ctrlz.buyer_token"). Reload → GET API.buyer(id) with the token header. Edits → PATCH API.buyer(id). Lists come from CAMPUS_SPOTS, WALK_CHOICES_MIN, FOOD_TYPES, BUYER_DIETS, BUYER_MAX_PRICE.
- B2: connectLive({ role: "buyer", buyerId }, onMessage) from web/src/lib/live.ts. Toggle off → PATCH notify_on false → "Paused. No pings."
- B3 on ping: full-screen card, live price from listing.tick, struck-through food_price, countdown, green reason line, "Buy for $X". "Not now" → POST API.dismiss(id).
- Buy → apiCall<BuyResponse>("POST", API.buy(id), undefined, token). kind "locked" → B4 (60 s real countdown, "Pay $X" → window.location = checkout_url). kind "free" → B5 with the pass. HTTP 409 → B-hold.
- B-hold on listing.locked (not you): "Someone is paying… back in 0:45 if they don't", Buy disabled. listing.unlocked → card comes back at the new price.
- B-lost on listing.sold without `pass`: grey card "Grabbed by someone at $X.", closes after LOST_CARD_CLOSE_SEC → B2.
- B5: after Stripe, the buyer lands on /join?paid=<listingId> → GET API.pass(listingId) with token → pickup pass. Or listing.sold with `pass`.
- /buy/:listingId?t=: GET API.listing(id) with token t → open B3 for that listing.
- /stage: two phone frames (390×844) side by side: /seller on the left, /join (the teammate's profile) on the right. Iframes are fine.
- /admin: Reset demo (POST API.adminReset), "Mark order ready" (API.adminOrderReady), "Mark paid" (API.adminMarkPaid with listing_id), AGENT_MODE switch (GET API.adminState, POST API.adminAgentMode), list of joined buyers.
Note: in the mock replay this buyer is never the winner (they see B-hold, then B-lost). Test B4/B5 with the stub POST /buy (it always wins) and /join?paid=lst_demo.
Design: Tailwind token classes (bg-forest, text-leaf, bg-mint, text-ink, text-stone, border-line, bg-amber, font-mono, rounded-card, h-bottom…). Mobile first. One bright green button per screen. Mascot images may not exist yet: placeholder of the same size.
Test fast with ?speed=30, or ?mock=local (no server).
Keep it simple: no feature that is not in the booklet. Exact on-screen text from the booklet.
When done, list what you built, how to run it, and anything you assumed.
Done means: the full buyer flow (B1 → B2 → B3 → B4 → B5, plus B-hold and B-lost) runs on mock events, and /stage and /admin work.
```

## Track C: Market engine

```text
You are building track C (Market engine + real API) of Ctrl+Z Eats, a hackathon app.
Read CLAUDE.md, then /docs/booklet.md fully. Your sections are 3, 9 and 10.
Work on branch track-c-market. You may only change files in worker/market and worker/api.
Use the shared contract in /shared exactly (types, API paths and shapes in shared/api.ts, live messages in shared/messages.ts, constants, D1 schema in shared/db/migrations). Do not change /shared.

What to build:
- worker/api: replace the stubs with the real API. Same paths, same request/response shapes. Keep exporting the Hono app as `api` from worker/api/index.ts. Read/write D1 (env.DB). JSON columns are TEXT, booleans are 0/1.
  POST /orders/:id/undo builds AgentInput (8.2) and calls runSellerAgent from worker/agent (signature in worker/integrations.ts), then saves a draft listing.
  /stripe/webhook calls parseStripeWebhook; /telegram/webhook calls handleTelegramUpdate (both from track D, placeholders exist).
  Admin: reset (wipe listings/pings/payments, order back to "preparing", ready_at = now + 4 story min), order-ready, mark-paid, state, agent-mode (store the runtime AGENT_MODE in Market; env.AGENT_MODE is the starting value).
- worker/market: the real Market Durable Object (one instance, idFromName("market")). It replaces the mock replay on /ws.
  WebSocket sessions by role (?role=seller&order= / ?role=buyer&id=). Price clock with alarms: tick every PRICE_TICK_SEC story seconds (scaled by DEMO_SPEED), price per 9.2, rounded down. Matching per 9.3 on every tick and on every profile change. Pings: web over WS + Telegram via sendTelegramPing (store pings rows, telegram_message_id). Lock per 9.4: first tap wins, LOCK_SEC real seconds, createCheckout from worker/stripe. Sold → listing.sold to everyone (pass ONLY to the winning buyer) + editTelegramPing "Gone — grabbed at $X". Fallbacks per 9.5. Stop listing. Export notifyBuyerChanged from worker/market/index.ts.
  Use the times in shared/constants.ts. All timers except the lock run DEMO_SPEED times faster.
- A test script inside your folders that runs one listing from publish to sold against `npm run dev` (publish → ticks → ping → buy → mark-paid → sold), and prints each step.
Keep it simple: plain code, no AI here, no feature that is not in the booklet.
When done, list what you built, how to run it, and anything you assumed.
Done means: the test script runs a listing from publish to sold.
```

## Track D: Integrations

```text
You are building track D (Integrations: seller agent, Stripe, Telegram) of Ctrl+Z Eats, a hackathon app.
Read CLAUDE.md, then /docs/booklet.md fully. Your sections are 7, 8 and 10.
Work on branch track-d-integrations. You may only change files in worker/agent, worker/stripe and worker/telegram.
Use the shared contract in /shared exactly. Do not change /shared. Export EXACTLY the functions and types listed for track D in worker/integrations.ts, from each folder's index.ts (placeholders with these names already exist; replace them).
Keys: copy the lead's private keys file next to wrangler.jsonc: cp "/Users/antonweitz/Projects/Hackathon Codejam/.dev.vars" . (it is git-ignored; never commit it, never print key values).

What to build (use fetch, no new npm packages):
- worker/agent: runSellerAgent. One OpenAI call (AGENT_MODEL = gpt-5.4-mini, JSON mode, POST https://api.openai.com/v1/chat/completions, key env.OPENAI_API_KEY), system prompt from 8.4, input AgentInput (shared/agent.ts). AGENT_TIMEOUT_MS timeout with AbortController. Every check in 8.5, defaults in 8.6 (restaurant.default_tags / default_diet). Never throws. AGENT_MODE "default" skips the call. Include a small script in your folder that runs it 20 times on the stage order (booklet 8.7) and prints each checked result.
- worker/stripe: createCheckout (Stripe Checkout Session, test mode, amount in cents, success_url = origin + PAGE.paid(listing_id), cancel_url = origin + PAGE.join, metadata listing_id + buyer_id) and parseStripeWebhook (verify the Stripe-Signature header with Web Crypto HMAC-SHA256 and env.STRIPE_WEBHOOK_SECRET; return the paid listing on checkout.session.completed, else null).
- worker/telegram: handleTelegramUpdate (/start, /on, /off, /settings with inline buttons, /stop, live location; writes the buyers table, then calls notifyBuyerChanged from worker/market), sendTelegramPing (the ping message from booklet 7, "Buy now" button → origin + PAGE.buy(listingId, buyerToken)), editTelegramPing. Exact bot texts from the booklet.
The routes /api/stripe/webhook and /api/telegram/webhook belong to track C and call your functions. Webhooks need a public URL: ask the lead to deploy when you're ready to test them.
Keep it simple: no feature that is not in the booklet.
When done, list what you built, how to run it, and anything you assumed.
Done means: each part works alone against the contract (agent script passes 20 runs; checkout URL opens in Stripe test mode; bot answers /start).
```
