# Ctrl+Z Eats: rules for every agent

Read these rules before you change anything. They apply to every track.

## 1. Read the booklet first
- Read `docs/booklet.md` fully before you write code. It is the spec.
- Your track, sections and folders are in booklet section 13.2.
- Exact on-screen text in the booklet (words in quotes) must be used word for word.
- Then read `docs/design-round-2.md`: the team's design feedback. **Where it disagrees with the booklet, it wins.**

## 2. The contract in /shared is frozen
- `/shared` holds the contract: types, API paths, live messages, constants, design tokens, D1 schema, seed data and mocks.
- **Never change anything in `/shared` unless you are the lead (track 0).**
- Need a change? Write it in `docs/contract-requests.md` (what, why, which track) and **stop**. The lead decides.
- Import from `@shared/...`. Do not copy contract types into your own folder or rename fields.
- Tracks C and D call each other only through the functions in `worker/integrations.ts`. Export them with exactly those names and types.

## 3. Only touch your own folders
| Track | You may change |
| --- | --- |
| 0. Contract (lead) | everything at first, then `/shared` and root config only |
| A. Seller app | `web/src/seller` |
| B. Buyer web + stage | `web/src/buyer`, `web/src/stage` (the `/admin` page lives in `web/src/stage/admin`), `web/src/landing` (round 6) |
| C. Market engine | `worker/market`, `worker/api` |
| D. Integrations | `worker/agent`, `worker/stripe`, `worker/telegram` |
| E. Restaurant tablet (round 4) | `web/src/restaurant` |

Root files (`package.json`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig*.json`, `web/tsconfig.json`, `worker/index.ts`, `worker/env.ts`, `worker/integrations.ts`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/lib/*`, `web/src/ui/*` (shared mascot, sounds, confetti, motion classes), `web/src/index.css`) belong to the lead. Need a new npm package or a route? Ask in `docs/contract-requests.md`.

## 4. Keep it simple
- Build **only** what the booklet describes. No extra features, screens, settings or abstractions.
- Plain code beats clever code. Short files, clear names, no frameworks beyond the stack in booklet 10.1 (React + Vite + Tailwind, Hono, Cloudflare Worker, D1, one Durable Object `Market`).
- AI is used in exactly one place: the seller agent (booklet section 8). Everything else is plain code.
- Use the mocks in `shared/mocks` until the real API exists. The live connection `/ws` replays a mock run today.

## 5. Secrets
- Never put a key in a file that goes to GitHub. Keys live in `.dev.vars` (local, git-ignored) and in Cloudflare secrets.
- Secret names: `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`.

## 6. Units (do not mix them up)
- Money: dollars as a number, e.g. `17.78`. Round with the helpers in `shared/constants.ts`.
- Timestamps: epoch milliseconds (`Date.now()`), real wall-clock time.
- `seconds_left` in live messages: story seconds (already scaled by `DEMO_SPEED`), ready to show on screen.

## 7. Working in git
- Each track works on its own branch: `track-a-seller`, `track-b-buyer`, `track-c-market`, `track-d-integrations`.
- Commit often with clear messages. Never push to `main`; the lead merges (order: C, D, A, B).
- An agent never says its own work is "done". The track owner checks it.

## 8. Commands
- `npm install`, then `npm run db:local` once (local database + seed data)
- `npm run dev`: web on http://localhost:5173, worker on http://localhost:8787
- `npm run typecheck`: must pass before you hand over
- `npm run deploy`: lead only
