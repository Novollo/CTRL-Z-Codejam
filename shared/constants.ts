// Numbers and fixed values from booklet sections 3, 8 and 9.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { DropSpeed } from "./catalog";

// ---- Times (booklet 9.1) ---------------------------------------------------
/** Listing closes this many minutes after the food is ready (R5). Story minutes. */
export const LISTING_AFTER_READY_MIN = 20;
/** Price tick interval, in story seconds (scaled by DEMO_SPEED like other timers). */
export const PRICE_TICK_SEC = 10;
/** Buy lock length. REAL seconds: the lock is never sped up (R8). */
export const LOCK_SEC = 60;
/** Pickup deadline after payment (R6). Story minutes. */
export const PICKUP_DEADLINE_MIN = 30;
/** Free-food window after close, only for the "free" fallback. Story minutes. */
export const FREE_WINDOW_MIN = 10;
/** Hard safety ceiling: food eaten within 2 hours of ready (R6). */
export const SAFETY_CEILING_MIN = 120;
/** Default demo speed. All timers except the lock run this many times faster. */
export const DEFAULT_DEMO_SPEED = 7;

// ---- Price plan (booklet 8.5, 9.2) -----------------------------------------
/** Minutes until the floor price is reached, per drop speed. */
export const T_FLOOR_MIN: Record<DropSpeed, number> = { fast: 8, normal: 12, slow: 15 };
/** If the listing is shorter than T_floor, the floor is reached at this share of its length. */
export const T_FLOOR_SHORT_LISTING_SHARE = 0.75;
/** Floor must stay between 30% and 70% of the food price. */
export const FLOOR_MIN_SHARE = 0.3;
export const FLOOR_MAX_SHARE = 0.7;
/** Default floor when the agent fails: 50% of food price. */
export const DEFAULT_FLOOR_SHARE = 0.5;
/** − / + step for the floor on S3 and S4. */
export const FLOOR_STEP = 0.5;
/** Every price is rounded to $0.10. */
export const PRICE_STEP = 0.1;

// ---- Buyer profile (booklet B1) -------------------------------------------
export const BUYER_MAX_PRICE = { min: 3, max: 25, default: 12 } as const;
/** Walk time from a live location: straight-line metres × 1.3 ÷ 80 m per minute (9.3). */
export const WALK_DETOUR_FACTOR = 1.3;
export const WALK_METRES_PER_MIN = 80;

// ---- Agent (booklet 8) ----------------------------------------------------
/** OpenAI model for the seller agent (lead decision 2026-11-21; tested: ~2 s for a small JSON answer).
 *  Faster fallback if needed: "gpt-5.4-nano" (~1 s). Key: OPENAI_API_KEY. */
export const AGENT_MODEL = "gpt-5.4-mini";
export const AGENT_TIMEOUT_MS = 5000;
export const AGENT_TEXT_MAX = { title: 40, selling_line: 100, reason: 90 } as const;
export const AGENT_BANNED_WORDS = ["safe", "allergen-free", "healthy"] as const;
export const AGENT_DEFAULT_TEXT = {
  title: (restaurant: string) => `${restaurant} order, untouched`,
  selling_line: "Ready at the counter. No fees.",
  reason: "Standard price plan.",
} as const;
export type AgentMode = "live" | "default";

// ---- Screens --------------------------------------------------------------
/** B-lost card closes by itself after this many seconds. */
export const LOST_CARD_CLOSE_SEC = 3;
/** Pickup code prefix: "ZEE-4821". */
export const PICKUP_CODE_PREFIX = "ZEE-";
/** Stripe test card for the stage (B4). */
export const STRIPE_TEST_CARD = "4242 4242 4242 4242";

// ---- Fixed demo ids (seed data uses these) --------------------------------
export const DEMO_ORDER_ID = "ord_4821";
export const DEMO_RESTAURANT_ID = "r_fiveguys";

// ---- Money helpers (pure, safe to use anywhere) ---------------------------
/** Round to the nearest $0.10. */
export const roundPrice = (dollars: number): number => Math.round(dollars * 10) / 10;
/** Round DOWN to $0.10 (used on every price tick, booklet 9.2). */
export const roundPriceDown = (dollars: number): number => Math.floor(dollars * 10 + 1e-9) / 10;
/** "$11.60" */
export const formatPrice = (dollars: number): string => `$${dollars.toFixed(2)}`;
/** "18:42" from story seconds. */
export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
