# Ctrl+Z Eats

An undo button for a food order you can no longer cancel.

**Live:** https://ctrlz-eats.stalerole.workers.dev (try `/stage`)
Spec: [`docs/booklet.md`](docs/booklet.md). Agent rules: [`CLAUDE.md`](CLAUDE.md).

## Folders
| Folder | What | Owner |
| --- | --- | --- |
| `shared/` | The contract: types, API paths, live messages, constants, design tokens, D1 schema + seed, mocks | Lead (track 0) |
| `worker/` | Cloudflare Worker: `api/` (C), `market/` (C), `agent/` `stripe/` `telegram/` (D) | C, D |
| `web/` | React app: `src/seller` (A), `src/buyer` + `src/stage` (B) | A, B |
| `docs/` | Booklet, contract requests | Everyone reads |

## Run it on your laptop
Needs Node.js 22.12 or newer.

```bash
npm install
npm run db:local
npm run dev
```

Then open http://localhost:5173/stage. You should see the mock run play: prices ticking down, a ping, a lock, sold.

Other pages: `/seller`, `/join`, `/buy/lst_demo`, `/admin`. Worker alone: http://localhost:8787/api/health.

## Useful
- `npm run typecheck`: check types in worker + web + shared
- `npm run deploy`: build and deploy to Cloudflare (lead only)
- `npm run db:remote`: load schema + seed into the Cloudflare D1 database (wipes demo data)
- Secrets for local runs go in `.dev.vars` (git-ignored). See `.dev.vars.example` for the names.

## Mock mode
Today every `/api/*` path returns mock data (`worker/api/stubs.ts`) and `/ws` replays a scripted run (`shared/mocks/player.ts`).
Use `connectLive()` from `web/src/lib/live.ts` in screens. Add `?speed=30` to a page URL to replay faster, or `?mock=local` to play with no server.
