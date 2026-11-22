// The popup: pick the server, switch demo mode. Both are saved in chrome.storage.local.
import { API } from "@shared/api";
import type { HealthResponse } from "@shared/api";
import { SERVERS, getSettings, saveSettings } from "./settings";

const serversEl = document.getElementById("servers")!;
const statusEl = document.getElementById("status")!;
const demoEl = document.getElementById("demo") as HTMLInputElement;

async function checkServer(base: string) {
  statusEl.className = "";
  statusEl.textContent = "Checking the server…";
  try {
    const res = await fetch(base + API.health());
    const health = (await res.json()) as HealthResponse;
    statusEl.className = health.ok ? "ok" : "";
    statusEl.textContent = health.ok ? `Connected. ${health.restaurants} restaurants.` : "The server answered, but it isn't ready.";
  } catch {
    statusEl.textContent = base.includes("localhost") ? "Can't reach it. Is npm run dev running?" : "Can't reach it right now.";
  }
}

async function init() {
  const settings = await getSettings();
  for (const s of SERVERS) {
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "server";
    input.checked = s.url === settings.apiBase;
    input.addEventListener("change", async () => {
      await saveSettings({ apiBase: s.url });
      void checkServer(s.url);
    });
    const label = document.createElement("label");
    label.className = "choice";
    const text = document.createElement("span");
    text.append(s.label);
    const small = document.createElement("small");
    small.textContent = s.url.replace(/^https?:\/\//, "");
    text.append(small);
    label.append(input, text);
    serversEl.append(label);
  }
  demoEl.checked = settings.demo;
  demoEl.addEventListener("change", () => saveSettings({ demo: demoEl.checked }));
  void checkServer(settings.apiBase);
}

void init();
