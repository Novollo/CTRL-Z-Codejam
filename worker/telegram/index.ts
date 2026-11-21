// Track D: the Telegram bot (booklet section 7). Runs through the webhook POST /api/telegram/webhook.
// Commands: /start, /on, /off, /settings, /stop, plus Telegram's (live) location.
// Every profile change is written to the `buyers` table, then Market is told (notifyBuyerChanged).
// Plain text messages (no parse_mode), so restaurant names and titles never break the formatting.

import { BUYER_DIETS, CAMPUS_SPOTS, FOOD_TYPES, WALK_CHOICES_MIN } from "@shared/catalog";
import type { BuyerDiet, CampusSpot, FoodType } from "@shared/catalog";
import { BUYER_MAX_PRICE, formatPrice } from "@shared/constants";
import type { Env } from "../env";
import type { EditTelegramPing, HandleTelegramUpdate, SendTelegramPing } from "../integrations";
import { notifyBuyerChanged } from "../market";

// ---- Exact texts (booklet 7) and small bot texts ---------------------------------
export const TEXT = {
  welcome: "Hi! I'm Zee from Ctrl+Z Eats. I'll ping you when regretted food near campus drops in price.",
  askName: "What's your first name?",
  on: "Pings on 🟢",
  off: "Paused",
  stopped: "Your profile is deleted. Send /start to come back.",
  needStart: "Send /start to begin.",
  location: "Got your location. Walk times now use it.",
  help: "Commands: /settings · /on · /off · /stop",
  buyNow: "Buy now",
} as const;

/** Max price buttons ($3 to $25, like the B1 slider). */
const PRICE_CHOICES = [3, 5, 8, 10, 12, 15, 20, 25].filter((p) => p >= BUYER_MAX_PRICE.min && p <= BUYER_MAX_PRICE.max);

// ---- Telegram shapes we read (only the fields we use) -----------------------------
interface TgMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  location?: { latitude: number; longitude: number };
}
interface TgUpdate {
  message?: TgMessage;
  edited_message?: TgMessage; // live location updates arrive here
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
}
type Button = { text: string; callback_data?: string; url?: string };
type Keyboard = Button[][];

// ---- The buyers row, as the bot uses it -------------------------------------------
interface BotBuyer {
  id: string;
  name: string; // "" = we asked for the first name and are waiting
  notify_on: boolean;
  spot: CampusSpot | null;
  lat: number | null;
  lng: number | null;
  max_walk_min: number;
  food_types: FoodType[];
  diet: BuyerDiet[];
  max_price: number;
}

// ---- Webhook entry ----------------------------------------------------------------

export const handleTelegramUpdate: HandleTelegramUpdate = async (env, update) => {
  try {
    const u = (update ?? {}) as TgUpdate;
    if (u.callback_query) return await onButton(env, u.callback_query);
    const msg = u.message ?? u.edited_message;
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    if (msg.location) return await onLocation(env, chatId, msg.location, Boolean(u.message));
    if (typeof msg.text === "string" && u.message) return await onText(env, chatId, msg.text.trim());
  } catch (err) {
    // Never throw: Telegram would resend the same update again and again.
    console.error("telegram: update failed:", err instanceof Error ? err.message : String(err));
  }
};

async function onText(env: Env, chatId: string, text: string) {
  const command = text.startsWith("/") ? text.split(/[\s@]/)[0].toLowerCase() : null;
  const buyer = await getBuyer(env, chatId);

  if (command === "/start") {
    await send(env, chatId, TEXT.welcome);
    if (buyer?.name) return void (await send(env, chatId, menuText(buyer), mainMenu()));
    if (!buyer) await createBuyer(env, chatId);
    return void (await send(env, chatId, TEXT.askName, { force_reply: true }));
  }
  if (!buyer) return void (await send(env, chatId, TEXT.needStart));

  if (command === "/stop") {
    await deleteBuyer(env, buyer.id);
    await changed(env, buyer.id);
    return void (await send(env, chatId, TEXT.stopped));
  }

  // Waiting for the first name: the next plain message is the name.
  if (!buyer.name) {
    if (command) return void (await send(env, chatId, TEXT.askName, { force_reply: true }));
    const name = text.replace(/\s+/g, " ").slice(0, 40);
    await updateBuyer(env, buyer.id, { name });
    return void (await send(env, chatId, menuText({ ...buyer, name }), mainMenu()));
  }

  if (command === "/on" || command === "/off") {
    const on = command === "/on";
    await updateBuyer(env, buyer.id, { notify_on: on ? 1 : 0 });
    await changed(env, buyer.id);
    return void (await send(env, chatId, on ? TEXT.on : TEXT.off));
  }
  if (command === "/settings") return void (await send(env, chatId, menuText(buyer), mainMenu()));

  await send(env, chatId, TEXT.help);
}

async function onLocation(env: Env, chatId: string, loc: { latitude: number; longitude: number }, isNew: boolean) {
  const buyer = await getBuyer(env, chatId);
  if (!buyer) return isNew ? void (await send(env, chatId, TEXT.needStart)) : undefined;
  await updateBuyer(env, buyer.id, { lat: loc.latitude, lng: loc.longitude });
  await changed(env, buyer.id);
  if (isNew) await send(env, chatId, TEXT.location); // live updates (edited_message) stay silent
}

// ---- Settings buttons (/settings) ---------------------------------------------------
// callback_data: "v:<view>" opens a view, "s:<spot>", "w:<min>", "f:<type>", "d:<diet>", "p:<price>" change a value.

async function onButton(env: Env, q: NonNullable<TgUpdate["callback_query"]>) {
  await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
  if (!q.message || !q.data) return;
  const chatId = String(q.message.chat.id);
  const buyer = await getBuyer(env, chatId);
  if (!buyer) return void (await send(env, chatId, TEXT.needStart));

  const [kind, value] = q.data.split(":", 2);
  let view = "main";
  const patch: Record<string, unknown> = {};
  if (kind === "v") view = value;
  else if (kind === "s" && CAMPUS_SPOTS.some((s) => s.key === value)) {
    Object.assign(patch, { spot: value, lat: null, lng: null }); // a chosen spot replaces the shared location
    buyer.spot = value as CampusSpot;
    buyer.lat = buyer.lng = null;
  } else if (kind === "w" && (WALK_CHOICES_MIN as readonly number[]).includes(Number(value))) {
    patch.max_walk_min = buyer.max_walk_min = Number(value);
  } else if (kind === "p" && PRICE_CHOICES.includes(Number(value))) {
    patch.max_price = buyer.max_price = Number(value);
  } else if (kind === "f" && FOOD_TYPES.some((f) => f.key === value)) {
    buyer.food_types = toggle(buyer.food_types, value as FoodType);
    patch.food_types = JSON.stringify(buyer.food_types);
    view = "food";
  } else if (kind === "d" && BUYER_DIETS.some((d) => d.key === value)) {
    buyer.diet = toggle(buyer.diet, value as BuyerDiet);
    patch.diet = JSON.stringify(buyer.diet);
    view = "diet";
  }

  if (Object.keys(patch).length > 0) {
    await updateBuyer(env, buyer.id, patch);
    await changed(env, buyer.id);
  }
  const keyboard = view === "main" ? mainMenu().inline_keyboard : subMenu(view, buyer);
  await tg(env, "editMessageText", {
    chat_id: chatId,
    message_id: q.message.message_id,
    text: view === "main" ? menuText(buyer) : VIEW_TITLES[view] ?? menuText(buyer),
    reply_markup: { inline_keyboard: keyboard },
  });
}

/** The criteria from B1, with the same labels. */
const VIEW_TITLES: Record<string, string> = {
  spot: "Where are you?",
  walk: "How far will you walk?",
  food: "What do you like?",
  diet: "Diet",
  price: "Max price",
};

function mainMenu(): { inline_keyboard: Keyboard } {
  return {
    inline_keyboard: [
      [{ text: VIEW_TITLES.spot, callback_data: "v:spot" }, { text: VIEW_TITLES.walk, callback_data: "v:walk" }],
      [{ text: VIEW_TITLES.food, callback_data: "v:food" }, { text: VIEW_TITLES.diet, callback_data: "v:diet" }],
      [{ text: VIEW_TITLES.price, callback_data: "v:price" }],
    ],
  };
}

function subMenu(view: string, b: BotBuyer): Keyboard {
  const mark = (on: boolean, label: string) => (on ? `✓ ${label}` : label);
  let buttons: Button[] = [];
  if (view === "spot") buttons = CAMPUS_SPOTS.map((s) => ({ text: mark(b.spot === s.key, s.label), callback_data: `s:${s.key}` }));
  if (view === "walk") buttons = WALK_CHOICES_MIN.map((m) => ({ text: mark(b.max_walk_min === m, `${m} min`), callback_data: `w:${m}` }));
  if (view === "food") buttons = FOOD_TYPES.map((f) => ({ text: mark(b.food_types.includes(f.key), f.label), callback_data: `f:${f.key}` }));
  if (view === "diet") buttons = BUYER_DIETS.map((d) => ({ text: mark(b.diet.includes(d.key), d.label), callback_data: `d:${d.key}` }));
  if (view === "price") buttons = PRICE_CHOICES.map((p) => ({ text: mark(b.max_price === p, `$${p}`), callback_data: `p:${p}` }));
  const rows: Keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push([{ text: "← Back", callback_data: "v:main" }]);
  return rows;
}

/** "Sarah: Trottier · 10 min walk · Burgers, Pizza · up to $12", like B2. */
function menuText(b: BotBuyer): string {
  const where = b.lat !== null && b.lng !== null ? "Live location" : (CAMPUS_SPOTS.find((s) => s.key === b.spot)?.label ?? "No spot yet");
  const food = b.food_types.length ? b.food_types.map((k) => FOOD_TYPES.find((f) => f.key === k)?.label ?? k).join(", ") : "Anything";
  const lines = [`${b.name}: ${where} · ${b.max_walk_min} min walk · ${food} · up to $${b.max_price}`];
  if (b.diet.length) lines.push(`Diet: ${b.diet.map((k) => BUYER_DIETS.find((d) => d.key === k)?.label ?? k).join(", ")}`);
  lines.push(b.notify_on ? TEXT.on : `${TEXT.off}. Send /on to get pings.`);
  return lines.join("\n");
}

// ---- Pings (called by Market) -------------------------------------------------------

/** Booklet 7: "Five Guys · Fresh Five Guys combo, untouched / Now $11.60 (was $17.78), dropping · 14 min left / Why you got this: …" + [Buy now]. */
export const sendTelegramPing: SendTelegramPing = async (env, chat_id, card, reason, buy_url) => {
  try {
    const minLeft = Math.max(1, Math.floor(card.seconds_left / 60));
    const priceLine =
      card.price > 0
        ? `Now ${formatPrice(card.price)} (was ${formatPrice(card.food_price)}), dropping · ${minLeft} min left`
        : `Now free (was ${formatPrice(card.food_price)}) · ${minLeft} min left`;
    const why = reason.startsWith("Why you got this") ? reason : `Why you got this: ${reason}`;
    const lines = [`${card.restaurant_name} · ${card.title}`, priceLine, why];
    // Telegram only accepts https links on buttons. On a laptop (http://localhost) the link goes in the text.
    const https = buy_url.startsWith("https://");
    if (!https) lines.push(`${TEXT.buyNow}: ${buy_url}`);
    const result = await tg(env, "sendMessage", {
      chat_id,
      text: lines.join("\n"),
      ...(https ? { reply_markup: { inline_keyboard: [[{ text: TEXT.buyNow, url: buy_url }]] } } : {}),
    });
    return typeof result?.message_id === "number" ? result.message_id : null;
  } catch (err) {
    console.error("telegram: ping failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
};

/** Replaces the ping text (e.g. "Gone — grabbed at $8.40") and removes the Buy button. */
export const editTelegramPing: EditTelegramPing = async (env, chat_id, message_id, text) => {
  try {
    await tg(env, "editMessageText", { chat_id, message_id, text, reply_markup: { inline_keyboard: [] } });
  } catch (err) {
    console.error("telegram: edit failed:", err instanceof Error ? err.message : String(err));
  }
};

// ---- Telegram Bot API ---------------------------------------------------------------

async function send(env: Env, chat_id: string, text: string, reply_markup?: unknown) {
  await tg(env, "sendMessage", { chat_id, text, ...(reply_markup ? { reply_markup } : {}) });
}

/** One Bot API call. Returns `result`, or null on any error (logged without the token). */
async function tg(env: Env, method: string, payload: unknown): Promise<{ message_id?: number } | null> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn(`telegram: TELEGRAM_BOT_TOKEN not set, skipped ${method}`);
    return null;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok: boolean; result?: { message_id?: number }; description?: string };
    if (!data.ok) {
      if (!String(data.description).includes("message is not modified")) console.warn(`telegram: ${method} failed: ${data.description}`);
      return null;
    }
    return data.result ?? null;
  } catch (err) {
    console.warn(`telegram: ${method} failed:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ---- buyers table -------------------------------------------------------------------

async function getBuyer(env: Env, chatId: string): Promise<BotBuyer | null> {
  const r = await env.DB.prepare(
    "SELECT id, name, notify_on, spot, lat, lng, max_walk_min, food_types, diet, max_price FROM buyers WHERE telegram_chat_id = ?",
  )
    .bind(chatId)
    .first<Record<string, unknown>>();
  if (!r) return null;
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    notify_on: Number(r.notify_on) === 1,
    spot: (r.spot as CampusSpot | null) ?? null,
    lat: r.lat === null ? null : Number(r.lat),
    lng: r.lng === null ? null : Number(r.lng),
    max_walk_min: Number(r.max_walk_min),
    food_types: parseList<FoodType>(r.food_types),
    diet: parseList<BuyerDiet>(r.diet),
    max_price: Number(r.max_price),
  };
}

/** New profile from /start: no name yet, pings off (like the toggle on B1), default criteria. */
async function createBuyer(env: Env, chatId: string) {
  await env.DB.prepare(
    `INSERT INTO buyers (id, token, name, notify_on, spot, lat, lng, max_walk_min, food_types, diet, max_price, telegram_chat_id)
     VALUES (?, ?, '', 0, NULL, NULL, NULL, 10, '[]', '[]', ?, ?)`,
  )
    .bind(`b_${randomHex(8)}`, `tok_${randomHex(16)}`, BUYER_MAX_PRICE.default, chatId)
    .run();
}

const COLUMNS = new Set(["name", "notify_on", "spot", "lat", "lng", "max_walk_min", "food_types", "diet", "max_price"]);

async function updateBuyer(env: Env, id: string, patch: Record<string, unknown>) {
  const keys = Object.keys(patch).filter((k) => COLUMNS.has(k));
  if (keys.length === 0) return;
  await env.DB.prepare(`UPDATE buyers SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
    .bind(...keys.map((k) => patch[k] ?? null), id)
    .run();
}

/** /stop: delete the profile and its pings. If a payment still points at it, keep the row but unlink it. */
async function deleteBuyer(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM pings WHERE buyer_id = ?").bind(id).run();
  try {
    await env.DB.prepare("DELETE FROM buyers WHERE id = ?").bind(id).run();
  } catch {
    await env.DB.prepare("UPDATE buyers SET notify_on = 0, telegram_chat_id = NULL, lat = NULL, lng = NULL WHERE id = ?").bind(id).run();
  }
}

async function changed(env: Env, buyerId: string) {
  try {
    await notifyBuyerChanged(env, buyerId);
  } catch (err) {
    console.error("telegram: notifyBuyerChanged failed:", err instanceof Error ? err.message : String(err));
  }
}

// ---- helpers ------------------------------------------------------------------------

function parseList<T>(v: unknown): T[] {
  try {
    const list = JSON.parse(String(v ?? "[]"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
