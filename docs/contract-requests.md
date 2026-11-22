# Contract requests and open questions

How this works (booklet 13.3.6): an agent that needs a change to `/shared` writes it here and **stops**. The lead decides.
Format: `- [ ] [track X] what you need · why · date`.

## Open requests

- [x] **Approved by the lead (Nov 21), built by track F:** option (b), unknown restaurants keep their real name. [track F] New endpoint `POST /api/orders/import` for the Chrome extension · Nov 21
  - **What:** body `{ source: "doordash", restaurant_name, items: {name, qty, price}[], food_price, demo: boolean }` → `{ order_id, restaurant_id }`. Creates an order row: `status = "preparing"`, `type = "pickup"`, `pickup_code = makePickupCode()`, `ready_at` = now + 4 story min (same as reset/`freshReadyAt`), `fees` all 0, `total = food_price`, `customer_name = "Demo customer"` (the extension never sends the real name). Items with qty > 1 are saved as "2 x Name" with the line price. `food_price` is recomputed on the server as the sum of items (R7), rounded with `roundPrice`.
  - **Restaurant:** match `restaurant_name` to a seeded restaurant by name, ignoring case and punctuation ("Tim Hortons" → `r_timhortons`). No match → the lead picks: (a) use `DEMO_RESTAURANT_ID` (buyers see "Five Guys"), or (b) add a restaurant row with the scraped name, copying Five Guys' location, walk times and defaults, so buyers see the real name.
  - **Also needed:** `originOf` in `worker/api/util.ts` must ignore a `chrome-extension://` Origin and use the request URL instead. Otherwise publish saves that origin and the Telegram "Buy now" links break.
  - **CORS:** not needed. The extension sends every request and the live connection from its background worker, which Chrome allows through the host permissions.
  - **Then** the existing flow runs unchanged: `API.undo` → `API.publish` → `API.wsSeller`.
  - **Where:** new file `worker/api/importOrder.ts`, mounted in `worker/api/index.ts`; path `importOrder: () => "/api/orders/import"` in `API` (`shared/api.ts`), plus `ImportOrderRequest` / `ImportOrderResponse` types there.
  - **Why:** the market only knows seeded orders. A DoorDash order must be created before the agent can run on it.

- [x] **Approved and done by the lead (Nov 21):** set when the order changed hands. [track E] `previous_customer_name: string | null` on `RestaurantOrderView` (next to `previous_pickup_code`) · The handover must show "Alex → Sarah" with the old name crossed out, but after a sale the view only carries the new name. Today the tablet remembers the old name itself (in memory + localStorage) from the moment it saw the order before the sale, so it works if the tablet was open before the sale, but not after a fresh load on another device. Track C would set it to `orders.customer_name` when the buyer takes over. · Nov 21

## Answered requests

- [x] [track B] `buyer_id` on `GET /api/listings/:id` · **Approved** (Nov 21): `ListingCardResponse.buyer_id` added; the stub returns `b_demo`. Track B: switch `/buy/:id` to `/ws` like `/join`. Track C: return the token's buyer id.
- [x] [track A] No "not sold" ending in the mock run · **OK as built** (Nov 21): keep the `?end=` switch inside `web/src/seller`; the shared mock stays as it is.
- [x] [track A] Thank-you text when the free meal is taken · **Use "Someone nearby took it. Thank you!"** for now (Nov 21). The team may change the words later.

---

## Lead decisions made while writing the contract (track 0)

These fill gaps in the booklet. Any track may question them here.

1. **Money is dollars** (`17.78`), not cents, to match the booklet and the agent JSON. Use `roundPrice` / `roundPriceDown` from `shared/constants.ts`.
2. **Timestamps are epoch milliseconds**, real time. `seconds_left` in live messages is **story seconds** (already scaled by `DEMO_SPEED`), so screens just display it.
3. **The price tick (10 s) is a story timer** and runs 7× faster like the others (about every 1.4 s real). Only the lock (60 s) is real time.
4. **Extra API paths** the screens need (not in 10.4): `GET /api/orders/:id` (S1), `GET /api/buyers/:id` (reload keeps the profile), `GET /api/listings/:id` (B3 from a Telegram link), `GET /api/admin/state` and `POST /api/admin/agent-mode` (/admin), `GET /api/health`, `GET /api/listings/:id/pass` (B5 after coming back from Stripe).
5. **Buyer auth:** buyer calls send the token in the header `x-buyer-token`.
6. **Pickup code privacy (lead decision, updated Nov 21):** `listing.sold` carries `pass` (with the pickup code) **only** in the copy sent to the **winning buyer**. The seller and everyone else get it without `pass`. (The seller still sees their own order's code in S5b "I'll pick it up", via `listing.closed.pickup_code`.)
7. **Buy response** is `{ kind: "locked", checkout_url, lock_until, price }` or, in the free window, `{ kind: "free", pass }`. A lost race is HTTP 409 `{ error: "taken", lock_until }`.
8. **`listing.unlocked` also carries `price`**, so the card comes back to life at the current price (B-hold).
9. **`listing.closed` has an `outcome`**: `pickup_self | free_window | free_expired | donated | stopped`. "Stop listing" uses `stopped`.
10. **`fees` is JSON** `{ service_fee, delivery_fee, tax }`, because S1 shows each line.
11. **`payments.paid_at`** was added (not in 10.3) to compute "Pick up by" = paid_at + 30 story min.
12. **Fallback keys:** `pickup_self | free | donate`. Default `free`.
13. **Floor range on S3** rounds inward: min = 30% rounded **up** to $0.10, max = 70% rounded **down**.
14. **`/admin` page** lives in `web/src/stage/admin` (track B owns `web/src/stage`).
15. **Stage buyer** in the seed: Sarah, Trottier, 10 min, Burgers, $12 (`b_demo` / token `tok_demo`).
16. **Mock lock** in the replay lasts only ~6 s before "unlocked", so screens can be built fast. The real lock is 60 s.
17. **Stripe return pages:** success_url = `PAGE.paid(id)` = `/join?paid=<listingId>`, cancel_url = `/join`. The buyer page then loads `GET /api/listings/:id/pass`. The stub `POST /buy` returns `checkout_url = PAGE.paid(id)` until Stripe exists.
18. **Agent provider (lead decision, Nov 21):** OpenAI instead of Claude. Model `gpt-5.4-mini` (`AGENT_MODEL`), JSON mode, secret `OPENAI_API_KEY`. Booklet section 8 updated. The hard limits and defaults (8.5, 8.6) are unchanged.

19. **C ↔ D functions** are fixed in `worker/integrations.ts`: D exports `runSellerAgent`, `createCheckout`, `parseStripeWebhook`, `handleTelegramUpdate`, `sendTelegramPing`, `editTelegramPing`; C exports `notifyBuyerChanged`. The routes `/api/stripe/webhook` and `/api/telegram/webhook` live in C's `worker/api` and call D's functions.
20. **`pings.telegram_message_id`** added (migration 0002) so the bot can edit the ping to "Gone — grabbed at $X".
21. **Late payment:** Stripe Checkout cannot expire in 60 s. If a payment arrives after the lock ended and someone else bought it, Market ignores it (demo; refund is out of scope).

## Open questions for the team

- [ ] **Restaurant details:** real address and lat/lng of the Five Guys used on stage. The pizza and bowls restaurants are placeholders: keep, rename or replace?
- [ ] **Walk times:** all 24 minutes in `shared/db/seed.sql` are guesses. Fill them in from a map (booklet 9.3).
- [ ] **Photos and mascot files:** put restaurant photos in `web/public/img/restaurants/` (`five-guys.jpg`, `pizza.jpg`, `bowls.jpg`) and the 4 mascot poses in `web/public/mascot/` (`sitting.png`, `bag.png`, `thinking.png`, `jumping.png`).
- [ ] **Where does AGENT_MODE live at runtime?** It is a Worker setting, which can't change without a redeploy. Suggestion: track C stores the /admin switch in the Market Durable Object, with `AGENT_MODE` as the starting value.
- [ ] **"A buyer picks it up at 14:32" (S5a)** vs **"Pick up by 14:52" (B5)**: is the seller's time the pickup deadline or something else? The contract sends `pickup_by` only.
- [ ] **B-lost example says $8.40, S5a says $9.40.** The mock run sells at $9.40 (40% of $23.46).
- [x] **Telegram bot name:** the bot is `@ZEats_bot` (`TELEGRAM_BOT_URL` in `shared/constants.ts`).
