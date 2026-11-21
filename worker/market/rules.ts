// Plain rules from booklet section 9: time scaling, the falling price, the floor range and matching.
// No database, no network: pure functions only.

import { FOOD_TYPES, NUT_WORDS, TAG_LABELS } from "@shared/catalog";
import type { FoodType } from "@shared/catalog";
import {
  DEFAULT_DEMO_SPEED, DEMO_CROWD, FLOOR_MAX_SHARE, FLOOR_MIN_SHARE, T_FLOOR_MIN, T_FLOOR_SHORT_LISTING_SHARE,
  WALK_DETOUR_FACTOR, WALK_METRES_PER_MIN, roundPrice, roundPriceDown,
} from "@shared/constants";
import type { Buyer, Listing, Restaurant } from "@shared/types";
import type { Env } from "../env";

// ---- Time (booklet 9.1): story minutes run DEMO_SPEED times faster than real time ----

export const demoSpeed = (env: Env): number => Number(env.DEMO_SPEED) || DEFAULT_DEMO_SPEED;

/** Real milliseconds for a number of story minutes. */
export const storyMinToMs = (minutes: number, speed: number): number => Math.round((minutes * 60_000) / speed);

/** Story seconds left until `until` (epoch ms), never negative. */
export const storySecondsLeft = (until: number, now: number, speed: number): number =>
  Math.max(0, Math.round(((until - now) * speed) / 1000));

// ---- Price (booklet 9.2) ----

/** How far along the way to the floor the listing is: 0 at publish, 1 from T_floor on (9.2). */
export function floorShare(listing: Listing, now: number, speed: number): number {
  if (listing.status === "free") return 1;
  const opens = listing.opens_at ?? now;
  const closes = listing.closes_at ?? now;
  const storyMin = ((now - opens) * speed) / 60_000;
  const lengthMin = ((closes - opens) * speed) / 60_000;
  let tFloor = T_FLOOR_MIN[listing.drop_speed];
  if (lengthMin < tFloor) tFloor = T_FLOOR_SHORT_LISTING_SHARE * lengthMin;
  return tFloor > 0 ? Math.min(1, Math.max(0, storyMin / tFloor)) : 1;
}

/** Price on the straight line from start to floor, rounded down to $0.10. */
export function priceAt(listing: Listing, now: number, speed: number): number {
  const price = listing.start_price - (listing.start_price - listing.floor_price) * floorShare(listing, now, speed);
  return Math.max(listing.floor_price, roundPriceDown(price));
}

// ---- Social proof (round 2): the simulated campus crowd added on top of the real counts ----

/** The crowd for this listing now: grows from 0 at publish to the max at the floor time; watching wobbles. */
export function demoCrowd(listing: Listing, now: number, speed: number): { seen: number; watching: number; interested: number } {
  const share = floorShare(listing, now, speed);
  const seen = Math.round(DEMO_CROWD.seen_max * share);
  const interested = Math.round(DEMO_CROWD.interested_max * share);
  const storySec = ((now - (listing.opens_at ?? now)) * speed) / 1000;
  const wave = 0.5 + 0.3 * Math.sin(storySec / 23) + 0.2 * Math.sin(storySec / 7); // 0..1, smooth, never periodic-looking
  const wobble = DEMO_CROWD.watching_min + Math.round((DEMO_CROWD.watching_max - DEMO_CROWD.watching_min) * wave);
  return { seen, interested, watching: Math.min(wobble, seen, interested) }; // never more watching than seen or interested
}

/** Allowed floor range: 30% rounded UP, 70% rounded DOWN, to $0.10 (lead decision 13). */
export function floorRange(foodPrice: number): { min: number; max: number } {
  return {
    min: Math.ceil(foodPrice * FLOOR_MIN_SHARE * 10 - 1e-9) / 10,
    max: Math.floor(foodPrice * FLOOR_MAX_SHARE * 10 + 1e-9) / 10,
  };
}

/** Clip a floor the seller asked for into the range (and never above the start price). */
export function clipFloor(floor: number, foodPrice: number, startPrice: number): number {
  const { min, max } = floorRange(foodPrice);
  const top = Math.min(max, startPrice);
  const value = Number.isFinite(floor) ? floor : (min + top) / 2;
  return roundPrice(Math.min(top, Math.max(min, value)));
}

// ---- Walk time (booklet 9.3) ----

/** Minutes from this buyer to the restaurant: live location first, then the campus spot table. */
export function walkMinutes(buyer: Buyer, restaurant: Restaurant, walkTable: Map<string, number>): number | null {
  if (buyer.lat != null && buyer.lng != null) {
    const metres = distanceMetres(buyer.lat, buyer.lng, restaurant.lat, restaurant.lng);
    return Math.max(1, Math.round((metres * WALK_DETOUR_FACTOR) / WALK_METRES_PER_MIN));
  }
  if (buyer.spot) return walkTable.get(buyer.spot) ?? null;
  return null;
}

function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

// ---- Matching (booklet 9.3, rules 1 and 3–6; rule 2 "not pinged before" is checked against the pings table) ----

/** "$12" or "$12.50" */
const maxLabel = (dollars: number): string => (Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`);

/**
 * Returns the reason line when this buyer should get this listing, else null.
 * `skipPrice` is true in the free window (9.5: rule 6 is skipped).
 */
export function matchReason(
  buyer: Buyer,
  listing: Listing,
  price: number,
  walk: number | null,
  skipPrice: boolean,
): string | null {
  if (!buyer.notify_on) return null;                                   // rule 1
  if (walk == null || walk > buyer.max_walk_min) return null;          // rule 3

  const types = buyer.food_types;                                      // rule 4
  const firstMatch = types.length === 0 ? listing.tags[0] : listing.tags.find((t) => types.includes(t as FoodType));
  if (types.length > 0 && !firstMatch) return null;

  for (const diet of buyer.diet) {                                     // rule 5
    if (diet === "vegetarian" && listing.diet.vegetarian !== "yes") return null;
    if (diet === "vegan" && listing.diet.vegan !== "yes") return null;
    if (diet === "halal" && listing.diet.halal !== "yes") return null;
    if (diet === "no_gluten" && listing.diet.gluten_free !== "yes") return null;
    if (diet === "no_nuts" && listing.may_contain.some(hasNut)) return null;
  }

  if (!skipPrice && price > buyer.max_price) return null;              // rule 6

  const typeLabel = firstMatch
    ? FOOD_TYPES.find((f) => f.key === firstMatch)?.label ?? TAG_LABELS[firstMatch]
    : "Anything";
  return `Why you got this: ${typeLabel} · ${walk} min walk · under your ${maxLabel(buyer.max_price)}`;
}

/** Careful on purpose: "coconut" also counts as a nut, so a "No nuts" buyer is not pinged. */
const hasNut = (allergen: string): boolean => NUT_WORDS.some((nut) => allergen.toLowerCase().includes(nut));
