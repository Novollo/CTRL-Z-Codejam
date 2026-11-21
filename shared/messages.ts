// Live messages, Market → screens, over the /ws connection (booklet 10.5).
// Every message is one JSON object with a `type` field.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { Fallback } from "./catalog";
import type { ListingCard, OrderStatus, PickupPass } from "./types";

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

/** Everyone with the card + seller. `pass` is only filled for the winning buyer and the seller. */
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

export type LiveMessage =
  | OrderStatusMsg
  | ListingTickMsg
  | ListingReachMsg
  | PingMsg
  | ListingLockedMsg
  | ListingUnlockedMsg
  | ListingSoldMsg
  | ListingClosedMsg;

export type LiveMessageType = LiveMessage["type"];

/** Who is on the other end of a /ws connection. */
export type LiveRole = "seller" | "buyer";
