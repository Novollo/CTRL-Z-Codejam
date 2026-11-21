# Ctrl+Z Eats — Master Build Booklet

Nov 21, 2026 · @Anton Weitz

## 1. Overview

Ctrl+Z Eats adds an undo button to a food order that you can no longer cancel. When the restaurant is already preparing your order, the normal Cancel button is dead. Our **Ctrl+Z this order** button appears under it. One AI agent reads the order, sets a price plan and writes a listing. Plain code then pings people near McGill campus whose filters match. The price falls live on their screens. The first person to tap Buy wins, pays within 1 minute and picks the food up at the counter. If nobody buys it, the fallback that the seller chose runs.

**Pitch line:** you get back part of a mistake you could not cancel.

**Hackathon category:** "Undo button": an app that lets the user fix a mistake online. Our mistake is a regretted food order.

**Closest existing product:** [Too Good To Go](https://www.toogoodtogo.com) sells leftover restaurant food at a discount. The difference: in Ctrl+Z Eats the seller is the customer, not the restaurant, and the trigger is regret, not surplus. Judges may ask about this, so every team member must know the difference.

**What this booklet is:** the master plan for the team. A coder or a coding agent who reads only this booklet must know exactly what to build.

## 2. Story and pitch

The lead story is **undo a mistake**. The resale angle and the zero-waste angle support it.

**The regret moment (open the pitch with this).** It is 12:40 between two classes. You order a $24 Five Guys pickup. Two minutes later, a friend invites you to lunch. The app says "Preparing" and the Cancel button is grey. Your only choices today: waste the money, or eat a second lunch. Ctrl+Z Eats gives you a third choice.

**Supporting angle 1, resale (e-commerce).** eBay and Vinted give you an audience to resell things you regret buying. Ctrl+Z Eats does the same for a food order. The difference: the product goes cold in 20 minutes, so the market must be fast, local and automatic. That is why the price falls instead of rising, and why an agent sets the price.

**Supporting angle 2, zero waste.** No regretted meal goes in the trash. It is resold, given free to people nearby, or donated. Our brand colour is green for this reason.

**Who wins:**

| Person | What they get |
| --- | --- |
| Seller (regretted the order) | Part of their money back, typically 30% to 70% of the food price |
| Buyer (anyone near campus) | A fresh meal, ready now, with no delivery or service fees, below the menu price |
| Delivery app (Uber Eats) | Fewer refund complaints, less waste, and it keeps the delivery fee |
| Community | Less food waste; free meals when nobody pays |

**Three lines every team member must be able to say:**

1. "You can't cancel once it's cooking. With us, you can Ctrl+Z it."
2. "The buyer collects at the counter, so the food never passes between strangers."
3. "The listing timer follows Health Canada's food safety guidance."

## 3. Fixed product rules

These rules are decided. Do not change them while you build. Each rule has its reason, so you can apply it to new cases.

| # | Rule | Reason |
| --- | --- | --- |
| R1 | The Undo button exists **only while the order is "Preparing"**. When the food is ready or picked up, the button is gone. | Food that left the kitchen can be tampered with. Trust breaks. |
| R2 | The buyer **always collects at the restaurant counter**, with a pickup code. | Food never passes between two strangers. |
| R3 | **Pickup orders first.** On campus, almost all orders are pickup. Delivery orders can be undone too, but the courier is released (still paid) and the app keeps the delivery fee. | Keep it simple. Do not disrupt the courier's flow. |
| R4 | Before a delivery order is listed, a warning says: "If nobody buys it, you must pick it up yourself." | The courier is gone after Undo. |
| R5 | The listing stays open for **at most 20 minutes after the food is ready**. Pickup time is not part of the 20 minutes. | Freshness. Well inside the safety limit (R6). |
| R6 | Hard safety ceiling: food must be eaten within 2 hours of being ready. The pickup deadline is 30 minutes after payment. | Health Canada: throw away cooked food left at room temperature for more than two hours ([source](https://www.canada.ca/content/canadasite/en/health-canada/services/general-food-safety-tips/food-safety-tips-leftovers.html)). |
| R7 | The price **falls**, it never rises. The start price is the **food price only**: delivery fee and service fee are removed. | The buyer never used those services. Food gets cold. Buyers are often broke. |
| R8 | The **first person to tap Buy** gets a 1-minute lock. If they do not pay in 1 minute, the order goes back on the market. | Fast and fair. Easy to show on stage. |
| R9 | The seller picks the **fallback when listing**: pick it up myself, free to people nearby, or donate. They can change it until the listing ends. | No decision under time pressure at the end. |
| R10 | **Anyone near McGill campus** can buy. No account. Name and a short profile only. | Campus niche, but not a closed group. |
| R11 | **One AI agent, on the seller side only.** Matching, pings, price ticks, locks and payments are plain code. | AI only where a rule cannot do the job. Plain code does not fail on stage. |
| R12 | No business model. Ctrl+Z Eats takes no cut. | Hackathon project. |

## 4. End-to-end flow

A listing goes down one path: the seller taps Ctrl+Z, the agent drafts a plan, the seller confirms, and the price falls live. It ends in one of four ways.

&#91;embedded content: listing flow · from Ctrl+Z to the 4 endings\]

The seller can also tap "Stop listing" at any time while it is live. The order then goes back to normal. The listing states in the database are: draft → live → locked → sold, or live → closed / free / donated / stopped (section 10.3).

## 5. Seller interface

The seller app is a mobile screen (390 × 844 px). On stage it runs inside a phone frame on the left of the laptop screen. It has 6 screens. Every word in quotes below is the exact text to show.

### S1. Order tracker (the fake delivery app)

This is a **generic food delivery app**, styled like Uber Eats, with a small "Demo app" tag in the top corner. No Uber logo, no Uber name.

- Header: restaurant photo, "Five Guys · Pickup", order number "#4821".
- Progress bar with 3 steps: "Order received" → "Preparing" (active) → "Ready for pickup".
- Order lines: "Little Cheeseburger — $11.49", "Cajun Fries (regular) — $6.29". Under them: "Service fee $2.99", "Tax $2.69", "Total $23.46". These are demo numbers.
- Greyed-out button: "Cancel order". Small grey text under it: "Orders can't be cancelled once the restaurant starts preparing."
- Under it, the bright green full-width button: **"Ctrl+Z this order"**, with the undo arrow icon and the small mascot.
- The button is shown only in the "Preparing" state (R1).

### S2. Agent at work (chef animation)

The screen goes green. The mascot (the "thinking" pose) stirs a pot. Three lines appear one by one while the agent works:

1. "Reading your order…"
2. "Checking who's hungry nearby…"
3. "Cooking up your listing…"

This screen lasts until the agent answers, at most 5 seconds. On timeout, the default plan is used (section 8). The seller never sees an error.

### S3. Confirm sheet

A bottom sheet with 4 parts and 1 button:

1. **Listing preview card:** the agent's title ("Fresh Five Guys combo, untouched") and selling line, food tags as small chips ("Burgers", "Fries", "May contain: peanuts").
2. **Price plan:** "Starts at $17.78" (food price only, fees removed). "Lowest price: $8.90" with − / + buttons in $0.50 steps. The floor can only stay between 30% and 70% of the food price. One grey line from the agent: "Drops fast: only 4 people nearby want burgers right now."
3. **If nobody buys it:** three choices, one selected: "I'll pick it up" · "Give it free to someone nearby" · "Donate it". Default: "Give it free to someone nearby".
4. **Delivery orders only:** a yellow warning: "Your courier is released. If nobody buys it, you pick it up at the restaurant."
5. Button: **"List it"**. A small link under it: "Never mind, keep my order".

### S4. Listed (live)

- Large current price in a mono font, ticking down: "$14.20".
- Countdown: "18:42 left" with a thin green progress ring.
- Line: "Sent to 14 people nearby". This number goes up as more people match.
- Mascot in the "waiting" (sitting) pose.
- Controls: "Lowest price $8.90  Edit" · "If nobody buys: Give it free  Change" · a text button "Stop listing".
- "Stop listing" asks once: "Stop and keep your order?" → Yes returns to S1 with the order as normal.

### S5a. Sold

- Mascot in the "jumping" pose with sparkles.
- "Sold!" and below it "You got $9.40 back."
- Green line: "You undid 40% of your mistake." (money back ÷ order total, rounded.)
- Grey line: "A buyer picks it up at 14:32. Nothing else to do." (The seller never sees the buyer's pickup code. Only the winning buyer gets it.)
- Demo note: the money back is simulated. Only the buyer's payment runs through Stripe test mode.

### S5b. Not sold (time is up)

The screen depends on the fallback the seller chose:

| Fallback | Screen text |
| --- | --- |
| I'll pick it up | "Nobody grabbed it. Your order is waiting at Five Guys." + pickup code |
| Give it free | "Nobody bought it, so it's now free for someone nearby. You'll get a thank-you when it's taken." |
| Donate it | "Thanks! Your meal is set aside for donation." (simulated, see open points) |

## 6. Buyer website

The buyer website is a mobile web page. The QR code on stage opens it at `/join`. There is no account and no buyer agent. The buyer gives a short profile, and the page must stay open to get pings. The page saves the buyer's id in the browser, so a reload keeps the profile.

### B1. Profile

- Title: "Get fresh food for less, near campus." Mascot in the "waving" style (the waiting pose is fine).
- Field: "Your first name".
- Big toggle: **"Notify me about food nearby"**. It is off at first.
- When the toggle is turned on, the criteria open below it (one screen, no steps):
  1. "Where are you?" — one choice from a list of campus spots: Trottier, McLennan Library, Leacock, Bronfman, Burnside, SSMU / University Centre, Redpath Hall, McConnell Engineering.
  2. "How far will you walk?" — chips: 5 min · 10 min · 15 min · 20 min.
  3. "What do you like?" — multi-select chips: Burgers · Pizza · Sushi · Asian · Healthy / bowls · Sandwiches · Coffee & bakery · Dessert. None selected means "anything".
  4. "Diet" — multi-select chips: Vegetarian · Vegan · Halal · No nuts · No gluten.
  5. "Max price" — slider from $3 to $25, default $12.
- Button: **"I'm in"**.

### B2. Waiting

- "You're on, Sarah. We'll ping you when food near you drops in price."
- A small summary line: "Trottier · 10 min walk · Burgers, Pizza · up to $12" + "Edit".
- Toggle stays visible at the top. Turning it off shows "Paused. No pings."
- Small text: "Keep this page open to get pings. Or get them on Telegram →" (link to the bot).

### B3. Offer pop-up (the ping)

The card slides up full-screen with a short vibration where the phone allows it. Content, top to bottom:

- Food photo, restaurant name, the agent's title and selling line.
- Tag chips, including any "May contain: …" chip.
- **Live price** in a big mono font, falling: "$11.60". The original food price is struck through next to it: "$17.78".
- Countdown: "14:05 left".
- The reason line in green: **"Why you got this: Burgers · 6 min walk · under your $12"**.
- Big button: **"Buy for $11.60"**. The amount in the button follows the live price.
- Small text button: "Not now". This closes the card. The same offer will not ping this buyer again.

### B4. Locked

- "It's yours for 1 minute." Big countdown "0:59".
- Price locked at the tap price: "$11.60".
- Button: **"Pay $11.60"** → Stripe Checkout in test mode. On stage, use test card 4242 4242 4242 4242.
- If the timer reaches 0: "Time ran out. It's back on the market." and the card closes.

### B5. Pickup pass

- Mascot in the "holding the bag" pose.
- "Paid. Go get it!"
- Restaurant, address, and walking time from the buyer's spot.
- Large pickup code: **"ZEE-4821"**, plus the name on the order.
- "Pick up by 14:52" (30 minutes after payment, R6).
- "Show this code at the counter."

### B-lost. Someone else got it

- The card turns grey: "Grabbed by someone at $8.40."
- It closes by itself after 3 seconds. The buyer returns to B2.

### B-hold. Someone is paying

While another buyer is in B4, the open card shows "Someone is paying… back in 0:45 if they don't", and the Buy button is disabled. If that buyer times out, the card comes back to life at the current price.

## 7. Telegram bot

The bot brings pings to a phone when the website is closed. On stage it is shown once, for about 10 seconds, on a teammate's phone. Judges do not use it. Bot name suggestion: `@CtrlZEatsBot`.

**Commands and buttons**

| Input | What the bot does |
| --- | --- |
| `/start` | "Hi! I'm Zee from Ctrl+Z Eats. I'll ping you when regretted food near campus drops in price." Then asks for first name, then shows the settings menu. |
| `/on` and `/off` | Turns pings on or off. Replies "Pings on 🟢" or "Paused". |
| `/settings` | Inline buttons for the same criteria as B1: campus spot, walk time, food types, diet, max price. |
| Location (Telegram's "share live location") | The bot saves the latest position. Walk time is then computed from the position, not from the campus spot. Live location updates the position while the person moves. |
| `/stop` | Deletes the profile. |

**The ping message**

> Five Guys · Fresh Five Guys combo, untouched Now $11.60 (was $17.78), dropping · 14 min left Why you got this: Burgers · 6 min walk · under your $12 \[ Buy now \]

The "Buy now" button is a link to the website: `/buy/<listingId>?t=<buyerToken>`. It opens B3 for that buyer at the live price. Lock and payment then happen on the website (B4, B5). The bot does not take payments.

**Rules:** one ping per offer per person. When the offer is sold, the bot edits the message to "Gone — grabbed at $8.40". The bot runs through a Telegram webhook on a Cloudflare Worker (section 10).

## 8. The seller agent

There is one AI call per listing, made when the seller taps Ctrl+Z. The agent **only suggests**. Plain code checks every suggestion against hard limits before anybody sees it. If the call is slow or broken, defaults are used, and nobody on stage sees a failure.

**Model:** OpenAI `gpt-5.4-mini` through the OpenAI API (JSON mode), because it answers fast (about 2 s in testing). The answer must be JSON only. *(Lead decision, Nov 21: changed from Claude Haiku to OpenAI.)*

### 8.1 The three jobs

1. **Read the order.** It turns menu lines into tags from the fixed tag list, diet flags and "may contain" allergens.
2. **Make the price plan.** It sets the start price, the floor and the drop speed. The inputs are demand (how many active people nearby like this food type) and how fast the food goes cold. Many matches → higher floor, slow drop, so the seller gets more back. Few matches → lower floor, fast drop, so it still sells. Fries and hot food → faster.
3. **Write the listing.** A title, a selling line and a one-line reason for the seller.

### 8.2 Input (sent by our code)

```json
{
  "restaurant": "Five Guys",
  "items": ["Little Cheeseburger", "Cajun Fries (regular)"],
  "food_price": 17.78,
  "minutes_until_ready": 4,
  "active_nearby": 22,
  "active_nearby_liking_category": 4,
  "allowed_tags": ["burgers", "pizza", "sushi", "asian", "bowls", "sandwiches", "coffee_bakery", "dessert", "fries", "drinks"]
}
```

`active_nearby_liking_category` uses the restaurant's default category from our restaurant table, because the agent's tags do not exist yet.

### 8.3 Output (what the agent must return)

```json
{
  "tags": ["burgers", "fries"],
  "diet": {"vegetarian": "no", "vegan": "no", "halal": "unsure", "gluten_free": "no"},
  "may_contain": ["peanuts"],
  "start_price": 17.78,
  "floor_price": 8.90,
  "drop_speed": "fast",
  "title": "Fresh Five Guys combo, untouched",
  "selling_line": "Cheeseburger and Cajun fries, ready at the counter. No fees.",
  "reason": "Drops fast: only 4 people nearby want burgers right now."
}
```

### 8.4 System prompt (starting draft)

```text
You price and describe a food order that a student regrets and resells near McGill campus.
Return JSON only, matching the schema. No other text.
Tags: use only words from allowed_tags.
Diet: answer "yes", "no" or "unsure". If you are not sure, answer "unsure".
may_contain: list allergens that are possible. If unsure, include it.
Never write the words safe, allergen-free or healthy.
Pricing: start_price <= food_price. floor_price between 30% and 70% of food_price.
Many interested people nearby -> higher floor, drop_speed "slow". Few -> lower floor, "fast".
Food that goes cold or soggy fast (fries, hot food) -> faster.
title: max 40 characters. selling_line: max 100. reason: max 90, plain words, explains the price plan.
```

### 8.5 Hard limits (enforced by code, not by the prompt)

| Check | What the code does |
| --- | --- |
| Timeout | No answer in 5 s → use defaults (8.6). |
| Not valid JSON, or a field is missing | Use the default for that field. |
| `start_price` > food price | Set it to the food price. |
| `floor_price` outside 30%–70% of food price | Clip it to 30% or 70%. |
| `floor_price` > `start_price` | Set the floor to 50% of the start price. |
| `drop_speed` not fast / normal / slow | Use "normal". |
| A tag not in `allowed_tags` | Drop that tag. |
| Diet value "unsure" or missing | Treat it as "no" for matching. People with that diet are not pinged. |
| Banned words: safe, allergen-free, healthy (any case) | Replace the text with the default text. |
| Title > 40, selling line > 100, reason > 90 characters | Cut at the last full word and add "…". |
| All prices | Round to $0.10. |

The seller can then change the floor on S3 and S4, only inside 30%–70%.

### 8.6 Defaults (used when the agent fails)

- Tags and diet: from the restaurant's default menu tags, stored in our restaurant table.
- Start = food price. Floor = 50% of the food price. Drop speed = "normal".
- Title: "\<Restaurant> order, untouched". Selling line: "Ready at the counter. No fees.". Reason: "Standard price plan."

### 8.7 Stage safety

- The stage order is fixed, so the team can test the real agent on it 20 times before the demo and check every answer.
- Keep a switch `AGENT_MODE=live | default` in settings. If the venue Wi-Fi is weak, switch to `default` and the demo still works.

## 9. Pricing, timing and matching rules

All of this is plain code. Nothing here uses AI.

### 9.1 Times

| Name | Value | Note |
| --- | --- | --- |
| Listing opens | When the seller taps "List it" | Always during "Preparing" (R1) |
| Listing closes | `ready_at` + 20 min | Not counting pickup (R5) |
| Price tick | Every 10 s | Pushed live to all open screens |
| Lock | 60 s, real time | R8 |
| Pickup deadline | Payment time + 30 min | R6 |
| Free-food window (fallback) | 10 min after close | Only if the seller chose "Give it free" |
| Demo speed | `DEMO_SPEED = 7` | All timers except the lock run 7× faster: 20 min → about 3 min |

### 9.2 The falling price

The price falls in a straight line from the start price to the floor, then stays at the floor until the listing closes.

```latex
\text{price}(t) = \text{start} - (\text{start} - \text{floor}) \cdot \min\left(1, \frac{t}{T_{floor}}\right)
```

- `t` = minutes since the listing opened.
- `T_floor` = minutes until the floor is reached: fast = 8, normal = 12, slow = 15. If the listing is shorter, use 75% of its length (the floor is always reached by minute 15 of 20).
- Round the price **down** to $0.10 on each tick.
- Example: start $17.78, floor $8.90, fast. After 4 min the price is $13.30. After 8 min and later it is $8.90.

### 9.3 Who gets pinged

A buyer gets a ping for a listing when **all** of these are true. The check runs on every price tick and every time a profile changes.

1. The buyer's toggle is on.
2. The buyer was not pinged for this listing before, and did not tap "Not now".
3. Walk time from the buyer to the restaurant ≤ the buyer's max walk time.
4. The buyer chose no food types, or at least one listing tag matches a chosen type.
5. Diet: for every diet the buyer chose, the listing passes. Vegetarian / Vegan / Halal need the value "yes". No gluten needs `gluten_free` = "yes". No nuts needs no nut in `may_contain`.
6. The current price ≤ the buyer's max price.

The last rule is why pings roll in one by one on stage: a judge with a $12 max gets pinged before a judge with a $9 max.

**Reason line:** built from the rules that matched: "Why you got this: \<first matching type> · \<walk> min walk · under your $\<max>".

**Walk time:** a small table of campus spot × restaurant, in minutes. The team fills it by hand from a map. For Telegram live location: straight-line distance × 1.3, divided by 80 m per minute.

### 9.4 Buy, lock and pay

1. A buyer taps Buy. The listing's referee (a Durable Object, section 10) accepts the **first** tap only, if the listing is live and not locked.
2. The price is locked at the tap price. Everyone else sees B-hold.
3. The buyer pays through Stripe Checkout (test mode) within 60 s.
4. The Stripe webhook confirms payment → listing = sold. Everyone else sees B-lost. The seller sees S5a.
5. No payment in 60 s → the lock ends and the listing is live again at the current price.

### 9.5 End of listing without a sale

| Seller's fallback | What the code does |
| --- | --- |
| I'll pick it up | Listing = closed. The seller gets S5b with the pickup code. |
| Give it free | A new 10-minute window at $0. Rule 6 of 9.3 is skipped. Pings go to all other matches. The first tap goes straight to B5 (no lock, no payment). If nobody taps, the seller gets the pickup message. |
| Donate it | Listing = donated. The seller gets S5b. In the demo the donation is only recorded (see open points). |

## 10. Tech architecture

Everything runs on Cloudflare: one Worker, one D1 database and one Durable Object called **Market**. Market is the referee: one small always-on program that holds every live listing, every open screen connection, the price clock and the Buy lock. With one referee, two people can never both win the same order, and every screen sees the same price at the same moment. One Market is enough for a hackathon (hundreds of users).

&#91;embedded content: system parts · screens, Cloudflare, outside services\]

Screens send actions to the Worker over HTTP. Market pushes every price tick, ping and result back over one live connection. Stripe and Telegram also call the Worker back through webhooks.

### 10.1 Parts

| Part | Tool | Job |
| --- | --- | --- |
| Frontend | React + Vite + Tailwind, served as static assets by the Worker | Seller app, buyer website, stage page, admin page |
| API | Cloudflare Worker (router: Hono) | All HTTP endpoints, Stripe and Telegram webhooks |
| Live state | Durable Object `Market` (WebSockets + alarms) | Price ticks, matching, pings, lock, timers |
| Database | Cloudflare D1 (SQLite) | Orders, listings, buyers, pings, payments, restaurants |
| Agent | OpenAI API, `gpt-5.4-mini` | Section 8 |
| Payment | Stripe Checkout, test mode | Buyer payment (B4) |
| Push | Telegram Bot API (webhook) | Pings when the website is closed |

Secrets (Worker settings, never in code): `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`. Settings: `DEMO_SPEED`, `AGENT_MODE`.

### 10.2 Pages (routes)

| Route | Who | Content |
| --- | --- | --- |
| `/seller` | Seller | S1 → S5 |
| `/join` | Buyer (QR target) | B1, B2, then B3–B5 as pop-ups |
| `/buy/:listingId?t=` | Buyer from Telegram | B3 for that listing, then B4, B5 |
| `/stage` | Laptop on stage | Two phone frames side by side: `/seller` left, `/join` (teammate's profile) right |
| `/admin` | Team | Reset demo, "Mark order ready", switch `AGENT_MODE`, list of joined buyers |

### 10.3 Data (D1 tables)

| Table | Main columns |
| --- | --- |
| `restaurants` | id, name, address, lat, lng, photo\_url, default\_category, default\_tags (JSON), default\_diet (JSON) |
| `walk_times` | spot, restaurant\_id, minutes |
| `orders` | id, restaurant\_id, items (JSON: name, price), food\_price, fees, total, type (pickup / delivery), status (received / preparing / ready / picked\_up), ready\_at, pickup\_code |
| `listings` | id, order\_id, status (draft / live / locked / sold / free / closed / donated / stopped), start\_price, floor\_price, drop\_speed, opens\_at, closes\_at, fallback, tags, diet, may\_contain, title, selling\_line, reason, agent\_source (live / default), locked\_by, lock\_until, sold\_price, buyer\_id |
| `buyers` | id, token, name, notify\_on, spot, lat, lng, max\_walk\_min, food\_types (JSON), diet (JSON), max\_price, telegram\_chat\_id |
| `pings` | listing\_id, buyer\_id, channel (web / telegram), reason, sent\_at, dismissed |
| `payments` | listing\_id, buyer\_id, amount, stripe\_session\_id, status |

### 10.4 API

| Method + path | Does |
| --- | --- |
| `POST /api/orders/:id/undo` | Checks status = preparing. Runs the agent with checks and defaults. Creates a draft listing. Returns the S3 data. |
| `POST /api/listings/:id/publish` | Body: floor, fallback. Status → live. Market starts the clock. |
| `PATCH /api/listings/:id` | Change floor (inside 30–70%) or fallback while live. |
| `POST /api/listings/:id/stop` | Status → stopped. The order goes back to normal. |
| `POST /api/buyers` | Creates the profile. Returns id + token (saved in the browser). |
| `PATCH /api/buyers/:id` | Toggle and criteria. |
| `POST /api/listings/:id/buy` | First tap wins the lock (Market decides). Returns the Stripe Checkout URL and lock\_until, or `409 taken`. |
| `POST /api/listings/:id/dismiss` | "Not now". |
| `POST /api/stripe/webhook` | Payment done → sold. |
| `POST /api/telegram/webhook` | Bot commands and location updates. |
| `POST /api/admin/reset``, /api/admin/order-ready and /api/admin/mark-paid` | Demo control. |
| `GET /ws?role=seller&order=` or `?role=buyer&id=` | Opens the live connection to Market. |

### 10.5 Live messages (Market → screens)

| Message | Sent to | Data |
| --- | --- | --- |
| `order.status` | Seller | status |
| `listing.tick` | Seller + buyers with this card open | price, seconds\_left |
| `listing.reach` | Seller | number of people pinged |
| `ping` | One buyer | listing card + reason |
| `listing.locked` / `listing.unlocked` | Everyone with the card | lock\_until |
| `listing.sold` | Everyone with the card + seller | sold\_price, pickup\_by |
| `listing.closed` | Seller (+ pinged buyers for "free") | fallback result |

## 11. Branding and design system

The look is **clean delivery-app layout + eco green + one friendly bear chef**. The layout follows Uber Eats patterns, because every user already knows them. The colour and mascot are our own, so we look ecological and never like a copy of Uber.

### 11.1 Rules

- Use Uber Eats layout patterns: white screens, big bold black headings, large food photos with rounded corners, pill chips, a progress tracker, bottom sheets, one full-width button stuck to the bottom.
- Do **not** use Uber's logo, name, wordmark or its exact green. The fake app in S1 is a "Demo app".
- Green means "good for you or the planet": the Ctrl+Z button, money back, the reason line, success.
- Only one bright green button per screen.

### 11.2 Colours (taken from the mascot)

| Token | Hex | Use |
| --- | --- | --- |
| `forest` | #1E5631 | Main brand colour. Ctrl+Z button, primary buttons, mascot lines, logo |
| `leaf` | #6CC24A | Accents: sparkles, progress ring, "You undid 40%", reason line icon |
| `mint` | #EEF7EA | Light green backgrounds: S2 screen, chips when selected, pickup pass |
| `ink` | #111111 | Headings and main text |
| `stone` | #6B6B6B | Secondary text |
| `line` | #E8E8E8 | Borders, dividers, greyed Cancel button |
| `white` | #FFFFFF | Screen background |
| `amber` | #F2A900 | Warnings only: delivery warning, last 60 s of a timer, lock countdown |

### 11.3 Type and shapes

- UI font: **Inter** (free). Headings 28/22/18 px bold, body 16 px, small 13 px.
- Prices and timers: **JetBrains Mono** (free), bold. It is a quiet nod to the keyboard: Ctrl+Z.
- Corners: 12 px for cards and buttons, full pill for chips. Bottom button height 56 px.
- Icons: simple line icons (Lucide), 2 px stroke, in `forest` or `ink`.
- Logo: two keyboard keycaps, "Ctrl" and "Z", in `forest` outline, followed by "Eats" in Inter bold.

### 11.4 Mascot: the bear chef *(replaced in round 2: Zee is now the team's red bird, see docs/design-round-2.md)*

A round bear in green outline, with a chef hat and an apron that shows the undo arrow. The name suggestion is **Zee** (from Ctrl+Z). The team has four poses:

| Pose | Where it appears |
| --- | --- |
| Sitting, calm | B2 waiting, S4 listed (waiting for a buyer), empty states |
| Winking, holding a food bag | B5 pickup pass, Telegram welcome |
| Thinking, hand on chin, "?" | S2 agent at work (with a stirring or bobbing animation) |
| Jumping, arms up, sparkles | S5a sold, "You undid 40%" |

Animation: simple CSS only (gentle bounce, a 3-frame swap, sparkles that fade in). No video files.

The mascot sheet from the team:

&#91;image: Zee the bear chef in four poses: sitting, winking with a food bag, thinking, jumping\]

## 12. Stage setup and demo script

The demo takes about 4 minutes. The laptop shows `/stage`: the seller app on the left, a teammate's buyer screen on the right. Judges join on their own phones. Nothing else is on screen.

### 12.1 Before going on stage

- [ ] `/admin` → Reset demo. The stage order is back in "Preparing".
- [ ] `DEMO_SPEED = 7`, `AGENT_MODE = live`. If the Wi-Fi is weak, switch to `default`.
- [ ] A phone hotspot is ready as backup internet.
- [ ] A screen recording of a full good run is ready, in case everything fails.
- [ ] The QR code (to `/join`) is on a printed card and on the first screen.
- [ ] The teammate's buyer profile is set: Trottier, 10 min, Burgers, $12.
- [ ] The Telegram bot is on, on a teammate's phone, with pings on.
- [ ] The real Five Guys meal is in the backpack.

### 12.2 Script

| Time | Who | Says / does | On screen |
| --- | --- | --- | --- |
| 0:00 | Speaker 1 | The regret moment (section 2). "Has anyone tried to cancel a food order that's already cooking? You can't." | S1 with the grey Cancel button |
| 0:30 | Speaker 2 | "Scan this. Pick Burgers, 10 minutes walk, and any max price you like." | QR code |
| 1:15 | Speaker 1 | Taps **Ctrl+Z this order**. "Our agent reads the order, checks who's hungry nearby and prices it." | S2 chef animation → S3 |
| 1:35 | Speaker 1 | Points at the reason line and the fallback choice. Taps **List it**. | S4: price starts falling |
| 1:45 | Speaker 2 | "Watch your phones. You get pinged when the price drops under your max." | Price falls, "Sent to N people" goes up |
| 2:30 | Judges | The first judge taps Buy. Everyone else sees "Grabbed". | B4 on the winner's phone, B-lost on the others |
| 2:45 | Winner | Pays with test card 4242 4242 4242 4242. | S5a "You got $X back. You undid Y%." B5 pickup pass |
| 3:10 | Speaker 2 | Shows the Telegram ping on a phone for 10 s. "When your browser is closed, it comes to Telegram." | Phone held up |
| 3:25 | Speaker 1 | "And the pickup is at the counter, so let's do that." Gives the real meal from the backpack to the winner. | B5 |
| 3:40 | Both | Close: "You can't cancel once it's cooking. With us, you can Ctrl+Z it." | Logo + mascot |

### 12.3 If something breaks

| Problem | Fix |
| --- | --- |
| Agent slow or down | Defaults load after 5 s. Say nothing. |
| Judges' phones do not connect | The teammate's phone on the right side of the stage screen buys instead. |
| Stripe does not open | `/admin` → "Mark paid". The sold screen still shows. |
| Nothing works | Play the recording and talk over it. |

## 13. Build plan and multiple agents

The plan is: **one agent writes the shared contract first, then four agents build in parallel, then the team joins the parts together.** Hours are counted from the start of the build (H0). Shift them to your real clock.

### 13.1 Why the contract comes first

Parallel agents fail when each one invents its own names. Agent A calls it `price`, agent C calls it `currentPrice`, and nothing fits together at hour 8. So one agent first writes the files that every track must use: data types, database tables, API paths and live messages (sections 9 and 10). After that, the contract is **frozen**. Only the lead may change it.

### 13.2 The five agents

| Track | Builds | Booklet sections | Folders it may change | Done when |
| --- | --- | --- | --- | --- |
| 0. Contract (lead) | Repo, shared types, D1 schema + seed data, API stubs that return mock data, a mock event player, design tokens | 9, 10, 11.2, 11.3 | everything at first, then `/shared` only | Every other track can start with mocks |
| A. Seller app | S1–S5b, chef animation | 5, 11 | `/web/src/seller` | The full seller flow runs on mock events |
| B. Buyer web + stage | B1–B5, B-lost, B-hold, `/stage`, `/admin` UI | 6, 11, 12 | `/web/src/buyer`, `/web/src/stage` | The full buyer flow runs on mock events |
| C. Market engine | Durable Object, price clock, matching, lock, timers, fallbacks, real API | 3, 9, 10 | `/worker/market`, `/worker/api` | A test script runs a listing from publish to sold |
| D. Integrations | Agent call + checks + defaults, Stripe Checkout + webhook, Telegram bot | 7, 8, 10 | `/worker/agent`, `/worker/stripe`, `/worker/telegram` | Each works alone against the contract |

### 13.3 How to run them

1. **One repo** with this layout: `/shared` (types, constants), `/worker` (API + Market + integrations), `/web` (React app), `/docs/booklet.md` (this booklet, exported as Markdown).
2. **One teammate owns each track.** That person starts the agent, reads its work, runs it and says "done". An agent never marks its own work done.
3. **Each agent runs in its own git branch** (a separate working folder per agent), so two agents never edit the same file at the same time.
4. **Mocks, not waiting.** Tracks A and B use the mock event player from track 0. It replays a scripted run (tick, ping, locked, sold), so the screens can be built before the engine exists.
5. **Merge order:** C, then D, then A and B. The lead merges and runs the full flow.
6. **Contract changes:** an agent that needs a change writes it in `/docs/contract-requests.md` and stops. The lead decides.

### 13.4 Starting prompt for each agent

Copy this and fill in the brackets:

```text
You are building track [X] of Ctrl+Z Eats, a hackathon app.
Read /docs/booklet.md fully. Your sections are [numbers].
Use the shared contract in /shared exactly. Do not change /shared.
You may only change files in [folders].
Use mock data from /shared/mocks until the real API exists.
Keep it simple: no feature that is not in the booklet.
When done, list what you built, how to run it, and anything you assumed.
Done means: [the "Done when" line from 13.2].
```

### 13.5 Gates

| Hour | Gate | Check |
| --- | --- | --- |
| H1.5 | Contract frozen | Lead reviews `/shared` and the stubs |
| H7 | Tracks done | Each owner signs off their "Done when" |
| H9.5 | First full run | Seller → ping → buy → pay → sold, on real phones |
| H11.5 | Looks final | Branding, mascot, all text from this booklet |
| H14 | Code freeze | 5 clean rehearsals, backup recording made |
| H16 | Pitch | Go on stage |

## 14. Assumptions and open points

### 14.1 Assumptions (the team can overrule any)

| Assumption | Chosen value |
| --- | --- |
| Demo order | Fixed Five Guys pickup: Little Cheeseburger $11.49 + Cajun Fries $6.29, total $23.46 |
| Demo speed | 7×: the 20-minute listing takes about 3 minutes on stage. The 1-minute lock stays real time. |
| Seller's money back | Simulated. Only the buyer pays through Stripe (test mode). |
| Pickup deadline | 30 minutes after payment |
| Free-food window | 10 minutes after the listing closes |
| Default fallback on S3 | "Give it free to someone nearby" |
| Mascot name and pickup code prefix | Zee, "ZEE-" |
| Campus spots and walk times | Team fills the table by hand from a map |
| Floor price steps | $0.50 on S3 and S4 |
| Stack | React + Vite + Tailwind, Hono on a Cloudflare Worker, D1, one Durable Object, OpenAI gpt-5.4-mini |

### 14.2 Open points

- [ ] **Shelter donation:** who carries a donated meal to the shelter? Prepare one sentence for judges. Example: "In a real launch we'd partner with a campus food bank that collects once an evening."
- [ ] **Restaurant handoff:** will a restaurant give an order to a person with a different name? Answer for the pitch: the pickup code is the proof, and the order name changes in the app.
- [ ] **Uber's terms:** reselling an order may break the delivery app's terms. Pitch answer: this is a feature we propose that Uber Eats builds itself.
- [ ] **Real timetables:** McGill has no public timetable connection. Not built. Roadmap only.
- [ ] **Discord ping** to the hackathon server: bonus, only if time is left after H11.5.
- [ ] **Pitch slides:** decide if 2–3 slides are needed around the live demo.
