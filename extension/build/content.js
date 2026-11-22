"use strict";
(() => {
  // sites/doordash.ts
  var PRICE_LINE = /^(?:CA|C|US)?\$\s?(\d{1,4}(?:,\d{3})*\.\d{2})(?:\s*(?:CAD|USD))?$/i;
  var QTY_LINE = /^(?:(\d{1,2})\s*[x×]|(?:qty|quantity):?\s*(\d{1,2}))$/i;
  var QTY_NAME_LINE = /^(\d{1,2})\s*[x×]\s+(.+)$/i;
  var NAME_PRICE_LINE = /^(.+?)\s+(?:CA|C|US)?\$\s?(\d{1,4}(?:,\d{3})*\.\d{2})$/i;
  var NOT_FOOD = /subtotal|total|fee|tax|tip|dasher|discount|promo|credit|saving|delivery|service|small order|expanded range|refund|charged|payment|paid|visa|mastercard|amex|apple pay|google pay|dashpass|gift card/i;
  var STATUS_LINE = /preparing|being prepared|being made|making your order|is cooking|in the kitchen|confirmed your order|order (?:received|confirmed|placed)|heading to|on (?:its|the) way|picked up|arriving|ready for pickup|delivered|complete|cancell?ed/i;
  var PREPARING = /prepar|being made|making your order|is cooking|in the kitchen|confirmed your order/i;
  var DONE = /delivered|complete|cancell?ed|picked up|on (?:its|the) way|ready for pickup/i;
  var GENERIC = /^(?:order|orders|your order|order details|receipt|help|reorder|view store|visit store|store|menu|track order|get help|rate|doordash)$/i;
  var FROM_LINE = /^(?:your order from|order from|ordered from)\s+(.{2,60})$/i;
  var TID_STATUS = "[data-testid='order-status']";
  var TID_STATUS_SECTION = "[data-testid='OrderStatusSection']";
  var TID_MERCHANT = "[data-testid='merchantSection']";
  var TID_ITEMS = "[data-testid='receiptSummaryItemsList'], [data-testid='DeliverySection']";
  var root = (doc) => doc.querySelector("main, [role='main']") ?? doc.body;
  function lines(doc, el = root(doc)) {
    return (el.innerText || "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  }
  function blockLines(doc, el) {
    if (el.getClientRects().length > 0) return lines(doc, el);
    const out = [];
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = (n.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
    return out;
  }
  var money = (s) => Math.round(Number(s.replace(/,/g, "")) * 100) / 100;
  var shortText = (el) => (el?.innerText ?? el?.textContent ?? "").replace(/\s+/g, " ").trim();
  var firstLine = (el) => (el?.innerText ?? "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).find(Boolean) ?? "";
  var usableName = (t) => t.length >= 2 && t.length <= 60 && !GENERIC.test(t) && !PRICE_LINE.test(t) && !/^\d+ items?$/i.test(t);
  function readRestaurant(doc, text) {
    const merchant = firstLine(doc.querySelector(TID_MERCHANT));
    if (usableName(merchant)) return merchant;
    for (const a of root(doc).querySelectorAll("a[href*='/store/']")) {
      const t = shortText(a);
      if (t.length >= 2 && t.length <= 60 && !GENERIC.test(t) && !PRICE_LINE.test(t)) return t;
      const label = a.getAttribute("aria-label")?.trim() ?? "";
      if (label.length >= 2 && label.length <= 60 && !GENERIC.test(label)) return label;
    }
    for (const el of root(doc).querySelectorAll("[data-testid*='store' i], [data-testid*='merchant' i], [data-testid*='restaurant' i]")) {
      const t = firstLine(el);
      if (usableName(t)) return t;
    }
    for (const l of text) {
      const m = FROM_LINE.exec(l);
      if (m) return m[1];
    }
    for (const h2 of root(doc).querySelectorAll("h1, h2, h3, [role='heading']")) {
      const t = shortText(h2);
      if (t.length >= 2 && t.length <= 60 && !GENERIC.test(t) && !STATUS_LINE.test(t) && !PRICE_LINE.test(t)) return t;
    }
    return "";
  }
  function readItems(text) {
    const items = [];
    for (let i = 0; i < text.length; i++) {
      let qty = 0;
      let name = "";
      const q = QTY_LINE.exec(text[i]);
      const qn = QTY_NAME_LINE.exec(text[i]);
      if (q) qty = Number(q[1] ?? q[2]);
      else if (qn) {
        qty = Number(qn[1]);
        name = qn[2];
      } else continue;
      for (let j = i + 1; j < Math.min(text.length, i + 7); j++) {
        const l = text[j];
        if (QTY_LINE.test(l) || QTY_NAME_LINE.test(l)) break;
        const p = PRICE_LINE.exec(l);
        if (p) {
          if (name && !NOT_FOOD.test(name)) items.push({ name: name.slice(0, 80), qty, price: money(p[1]) });
          i = j;
          break;
        }
        const np = NAME_PRICE_LINE.exec(l);
        if (np && !name) {
          if (!NOT_FOOD.test(np[1])) items.push({ name: np[1].slice(0, 80), qty, price: money(np[2]) });
          i = j;
          break;
        }
        if (!name) name = l;
      }
    }
    return items.filter((it) => it.price > 0);
  }
  function readStatus(doc, text) {
    const heading = firstLine(doc.querySelector(TID_STATUS));
    if (heading && heading.length <= 80) return heading;
    for (const el of root(doc).querySelectorAll("[role='status'], [aria-live]")) {
      const t = shortText(el);
      if (t && t.length <= 80 && STATUS_LINE.test(t)) return t;
    }
    return text.find((l) => l.length <= 80 && STATUS_LINE.test(l)) ?? "";
  }
  function elementWithText(doc, wanted) {
    const walker = doc.createTreeWalker(root(doc), NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (wanted.test((n.textContent ?? "").trim())) return n.parentElement;
    }
    return null;
  }
  var doordash = {
    source: "doordash",
    matches: (host) => host === "www.doordash.com" || host === "doordash.com",
    isOrderPage(doc, url) {
      if (/^\/orders?\/[^/]{6,}/i.test(url.pathname) || /\/(?:order-status|receipt|track)/i.test(url.pathname)) return true;
      const text = lines(doc);
      return readItems(text).length > 0 && readStatus(doc, text) !== "";
    },
    read(doc) {
      try {
        const text = lines(doc);
        const itemsBlock = doc.querySelector(TID_ITEMS);
        let items = itemsBlock ? readItems(blockLines(doc, itemsBlock)) : [];
        if (items.length === 0) items = readItems(text);
        const restaurant_name = readRestaurant(doc, text);
        const status_text = readStatus(doc, text);
        if (!restaurant_name && items.length === 0) return null;
        const food_price = Math.round(items.reduce((s, it) => s + it.price, 0) * 100) / 100;
        return {
          source: "doordash",
          restaurant_name,
          items,
          food_price,
          status_text,
          is_preparing: PREPARING.test(status_text) && !DONE.test(status_text)
        };
      } catch {
        return null;
      }
    },
    anchor(doc) {
      for (const el of root(doc).querySelectorAll("button, a, [role='button']")) {
        if (/^cancel(?: order)?$/i.test(shortText(el))) return el;
      }
      return doc.querySelector(TID_STATUS_SECTION) ?? elementWithText(doc, STATUS_LINE);
    }
  };

  // sites/index.ts
  var READERS = [doordash];
  var readerFor = (host) => READERS.find((r) => r.matches(host)) ?? null;

  // src/settings.ts
  var SERVERS = [
    { url: "https://ctrlz-eats.stalerole.workers.dev", name: "Live site", label: "Live site (judges' phones)" },
    { url: "http://localhost:8787", name: "This laptop", label: "This laptop (npm run dev)" }
  ];
  var serverName = (url) => SERVERS.find((s) => s.url === url)?.name ?? url;
  var DEFAULT_SETTINGS = { apiBase: SERVERS[0].url, demo: false };
  async function getSettings() {
    const raw = await chrome.storage.local.get(["apiBase", "demo"]);
    const apiBase = SERVERS.some((s) => s.url === raw.apiBase) ? raw.apiBase : DEFAULT_SETTINGS.apiBase;
    return { apiBase, demo: raw.demo === true };
  }
  function onSettingsChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && ("apiBase" in changes || "demo" in changes)) cb();
    });
  }

  // ../shared/tokens.ts
  var COLORS = {
    forest: "#1E5631",
    // main brand: Ctrl+Z button, primary buttons, logo
    leaf: "#6CC24A",
    // accents: sparkles, progress ring, "You undid 40%", reason icon
    mint: "#EEF7EA",
    // light green backgrounds: S2, selected chips, pickup pass
    ink: "#111111",
    // headings and main text
    stone: "#6B6B6B",
    // secondary text
    line: "#E8E8E8",
    // borders, dividers, greyed Cancel button
    white: "#FFFFFF",
    // screen background
    amber: "#F2A900"
    // warnings only: delivery warning, last 60 s, lock countdown
  };
  var FONTS = {
    ui: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace"
    // prices and timers, bold
  };
  var SHAPE = {
    radius: 12,
    // cards and buttons
    bottomButtonHeight: 56,
    iconStroke: 2
    // Lucide line icons
  };

  // src/ui/styles.ts
  var CSS = `
:host { all: initial; display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.root {
  font-family: ${FONTS.ui}; color: ${COLORS.ink}; font-size: 14px; line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}
.mono { font-family: ${FONTS.mono}; font-weight: 700; }
button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
input { font: inherit; color: ${COLORS.ink}; }

/* ---- Hold to confirm ---------------------------------------------------- */
.hold { position: relative; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
.hold::before {
  content: ""; position: absolute; inset: 0; background: ${COLORS.leaf};
  transform: scaleX(0); transform-origin: left center; transition: transform 160ms ease-out;
}
.hold.holding::before { transform: scaleX(1); transition: transform var(--hold-ms, 1000ms) linear; }
.hold > * { position: relative; }
.hold.held { animation: held 380ms ease-out; }
@keyframes held { 0% { transform: scale(1); } 40% { transform: scale(0.97); } 100% { transform: scale(1); } }

/* ---- The Ctrl+Z button ---------------------------------------------------- */
.dock { display: block; max-width: 380px; margin: 12px 16px 16px; }
.dock.floating {
  position: fixed; right: 24px; bottom: 24px; width: 320px; margin: 0; z-index: 2147483646;
  background: ${COLORS.white}; border-radius: 16px; padding: 12px;
  box-shadow: 0 12px 32px rgba(17,17,17,0.18), 0 0 0 1px ${COLORS.line};
}
.ctrlz {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
  height: ${SHAPE.bottomButtonHeight}px; border-radius: ${SHAPE.radius}px; background: ${COLORS.forest}; color: ${COLORS.white};
  font-size: 17px; font-weight: 700; box-shadow: 0 6px 16px rgba(30,86,49,0.28);
}
.ctrlz:focus-visible, .primary:focus-visible { outline: 3px solid ${COLORS.leaf}; outline-offset: 2px; }
.keys { display: inline-flex; align-items: center; gap: 4px; }
.key {
  display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; padding: 0 7px;
  border: 2px solid currentColor; border-radius: 7px; font-family: ${FONTS.mono}; font-weight: 700; font-size: 14px;
  box-shadow: 0 2px 0 currentColor;
}
.plus { font-weight: 700; }
.under { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.hint { color: ${COLORS.stone}; font-size: 12px; }
.demo {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
  background: ${COLORS.mint}; color: ${COLORS.forest}; font-size: 12px; font-weight: 700; white-space: nowrap;
}
.demo::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: ${COLORS.amber}; }

/* ---- Panel ------------------------------------------------------------------ */
.panel {
  position: fixed; top: 24px; right: 24px; width: 384px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
  display: flex; flex-direction: column; z-index: 2147483647; background: ${COLORS.white}; border-radius: 16px;
  box-shadow: 0 20px 48px rgba(17,17,17,0.22), 0 0 0 1px ${COLORS.line}; animation: pop 220ms ease-out;
}
@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: ${COLORS.mint}; border-radius: 16px 16px 0 0; }
.head img { width: 44px; height: 37px; object-fit: contain; }
.head .name { flex: 1; font-weight: 800; font-size: 16px; color: ${COLORS.forest}; display: flex; align-items: center; gap: 4px; }
.head .name .key { min-width: 22px; height: 22px; font-size: 12px; padding: 0 5px; border-width: 1.5px; box-shadow: 0 1.5px 0 currentColor; }
.close { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: ${COLORS.stone}; }
.close:hover { background: ${COLORS.white}; }
.body { padding: 16px; overflow: auto; }
.foot { padding: 12px 16px 16px; border-top: 1px solid ${COLORS.line}; }
.foot:empty { display: none; }
h2 { font-size: 20px; font-weight: 800; line-height: 1.2; }
.sub { color: ${COLORS.stone}; font-size: 13px; margin-top: 4px; }
label.field { display: block; margin-top: 14px; font-size: 12px; font-weight: 700; color: ${COLORS.stone}; text-transform: uppercase; letter-spacing: 0.04em; }
.input {
  display: block; width: 100%; height: 40px; margin-top: 6px; padding: 0 10px; border: 1.5px solid ${COLORS.line};
  border-radius: 10px; background: ${COLORS.white}; font-size: 14px;
}
.input:focus { outline: none; border-color: ${COLORS.forest}; }
.row { display: grid; grid-template-columns: 52px 1fr 84px 28px; gap: 6px; align-items: center; margin-top: 6px; }
.row .input { margin-top: 0; }
.row .x { width: 28px; height: 28px; border-radius: 50%; color: ${COLORS.stone}; display: grid; place-items: center; }
.row .x:hover { background: ${COLORS.mint}; }
.cols { display: grid; grid-template-columns: 52px 1fr 84px 28px; gap: 6px; margin-top: 6px; font-size: 11px; color: ${COLORS.stone}; }
.link { color: ${COLORS.forest}; font-weight: 700; font-size: 13px; margin-top: 8px; }
.total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding-top: 12px; border-top: 1px dashed ${COLORS.line}; }
.note { margin-top: 10px; padding: 8px 10px; border-radius: 10px; background: ${COLORS.mint}; color: ${COLORS.forest}; font-size: 12px; }
.primary {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: ${SHAPE.bottomButtonHeight}px;
  border-radius: ${SHAPE.radius}px; background: ${COLORS.forest}; color: ${COLORS.white}; font-size: 17px; font-weight: 700;
}
.primary:disabled { opacity: 0.45; cursor: default; }
.quiet { display: block; margin: 10px auto 0; color: ${COLORS.stone}; font-size: 13px; text-decoration: underline; }
.center { text-align: center; }
.error { margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(242,169,0,0.14); font-size: 13px; }

/* working */
.steps { list-style: none; margin-top: 16px; display: grid; gap: 12px; }
.steps li { display: flex; align-items: center; gap: 10px; font-weight: 600; opacity: 0.25; transition: opacity 300ms; }
.steps li.on { opacity: 1; }
.dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${COLORS.leaf}; display: grid; place-items: center; flex: none; }
.steps li.done .dot { background: ${COLORS.leaf}; color: ${COLORS.white}; }
.zee { display: block; margin: 4px auto 0; width: 120px; height: 100px; object-fit: contain; animation: bob 1.6s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-5px); } }

/* plan */
.card { padding: 14px; border-radius: ${SHAPE.radius}px; background: ${COLORS.mint}; }
.card .title { font-size: 18px; font-weight: 800; line-height: 1.25; }
.card .line { margin-top: 4px; color: ${COLORS.stone}; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip { padding: 3px 10px; border-radius: 999px; background: ${COLORS.white}; font-size: 12px; font-weight: 600; }
.plan { margin-top: 16px; display: grid; gap: 8px; font-size: 16px; }
.plan .mono { font-size: 17px; }
.grey { margin-top: 12px; color: ${COLORS.stone}; font-size: 12px; }
.floor { display: flex; align-items: center; justify-content: space-between; }
.stepper { display: inline-flex; align-items: center; gap: 10px; }
.step {
  width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid ${COLORS.line}; font-size: 20px; line-height: 1;
  display: grid; place-items: center; color: ${COLORS.ink};
}
.step:disabled { color: ${COLORS.line}; cursor: default; }
.stepval { width: 72px; text-align: center; }
.h3 { margin-top: 18px; font-size: 16px; font-weight: 800; }
.choices { display: grid; gap: 8px; margin-top: 10px; }
.choice {
  display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 11px 14px; text-align: left;
  border-radius: ${SHAPE.radius}px; border: 1.5px solid ${COLORS.line}; font-size: 14px;
}
.choice.on { border-color: ${COLORS.forest}; background: ${COLORS.mint}; color: ${COLORS.forest}; font-weight: 700; }
.choice .tick { width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${COLORS.line}; flex: none; }
.choice.on .tick { border-color: ${COLORS.forest}; background: ${COLORS.forest}; box-shadow: inset 0 0 0 3px ${COLORS.white}; }
.server { padding: 0 16px 10px; color: ${COLORS.stone}; font-size: 11px; }

/* live */
.live { display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.forest}; font-weight: 700; font-size: 13px; }
.live::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: ${COLORS.leaf}; box-shadow: 0 0 0 0 ${COLORS.leaf}; animation: pulse 1.4s infinite; }
@keyframes pulse { 70% { box-shadow: 0 0 0 8px rgba(108,194,74,0); } 100% { box-shadow: 0 0 0 0 rgba(108,194,74,0); } }
.price { font-family: ${FONTS.mono}; font-weight: 700; font-size: 48px; color: ${COLORS.forest}; margin-top: 8px; letter-spacing: -0.02em; }
.price.drop { animation: drop 360ms ease-out; }
@keyframes drop { 0% { transform: translateY(-6px); opacity: 0.4; } 100% { transform: none; opacity: 1; } }
.meta { display: flex; justify-content: space-between; margin-top: 6px; color: ${COLORS.stone}; }
.big { font-size: 28px; font-weight: 800; color: ${COLORS.forest}; }

@media (prefers-reduced-motion: reduce) {
  *, *::before { animation: none !important; transition: none !important; }
}
`;

  // src/ui/dom.ts
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === false || v == null) continue;
      if (k === "class") el.className = String(v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of children) if (c) el.append(c);
    return el;
  }
  function fill(el, ...children) {
    el.replaceChildren(...children.filter((c) => !!c));
  }
  var keycaps = () => h("span", { class: "keys", "aria-hidden": "true" }, h("span", { class: "key" }, "Ctrl"), h("span", { class: "plus" }, "+"), h("span", { class: "key" }, "Z"));
  function shadowHost(tagName) {
    const host = document.createElement(tagName);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.append(h("style", {}, CSS));
    const root2 = h("div", { class: "root" });
    shadow.append(root2);
    return { host, root: root2 };
  }

  // src/ui/hold.ts
  var HOLD_MS = 1e3;
  function makeHoldButton(btn, onConfirm, ms = HOLD_MS) {
    btn.classList.add("hold");
    btn.style.setProperty("--hold-ms", `${ms}ms`);
    let timer;
    const start = () => {
      if (btn.disabled || timer) return;
      btn.classList.add("holding");
      timer = setTimeout(() => {
        timer = void 0;
        btn.classList.remove("holding");
        btn.classList.add("held");
        setTimeout(() => btn.classList.remove("held"), 400);
        onConfirm();
      }, ms);
    };
    const cancel = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = void 0;
      btn.classList.remove("holding");
    };
    btn.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
      }
      start();
    });
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointercancel", cancel);
    btn.addEventListener("lostpointercapture", cancel);
    btn.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        start();
      }
    });
    btn.addEventListener("keyup", (e) => {
      if (e.key === " " || e.key === "Enter") cancel();
    });
    btn.addEventListener("blur", cancel);
    btn.addEventListener("click", (e) => e.preventDefault());
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // src/ui/button.ts
  var CtrlzButton = class {
    host;
    dock;
    demoLabel;
    constructor(onConfirm) {
      const { host, root: root2 } = shadowHost("ctrlz-eats-button");
      this.host = host;
      const btn = h(
        "button",
        { class: "ctrlz", type: "button", "aria-label": "Ctrl+Z this order. Press and hold." },
        keycaps(),
        h("span", {}, "this order")
      );
      makeHoldButton(btn, onConfirm);
      this.demoLabel = h("span", { class: "demo" }, "Demo mode");
      this.dock = h("div", { class: "dock" }, btn, h("div", { class: "under" }, h("span", { class: "hint" }, "Press and hold"), this.demoLabel));
      root2.append(this.dock);
    }
    /** Show the button after `anchor`, or floating when anchor is null. Does nothing if it's already there. */
    mount(anchor, demo) {
      this.demoLabel.style.display = demo ? "" : "none";
      if (anchor) {
        this.dock.classList.remove("floating");
        if (anchor.nextElementSibling !== this.host) anchor.insertAdjacentElement("afterend", this.host);
      } else {
        this.dock.classList.add("floating");
        if (this.host.parentElement !== document.body) document.body.append(this.host);
      }
    }
    unmount() {
      this.host.remove();
    }
  };

  // ../shared/catalog.ts
  var TAG_LABELS = {
    burgers: "Burgers",
    pizza: "Pizza",
    sushi: "Sushi",
    asian: "Asian",
    bowls: "Healthy / bowls",
    sandwiches: "Sandwiches",
    coffee_bakery: "Coffee & bakery",
    dessert: "Dessert",
    fries: "Fries",
    drinks: "Drinks"
  };
  var FALLBACKS = [
    { key: "pickup_self", label: "I'll pick it up" },
    { key: "free", label: "Give it free to someone nearby" }
  ];

  // ../shared/constants.ts
  var roundPrice = (dollars) => Math.round(dollars * 10) / 10;
  var formatPrice = (dollars) => `$${dollars.toFixed(2)}`;
  var formatClock = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // img/mark.webp
  var mark_default = "data:image/webp;base64,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";

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

  // src/messages.ts
  var PORT_NAME = "ctrlz";

  // src/server.ts
  var port = null;
  var nextId = 1;
  var waiting = /* @__PURE__ */ new Map();
  var liveHandler = null;
  var livePath = null;
  var retry;
  function getPort() {
    if (port) return port;
    const p = chrome.runtime.connect({ name: PORT_NAME });
    port = p;
    p.onMessage.addListener((msg) => {
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
  function post(msg) {
    try {
      getPort().postMessage(msg);
    } catch {
      port = null;
      getPort().postMessage(msg);
    }
  }
  var ServerError = class extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
    status;
  };
  function call(method, path, body) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      waiting.set(id, (r) => {
        if (r.ok) resolve(r.data);
        else reject(new ServerError(r.status, String(r.data?.error ?? "error")));
      });
      post({ kind: "call", id, method, path, body });
    });
  }
  var server = {
    importOrder: (body) => call("POST", API.importOrder(), body),
    undo: (orderId) => call("POST", API.undo(orderId)),
    publish: (listingId, body) => call("POST", API.publish(listingId), body)
  };
  function scheduleLiveRetry() {
    if (!livePath) return;
    clearTimeout(retry);
    retry = setTimeout(() => livePath && post({ kind: "live", path: livePath }), 1500);
  }
  function startLive(orderId, onMessage) {
    liveHandler = onMessage;
    livePath = API.wsSeller(orderId);
    post({ kind: "live", path: livePath });
  }
  function stopLive() {
    clearTimeout(retry);
    livePath = null;
    liveHandler = null;
    if (port) post({ kind: "live-stop" });
  }

  // src/ui/panel.ts
  var WORKING_LINES = ["Reading your order…", "Checking who's hungry nearby…", "Cooking up your listing…"];
  var LINE_MS = 900;
  var wait = (ms) => new Promise((r) => setTimeout(r, ms));
  var cents = (n) => Math.round(n * 100) / 100;
  var foodPrice = (items) => cents(items.reduce((s, it) => s + (it.price > 0 ? it.price : 0), 0));
  var validItems = (items) => items.filter((it) => it.name.trim() && it.price > 0);
  function problem(e) {
    if (e instanceof ServerError && e.status === 0) return "Can't reach Ctrl+Z Eats. Check the server in the extension popup, then try again.";
    return "Something went wrong on the Ctrl+Z Eats server. Try again.";
  }
  var Panel = class {
    host;
    root;
    body;
    foot;
    demo = false;
    apiBase = "";
    run = 0;
    // bumps on every open/close, so late answers from an old run are ignored
    constructor() {
      const { host, root: root2 } = shadowHost("ctrlz-eats-panel");
      this.host = host;
      this.root = root2;
    }
    get isOpen() {
      return this.host.isConnected;
    }
    open(scraped, settings) {
      this.close();
      this.demo = settings.demo;
      this.apiBase = settings.apiBase;
      const draft = {
        restaurant: scraped?.restaurant_name ?? "",
        items: scraped?.items.length ? scraped.items.map((it) => ({ ...it })) : [{ name: "", qty: 1, price: 0 }]
      };
      this.frame();
      document.body.append(this.host);
      this.showEdit(draft, !scraped || scraped.items.length === 0);
    }
    close() {
      this.run++;
      stopLive();
      this.host.remove();
    }
    /** Header (logo, name, Demo mode label, close) + body + footer. */
    frame() {
      const closeBtn = h("button", { class: "close", type: "button", "aria-label": "Close" }, "✕");
      closeBtn.addEventListener("click", () => this.close());
      const img = h("img", { src: mark_default, alt: "" });
      this.body = h("div", { class: "body" });
      this.foot = h("div", { class: "foot" });
      this.root.replaceChildren(
        h(
          "section",
          { class: "panel", role: "dialog", "aria-label": "Ctrl+Z Eats" },
          h("div", { class: "head" }, img, h("span", { class: "name" }, keycaps(), h("span", {}, "Eats")), this.demo && h("span", { class: "demo" }, "Demo mode"), closeBtn),
          this.body,
          this.foot,
          h("p", { class: "server" }, `Server: ${serverName(this.apiBase)}`)
        )
      );
    }
    // ---- 1. Check the order -------------------------------------------------------
    showEdit(draft, readFailed, error = "") {
      const total = h("span", { class: "mono" }, formatPrice(foodPrice(draft.items)));
      const cont = h("button", { class: "primary", type: "button" }, "Continue");
      const refresh = () => {
        total.textContent = formatPrice(foodPrice(draft.items));
        cont.disabled = !draft.restaurant.trim() || validItems(draft.items).length === 0;
      };
      const restaurant = h("input", { class: "input", value: draft.restaurant, placeholder: "e.g. Tim Hortons", "aria-label": "Restaurant" });
      restaurant.addEventListener("input", () => {
        draft.restaurant = restaurant.value;
        refresh();
      });
      const rows = h("div", {});
      const drawRows = () => {
        rows.replaceChildren(
          ...draft.items.map((it, i) => {
            const qty = h("input", { class: "input", type: "number", min: "1", max: "20", value: String(it.qty), "aria-label": "Quantity" });
            const name = h("input", { class: "input", value: it.name, placeholder: "Item", "aria-label": "Item name" });
            const price = h("input", { class: "input", inputmode: "decimal", value: it.price ? it.price.toFixed(2) : "", placeholder: "0.00", "aria-label": "Price in dollars" });
            const x = h("button", { class: "x", type: "button", "aria-label": "Remove item" }, "✕");
            qty.addEventListener("input", () => {
              it.qty = Math.max(1, Math.round(Number(qty.value) || 1));
            });
            name.addEventListener("input", () => {
              it.name = name.value;
              refresh();
            });
            price.addEventListener("input", () => {
              it.price = cents(Math.max(0, Number(price.value.replace(",", ".").replace(/[^0-9.]/g, "")) || 0));
              refresh();
            });
            x.addEventListener("click", () => {
              draft.items.splice(i, 1);
              if (draft.items.length === 0) draft.items.push({ name: "", qty: 1, price: 0 });
              drawRows();
              refresh();
            });
            return h("div", { class: "row" }, qty, name, price, x);
          })
        );
      };
      drawRows();
      const add = h("button", { class: "link", type: "button" }, "+ Add item");
      add.addEventListener("click", () => {
        draft.items.push({ name: "", qty: 1, price: 0 });
        drawRows();
        refresh();
      });
      fill(
        this.body,
        h("h2", {}, "Ctrl+Z this order"),
        h("p", { class: "sub" }, "Check the order. Only the restaurant, items and prices are sent."),
        readFailed && h("p", { class: "note" }, "We couldn't read this page. Type the order in."),
        h("label", { class: "field" }, "Restaurant", restaurant),
        h("label", { class: "field" }, "Items"),
        h("div", { class: "cols" }, h("span", {}, "Qty"), h("span", {}, "Name"), h("span", {}, "Price ($)"), h("span", {})),
        rows,
        add,
        h("div", { class: "total" }, h("span", {}, "Food price (no fees)"), total),
        error && h("p", { class: "error" }, error)
      );
      cont.addEventListener("click", () => this.submit(draft, readFailed));
      fill(this.foot, cont);
      refresh();
    }
    // ---- 2. Agent at work ------------------------------------------------------------
    async submit(draft, readFailed) {
      const run = this.run;
      const items = validItems(draft.items).map((it) => ({ name: it.name.trim(), qty: it.qty, price: it.price }));
      const steps = WORKING_LINES.map((t) => h("li", {}, h("span", { class: "dot" }), h("span", {}, t)));
      fill(this.body, h("img", { class: "zee", src: mark_default, alt: "" }), h("ul", { class: "steps" }, ...steps));
      fill(this.foot);
      const animate = (async () => {
        for (const li of steps) {
          li.classList.add("on");
          await wait(LINE_MS);
          li.classList.add("done");
          li.querySelector(".dot").textContent = "✓";
        }
      })();
      try {
        const imported = await server.importOrder({
          source: "doordash",
          restaurant_name: draft.restaurant.trim(),
          items,
          food_price: foodPrice(items),
          demo: this.demo
        });
        const plan = await server.undo(imported.order_id);
        await animate;
        if (run === this.run) this.showPlan(imported.order_id, draft.restaurant.trim(), plan);
      } catch (e) {
        if (run === this.run) this.showEdit(draft, readFailed, problem(e));
      }
    }
    // ---- 3. The agent's plan (S3 wording) ---------------------------------------------
    showPlan(orderId, restaurant, plan, error = "", choice = { floor: plan.floor_price, fallback: plan.fallback }) {
      const range = { min: plan.floor_min, max: plan.floor_max, step: plan.floor_step };
      const floorText = h("span", { class: "mono stepval" }, formatPrice(choice.floor));
      const lower = h("button", { class: "step", type: "button", "aria-label": "Lower" }, "−");
      const higher = h("button", { class: "step", type: "button", "aria-label": "Higher" }, "+");
      const drawFloor = () => {
        floorText.textContent = formatPrice(choice.floor);
        lower.disabled = choice.floor <= range.min;
        higher.disabled = choice.floor >= range.max;
      };
      const stepFloor = (dir) => {
        choice.floor = Math.min(range.max, Math.max(range.min, roundPrice(choice.floor + dir * range.step)));
        drawFloor();
      };
      lower.addEventListener("click", () => stepFloor(-1));
      higher.addEventListener("click", () => stepFloor(1));
      drawFloor();
      const fallbacks = FALLBACKS.map((f) => {
        const btn = h("button", { class: "choice", type: "button", role: "radio" }, h("span", {}, f.label), h("span", { class: "tick" }));
        btn.addEventListener("click", () => {
          choice.fallback = f.key;
          drawFallback();
        });
        return { key: f.key, btn };
      });
      const drawFallback = () => {
        for (const f of fallbacks) {
          const on = f.key === choice.fallback;
          f.btn.classList.toggle("on", on);
          f.btn.setAttribute("aria-checked", String(on));
        }
      };
      drawFallback();
      const chips = [...plan.tags.map((t) => TAG_LABELS[t]), ...plan.may_contain.length ? [`May contain: ${plan.may_contain.join(", ")}`] : []];
      fill(
        this.body,
        h(
          "div",
          { class: "card" },
          h("p", { class: "title" }, plan.title),
          h("p", { class: "line" }, plan.selling_line),
          chips.length > 0 && h("div", { class: "chips" }, ...chips.map((c) => h("span", { class: "chip" }, c)))
        ),
        h(
          "div",
          { class: "plan" },
          h("p", {}, "Starts at ", h("span", { class: "mono" }, formatPrice(plan.start_price))),
          h("div", { class: "floor" }, h("span", {}, "Lowest price:"), h("span", { class: "stepper" }, lower, floorText, higher))
        ),
        h("p", { class: "h3" }, "If nobody buys it:"),
        h("div", { class: "choices", role: "radiogroup", "aria-label": "If nobody buys it" }, ...fallbacks.map((f) => f.btn)),
        h("p", { class: "grey" }, "Demo: the restaurant handover runs in the Ctrl+Z Eats app."),
        error && h("p", { class: "error" }, error)
      );
      const list = h("button", { class: "primary", type: "button", "aria-label": "List it. Press and hold." }, h("span", {}, "List it"), h("span", { "aria-hidden": "true" }, "→"));
      const never = h("button", { class: "quiet", type: "button" }, "Never mind, keep my order");
      never.addEventListener("click", () => this.close());
      makeHoldButton(list, async () => {
        const run = this.run;
        list.disabled = true;
        try {
          const live = await server.publish(plan.listing_id, { floor_price: choice.floor, fallback: choice.fallback });
          if (run === this.run) this.showLive(orderId, restaurant, plan.listing_id, live.price, live.seconds_left);
        } catch (e) {
          if (run === this.run) this.showPlan(orderId, restaurant, plan, problem(e), choice);
        }
      });
      fill(this.foot, list, h("p", { class: "hint center" }, "Press and hold"), never);
    }
    // ---- 4. Live (S4) and the endings (S5) ------------------------------------------------
    showLive(orderId, restaurant, listingId, startPrice, secondsLeft) {
      const price = h("p", { class: "price" }, formatPrice(startPrice));
      const left = h("span", {}, `${formatClock(secondsLeft)} left`);
      const reach = h("span", {}, "");
      const state = h("p", { class: "sub" }, "");
      fill(
        this.body,
        h("p", { class: "live" }, "Listed on Ctrl+Z Eats"),
        price,
        h("div", { class: "meta" }, left, reach),
        state,
        h("p", { class: "grey" }, "Demo: the restaurant handover runs in the Ctrl+Z Eats app.")
      );
      fill(this.foot);
      let last = startPrice;
      const end = (...lines2) => {
        stopLive();
        fill(this.body, ...lines2.map((l) => typeof l === "string" ? l && h("p", { class: "sub" }, l) : l));
        const done = h("button", { class: "primary", type: "button" }, "Close");
        done.addEventListener("click", () => this.close());
        fill(this.foot, done);
      };
      startLive(orderId, (m) => {
        if ("listing_id" in m && m.listing_id !== listingId) return;
        switch (m.type) {
          case "listing.tick":
            if (m.price < last) {
              price.classList.remove("drop");
              void price.offsetWidth;
              price.classList.add("drop");
            }
            last = m.price;
            price.textContent = formatPrice(m.price);
            left.textContent = `${formatClock(m.seconds_left)} left`;
            break;
          case "listing.reach":
            reach.textContent = `Sent to ${m.reached} people nearby`;
            break;
          case "listing.locked":
            state.textContent = "Someone is paying…";
            break;
          case "listing.unlocked":
            state.textContent = "";
            break;
          case "listing.sold":
            if (m.sold_price > 0) end(h("p", { class: "big" }, "Sold!"), `You got ${formatPrice(m.sold_price)} back.`, `A buyer picks it up at ${new Date(m.pickup_by).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Nothing else to do.`);
            else end(h("p", { class: "big" }, "Taken!"), "Someone nearby took it. Thank you!");
            break;
          case "listing.closed":
            if (m.outcome === "free_window") {
              state.textContent = "Nobody bought it, so it's now free for someone nearby. You'll get a thank-you when it's taken.";
              price.textContent = formatPrice(0);
            } else if (m.outcome === "donated") end(h("p", { class: "big" }, "Thanks!"), "Thanks! Your meal is set aside for donation.");
            else if (m.outcome === "stopped") end(h("p", { class: "big" }, "Stopped"), "Your order is back to normal.");
            else end(h("p", { class: "big" }, "Time is up"), `Nobody grabbed it. Your order is waiting at ${restaurant}.`, m.pickup_code ? `Pickup code ${m.pickup_code}` : "");
            break;
        }
      });
    }
  };

  // src/content.ts
  var CHECK_EVERY_MS = 400;
  var SETTLE_AFTER_LOAD_MS = 800;
  var pageSettled = new Promise((resolve) => {
    const later = () => setTimeout(resolve, SETTLE_AFTER_LOAD_MS);
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  });
  async function main() {
    const reader = readerFor(location.hostname);
    if (!reader) return;
    await pageSettled;
    let settings = await getSettings();
    let latest = null;
    const panel = new Panel();
    const button = new CtrlzButton(() => panel.open(reader.read(document) ?? latest, settings));
    const check = () => {
      const onOrder = reader.isOrderPage(document, new URL(location.href));
      latest = onOrder ? reader.read(document) : null;
      if (onOrder && (settings.demo || latest?.is_preparing === true)) button.mount(reader.anchor(document), settings.demo);
      else button.unmount();
    };
    let timer;
    let lastRun = 0;
    const schedule = () => {
      if (timer) return;
      const delay = Math.max(0, CHECK_EVERY_MS - (Date.now() - lastRun));
      timer = setTimeout(() => {
        timer = void 0;
        lastRun = Date.now();
        check();
      }, delay);
    };
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    let href = location.href;
    setInterval(() => {
      if (location.href === href) return;
      href = location.href;
      schedule();
    }, 300);
    window.addEventListener("popstate", schedule);
    onSettingsChange(async () => {
      settings = await getSettings();
      schedule();
    });
    schedule();
  }
  void main();
})();
