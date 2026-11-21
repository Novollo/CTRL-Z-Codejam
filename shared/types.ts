// One TypeScript type per D1 table (booklet 10.3). Column names match shared/db/migrations exactly.
// These are the APP shapes: JSON columns are parsed, 0/1 columns are booleans.
// In D1 they are stored as TEXT (JSON) and INTEGER (0/1). Convert when you read/write a row.
// Money = dollars (number). Timestamps = epoch milliseconds, real time.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { BuyerDiet, CampusSpot, DropSpeed, Fallback, FoodType, ListingDiet, Tag } from "./catalog";

export interface Restaurant {
  id: string;               // "r_fiveguys"
  name: string;             // "Five Guys"
  address: string;
  lat: number;
  lng: number;
  photo_url: string;
  logo_url: string;                 // round 2: /img/logos/<name>.png (web/public)
  default_category: FoodType;       // used for `active_nearby_liking_category` (8.2)
  default_tags: Tag[];              // JSON. Agent fallback (8.6)
  default_diet: ListingDiet;        // JSON. Agent fallback (8.6)
}

export interface WalkTime {
  spot: CampusSpot;
  restaurant_id: string;
  minutes: number;
}

export interface OrderItem {
  name: string;
  price: number;
  /** What's in it, for the buyer (round 2): "Beef patty, American cheese, pickles…" */
  description: string;
}

export interface OrderFees {
  service_fee: number;
  delivery_fee: number;
  tax: number;
}

export type OrderType = "pickup" | "delivery";
export type OrderStatus = "received" | "preparing" | "ready" | "picked_up";

export interface Order {
  id: string;               // "ord_4821"
  restaurant_id: string;
  items: OrderItem[];       // JSON
  food_price: number;       // sum of items = 17.78 (start price, fees removed, R7)
  fees: OrderFees;          // JSON
  total: number;            // 23.46
  type: OrderType;
  status: OrderStatus;
  ready_at: number | null;  // epoch ms (expected or actual ready time)
  pickup_code: string;      // "ZEE-4821": the ORIGINAL customer's code (seller's own pickup)
  customer_name: string;    // round 4: the original customer (the seller), e.g. "Alex"
}

export type ListingStatus = "draft" | "live" | "locked" | "sold" | "free" | "closed" | "donated" | "stopped";
export type AgentSource = "live" | "default";

export interface Listing {
  id: string;               // "lst_..."
  order_id: string;
  status: ListingStatus;
  start_price: number;
  floor_price: number;
  drop_speed: DropSpeed;
  opens_at: number | null;  // epoch ms, set on publish
  closes_at: number | null; // epoch ms = ready_at + 20 story min
  fallback: Fallback;
  tags: Tag[];              // JSON
  diet: ListingDiet;        // JSON
  may_contain: string[];    // JSON
  title: string;
  selling_line: string;
  reason: string;
  agent_source: AgentSource;
  locked_by: string | null; // buyer id
  lock_until: number | null;// epoch ms, real time
  sold_price: number | null;
  buyer_id: string | null;  // winning buyer
  pickup_code: string | null; // round 4: NEW code generated for the winning buyer at sale (makePickupCode); null before
}

export interface Buyer {
  id: string;               // "b_..."
  token: string;            // secret, saved in the browser; proves who is calling
  name: string;
  notify_on: boolean;       // INTEGER 0/1
  spot: CampusSpot | null;
  lat: number | null;       // from Telegram live location
  lng: number | null;
  max_walk_min: number;
  food_types: FoodType[];   // JSON. Empty = "anything"
  diet: BuyerDiet[];        // JSON
  max_price: number;
  telegram_chat_id: string | null;
}

export type PingChannel = "web" | "telegram";

export interface Ping {
  listing_id: string;
  buyer_id: string;
  channel: PingChannel;
  reason: string;           // "Why you got this: Burgers · 6 min walk · under your $12"
  sent_at: number;          // epoch ms
  dismissed: boolean;       // INTEGER 0/1. "Not now"
  telegram_message_id: number | null; // to edit the message to "Gone — grabbed" (migration 0002)
}

export type PaymentStatus = "pending" | "paid" | "expired";

export interface Payment {
  listing_id: string;
  buyer_id: string;
  amount: number;
  stripe_session_id: string | null; // null when paid by /api/admin/mark-paid
  status: PaymentStatus;
  paid_at: number | null;   // epoch ms. pickup_by = paid_at + 30 story min
}

// ---- Shapes built from several tables (used by the API and live messages) ----

/** What a buyer sees on the offer card (B3). Never contains the pickup code. */
export interface ListingCard {
  listing_id: string;
  restaurant_name: string;
  restaurant_address: string;
  photo_url: string;
  logo_url: string;         // restaurant logo (round 2)
  title: string;
  selling_line: string;
  tags: Tag[];
  may_contain: string[];    // shown as "May contain: …" chip
  food_price: number;       // struck-through original price
  items: OrderItem[];       // what's in the order, with descriptions (round 2)
  price: number;            // live price now (0 during the free window)
  seconds_left: number;     // story seconds, ready to show
  status: "live" | "locked" | "free";
  lock_until: number | null;
  walk_min: number | null;  // from this buyer's spot
}

/** The pickup pass (B5). Only ever sent to the winning buyer: never to the seller or other buyers. */
export interface PickupPass {
  listing_id: string;
  restaurant_name: string;
  restaurant_address: string;
  walk_min: number | null;
  pickup_code: string;      // "ZEE-4821"
  name_on_order: string;    // the buyer's first name
  pickup_by: number;        // epoch ms
}

// ---- Restaurant view (round 4) --------------------------------------------------
// What the restaurant tablet sees for one order. Built by Market from orders + listings + buyers.

export type Fulfilment = "delivery" | "pickup";
/** Which platform the order belongs to now: the original delivery app, or Ctrl+Z Eats after a resale. */
export type OrderChannel = "delivery_app" | "ctrlz";

export interface RestaurantTimelineEntry {
  at: number;   // epoch ms
  text: string; // "Order received", "Customer pressed Ctrl+Z", "Courier released: now pickup", "Resold on Ctrl+Z Eats to Sarah", "New pickup code ZEE-7Q2K"
  kind: "info" | "ctrlz" | "handover" | "done";
}

export interface RestaurantOrderView {
  order_id: string;
  short_code: string;             // "#4821"
  customer_name: string;          // original customer, or the new buyer after the handover
  items: OrderItem[];
  food_price: number;
  status: OrderStatus;            // received / preparing / ready / picked_up
  fulfilment: Fulfilment;         // delivery until the courier is released (listing published), then pickup
  channel: OrderChannel;          // "ctrlz" once sold or given free on Ctrl+Z Eats
  pickup_code: string;            // the code that is valid NOW
  previous_pickup_code: string | null; // shown crossed out after the handover
  ctrlz: null | {                 // set while/after the order is on Ctrl+Z Eats
    listing_id: string;
    status: ListingStatus;
    price: number | null;         // live price while on the market
    sold_price: number | null;
  };
  timeline: RestaurantTimelineEntry[]; // oldest first
  placed_at: number;              // epoch ms
}
