// Uploads the FILLED-IN keys from .dev.vars to Cloudflare as Worker secrets.
// Run: npm run secrets:upload   (empty keys are skipped; values are never printed)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const NAMES = ["ANTHROPIC_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "TELEGRAM_BOT_TOKEN"];

let text = "";
try {
  text = readFileSync(".dev.vars", "utf8");
} catch {
  console.error("No .dev.vars file found in this folder.");
  process.exit(1);
}

const secrets = {};
for (const line of text.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && NAMES.includes(m[1]) && m[2] !== "") secrets[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

for (const name of NAMES) console.log(`${secrets[name] ? "✓ will upload" : "– skipped (empty)"}  ${name}`);
if (Object.keys(secrets).length === 0) {
  console.log("\nNo keys filled in yet. Paste them into .dev.vars, save, and run this again.");
  process.exit(0);
}

const run = spawnSync("npx", ["wrangler", "secret", "bulk"], { input: JSON.stringify(secrets), stdio: ["pipe", "inherit", "inherit"] });
process.exit(run.status ?? 1);
