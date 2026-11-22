// The seller app's server calls and live connection.
// With ?mock=local there is no server: calls answer with the shared mock data.
import { API } from "@shared/api";
import type {
  RestaurantsResponse,
  ListingPatchRequest,
  ListingPatchResponse,
  OrderResponse,
  PublishRequest,
  PublishResponse,
  StopResponse,
  UndoResponse,
} from "@shared/api";
import { DEMO_ORDER_ID, LISTING_AFTER_READY_MIN } from "@shared/constants";
import type { LiveMessage } from "@shared/messages";
import { MOCK_LISTING_ID, MOCK_ORDER_RESPONSE, MOCK_RESTAURANT, MOCK_UNDO } from "@shared/mocks/data";
import { apiCall } from "../lib/api";
import { connectLive } from "../lib/live";

const params = new URLSearchParams(window.location.search);
const LOCAL = params.get("mock") === "local";

export const getOrder = (): Promise<OrderResponse> =>
  LOCAL ? Promise.resolve(MOCK_ORDER_RESPONSE) : apiCall<OrderResponse>("GET", API.order(DEMO_ORDER_ID));

/** Home screen restaurant cards (round 4). */
export const getRestaurants = (): Promise<RestaurantsResponse> =>
  LOCAL ? Promise.resolve({ restaurants: [MOCK_RESTAURANT] }) : apiCall<RestaurantsResponse>("GET", API.restaurants());

export const undoOrder = (): Promise<UndoResponse> =>
  LOCAL ? Promise.resolve(MOCK_UNDO) : apiCall<UndoResponse>("POST", API.undo(DEMO_ORDER_ID));

export const publishListing = (id: string, body: PublishRequest): Promise<PublishResponse> => {
  if (!LOCAL) return apiCall<PublishResponse>("POST", API.publish(id), body);
  const seconds_left = (4 + LISTING_AFTER_READY_MIN) * 60;
  const now = Date.now();
  return Promise.resolve({ listing_id: id, status: "live", price: MOCK_UNDO.start_price, opens_at: now, closes_at: now, seconds_left });
};

export const patchListing = (id: string, body: ListingPatchRequest): Promise<ListingPatchResponse> =>
  LOCAL
    ? Promise.resolve({ listing_id: id, floor_price: body.floor_price ?? MOCK_UNDO.floor_price, fallback: body.fallback ?? MOCK_UNDO.fallback })
    : apiCall<ListingPatchResponse>("PATCH", API.listing(id), body);

export const stopListing = (id: string): Promise<StopResponse> =>
  LOCAL ? Promise.resolve({ listing_id: id, status: "stopped" }) : apiCall<StopResponse>("POST", API.stop(id));

/**
 * Opens the seller's live connection.
 * Testing S5b on the mock run: add ?end=pickup_self | free_window | free_expired | donated | free_taken.
 * The mock run always ends "sold"; with ?end= the seller app turns that last message into the chosen ending.
 * Only applies to the mock listing (lst_demo), so it can never change a real listing.
 */
export function connectSeller(onMessage: (msg: LiveMessage) => void): () => void {
  const end = params.get("end");
  const timers: ReturnType<typeof setTimeout>[] = [];
  const stop = connectLive({ role: "seller", orderId: DEMO_ORDER_ID }, (msg) => {
    if (end && msg.type === "listing.sold" && msg.listing_id === MOCK_LISTING_ID) {
      const base = { type: "listing.closed", listing_id: msg.listing_id } as const;
      if (end === "pickup_self") onMessage({ ...base, fallback: "pickup_self", outcome: "pickup_self", pickup_code: MOCK_ORDER_RESPONSE.order.pickup_code });
      if (end === "donated") onMessage({ ...base, fallback: "donate", outcome: "donated" });
      if (end === "free_window" || end === "free_expired" || end === "free_taken") {
        onMessage({ ...base, fallback: "free", outcome: "free_window", free_until: Date.now() + 10_000 });
        timers.push(
          setTimeout(() => {
            if (end === "free_expired") onMessage({ ...base, fallback: "free", outcome: "free_expired", pickup_code: MOCK_ORDER_RESPONSE.order.pickup_code });
            if (end === "free_taken") onMessage({ ...msg, sold_price: 0 });
          }, 4000),
        );
      }
      return;
    }
    onMessage(msg);
  });
  return () => {
    timers.forEach(clearTimeout);
    stop();
  };
}
