// Messages between the content script (on the delivery site) and the background worker.
// The background worker does every network call, so the delivery site never sees our requests
// and Chrome's host permissions replace CORS.
import type { LiveMessage } from "@shared/messages";

export const PORT_NAME = "ctrlz";

export type ToBackground =
  | { kind: "call"; id: number; method: "GET" | "POST"; path: string; body?: unknown }
  | { kind: "live"; path: string }  // open the live connection (API.wsSeller)
  | { kind: "live-stop" };

export type FromBackground =
  | { kind: "reply"; id: number; ok: boolean; status: number; data: unknown }
  | { kind: "live"; message: LiveMessage }
  | { kind: "live-closed" };
