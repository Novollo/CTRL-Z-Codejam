// Mock data that matches the seed data (shared/db/seed.sql) and the booklet examples.
// Used by the API stubs and the mock event player until the real engine exists.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { BuyerProfile, OrderResponse, UndoResponse } from "../api";
import { DEMO_ORDER_ID, DEMO_RESTAURANT_ID } from "../constants";
import type { ListingCard, Order, PickupPass, Restaurant } from "../types";

export const MOCK_LISTING_ID = "lst_demo";
export const MOCK_BUYER_ID = "b_demo";
export const MOCK_BUYER_TOKEN = "tok_demo";

/** Same text as shared/db/seed.sql and migration 0003. */
export const ITEM_DESCRIPTIONS = {
  burger: "One hand-formed beef patty, American cheese, pickles, grilled onions, ketchup and mustard on a toasted sesame bun.",
  fries: "Fresh-cut Idaho potatoes, skin on, cooked in peanut oil and dusted with Cajun spice. Regular size.",
} as const;

export const MOCK_RESTAURANT: Restaurant = {
  id: DEMO_RESTAURANT_ID,
  name: "Five Guys",
  address: "Placeholder address, downtown Montréal (TBD)",
  lat: 45.5017,
  lng: -73.5727,
  photo_url: "/img/restaurants/five-guys.jpg",
  logo_url: "/img/logos/fiveguys.png",
  default_category: "burgers",
  default_tags: ["burgers", "fries"],
  default_diet: { vegetarian: "no", vegan: "no", halal: "unsure", gluten_free: "no" },
};

export const MOCK_ORDER: Order = {
  id: DEMO_ORDER_ID,
  restaurant_id: DEMO_RESTAURANT_ID,
  items: [
    { name: "Little Cheeseburger", price: 11.49, description: ITEM_DESCRIPTIONS.burger },
    { name: "Cajun Fries (regular)", price: 6.29, description: ITEM_DESCRIPTIONS.fries },
  ],
  food_price: 17.78,
  fees: { service_fee: 2.99, delivery_fee: 2.49, tax: 2.69 },
  total: 25.95,
  type: "delivery",
  status: "preparing",
  ready_at: null,
  pickup_code: "ZEE-4821",
  customer_name: "Alex",
};

export const MOCK_ORDER_RESPONSE: OrderResponse = {
  order: MOCK_ORDER,
  restaurant: MOCK_RESTAURANT,
  listing_id: null,
};

/** S3 confirm sheet, exactly the booklet 8.3 example. */
export const MOCK_UNDO: UndoResponse = {
  listing_id: MOCK_LISTING_ID,
  title: "Fresh Five Guys combo, untouched",
  selling_line: "Cheeseburger and Cajun fries, ready at the counter. No fees.",
  reason: "Drops fast: only 4 people nearby want burgers right now.",
  tags: ["burgers", "fries"],
  may_contain: ["peanuts"],
  diet: { vegetarian: "no", vegan: "no", halal: "unsure", gluten_free: "no" },
  start_price: 17.78,
  floor_price: 8.9,
  floor_min: 5.4,  // 30% of 17.78 = 5.33, rounded UP to $0.10 so it stays inside the range
  floor_max: 12.4, // 70% of 17.78 = 12.45, rounded DOWN to $0.10
  floor_step: 0.5,
  drop_speed: "fast",
  fallback: "free",
  order_type: "delivery",
  agent_source: "default",
};

export const MOCK_BUYER: BuyerProfile = {
  id: MOCK_BUYER_ID,
  name: "Sarah",
  notify_on: true,
  spot: "trottier",
  lat: null,
  lng: null,
  max_walk_min: 10,
  food_types: ["burgers", "pizza"],
  diet: [],
  max_price: 12,
  telegram_chat_id: null,
};

export const MOCK_REASON = "Why you got this: Burgers · 6 min walk · under your $12";

/** B3 card. `price`, `seconds_left`, `status` and `lock_until` change live. */
export const mockListingCard = (price: number, seconds_left: number): ListingCard => ({
  listing_id: MOCK_LISTING_ID,
  restaurant_name: MOCK_RESTAURANT.name,
  restaurant_address: MOCK_RESTAURANT.address,
  photo_url: MOCK_RESTAURANT.photo_url,
  logo_url: MOCK_RESTAURANT.logo_url,
  title: MOCK_UNDO.title,
  selling_line: MOCK_UNDO.selling_line,
  tags: MOCK_UNDO.tags,
  may_contain: MOCK_UNDO.may_contain,
  food_price: MOCK_ORDER.food_price,
  items: MOCK_ORDER.items,
  price,
  seconds_left,
  status: "live",
  lock_until: null,
  walk_min: 6,
});

export const mockPickupPass = (pickup_by: number): PickupPass => ({
  listing_id: MOCK_LISTING_ID,
  restaurant_name: MOCK_RESTAURANT.name,
  restaurant_address: MOCK_RESTAURANT.address,
  walk_min: 6,
  pickup_code: MOCK_ORDER.pickup_code,
  name_on_order: MOCK_BUYER.name,
  pickup_by,
});

/** Round 4: two other Five Guys orders so the restaurant tablet doesn't look empty. Static, never change. */
export const MOCK_RESTAURANT_QUEUE = (now: number): import("../types").RestaurantOrderView[] => [
  {
    order_id: "ord_4823", short_code: "#4823", customer_name: "Maya",
    items: [{ name: "Bacon Cheeseburger", price: 13.99, description: "Two patties, bacon, cheese." }, { name: "Five Guys Fries (little)", price: 5.49, description: "Peanut oil." }],
    food_price: 19.48, status: "received", fulfilment: "delivery", channel: "delivery_app",
    pickup_code: "ZEE-4823", previous_pickup_code: null, previous_customer_name: null, ctrlz: null,
    timeline: [{ at: now - 60_000, text: "Order received", kind: "info" }], placed_at: now - 60_000,
  },
  {
    order_id: "ord_4817", short_code: "#4817", customer_name: "Jordan",
    items: [{ name: "Grilled Cheese", price: 7.99, description: "American cheese on a toasted bun." }],
    food_price: 7.99, status: "ready", fulfilment: "pickup", channel: "delivery_app",
    pickup_code: "ZEE-4817", previous_pickup_code: null, previous_customer_name: null, ctrlz: null,
    timeline: [{ at: now - 9 * 60_000, text: "Order received", kind: "info" }, { at: now - 2 * 60_000, text: "Ready for pickup", kind: "done" }],
    placed_at: now - 9 * 60_000,
  },
];
