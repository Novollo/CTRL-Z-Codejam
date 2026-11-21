// Live connection to Market (booklet 10.5). Owned by the lead. Tracks A and B use this; do not open WebSockets yourself.
//
//   const stop = connectLive({ role: "seller", orderId: DEMO_ORDER_ID }, (msg) => { ... });
//   const stop = connectLive({ role: "buyer", buyerId }, (msg) => { ... });
//
// Add ?mock=local to the page URL to play the mock run in the browser with no server at all.
// Add ?speed=30 to make the mock run faster (default DEMO_SPEED 7, about 70 s).

import { API } from "@shared/api";
import type { LiveMessage } from "@shared/messages";
import { playMockRun } from "@shared/mocks/player";

export type LiveTarget = { role: "seller"; orderId: string } | { role: "buyer"; buyerId: string };

export function connectLive(target: LiveTarget, onMessage: (msg: LiveMessage) => void): () => void {
  const params = new URLSearchParams(window.location.search);
  const speed = Number(params.get("speed")) || undefined;

  if (params.get("mock") === "local") {
    return playMockRun({ role: target.role, onMessage, speed, loop: true });
  }

  let path = target.role === "seller" ? API.wsSeller(target.orderId) : API.wsBuyer(target.buyerId);
  if (speed) path += `&speed=${speed}`;
  const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${path}`;

  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const open = () => {
    ws = new WebSocket(url);
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data as string) as LiveMessage);
      } catch {
        // ignore bad frames
      }
    };
    ws.onclose = () => {
      if (!closed) retry = setTimeout(open, 1500); // reconnect: stage Wi-Fi drops happen
    };
  };
  open();

  return () => {
    closed = true;
    clearTimeout(retry);
    ws?.close();
  };
}
