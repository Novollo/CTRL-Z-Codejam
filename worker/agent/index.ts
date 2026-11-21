// Track D: the seller agent (booklet section 8).
// One OpenAI call per listing. The model only suggests; checkAgentOutput (8.5) fixes every field,
// and defaultAgentOutput (8.6) is used when the call is off, slow or broken. Never throws.

import type { AgentInput, AgentOutput, AgentResult } from "@shared/agent";
import { ALLOWED_TAGS } from "@shared/catalog";
import type { DietAnswer, DropSpeed, ListingDiet, Tag } from "@shared/catalog";
import {
  AGENT_BANNED_WORDS, AGENT_DEFAULT_TEXT, AGENT_MODEL, AGENT_TEXT_MAX, AGENT_TIMEOUT_MS,
  DEFAULT_FLOOR_SHARE, FLOOR_MAX_SHARE, FLOOR_MIN_SHARE, roundPrice, roundPriceDown,
} from "@shared/constants";
import type { Restaurant } from "@shared/types";
import type { Env } from "../env";
import type { RunSellerAgent } from "../integrations";

// Booklet 8.4, plus the output shape from 8.3 so the model knows the field names.
export const SYSTEM_PROMPT = `You price and describe a food order that a student regrets and resells near McGill campus.
Return JSON only, matching the schema. No other text.
Tags: use only words from allowed_tags.
Diet: answer "yes", "no" or "unsure". If you are not sure, answer "unsure".
may_contain: list allergens that are possible. If unsure, include it.
Never write the words safe, allergen-free or healthy.
Pricing: start_price <= food_price. floor_price between 30% and 70% of food_price.
Many interested people nearby -> higher floor, drop_speed "slow". Few -> lower floor, "fast".
Food that goes cold or soggy fast (fries, hot food) -> faster.
title: max 40 characters. selling_line: max 100. reason: max 90, plain words, explains the price plan.
Demand is active_nearby_liking_category: the number of active people nearby who like this kind of food.
start_price is normally food_price.
reason is one short sentence, like: "Drops fast: only 4 people nearby want burgers right now."
Schema:
{"tags": string[], "diet": {"vegetarian": "yes"|"no"|"unsure", "vegan": "yes"|"no"|"unsure", "halal": "yes"|"no"|"unsure", "gluten_free": "yes"|"no"|"unsure"}, "may_contain": string[], "start_price": number, "floor_price": number, "drop_speed": "fast"|"normal"|"slow", "title": string, "selling_line": string, "reason": string}`;

const DIET_KEYS = ["vegetarian", "vegan", "halal", "gluten_free"] as const;
const DIET_ANSWERS: DietAnswer[] = ["yes", "no", "unsure"];
const DROP_SPEEDS: DropSpeed[] = ["fast", "normal", "slow"];

// ---- Defaults (8.6) ----------------------------------------------------------

export function defaultAgentOutput(input: AgentInput, restaurant: Restaurant): AgentOutput {
  const allowed = allowedTags(input);
  const tags = unique(restaurant.default_tags.filter((t) => allowed.includes(t)));
  const diet = {} as ListingDiet;
  for (const key of DIET_KEYS) {
    const v = restaurant.default_diet?.[key];
    diet[key] = DIET_ANSWERS.includes(v) ? v : "unsure";
  }
  return {
    tags,
    diet,
    may_contain: [],
    start_price: input.food_price,
    floor_price: clampFloor(roundPrice(input.food_price * DEFAULT_FLOOR_SHARE), input.food_price),
    drop_speed: "normal",
    title: cutText(AGENT_DEFAULT_TEXT.title(restaurant.name), AGENT_TEXT_MAX.title),
    selling_line: AGENT_DEFAULT_TEXT.selling_line,
    reason: AGENT_DEFAULT_TEXT.reason,
  };
}

// ---- Hard limits (8.5) -------------------------------------------------------

/** Turns whatever the model sent into a valid AgentOutput. A bad or missing field gets its default. */
export function checkAgentOutput(raw: unknown, input: AgentInput, restaurant: Restaurant): AgentOutput {
  const d = defaultAgentOutput(input, restaurant);
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const food = input.food_price;

  // Tags: drop any tag not in allowed_tags. Nothing left = treat as missing.
  const allowed = allowedTags(input);
  let tags = d.tags;
  if (Array.isArray(r.tags)) {
    const kept = unique(r.tags.filter((t): t is Tag => typeof t === "string" && allowed.includes(t as Tag)));
    if (kept.length > 0) tags = kept;
  }

  // Diet: each value must be yes / no / unsure, else the restaurant default.
  // ("unsure" stays "unsure" here; matching treats it as "no".)
  const diet = { ...d.diet };
  const rawDiet = (r.diet && typeof r.diet === "object" ? r.diet : {}) as Record<string, unknown>;
  for (const key of DIET_KEYS) {
    const v = rawDiet[key];
    if (typeof v === "string" && DIET_ANSWERS.includes(v as DietAnswer)) diet[key] = v as DietAnswer;
  }

  // may_contain: a list of short words.
  let may_contain = d.may_contain;
  if (Array.isArray(r.may_contain)) {
    may_contain = unique(
      r.may_contain.filter((x): x is string => typeof x === "string").map((x) => x.trim().toLowerCase()).filter(Boolean),
    );
  }

  // Prices. The floor range rounds inward to $0.10 (lead decision 13).
  const floorMin = Math.ceil(food * FLOOR_MIN_SHARE * 10 - 1e-9) / 10;
  let start = isPrice(r.start_price) ? r.start_price : food;
  if (start >= food) start = food; // start_price > food price → food price (kept exact: "Starts at $17.78")
  else start = roundPriceDown(start); // round down, so it can never pass the food price
  if (start < floorMin) start = food; // a start below the lowest allowed floor makes no sense → default

  let floor = isPrice(r.floor_price) ? roundPrice(r.floor_price) : d.floor_price;
  floor = clampFloor(floor, food);
  if (floor > start) floor = Math.max(floorMin, roundPrice(start * 0.5));

  const drop_speed = DROP_SPEEDS.includes(r.drop_speed as DropSpeed) ? (r.drop_speed as DropSpeed) : "normal";

  return {
    tags,
    diet,
    may_contain,
    start_price: start,
    floor_price: floor,
    drop_speed,
    title: checkText(r.title, d.title, AGENT_TEXT_MAX.title),
    selling_line: checkText(r.selling_line, d.selling_line, AGENT_TEXT_MAX.selling_line),
    reason: checkText(r.reason, d.reason, AGENT_TEXT_MAX.reason),
  };
}

// ---- The model call ----------------------------------------------------------

/** One OpenAI chat call in JSON mode. Returns the parsed JSON, or throws (timeout, HTTP error, bad JSON). */
export async function callOpenAI(env: Env, input: AgentInput): Promise<unknown> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: AGENT_MODEL,
        response_format: { type: "json_object" },
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI answer has no content");
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

export const runSellerAgent: RunSellerAgent = async (env, input, restaurant, agentMode) => {
  try {
    if (agentMode === "live" && env.OPENAI_API_KEY) {
      try {
        const raw = await callOpenAI(env, input);
        return { ...checkAgentOutput(raw, input, restaurant), agent_source: "live" };
      } catch (err) {
        console.warn("seller agent: using defaults:", err instanceof Error ? err.message : String(err));
      }
    }
    return { ...defaultAgentOutput(input, restaurant), agent_source: "default" };
  } catch (err) {
    // Last resort (e.g. a broken restaurant row): still never throw.
    console.error("seller agent: defaults failed:", err);
    return lastResortResult(input, restaurant);
  }
};

// ---- Small helpers -----------------------------------------------------------

function allowedTags(input: AgentInput): Tag[] {
  const fromInput = Array.isArray(input.allowed_tags) ? input.allowed_tags : [];
  return (ALLOWED_TAGS as readonly Tag[]).filter((t) => fromInput.length === 0 || fromInput.includes(t));
}

function clampFloor(floor: number, food: number): number {
  const min = Math.ceil(food * FLOOR_MIN_SHARE * 10 - 1e-9) / 10;
  const max = Math.floor(food * FLOOR_MAX_SHARE * 10 + 1e-9) / 10;
  return Math.min(max, Math.max(min, floor));
}

function isPrice(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}

const BANNED = new RegExp(AGENT_BANNED_WORDS.map((w) => w.replace(/-/g, "\\-")).join("|"), "i");

/** Missing, empty or banned words → default text. Too long → cut at the last full word + "…". */
function checkText(v: unknown, fallback: string, max: number): string {
  const text = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (!text || BANNED.test(text)) return fallback;
  return cutText(text, max);
}

function cutText(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1); // leave 1 character for "…"
  const lastSpace = room.lastIndexOf(" ");
  const cut = lastSpace > 0 ? room.slice(0, lastSpace) : room;
  return cut.replace(/[\s,.;:!?·—-]+$/, "") + "…";
}

function lastResortResult(input: AgentInput, restaurant: Restaurant): AgentResult {
  const food = Number(input?.food_price) || 0;
  return {
    tags: [],
    diet: { vegetarian: "unsure", vegan: "unsure", halal: "unsure", gluten_free: "unsure" },
    may_contain: [],
    start_price: food,
    floor_price: roundPrice(food * DEFAULT_FLOOR_SHARE),
    drop_speed: "normal",
    title: cutText(AGENT_DEFAULT_TEXT.title(restaurant?.name ?? "Restaurant"), AGENT_TEXT_MAX.title),
    selling_line: AGENT_DEFAULT_TEXT.selling_line,
    reason: AGENT_DEFAULT_TEXT.reason,
    agent_source: "default",
  };
}
