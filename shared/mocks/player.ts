// Mock event player: replays one full scripted run (booklet 13.3.4).
// Story: listing published → price ticks down → pings roll out → the order becomes ready →
// another buyer locks it and lets the lock run out → it comes back → a buyer locks it and pays → sold at $9.40.
// A run lasts about 70 s at DEMO_SPEED 7. Pass a higher `speed` to go faster while building screens.
//
// Used by: the /ws stub (worker/market/Market.ts) and, offline, by web/src/lib/live.ts (?mock=local).
// FROZEN: only the lead changes this file (see CLAUDE.md).

import { DEFAULT_DEMO_SPEED, LISTING_AFTER_READY_MIN, LOCK_SEC, PICKUP_DEADLINE_MIN, PRICE_TICK_SEC, T_FLOOR_MIN, roundPriceDown } from "../constants";
import type { LiveMessage, LiveRole } from "../messages";
import { MOCK_LISTING_ID, MOCK_ORDER, MOCK_REASON, MOCK_UNDO, mockListingCard, mockPickupPass } from "./data";

/** One scripted step. `at` is in story seconds after the listing opened. */
export interface MockStep {
  at: number;
  to: LiveRole[];
  make: (ctx: { now: number; speed: number }) => LiveMessage;
}

const START = MOCK_UNDO.start_price;  // 17.78
const FLOOR = MOCK_UNDO.floor_price;  // 8.90
const T_FLOOR_SEC = T_FLOOR_MIN.fast * 60;
const READY_AT = 4 * 60;              // order is ready 4 story min after publish
const TOTAL_SEC = READY_AT + LISTING_AFTER_READY_MIN * 60; // 1440 story s → "24:00 left"
const PING_AT = 320;                  // price $11.80, under the buyer's $12 max
const LOCK1_AT = 360;                 // another buyer taps Buy…
const UNLOCK1_AT = 400;               // …and does not pay (mock lock is short: real lock is 60 s real time)
const LOCK2_AT = 450;                 // a buyer taps Buy at $9.40…
const SOLD_AT = 480;                  // …and pays.

/** Booklet 9.2: straight line from start to floor, rounded down to $0.10. */
export const mockPriceAt = (storySec: number): number =>
  roundPriceDown(START - (START - FLOOR) * Math.min(1, storySec / T_FLOOR_SEC));

const LOCK_PRICE = mockPriceAt(LOCK2_AT); // 9.40

/** The full scripted run, sorted by time. */
export function buildMockRun(): MockStep[] {
  const id = MOCK_LISTING_ID;
  const steps: MockStep[] = [];

  steps.push({ at: 0, to: ["seller"], make: () => ({ type: "order.status", order_id: MOCK_ORDER.id, status: "preparing" }) });

  // Price ticks every 10 story seconds until sold. Buyers only get ticks once their card is open (after the ping).
  for (let at = 0; at < SOLD_AT; at += PRICE_TICK_SEC) {
    const to: LiveRole[] = at >= PING_AT ? ["seller", "buyer"] : ["seller"];
    steps.push({ at, to, make: () => ({ type: "listing.tick", listing_id: id, price: mockPriceAt(at), seconds_left: TOTAL_SEC - at }) });
  }

  // "Sent to N people nearby" grows as the price drops under more people's max price.
  for (const [at, reached] of [[30, 3], [120, 7], [240, 11], [PING_AT, 14]] as const) {
    steps.push({ at, to: ["seller"], make: () => ({ type: "listing.reach", listing_id: id, reached }) });
  }

  steps.push({ at: READY_AT, to: ["seller"], make: () => ({ type: "order.status", order_id: MOCK_ORDER.id, status: "ready" }) });

  steps.push({
    at: PING_AT,
    to: ["buyer"],
    make: () => ({ type: "ping", listing: mockListingCard(mockPriceAt(PING_AT), TOTAL_SEC - PING_AT), reason: MOCK_REASON }),
  });

  steps.push({ at: LOCK1_AT, to: ["seller", "buyer"], make: ({ now }) => ({ type: "listing.locked", listing_id: id, lock_until: now + LOCK_SEC * 1000 }) });
  steps.push({ at: UNLOCK1_AT, to: ["seller", "buyer"], make: () => ({ type: "listing.unlocked", listing_id: id, lock_until: null, price: mockPriceAt(UNLOCK1_AT) }) });
  steps.push({ at: LOCK2_AT, to: ["seller", "buyer"], make: ({ now }) => ({ type: "listing.locked", listing_id: id, lock_until: now + LOCK_SEC * 1000 }) });

  // Sold. The seller gets the pass; this mock buyer is NOT the winner, so they see B-lost.
  const pickupBy = (now: number, speed: number) => now + (PICKUP_DEADLINE_MIN * 60 * 1000) / speed;
  steps.push({
    at: SOLD_AT,
    to: ["seller"],
    make: ({ now, speed }) => ({ type: "listing.sold", listing_id: id, sold_price: LOCK_PRICE, pickup_by: pickupBy(now, speed), pass: mockPickupPass(pickupBy(now, speed)) }),
  });
  steps.push({
    at: SOLD_AT,
    to: ["buyer"],
    make: ({ now, speed }) => ({ type: "listing.sold", listing_id: id, sold_price: LOCK_PRICE, pickup_by: pickupBy(now, speed) }),
  });

  return steps.sort((a, b) => a.at - b.at);
}

export interface PlayOptions {
  /** Which screen is listening. "all" gets every message (handy for /stage). */
  role: LiveRole | "all";
  onMessage: (msg: LiveMessage) => void;
  /** Story speed. Default DEMO_SPEED (7): a run takes ~70 s. */
  speed?: number;
  /** Start again after the run ends. */
  loop?: boolean;
}

/** Plays the run. Returns a stop function. */
export function playMockRun({ role, onMessage, speed = DEFAULT_DEMO_SPEED, loop = false }: PlayOptions): () => void {
  const steps = buildMockRun().filter((s) => role === "all" || s.to.includes(role));
  const timers: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  const start = () => {
    for (const step of steps) {
      timers.push(setTimeout(() => { if (!stopped) onMessage(step.make({ now: Date.now(), speed })); }, (step.at * 1000) / speed));
    }
    if (loop) timers.push(setTimeout(() => { if (!stopped) start(); }, ((SOLD_AT + 30) * 1000) / speed));
  };
  start();

  return () => {
    stopped = true;
    timers.forEach(clearTimeout);
  };
}
