// Worker bindings (see wrangler.jsonc). Owned by the lead.
export interface Env {
  DB: D1Database;
  MARKET: DurableObjectNamespace;
  ASSETS: Fetcher;
  // Settings
  DEMO_SPEED: string; // "7"
  AGENT_MODE: string; // "live" | "default"
  DEMO_CROWD: string; // "on" | "off" (round 2: simulated crowd on top of real counts)
  // Secrets (.dev.vars locally, `wrangler secret put` on Cloudflare). May be empty until set.
  OPENAI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
}
