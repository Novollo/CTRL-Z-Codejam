// Runs one of track D's test scripts on this laptop (no Worker needed).
// Usage: node worker/agent/run-test.mjs worker/agent/test-agent.ts [args...]
// It bundles the .ts file with esbuild (already installed by wrangler) into .wrangler/ (git-ignored), then runs it.
// The test scripts get the local D1 database and the keys from .dev.vars through wrangler's getPlatformProxy.

import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { basename, resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node worker/agent/run-test.mjs <test file.ts> [args...]");
  process.exit(1);
}
const outfile = resolve(".wrangler/ctrlz-tests", basename(file).replace(/\.ts$/, ".mjs"));
await build({
  entryPoints: [file],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["wrangler"],
  logLevel: "warning",
  plugins: [
    {
      // worker/market imports "cloudflare:workers" (only exists inside the Worker). Tests get a stand-in.
      name: "cloudflare-workers-stand-in",
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: "cloudflare:workers", namespace: "stand-in" }));
        b.onLoad({ filter: /.*/, namespace: "stand-in" }, () => ({
          contents: "export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }",
          loader: "js",
        }));
      },
    },
  ],
});
await import(pathToFileURL(outfile).href);
