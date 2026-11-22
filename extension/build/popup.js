"use strict";
(() => {
  // ../shared/api.ts
  var API = {
    // From booklet 10.4
    undo: (orderId) => `/api/orders/${orderId}/undo`,
    // POST
    publish: (listingId) => `/api/listings/${listingId}/publish`,
    // POST
    listing: (listingId) => `/api/listings/${listingId}`,
    // PATCH (seller) | GET (buyer, lead addition)
    stop: (listingId) => `/api/listings/${listingId}/stop`,
    // POST
    buyers: () => `/api/buyers`,
    // POST
    buyer: (buyerId) => `/api/buyers/${buyerId}`,
    // PATCH | GET (lead addition)
    buy: (listingId) => `/api/listings/${listingId}/buy`,
    // POST
    dismiss: (listingId) => `/api/listings/${listingId}/dismiss`,
    // POST
    pass: (listingId) => `/api/listings/${listingId}/pass`,
    // GET (lead addition: B5 after the Stripe redirect)
    stripeWebhook: () => `/api/stripe/webhook`,
    // POST (Stripe calls it)
    telegramWebhook: () => `/api/telegram/webhook`,
    // POST (Telegram calls it)
    adminReset: () => `/api/admin/reset`,
    // POST
    adminOrderReady: () => `/api/admin/order-ready`,
    // POST
    adminMarkPaid: () => `/api/admin/mark-paid`,
    // POST
    // Lead additions (needed by screens, see docs/contract-requests.md)
    order: (orderId) => `/api/orders/${orderId}`,
    // GET  (S1 order tracker)
    adminState: () => `/api/admin/state`,
    // GET  (/admin: agent mode + buyers)
    adminAgentMode: () => `/api/admin/agent-mode`,
    // POST (/admin: switch AGENT_MODE)
    health: () => `/api/health`,
    restaurants: () => `/api/restaurants`,
    restaurantOrders: (restaurantId) => `/api/restaurant/${restaurantId}/orders`,
    // GET  (round 4)
    restaurantReady: (orderId) => `/api/restaurant/orders/${orderId}/ready`,
    // POST (round 4) "Mark ready"
    restaurantPickedUp: (orderId) => `/api/restaurant/orders/${orderId}/picked-up`,
    // POST (round 4) "Picked up"
    wsRestaurant: (restaurantId) => `/ws?role=restaurant&restaurant=${encodeURIComponent(restaurantId)}`,
    // GET  (round 2: logos for the buyer side)                                        // GET  (is the Worker + DB up?)
    importOrder: () => `/api/orders/import`,
    // POST (track F: Chrome extension, lead approved Nov 21)
    // Live connection
    wsSeller: (orderId) => `/ws?role=seller&order=${encodeURIComponent(orderId)}`,
    wsBuyer: (buyerId) => `/ws?role=buyer&id=${encodeURIComponent(buyerId)}`
  };

  // src/settings.ts
  var SERVERS = [
    { url: "http://localhost:8787", label: "This laptop (npm run dev)" },
    { url: "https://ctrlz-eats.stalerole.workers.dev", label: "Live site" }
  ];
  var DEFAULT_SETTINGS = { apiBase: SERVERS[0].url, demo: false };
  async function getSettings() {
    const raw = await chrome.storage.local.get(["apiBase", "demo"]);
    const apiBase = SERVERS.some((s) => s.url === raw.apiBase) ? raw.apiBase : DEFAULT_SETTINGS.apiBase;
    return { apiBase, demo: raw.demo === true };
  }
  async function saveSettings(patch) {
    await chrome.storage.local.set(patch);
  }

  // src/popup.ts
  var serversEl = document.getElementById("servers");
  var statusEl = document.getElementById("status");
  var demoEl = document.getElementById("demo");
  async function checkServer(base) {
    statusEl.className = "";
    statusEl.textContent = "Checking the server…";
    try {
      const res = await fetch(base + API.health());
      const health = await res.json();
      statusEl.className = health.ok ? "ok" : "";
      statusEl.textContent = health.ok ? `Connected. ${health.restaurants} restaurants.` : "The server answered, but it isn't ready.";
    } catch {
      statusEl.textContent = base.includes("localhost") ? "Can't reach it. Is npm run dev running?" : "Can't reach it right now.";
    }
  }
  async function init() {
    const settings = await getSettings();
    for (const s of SERVERS) {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "server";
      input.checked = s.url === settings.apiBase;
      input.addEventListener("change", async () => {
        await saveSettings({ apiBase: s.url });
        void checkServer(s.url);
      });
      const label = document.createElement("label");
      label.className = "choice";
      const text = document.createElement("span");
      text.append(s.label);
      const small = document.createElement("small");
      small.textContent = s.url.replace(/^https?:\/\//, "");
      text.append(small);
      label.append(input, text);
      serversEl.append(label);
    }
    demoEl.checked = settings.demo;
    demoEl.addEventListener("change", () => saveSettings({ demo: demoEl.checked }));
    void checkServer(settings.apiBase);
  }
  void init();
})();
