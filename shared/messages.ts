// Live messages, Market → screens, over the /ws connection (booklet 10.5).
// Every message is one JSON object with a `type` field.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { Fallback } from "./catalog";
import type { ListingCard, OrderStatus, PickupPass, RestaurantOrderView } from "./types";

/** Seller. The order moved (e.g. preparing → ready). */
export interface OrderStatusMsg {
  type: "order.status";
  order_id: string;
  status: OrderStatus;
}

/** Seller + buyers with this card open. Sent on every price tick. */
export interface ListingTickMsg {
  type: "listing.tick";
  listing_id: string;
  price: number;
  seconds_left: number; // story seconds
}

/** Seller. "Sent to 14 people nearby". */
export interface ListingReachMsg {
  type: "listing.reach";
  listing_id: string;
  reached: number;
}

/**
 * Seller + buyers with this card open (round 2). Social proof, sent on every tick.
 * - seen: people who got the offer (pinged)            → seller "Seen by 23"
 * - watching: people with the card open right now      → buyer card "8 people watching right now"
 * - interested: people whose filters match this order  → seller "17 people want this"
 * When DEMO_CROWD is "on", Market adds a simulated campus crowd (see DEMO_CROWD in constants.ts).
 * listing.reach.reached uses the same `seen` number.
 */
export interface ListingStatsMsg {
  type: "listing.stats";
  listing_id: string;
  seen: number;
  watching: number;
  interested: number;
}

/** One buyer. Opens the offer card (B3). */
export interface PingMsg {
  type: "ping";
  listing: ListingCard;
  reason: string; // "Why you got this: Burgers · 6 min walk · under your $12"
}

/** Everyone with the card. Someone tapped Buy (B-hold for the others). */
export interface ListingLockedMsg {
  type: "listing.locked";
  listing_id: string;
  lock_until: number; // epoch ms, real time
}

/** Everyone with the card. The lock ran out; back on the market at `price`. */
export interface ListingUnlockedMsg {
  type: "listing.unlocked";
  listing_id: string;
  lock_until: null;
  price: number;
}

/** Everyone with the card + seller. `pass` (with the pickup code) is ONLY filled in the copy sent to the winning buyer.
 *  The seller never gets the buyer's pickup code; S5a uses `sold_price` and `pickup_by`. */
export interface ListingSoldMsg {
  type: "listing.sold";
  listing_id: string;
  sold_price: number; // 0 when taken for free
  pickup_by: number;  // epoch ms
  pass?: PickupPass;
}

/**
 * Seller (+ pinged buyers when the free window opens).
 * outcome:
 *  - "pickup_self": seller picks it up (pickup_code filled for the seller)
 *  - "free_window": a 10-min window at $0 has opened (free_until filled)
 *  - "free_expired": nobody took it free → seller gets the pickup message
 *  - "donated": set aside for donation
 *  - "stopped": seller tapped "Stop listing"
 */
export interface ListingClosedMsg {
  type: "listing.closed";
  listing_id: string;
  fallback: Fallback;
  outcome: "pickup_self" | "free_window" | "free_expired" | "donated" | "stopped";
  pickup_code?: string;
  free_until?: number; // epoch ms
}

/**
 * Restaurant tablet (round 4). The FULL current view of one order, sent whenever anything about it changes
 * (status, Ctrl+Z pressed, listed, courier released, locked, sold → new name + new code, closed, stopped).
 * The restaurant screen just replaces its copy of that order.
 */
export interface RestaurantOrderMsg {
  type: "restaurant.order";
  order: RestaurantOrderView;
}

export type LiveMessage =
  | OrderStatusMsg
  | ListingTickMsg
  | ListingReachMsg
  | ListingStatsMsg
  | PingMsg
  | ListingLockedMsg
  | ListingUnlockedMsg
  | ListingSoldMsg
  | ListingClosedMsg
  | RestaurantOrderMsg;

export type LiveMessageType = LiveMessage["type"];

/** Who is on the other end of a /ws connection. */
export type LiveRole = "seller" | "buyer" | "restaurant";
