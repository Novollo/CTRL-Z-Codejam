// Seller agent test (booklet 8.7): the stage order, N real runs, every answer checked.
//   node worker/agent/run-test.mjs worker/agent/test-agent.ts          → offline rule checks + 20 live runs
//   node worker/agent/run-test.mjs worker/agent/test-agent.ts 1        → offline checks + 1 live run (debug)
//   node worker/agent/run-test.mjs worker/agent/test-agent.ts 0        → offline checks only (no OpenAI call)
// Needs OPENAI_API_KEY in .dev.vars and the local database (npm run db:local).

import type { AgentInput, AgentOutput } from "@shared/agent";
import { ALLOWED_TAGS } from "@shared/catalog";
import { AGENT_BANNED_WORDS, AGENT_TEXT_MAX, AGENT_TIMEOUT_MS, DEMO_RESTAURANT_ID } from "@shared/constants";
import type { Restaurant } from "@shared/types";
import { callOpenAI, checkAgentOutput, defaultAgentOutput, runSellerAgent } from "./index";
import { loadRestaurant, testEnv } from "./test-env";

const argv = ((globalThis as unknown as { process?: { argv: string[] } }).process?.argv ?? []).slice(3);
const RUNS = argv[0] === undefined ? 20 : Number(argv[0]);

// Booklet 8.2: the fixed stage order.
const STAGE_INPUT: AgentInput = {
  restaurant: "Five Guys",
  items: ["Little Cheeseburger", "Cajun Fries (regular)"],
  food_price: 17.78,
  minutes_until_ready: 4,
  active_nearby: 22,
  active_nearby_liking_category: 4,
  allowed_tags: [...ALLOWED_TAGS],
};

/** Every hard limit from 8.5, as a list of problems (empty = passes). */
function problems(o: AgentOutput, input: AgentInput): string[] {
  const p: string[] = [];
  const food = input.food_price;
  const tenth = (n: number) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-6;
  if (o.start_price > food) p.push(`start ${o.start_price} > food ${food}`);
  if (o.start_price !== food && !tenth(o.start_price)) p.push(`start ${o.start_price} not rounded to $0.10`);
  if (!tenth(o.floor_price)) p.push(`floor ${o.floor_price} not rounded to $0.10`);
  if (o.floor_price < food * 0.3 - 1e-9 || o.floor_price > food * 0.7 + 1e-9) p.push(`floor ${o.floor_price} outside 30–70%`);
  if (o.floor_price > o.start_price) p.push(`floor ${o.floor_price} > start ${o.start_price}`);
  if (!["fast", "normal", "slow"].includes(o.drop_speed)) p.push(`drop_speed ${o.drop_speed}`);
  for (const t of o.tags) if (!input.allowed_tags.includes(t)) p.push(`tag ${t} not allowed`);
  for (const k of ["vegetarian", "vegan", "halal", "gluten_free"] as const)
    if (!["yes", "no", "unsure"].includes(o.diet[k])) p.push(`diet.${k} = ${o.diet[k]}`);
  for (const [k, max] of Object.entries(AGENT_TEXT_MAX)) {
    const text = o[k as keyof typeof AGENT_TEXT_MAX];
    if (!text) p.push(`${k} empty`);
    if (text.length > max) p.push(`${k} is ${text.length} > ${max} chars`);
    for (const w of AGENT_BANNED_WORDS) if (text.toLowerCase().includes(w)) p.push(`${k} has banned word "${w}"`);
  }
  return p;
}

/** Which fields the code checks changed (so we see what the model got wrong). */
function changed(raw: unknown, checked: AgentOutput): string[] {
  const r = (raw ?? {}) as Record<string, unknown>;
  return (Object.keys(checked) as (keyof AgentOutput)[]).filter((k) => JSON.stringify(r[k]) !== JSON.stringify(checked[k]));
}

function offlineChecks(restaurant: Restaurant): number {
  const food = STAGE_INPUT.food_price;
  const cases: { name: string; raw: unknown; expect: (o: AgentOutput) => boolean }[] = [
    { name: "not JSON at all → all defaults", raw: null, expect: (o) => JSON.stringify(o) === JSON.stringify(defaultAgentOutput(STAGE_INPUT, restaurant)) },
    { name: "start > food → food price", raw: { start_price: 30 }, expect: (o) => o.start_price === food },
    { name: "floor below 30% → clipped to 30%", raw: { floor_price: 1 }, expect: (o) => o.floor_price === 5.4 },
    { name: "floor above 70% → clipped to 70%", raw: { floor_price: 16 }, expect: (o) => o.floor_price === 12.4 },
    { name: "floor > start → 50% of start", raw: { start_price: 10, floor_price: 12 }, expect: (o) => o.start_price === 10 && o.floor_price === 5.4 },
    { name: "floor below start is kept", raw: { start_price: 15, floor_price: 12.4 }, expect: (o) => o.floor_price === 12.4 },
    { name: "start rounded down to $0.10", raw: { start_price: 16.37, floor_price: 8.94 }, expect: (o) => o.start_price === 16.3 && o.floor_price === 8.9 },
    { name: "bad drop_speed → normal", raw: { drop_speed: "turbo" }, expect: (o) => o.drop_speed === "normal" },
    { name: "unknown tag dropped", raw: { tags: ["burgers", "tacos", "fries"] }, expect: (o) => o.tags.join() === "burgers,fries" },
    { name: "only unknown tags → restaurant default tags", raw: { tags: ["tacos"] }, expect: (o) => o.tags.join() === restaurant.default_tags.join() },
    { name: "bad diet value → restaurant default", raw: { diet: { vegetarian: "maybe", vegan: "yes" } }, expect: (o) => o.diet.vegetarian === restaurant.default_diet.vegetarian && o.diet.vegan === "yes" },
    { name: "banned word in title → default title", raw: { title: "Totally SAFE burger" }, expect: (o) => o.title === "Five Guys order, untouched" },
    { name: "banned word in selling line → default", raw: { selling_line: "Allergen-free fries" }, expect: (o) => o.selling_line === "Ready at the counter. No fees." },
    { name: "banned word in reason → default", raw: { reason: "Healthy demand nearby" }, expect: (o) => o.reason === "Standard price plan." },
    { name: "long title cut at a full word + …", raw: { title: "A very long title about a cheeseburger and fries combo" }, expect: (o) => o.title.length <= 40 && o.title.endsWith("…") && !o.title.includes("combo") },
  ];
  let failed = 0;
  console.log("\n== Offline checks (booklet 8.5, no OpenAI call) ==");
  for (const c of cases) {
    const o = checkAgentOutput(c.raw, STAGE_INPUT, restaurant);
    const ok = c.expect(o) && problems(o, STAGE_INPUT).length === 0;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}${ok ? "" : "  → " + JSON.stringify(o)}`);
  }
  return failed;
}

async function main() {
  const { env, dispose } = await testEnv();
  try {
    const restaurant = await loadRestaurant(env, DEMO_RESTAURANT_ID);
    let failed = offlineChecks(restaurant);

    // AGENT_MODE=default must skip the model.
    const def = await runSellerAgent(env, STAGE_INPUT, restaurant, "default");
    const defOk = def.agent_source === "default" && problems(def, STAGE_INPUT).length === 0;
    if (!defOk) failed++;
    console.log(`${defOk ? "PASS" : "FAIL"}  AGENT_MODE=default → defaults, no call`);

    if (RUNS > 0) {
      if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing in .dev.vars");
      console.log(`\n== ${RUNS} live runs on the stage order (${STAGE_INPUT.restaurant}, $${STAGE_INPUT.food_price}) ==`);
      const times: number[] = [];
      for (let i = 1; i <= RUNS; i++) {
        const t0 = Date.now();
        let raw: unknown = null;
        let error = "";
        try {
          raw = await callOpenAI(env, STAGE_INPUT); // the same call runSellerAgent makes
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
        const ms = Date.now() - t0;
        times.push(ms);
        const checked = error ? defaultAgentOutput(STAGE_INPUT, restaurant) : checkAgentOutput(raw, STAGE_INPUT, restaurant);
        const p = problems(checked, STAGE_INPUT);
        const ok = !error && p.length === 0 && ms <= AGENT_TIMEOUT_MS;
        if (!ok) failed++;
        console.log(
          `\nRun ${String(i).padStart(2)}: ${ok ? "PASS" : "FAIL"} · ${(ms / 1000).toFixed(1)} s · source ${error ? "default" : "live"}` +
            (error ? ` · error: ${error}` : "") +
            (p.length ? ` · problems: ${p.join("; ")}` : ""),
        );
        if (!error) {
          const fixed = changed(raw, checked);
          console.log(`  fixed by code: ${fixed.length ? fixed.join(", ") : "nothing"}`);
        }
        console.log(
          `  "${checked.title}" | "${checked.selling_line}"\n  reason: "${checked.reason}"\n` +
            `  tags ${checked.tags.join(",")} · may contain ${checked.may_contain.join(",") || "-"} · diet ${JSON.stringify(checked.diet)}\n` +
            `  start $${checked.start_price} · floor $${checked.floor_price} · ${checked.drop_speed}`,
        );
      }
      const sorted = [...times].sort((a, b) => a - b);
      console.log(`\nTimes: median ${(sorted[Math.floor(sorted.length / 2)] / 1000).toFixed(1)} s, max ${(sorted[sorted.length - 1] / 1000).toFixed(1)} s`);
    }
    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
  } finally {
    await dispose();
  }
}

await main();
