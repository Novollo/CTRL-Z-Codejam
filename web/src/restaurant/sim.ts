// Local data for the restaurant tablet while the real API is missing, and the dev-only story simulator (?sim=1).
// The simulator steps the stage order (#4821, Alex, delivery) through the whole Ctrl+Z story,
// so every animation can be checked without the engine.
import { DEMO_ORDER_ID, makePickupCode } from "@shared/constants";
import { MOCK_ORDER, MOCK_UNDO, MOCK_LISTING_ID } from "@shared/mocks/data";
import type { RestaurantOrderView, RestaurantTimelineEntry } from "@shared/types";

export const SIM_STEPS = ["Preparing", "Ctrl+Z pressed", "Listed", "Locked", "Sold", "Ready", "Picked up"] as const;
export const SIM_LAST = SIM_STEPS.length - 1;

/** The stage order at a given simulator step. `t0` = when the simulator started (epoch ms). */
export function simStageOrder(step: number, t0: number, newCode: string, price: number): RestaurantOrderView {
  const at = (sec: number) => t0 + sec * 1000;
  const timeline: RestaurantTimelineEntry[] = [
    { at: at(-180), text: "Order received", kind: "info" },
    { at: at(-150), text: "Preparing", kind: "info" },
  ];
  const view: RestaurantOrderView = {
    order_id: DEMO_ORDER_ID,
    short_code: "#4821",
    customer_name: MOCK_ORDER.customer_name,
    items: MOCK_ORDER.items,
    food_price: MOCK_ORDER.food_price,
    status: "preparing",
    fulfilment: "delivery",
    channel: "delivery_app",
    pickup_code: MOCK_ORDER.pickup_code,
    previous_pickup_code: null,
    previous_customer_name: null,
    ctrlz: null,
    timeline,
    placed_at: at(-180),
  };
  if (step >= 1) {
    view.ctrlz = { listing_id: MOCK_LISTING_ID, status: "draft", price: null, sold_price: null };
    timeline.push({ at: at(0), text: "Customer pressed Ctrl+Z", kind: "ctrlz" });
  }
  if (step >= 2) {
    view.fulfilment = "pickup";
    view.ctrlz = { listing_id: MOCK_LISTING_ID, status: "live", price, sold_price: null };
    timeline.push({ at: at(4), text: "Listed on Ctrl+Z Eats", kind: "ctrlz" });
    timeline.push({ at: at(4), text: "Courier released: now pickup", kind: "ctrlz" });
  }
  if (step >= 3) {
    view.ctrlz = { listing_id: MOCK_LISTING_ID, status: "locked", price: simFloorPrice, sold_price: null };
    timeline.push({ at: at(8), text: `A buyer tapped Buy at $${simFloorPrice.toFixed(2)}: paying now`, kind: "ctrlz" });
  }
  if (step >= 4) {
    view.channel = "ctrlz";
    view.previous_customer_name = view.customer_name;
    view.customer_name = "Sarah";
    view.previous_pickup_code = MOCK_ORDER.pickup_code;
    view.pickup_code = newCode;
    view.ctrlz = { listing_id: MOCK_LISTING_ID, status: "sold", price: null, sold_price: simFloorPrice };
    timeline.push({ at: at(12), text: "Resold on Ctrl+Z Eats to Sarah", kind: "handover" });
    timeline.push({ at: at(12), text: `New pickup code ${newCode}`, kind: "handover" });
  }
  if (step >= 5) {
    view.status = "ready";
    timeline.push({ at: at(16), text: "Ready for pickup", kind: "done" });
  }
  if (step >= 6) {
    view.status = "picked_up";
    timeline.push({ at: at(20), text: "Picked up by Sarah", kind: "done" });
  }
  return view;
}

/** Live price for the "Listed" step: falls from the start price by $0.30 per second to the floor. */
export const simStartPrice = MOCK_UNDO.start_price;
export const simFloorPrice = 9.4;
export const nextSimPrice = (p: number) => Math.max(simFloorPrice, Math.round((p - 0.3) * 10) / 10);
export const newSimCode = () => makePickupCode();
