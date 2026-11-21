import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// The React app lives in /web. In dev, /api and /ws are sent to `wrangler dev` on port 8787.
export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@shared": fileURLToPath(new URL("./shared", import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true, // so a phone on the same Wi-Fi can open it
    proxy: {
      "/api": "http://localhost:8787",
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
