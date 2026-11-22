# Ctrl+Z Eats

**An undo button for a food order you can no longer cancel.**

You ordered food, then plans changed. Delivery apps won't let you cancel once the restaurant starts cooking. With Ctrl+Z Eats you press **"Ctrl+Z this order"** and:

1. An AI agent prices your order and writes the listing.
2. Students near campus get pinged (web and Telegram).
3. The price drops live until someone buys it.
4. The buyer pays and picks the food up at the counter with a new pickup code. You get money back, the food doesn't go to waste, and the restaurant keeps its full price.

McGill CodeJam 16, Montréal.

## Try it

**Live app:** https://ctrlz-eats.stalerole.workers.dev

| Page | What you see |
| --- | --- |
| [`/`](https://ctrlz-eats.stalerole.workers.dev/) | Landing page |
| [`/demo`](https://ctrlz-eats.stalerole.workers.dev/demo) | **Best place to start:** seller, buyer and restaurant side by side. Resets on every load. |
| [`/join`](https://ctrlz-eats.stalerole.workers.dev/join) | Become a buyer on your phone and get pinged |
| [`/seller`](https://ctrlz-eats.stalerole.workers.dev/seller) | The customer who regrets the order, inside a delivery-app style screen |
| [`/restaurant`](https://ctrlz-eats.stalerole.workers.dev/restaurant) | The restaurant tablet: the order changes hands, gets a new pickup code, the price stays the original |

Payments use **Stripe test mode**: pay with card `4242 4242 4242 4242`, any future date and any CVC. No real money moves.

**Telegram bot:** [@ZEats_bot](https://t.me/ZEats_bot). Send `/start`, then use `/settings` to change what you get pinged for.

**Chrome extension:** puts the same "Ctrl+Z this order" button on a real DoorDash order page and sends that order into our market. It is a hackathon demo: DoorDash is not involved and the real order is not cancelled. To install it, see [`extension/README.md`](extension/README.md).

## How it works

- **Web app:** React 19, Vite, Tailwind v4 (`web/`)
- **Server:** one Cloudflare Worker with Hono (`worker/`)
  - D1 (SQLite) for data
  - one Durable Object `Market` that runs every listing: falling price, pings, the 60 s payment lock and the handover, all live over WebSockets
- **AI:** exactly one place, the seller agent (`worker/agent/`). An OpenAI model with JSON output and safe fallbacks if it is slow or down. It writes the title, the selling line, tags and allergens, and suggests a price plan.
- **Payments:** Stripe Checkout in test mode with a signed webhook (`worker/stripe/`)
- **Pings:** web live updates plus a Telegram bot via webhook (`worker/telegram/`)
- **Extension:** Manifest V3, plain TypeScript, Shadow DOM UI (`extension/`)
- **The contract:** shared types, API paths, constants, design tokens, D1 schema and seed (`shared/`)

The full product spec is in [`docs/booklet.md`](docs/booklet.md), and the design feedback rounds are in [`docs/design-round-2.md`](docs/design-round-2.md).

## Run it on your laptop

You need Node.js 22.12 or newer.

```bash
npm install
npm run db:local
npm run dev
```

Then open http://localhost:5173/demo.

API keys are optional for a local run, since the agent falls back to safe defaults. To use your own keys, copy `.dev.vars.example` to `.dev.vars` and fill in the keys you have. That file is git-ignored.

Other commands:
- `npm run typecheck`: checks types across the worker, the web app and the extension
- `npm run extension:build`: rebuilds the Chrome extension
