// DoorDash site reader. EVERY DoorDash selector and text pattern lives in this file.
// DoorDash changes its HTML often, so we never use generated class names: only the visible text
// (read line by line, like a person would), links to the store page, aria-*/role and data-testid.
// We read only food facts. The address, payment, Dasher and customer name are never kept.
import type { ScrapedItem, ScrapedOrder, SiteReader } from "./types";

// ---- Text patterns ---------------------------------------------------------
/** "$11.49", "CA$11.49", "$11.49 CAD" (a whole line). */
const PRICE_LINE = /^(?:CA|C|US)?\$\s?(\d{1,4}(?:,\d{3})*\.\d{2})(?:\s*(?:CAD|USD))?$/i;
/** "1x", "2 ×", "Qty 2", "Quantity: 2" (a whole line). */
const QTY_LINE = /^(?:(\d{1,2})\s*[x×]|(?:qty|quantity):?\s*(\d{1,2}))$/i;
/** "1x Little Cheeseburger" or "1 × Little Cheeseburger" (qty and name on one line). */
const QTY_NAME_LINE = /^(\d{1,2})\s*[x×]\s+(.+)$/i;
/** "Little Cheeseburger $11.49" (name and price on one line). */
const NAME_PRICE_LINE = /^(.+?)\s+(?:CA|C|US)?\$\s?(\d{1,4}(?:,\d{3})*\.\d{2})$/i;
/** Lines that are money but not food (booklet R7: the start price is food only). */
const NOT_FOOD = /subtotal|total|fee|tax|tip|dasher|discount|promo|credit|saving|delivery|service|small order|expanded range|refund|charged|payment|paid|visa|mastercard|amex|apple pay|google pay|dashpass|gift card/i;
/** Status lines on a live order page, and on past orders. */
const STATUS_LINE = /preparing|being prepared|being made|making your order|is cooking|in the kitchen|confirmed your order|order (?:received|confirmed|placed)|heading to|on (?:its|the) way|picked up|arriving|ready for pickup|delivered|complete|cancell?ed/i;
const PREPARING = /prepar|being made|making your order|is cooking|in the kitchen|confirmed your order/i;
const DONE = /delivered|complete|cancell?ed|picked up|on (?:its|the) way|ready for pickup/i;
/** Headings that are not a restaurant name. */
const GENERIC = /^(?:order|orders|your order|order details|receipt|help|reorder|view store|visit store|store|menu|track order|get help|rate|doordash)$/i;
/** "Your order from Five Guys", "Order from Five Guys". */
const FROM_LINE = /^(?:your order from|order from|ordered from)\s+(.{2,60})$/i;

// ---- DoorDash data-testid values (seen on a real order page, Nov 21 2026) ----------
/** The status heading, e.g. "Preparing your order" / "Order Complete". */
const TID_STATUS = "[data-testid='order-status']";
/** The status block (heading, time, progress steps). Our button goes right after it. */
const TID_STATUS_SECTION = "[data-testid='OrderStatusSection']";
/** The store block: first line is the restaurant name ("Shake Shack", then "3 Items", "Rate store"). */
const TID_MERCHANT = "[data-testid='merchantSection']";
/** The block with the store and the item lines ("1× Fries", "$4.79"). Fees are in a separate block. */
const TID_ITEMS = "[data-testid='DeliverySection']";

// ---- Page helpers ------------------------------------------------------------
const root = (doc: Document): HTMLElement => doc.querySelector<HTMLElement>("main, [role='main']") ?? doc.body;

/** The page's visible text, one trimmed line per entry (innerText follows the visual order). */
function lines(doc: Document, el: HTMLElement = root(doc)): string[] {
  return (el.innerText || "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const money = (s: string): number => Math.round(Number(s.replace(/,/g, "")) * 100) / 100;
const shortText = (el: Element | null): string => ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? "").replace(/\s+/g, " ").trim();
/** The first visible line of an element ("Shake Shack" out of "Shake Shack / 3 Items / Rate store"). */
const firstLine = (el: Element | null): string =>
  ((el as HTMLElement | null)?.innerText ?? "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).find(Boolean) ?? "";
const usableName = (t: string) => t.length >= 2 && t.length <= 60 && !GENERIC.test(t) && !PRICE_LINE.test(t) && !/^\d+ items?$/i.test(t);

// ---- Readers -----------------------------------------------------------------
function readRestaurant(doc: Document, text: string[]): string {
  // 0. DoorDash's store block.
  const merchant = firstLine(doc.querySelector(TID_MERCHANT));
  if (usableName(merchant)) return merchant;
  // 1. A link to the store's own page ("/store/five-guys-montreal-123/") carries its name.
  for (const a of root(doc).querySelectorAll<HTMLAnchorElement>("a[href*='/store/']")) {
    const t = shortText(a);
    if (t.length >= 2 && t.length <= 60 && !GENERIC.test(t) && !PRICE_LINE.test(t)) return t;
    const label = a.getAttribute("aria-label")?.trim() ?? "";
    if (label.length >= 2 && label.length <= 60 && !GENERIC.test(label)) return label;
  }
  // 2. A data-testid that names the store.
  for (const el of root(doc).querySelectorAll("[data-testid*='store' i], [data-testid*='merchant' i], [data-testid*='restaurant' i]")) {
    const t = firstLine(el);
    if (usableName(t)) return t;
  }
  // 3. "Your order from Five Guys".
  for (const l of text) {
    const m = FROM_LINE.exec(l);
    if (m) return m[1];
  }
  // 4. The first heading that is not a generic word or a status.
  for (const h of root(doc).querySelectorAll("h1, h2, h3, [role='heading']")) {
    const t = shortText(h);
    if (t.length >= 2 && t.length <= 60 && !GENERIC.test(t) && !STATUS_LINE.test(t) && !PRICE_LINE.test(t)) return t;
  }
  return "";
}

/** Items: a quantity ("1x"), then the name, then the price within a few lines. */
function readItems(text: string[]): ScrapedItem[] {
  const items: ScrapedItem[] = [];
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
      if (QTY_LINE.test(l) || QTY_NAME_LINE.test(l)) break; // the next item started: no price for this one
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
      if (!name) name = l; // first line after the quantity = the item name; later lines are options
    }
  }
  return items.filter((it) => it.price > 0);
}

function readStatus(doc: Document, text: string[]): string {
  // DoorDash's status heading first ("Preparing your order", "Order Complete").
  const heading = firstLine(doc.querySelector(TID_STATUS));
  if (heading && heading.length <= 80) return heading;
  // Then live regions (screen readers get the live status there), then any matching line.
  for (const el of root(doc).querySelectorAll("[role='status'], [aria-live]")) {
    const t = shortText(el);
    if (t && t.length <= 80 && STATUS_LINE.test(t)) return t;
  }
  return text.find((l) => l.length <= 80 && STATUS_LINE.test(l)) ?? "";
}

/** The element whose own text is exactly `wanted` (first match), for placing our button. */
function elementWithText(doc: Document, wanted: RegExp): Element | null {
  const walker = doc.createTreeWalker(root(doc), NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (wanted.test((n.textContent ?? "").trim())) return n.parentElement;
  }
  return null;
}

// ---- The reader ----------------------------------------------------------------
export const doordash: SiteReader = {
  source: "doordash",

  matches: (host) => host === "www.doordash.com" || host === "doordash.com",

  isOrderPage(doc, url) {
    // Live tracking and past receipts live under /orders/<id>; some flows use order-status or receipt paths.
    if (/^\/orders?\/[^/]{6,}/i.test(url.pathname) || /\/(?:order-status|receipt|track)/i.test(url.pathname)) return true;
    // Otherwise: a page that shows both an order item and a status line.
    const text = lines(doc);
    return readItems(text).length > 0 && readStatus(doc, text) !== "";
  },

  read(doc) {
    try {
      const text = lines(doc);
      const itemsBlock = doc.querySelector<HTMLElement>(TID_ITEMS);
      let items = itemsBlock ? readItems(lines(doc, itemsBlock)) : [];
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
        is_preparing: PREPARING.test(status_text) && !DONE.test(status_text),
      };
    } catch {
      return null; // the demo must never die because a selector broke
    }
  },

  anchor(doc) {
    // Next to DoorDash's own Cancel button if there is one, else under the status line.
    for (const el of root(doc).querySelectorAll("button, a, [role='button']")) {
      if (/^cancel(?: order)?$/i.test(shortText(el))) return el;
    }
    return doc.querySelector(TID_STATUS_SECTION) ?? elementWithText(doc, STATUS_LINE);
  },
};
