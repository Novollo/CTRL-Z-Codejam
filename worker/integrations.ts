// The functions tracks C and D call across folders. Owned by the lead.
// Each track EXPORTS the functions listed for it, with EXACTLY these names and types,
// from the index.ts of its folder. Until then, callers use the defaults noted.

import type { AgentInput, AgentResult } from "@shared/agent";
import type { ListingCard, Restaurant } from "@shared/types";
import type { Env } from "./env";

// ---- Track D exports from worker/agent/index.ts --------------------------------
/** One call per listing. NEVER throws: applies the checks in booklet 8.5 and the defaults in 8.6.
 *  Respects the 5 s timeout and AGENT_MODE ("default" = skip the model). */
export type RunSellerAgent = (env: Env, input: AgentInput, restaurant: Restaurant, agentMode: "live" | "default") => Promise<AgentResult>;

// ---- Track D exports from worker/stripe/index.ts -------------------------------
/** Creates a Stripe Checkout session (test mode) for a locked listing. */
export type CreateCheckout = (
  env: Env,
  args: { listing_id: string; buyer_id: string; amount: number; title: string; origin: string },
) => Promise<{ url: string; session_id: string }>;
/** Verifies the Stripe signature. Returns the paid listing, or null for events to ignore. Throws on a bad signature. */
export type ParseStripeWebhook = (
  env: Env,
  request: Request,
) => Promise<{ listing_id: string; buyer_id: string; session_id: string; amount: number } | null>;

// ---- Track D exports from worker/telegram/index.ts -----------------------------
/** Handles one Telegram update (commands, buttons, location). Writes the `buyers` table, then calls notifyBuyerChanged. */
export type HandleTelegramUpdate = (env: Env, update: unknown) => Promise<void>;
/** Sends the ping message (booklet 7). Returns the Telegram message id (store it in pings.telegram_message_id). */
export type SendTelegramPing = (env: Env, chat_id: string, card: ListingCard, reason: string, buy_url: string) => Promise<number | null>;
/** Edits a sent ping, e.g. "Gone — grabbed at $8.40". */
export type EditTelegramPing = (env: Env, chat_id: string, message_id: number, text: string) => Promise<void>;

// ---- Track C exports from worker/market/index.ts -------------------------------
/** Tell Market a buyer profile changed (re-run matching, booklet 9.3). Used by the API and by the Telegram bot. */
export type NotifyBuyerChanged = (env: Env, buyer_id: string) => Promise<void>;
