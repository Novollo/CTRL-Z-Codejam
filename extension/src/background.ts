// Background worker: the only part that talks to the Ctrl+Z Eats server (HTTP + the live connection).
// It sends only what the content script gives it: restaurant name, item names, quantities, prices.
import type { FromBackground, ToBackground } from "./messages";
import { PORT_NAME } from "./messages";
import { getSettings } from "./settings";

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;
  let ws: WebSocket | null = null;
  let open = true;

  const send = (msg: FromBackground) => {
    if (!open) return;
    try {
      port.postMessage(msg);
    } catch {
      open = false;
    }
  };

  const closeLive = () => {
    if (!ws) return;
    ws.onclose = null;
    ws.close();
    ws = null;
  };

  port.onMessage.addListener(async (msg: ToBackground) => {
    const { apiBase } = await getSettings();

    if (msg.kind === "call") {
      try {
        const res = await fetch(apiBase + msg.path, {
          method: msg.method,
          headers: msg.body === undefined ? undefined : { "content-type": "application/json" },
          body: msg.body === undefined ? undefined : JSON.stringify(msg.body),
        });
        const data = await res.json().catch(() => ({}));
        send({ kind: "reply", id: msg.id, ok: res.ok, status: res.status, data });
      } catch {
        send({ kind: "reply", id: msg.id, ok: false, status: 0, data: { error: "unreachable" } });
      }
    }

    if (msg.kind === "live") {
      closeLive();
      const socket = new WebSocket(apiBase.replace(/^http/, "ws") + msg.path);
      ws = socket;
      socket.onmessage = (e) => {
        try {
          send({ kind: "live", message: JSON.parse(String(e.data)) });
        } catch {
          // not JSON: ignore
        }
      };
      socket.onclose = () => {
        if (ws === socket) ws = null;
        send({ kind: "live-closed" });
      };
    }

    if (msg.kind === "live-stop") closeLive();
  });

  port.onDisconnect.addListener(() => {
    open = false;
    closeLive();
  });
});
