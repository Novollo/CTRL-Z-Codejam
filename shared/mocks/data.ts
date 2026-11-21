// Mock data that matches the seed data (shared/db/seed.sql) and the booklet examples.
// Used by the API stubs and the mock event player until the real engine exists.
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { BuyerProfile, OrderResponse, UndoResponse } from "../api";
import { DEMO_ORDER_ID, DEMO_RESTAURANT_ID } from "../constants";
import type { ListingCard, Order, PickupPass, Restaurant } from "../types";

export const MOCK_LISTING_ID = "lst_demo";
export const MOCK_BUYER_ID = "b_demo";
export const MOCK_BUYER_TOKEN = "tok_demo";

export const MOCK_RESTAURANT: Restaurant = {
  id: DEMO_RESTAURANT_ID,
  name: "Five Guys",
  address: "Placeholder address, downtown Montréal (TBD)",
  lat: 45.5017,
  lng: -73.5727,
  photo_url: "/img/restaurants/five-guys.jpg",
  default_category: "burgers",
  default_tags: ["burgers", "fries"],
  default_diet: { vegetarian: "no", vegan: "no", halal: "unsure", gluten_free: "no" },
};

export const MOCK_ORDER: Order = {
  id: DEMO_ORDER_ID,
  restaurant_id: DEMO_RESTAURANT_ID,
  items: [
    { name: "Little Cheeseburger", price: 11.49 },
    { name: "Cajun Fries (regular)", price: 6.29 },
  ],
  food_price: 17.78,
  fees: { service_fee: 2.99, delivery_fee: 0, tax: 2.69 },
  total: 23.46,
  type: "pickup",
  status: "preparing",
  ready_at: null,
  pickup_code: "ZEE-4821",
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
  order_type: "pickup",
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
  title: MOCK_UNDO.title,
  selling_line: MOCK_UNDO.selling_line,
  tags: MOCK_UNDO.tags,
  may_contain: MOCK_UNDO.may_contain,
  food_price: MOCK_ORDER.food_price,
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
