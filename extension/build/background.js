"use strict";
(() => {
  // src/messages.ts
  var PORT_NAME = "ctrlz";

  // src/settings.ts
  var SERVERS = [
    { url: "https://ctrlz-eats.stalerole.workers.dev", name: "Live site", label: "Live site (judges' phones)" },
    { url: "http://localhost:8787", name: "This laptop", label: "This laptop (npm run dev)" }
  ];
  var DEFAULT_SETTINGS = { apiBase: SERVERS[0].url, demo: false };
  async function getSettings() {
    const raw = await chrome.storage.local.get(["apiBase", "demo"]);
    const apiBase = SERVERS.some((s) => s.url === raw.apiBase) ? raw.apiBase : DEFAULT_SETTINGS.apiBase;
    return { apiBase, demo: raw.demo === true };
  }

  // src/background.ts
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME) return;
    let ws = null;
    let open = true;
    const send = (msg) => {
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
    port.onMessage.addListener(async (msg) => {
      const { apiBase } = await getSettings();
      if (msg.kind === "call") {
        try {
          const res = await fetch(apiBase + msg.path, {
            method: msg.method,
            headers: msg.body === void 0 ? void 0 : { "content-type": "application/json" },
            body: msg.body === void 0 ? void 0 : JSON.stringify(msg.body)
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
})();
