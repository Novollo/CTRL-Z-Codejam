// Restaurant tablet view (round 4, docs/design-round-2.md "Engine"). Pure: built from rows Market already loaded.
//
// Fulfilment, channel, customer name and codes are DERIVED from the database every time:
// - a published listing that was not stopped → the courier is released → "pickup" (a delivery order goes back to "delivery" on stop)
// - a sold listing (paid or taken free) → channel "ctrlz", the buyer's name, the NEW code, the old one as previous_pickup_code
// So "Stop listing" and admin reset restore everything without extra bookkeeping.
// Only the timeline (events have no table) lives in Market's own storage (OrderRecord).

import type { Buyer, Listing, Order, RestaurantOrderView, RestaurantTimelineEntry } from "@shared/types";

/** What Market stores per order (key "order:<id>"). */
export interface OrderRecord {
  placed_at: number;
  timeline: RestaurantTimelineEntry[];
}

export const newOrderRecord = (now: number): OrderRecord => ({
  placed_at: now,
  timeline: [{ at: now, text: "Order received", kind: "info" }],
});

/**
 * @param listing the newest PUBLISHED listing of this order (opens_at set), or null
 * @param winner  the buyer who got it, when that listing is sold
 * @param price   the live price while the listing is live/locked/free, else null
 */
export function buildOrderView(
  order: Order,
  listing: Listing | null,
  winner: Buyer | null,
  record: OrderRecord,
  price: number | null,
): RestaurantOrderView {
  const onCtrlz = listing != null && listing.status !== "stopped";
  const handedOver = listing?.status === "sold" && winner != null;
  return {
    order_id: order.id,
    short_code: `#${order.id.replace(/^ord_/, "")}`,
    customer_name: handedOver ? winner.name : order.customer_name,
    items: order.items,
    food_price: order.food_price,
    total: order.total, // round 8: the original delivery-app total, the only price the restaurant sees
    status: order.status,
    fulfilment: order.type === "pickup" || onCtrlz ? "pickup" : "delivery",
    channel: handedOver ? "ctrlz" : "delivery_app",
    pickup_code: handedOver && listing.pickup_code ? listing.pickup_code : order.pickup_code,
    previous_pickup_code: handedOver && listing.pickup_code ? order.pickup_code : null,
    previous_customer_name: handedOver ? order.customer_name : null,
    ctrlz: listing
      ? { listing_id: listing.id, status: listing.status, price, sold_price: listing.sold_price }
      : null,
    timeline: record.timeline,
    placed_at: record.placed_at,
  };
}
