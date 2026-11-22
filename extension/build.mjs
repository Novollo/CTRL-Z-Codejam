// Builds the extension: src/*.ts → build/*.js (one file each, plain scripts Chrome can load).
// Run from the repo root: npm run extension:build   (add --watch to rebuild on every save)
import { build, context } from "esbuild";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const options = {
  absWorkingDir: dir,
  entryPoints: ["src/content.ts", "src/background.ts", "src/popup.ts"],
  outdir: "build",
  bundle: true,
  format: "iife",
  target: "chrome120",
  tsconfig: "tsconfig.json",
  loader: { ".webp": "dataurl" },
  charset: "utf8",
  legalComments: "none",
  logLevel: "info",
};

if (process.argv.includes("--watch")) await (await context(options)).watch();
else await build(options);
