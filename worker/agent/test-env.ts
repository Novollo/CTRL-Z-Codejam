// Test helper for track D scripts: the Worker env (local D1 + .dev.vars keys) without running the Worker.
// Only used by the test-*.ts scripts through worker/agent/run-test.mjs. Not part of the Worker bundle.

import { getPlatformProxy } from "wrangler";
import type { Restaurant } from "@shared/types";
import type { Env } from "../env";

export async function testEnv(): Promise<{ env: Env; dispose: () => Promise<void> }> {
  const proxy = await getPlatformProxy<Env>({ configPath: "wrangler.jsonc", persist: true });
  return { env: proxy.env, dispose: proxy.dispose };
}

/** Reads one restaurant row from D1 and parses its JSON columns. */
export async function loadRestaurant(env: Env, id: string): Promise<Restaurant> {
  const row = await env.DB.prepare("SELECT * FROM restaurants WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) throw new Error(`restaurant ${id} not found: run npm run db:local`);
  return {
    ...(row as unknown as Restaurant),
    default_tags: JSON.parse(String(row.default_tags)),
    default_diet: JSON.parse(String(row.default_diet)),
  };
}
