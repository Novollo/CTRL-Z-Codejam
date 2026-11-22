// HTTP API: paths, request bodies and responses (booklet 10.4).
// Every response is JSON. Errors are { error: string } with a 4xx/5xx status.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { BuyerDiet, CampusSpot, DropSpeed, Fallback, FoodType, ListingDiet, Tag } from "./catalog";
import type { AgentMode } from "./constants";
import type { AgentSource, Buyer, ListingCard, Order, OrderType, PickupPass, Restaurant, RestaurantOrderView } from "./types";

/** Buyer calls send their token in this header (saved in the browser by POST /api/buyers). */
export const BUYER_TOKEN_HEADER = "x-buyer-token";

/** Web pages the server sends people to. Stripe success_url = PAGE.paid(id), cancel_url = PAGE.join. */
export const PAGE = {
  join: "/join",
  paid: (listingId: string) => `/join?paid=${encodeURIComponent(listingId)}`,
  buy: (listingId: string, buyerToken: string) => `/buy/${encodeURIComponent(listingId)}?t=${encodeURIComponent(buyerToken)}`,
  demo: "/demo",             // round 4: three phones: seller · buyer · restaurant
  restaurant: "/restaurant", // round 4: the restaurant tablet (?r=r_fiveguys)
} as const;

/** Paths. Use these builders, never hand-written strings. */
export const API = {
  // From booklet 10.4
  undo: (orderId: string) => `/api/orders/${orderId}/undo`,           // POST
  publish: (listingId: string) => `/api/listings/${listingId}/publish`, // POST
  listing: (listingId: string) => `/api/listings/${listingId}`,       // PATCH (seller) | GET (buyer, lead addition)
  stop: (listingId: string) => `/api/listings/${listingId}/stop`,     // POST
  buyers: () => `/api/buyers`,                                        // POST
  buyer: (buyerId: string) => `/api/buyers/${buyerId}`,               // PATCH | GET (lead addition)
  buy: (listingId: string) => `/api/listings/${listingId}/buy`,       // POST
  dismiss: (listingId: string) => `/api/listings/${listingId}/dismiss`, // POST
  pass: (listingId: string) => `/api/listings/${listingId}/pass`,      // GET (lead addition: B5 after the Stripe redirect)
  stripeWebhook: () => `/api/stripe/webhook`,                         // POST (Stripe calls it)
  telegramWebhook: () => `/api/telegram/webhook`,                     // POST (Telegram calls it)
  adminReset: () => `/api/admin/reset`,                               // POST
  adminOrderReady: () => `/api/admin/order-ready`,                    // POST
  adminMarkPaid: () => `/api/admin/mark-paid`,                        // POST
  // Lead additions (needed by screens, see docs/contract-requests.md)
  order: (orderId: string) => `/api/orders/${orderId}`,               // GET  (S1 order tracker)
  adminState: () => `/api/admin/state`,                               // GET  (/admin: agent mode + buyers)
  adminAgentMode: () => `/api/admin/agent-mode`,                      // POST (/admin: switch AGENT_MODE)
  health: () => `/api/health`,
  restaurants: () => `/api/restaurants`,
  restaurantOrders: (restaurantId: string) => `/api/restaurant/${restaurantId}/orders`, // GET  (round 4)
  restaurantReady: (orderId: string) => `/api/restaurant/orders/${orderId}/ready`,      // POST (round 4) "Mark ready"
  restaurantPickedUp: (orderId: string) => `/api/restaurant/orders/${orderId}/picked-up`, // POST (round 4) "Picked up"
  wsRestaurant: (restaurantId: string) => `/ws?role=restaurant&restaurant=${encodeURIComponent(restaurantId)}`,                              // GET  (round 2: logos for the buyer side)                                        // GET  (is the Worker + DB up?)
  importOrder: () => `/api/orders/import`,                            // POST (track F: Chrome extension, lead approved Nov 21)
  // Live connection
  wsSeller: (orderId: string) => `/ws?role=seller&order=${encodeURIComponent(orderId)}`,
  wsBuyer: (buyerId: string) => `/ws?role=buyer&id=${encodeURIComponent(buyerId)}`,
} as const;

export interface ApiError {
  error: string;
}

// ---- Seller --------------------------------------------------------------

/** GET /api/orders/:id → S1 */
export interface OrderResponse {
  order: Order;
  restaurant: Restaurant;
  listing_id: string | null; // the live/draft listing for this order, if any
}

/** POST /api/orders/:id/undo → S3 confirm sheet. 409 if status is not "preparing". */
export interface UndoResponse {
  listing_id: string;
  title: string;
  selling_line: string;
  reason: string;            // grey line under the price plan
  tags: Tag[];
  may_contain: string[];
  diet: ListingDiet;
  start_price: number;       // "Starts at $17.78"
  floor_price: number;       // "Lowest price: $8.90"
  floor_min: number;         // 30% of food price
  floor_max: number;         // 70% of food price
  floor_step: number;        // 0.5
  drop_speed: DropSpeed;
  fallback: Fallback;        // default "free"
  order_type: OrderType;     // "delivery" → show the yellow warning (S3.4)
  agent_source: AgentSource;
}

/** POST /api/orders/import (track F). An order read from a delivery site page; names, quantities and prices only. */
export interface ImportOrderRequest {
  source: "doordash";
  restaurant_name: string;
  items: { name: string; qty: number; price: number }[]; // price = line price in dollars
  food_price: number;      // sum of items, no fees (R7). The server recomputes it.
  demo: boolean;           // the extension's demo mode was on
}
export interface ImportOrderResponse {
  order_id: string;        // a new "preparing" pickup order: then API.undo → API.publish → API.wsSeller
  restaurant_id: string;   // seeded match by name, or a new row with the real name
}

/** POST /api/listings/:id/publish */
export interface PublishRequest {
  floor_price: number;
  fallback: Fallback;
}
export interface PublishResponse {
  listing_id: string;
  status: "live";
  price: number;
  opens_at: number;
  closes_at: number;
  seconds_left: number;
}

/** PATCH /api/listings/:id (only while live; floor clipped to 30–70%) */
export interface ListingPatchRequest {
  floor_price?: number;
  fallback?: Fallback;
}
export interface ListingPatchResponse {
  listing_id: string;
  floor_price: number;
  fallback: Fallback;
}

/** POST /api/listings/:id/stop */
export interface StopResponse {
  listing_id: string;
  status: "stopped";
}

// ---- Buyer ---------------------------------------------------------------

/** POST /api/buyers and PATCH /api/buyers/:id (PATCH: any subset of fields) */
export interface BuyerProfileInput {
  name: string;
  notify_on: boolean;
  spot: CampusSpot | null;
  max_walk_min: number;
  food_types: FoodType[];
  diet: BuyerDiet[];
  max_price: number;
}
export interface CreateBuyerResponse {
  id: string;
  token: string; // save in localStorage; send as BUYER_TOKEN_HEADER
}
/** GET /api/buyers/:id (with token header) → reload keeps the profile */
export type BuyerProfile = Omit<Buyer, "token">;

/** GET /api/listings/:id (with token header) → B3 opened from a Telegram link */
export interface ListingCardResponse {
  listing: ListingCard;
  reason: string;
  buyer_id: string; // the buyer the token belongs to, so the page can open /ws (track B request, Nov 21)
}

/**
 * POST /api/listings/:id/buy (with token header)
 * - Paid listing: first tap wins a 60 s lock → go to Stripe Checkout (B4).
 * - Free window: first tap goes straight to the pickup pass (B5).
 * - Someone else was first: HTTP 409 with BuyTakenResponse.
 */
export type BuyResponse =
  | { kind: "locked"; checkout_url: string; lock_until: number; price: number }
  | { kind: "free"; pass: PickupPass };
export interface BuyTakenResponse {
  error: "taken";
  lock_until: number | null;
}

/** GET /api/listings/:id/pass (with token header) → B5. 404 unless this buyer won the listing. */
export type PassResponse = PickupPass;

/** POST /api/listings/:id/dismiss ("Not now") */
export interface OkResponse {
  ok: true;
}

// ---- Admin ---------------------------------------------------------------

/** POST /api/admin/mark-paid */
export interface MarkPaidRequest {
  listing_id: string;
}
/** GET /api/admin/state */
export interface AdminStateResponse {
  agent_mode: AgentMode;
  demo_speed: number;
  order_status: Order["status"];
  buyers: BuyerProfile[];
}
/** POST /api/admin/agent-mode */
export interface AgentModeRequest {
  agent_mode: AgentMode;
}

/** GET /api/restaurants → every restaurant (round 2: "campus favourites" logo row on the buyer side). */
export interface RestaurantsResponse {
  restaurants: Restaurant[];
}

/** GET /api/restaurant/:restaurantId/orders → the restaurant tablet (round 4). Newest first. */
export interface RestaurantOrdersResponse {
  restaurant: Restaurant;
  orders: RestaurantOrderView[];
}

/** GET /api/health */
export interface HealthResponse {
  ok: boolean;
  restaurants: number;
  mode: "mock" | "real";
}
