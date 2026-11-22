// Content-script side of the background connection: server calls and the live connection.
import { API } from "@shared/api";
import type { ImportOrderRequest, ImportOrderResponse, PublishRequest, PublishResponse, UndoResponse } from "@shared/api";
import type { LiveMessage } from "@shared/messages";
import type { FromBackground, ToBackground } from "./messages";
import { PORT_NAME } from "./messages";

let port: chrome.runtime.Port | null = null;
let nextId = 1;
const waiting = new Map<number, (reply: Extract<FromBackground, { kind: "reply" }>) => void>();
let liveHandler: ((m: LiveMessage) => void) | null = null;
let livePath: string | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;

/** The background worker can be stopped by Chrome at any time: reconnect on demand. */
function getPort(): chrome.runtime.Port {
  if (port) return port;
  const p = chrome.runtime.connect({ name: PORT_NAME });
  port = p;
  p.onMessage.addListener((msg: FromBackground) => {
    if (msg.kind === "reply") {
      waiting.get(msg.id)?.(msg);
      waiting.delete(msg.id);
    } else if (msg.kind === "live") {
      liveHandler?.(msg.message);
    } else if (msg.kind === "live-closed") {
      scheduleLiveRetry();
    }
  });
  p.onDisconnect.addListener(() => {
    port = null;
    for (const [id, resolve] of waiting) resolve({ kind: "reply", id, ok: false, status: 0, data: { error: "unreachable" } });
    waiting.clear();
    scheduleLiveRetry();
  });
  return p;
}

function post(msg: ToBackground) {
  try {
    getPort().postMessage(msg);
  } catch {
    port = null;
    getPort().postMessage(msg);
  }
}

/** A server error the panel can show. `status` 0 = the server can't be reached. */
export class ServerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    waiting.set(id, (r) => {
      if (r.ok) resolve(r.data as T);
      else reject(new ServerError(r.status, String((r.data as { error?: string })?.error ?? "error")));
    });
    post({ kind: "call", id, method, path, body });
  });
}

export const server = {
  importOrder: (body: ImportOrderRequest) => call<ImportOrderResponse>("POST", API.importOrder(), body),
  undo: (orderId: string) => call<UndoResponse>("POST", API.undo(orderId)),
  publish: (listingId: string, body: PublishRequest) => call<PublishResponse>("POST", API.publish(listingId), body),
};

function scheduleLiveRetry() {
  if (!livePath) return;
  clearTimeout(retry);
  retry = setTimeout(() => livePath && post({ kind: "live", path: livePath }), 1500);
}

/** Follow the seller's listing live (API.wsSeller). Reconnects by itself until stopLive(). */
export function startLive(orderId: string, onMessage: (m: LiveMessage) => void): void {
  liveHandler = onMessage;
  livePath = API.wsSeller(orderId);
  post({ kind: "live", path: livePath });
}

export function stopLive(): void {
  clearTimeout(retry);
  livePath = null;
  liveHandler = null;
  if (port) post({ kind: "live-stop" });
}
