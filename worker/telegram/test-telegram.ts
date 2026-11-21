// Telegram bot test (track D) with sample update objects.
//   node worker/agent/run-test.mjs worker/telegram/test-telegram.ts
// Uses the real local database (npm run db:local). Calls to Telegram are CAPTURED, not sent,
// except one real getMe that checks TELEGRAM_BOT_TOKEN and prints the bot's @name.

import type { ListingCard } from "@shared/types";
import { testEnv } from "../agent/test-env";
import { TEXT, editTelegramPing, handleTelegramUpdate, sendTelegramPing } from "./index";

const CHAT = 990001; // made-up chat id, removed at the end
let failed = 0;
const check = (name: string, ok: boolean, info = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  " + info : ""}`);
};

// ---- capture Telegram calls ----
const realFetch = globalThis.fetch;
let sent: { method: string; body: Record<string, unknown> }[] = [];
let nextId = 100;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  const m = url.match(/^https:\/\/api\.telegram\.org\/bot[^/]+\/(\w+)$/);
  if (!m) return realFetch(input, init);
  sent.push({ method: m[1], body: JSON.parse(String(init?.body ?? "{}")) });
  return new Response(JSON.stringify({ ok: true, result: { message_id: nextId++ } }));
}) as typeof fetch;

const texts = () => sent.filter((s) => s.method === "sendMessage" || s.method === "editMessageText").map((s) => String(s.body.text));
const msg = (text: string) => ({ update_id: 1, message: { message_id: 1, chat: { id: CHAT }, text } });
const button = (data: string) => ({ update_id: 1, callback_query: { id: "q1", data, message: { message_id: 50, chat: { id: CHAT } } } });

async function main() {
  const { env, dispose } = await testEnv();
  const row = () => env.DB.prepare("SELECT * FROM buyers WHERE telegram_chat_id = ?").bind(String(CHAT)).first<Record<string, unknown>>();
  const run = async (update: unknown) => {
    sent = [];
    await handleTelegramUpdate(env, update);
  };
  try {
    await env.DB.prepare("DELETE FROM buyers WHERE telegram_chat_id = ?").bind(String(CHAT)).run();

    // Real token check (read-only).
    if (env.TELEGRAM_BOT_TOKEN) {
      const me = (await (await realFetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`)).json()) as { ok: boolean; result?: { username?: string } };
      check("TELEGRAM_BOT_TOKEN works (getMe)", me.ok, me.result?.username ? `bot is @${me.result.username}` : "");
    } else check("TELEGRAM_BOT_TOKEN is set", false);

    console.log("\n== Sample updates ==");
    await run(msg("/start"));
    check("/start → welcome text", texts()[0] === TEXT.welcome, JSON.stringify(texts()[0]));
    check("/start → asks first name", texts()[1] === TEXT.askName);
    check("/start → buyer row created, pings off", (await row())?.name === "" && (await row())?.notify_on === 0);

    await run(msg("Sarah"));
    check("name saved", (await row())?.name === "Sarah");
    check("then shows the settings menu", sent[0]?.body.reply_markup !== undefined, JSON.stringify(texts()[0]));

    await run(msg("/on"));
    check("/on → \"Pings on 🟢\"", texts()[0] === "Pings on 🟢" && (await row())?.notify_on === 1);

    await run(button("v:spot"));
    check("button opens \"Where are you?\"", sent.some((s) => s.method === "answerCallbackQuery") && texts()[0] === "Where are you?");
    await run(button("s:trottier"));
    await run(button("w:10"));
    await run(button("f:burgers"));
    await run(button("f:pizza"));
    await run(button("f:pizza")); // toggle off again
    await run(button("d:no_nuts"));
    await run(button("p:12"));
    const r = await row();
    check(
      "settings saved (Trottier, 10 min, Burgers, No nuts, $12)",
      r?.spot === "trottier" && r?.max_walk_min === 10 && r?.food_types === '["burgers"]' && r?.diet === '["no_nuts"]' && r?.max_price === 12,
      JSON.stringify({ spot: r?.spot, walk: r?.max_walk_min, food: r?.food_types, diet: r?.diet, max: r?.max_price }),
    );
    await run(msg("/settings"));
    console.log("  menu text:\n    " + texts()[0].replace(/\n/g, "\n    "));

    await run({ update_id: 2, message: { message_id: 3, chat: { id: CHAT }, location: { latitude: 45.5048, longitude: -73.5772 } } });
    check("location saved", (await row())?.lat === 45.5048 && texts()[0] === TEXT.location);
    await run({ update_id: 3, edited_message: { message_id: 3, chat: { id: CHAT }, location: { latitude: 45.505, longitude: -73.577 } } });
    check("live location update saved silently", (await row())?.lat === 45.505 && sent.length === 0);

    await run(msg("/off"));
    check("/off → \"Paused\"", texts()[0] === "Paused" && (await row())?.notify_on === 0);

    console.log("\n== Ping message ==");
    const card: ListingCard = {
      listing_id: "lst_demo", restaurant_name: "Five Guys", restaurant_address: "x", photo_url: "x", logo_url: "x",
      title: "Fresh Five Guys combo, untouched", selling_line: "x", tags: ["burgers"], may_contain: [],
      food_price: 17.78, price: 11.6, seconds_left: 14 * 60 + 5, status: "live", lock_until: null, walk_min: 6, items: [],
    };
    sent = [];
    const id = await sendTelegramPing(env, String(CHAT), card, "Why you got this: Burgers · 6 min walk · under your $12", "https://ctrlz-eats.stalerole.workers.dev/buy/lst_demo?t=tok_demo");
    const ping = sent[0]?.body;
    console.log("  " + String(ping?.text).replace(/\n/g, "\n  "));
    check(
      "ping text matches booklet 7",
      ping?.text === "Five Guys · Fresh Five Guys combo, untouched\nNow $11.60 (was $17.78), dropping · 14 min left\nWhy you got this: Burgers · 6 min walk · under your $12",
    );
    check("ping has [Buy now] link button", JSON.stringify(ping?.reply_markup).includes('"text":"Buy now","url":"https://'));
    check("ping returns the message id", typeof id === "number");
    sent = [];
    await sendTelegramPing(env, String(CHAT), card, "Burgers · 6 min walk", "http://localhost:5173/buy/lst_demo?t=tok_demo");
    check("http link (laptop) goes in the text instead", String(sent[0]?.body.text).includes("Buy now: http://localhost") && !sent[0]?.body.reply_markup);
    sent = [];
    await editTelegramPing(env, String(CHAT), 123, "Gone — grabbed at $8.40");
    check("edit → \"Gone — grabbed at $8.40\"", sent[0]?.method === "editMessageText" && sent[0]?.body.text === "Gone — grabbed at $8.40" && sent[0]?.body.message_id === 123);

    console.log("\n== Stop and odd input ==");
    await run(msg("/stop"));
    check("/stop → profile deleted", (await row()) === null && texts()[0] === TEXT.stopped);
    await run(msg("/on"));
    check("unknown chat → \"Send /start\"", texts()[0] === TEXT.needStart);
    await run({ nonsense: true });
    await run(null);
    check("bad updates do not throw", true);

    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
  } finally {
    await env.DB.prepare("DELETE FROM buyers WHERE telegram_chat_id = ?").bind(String(CHAT)).run();
    globalThis.fetch = realFetch;
    await dispose();
  }
}

await main();
