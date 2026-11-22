// Popup settings, saved in chrome.storage.local: which Ctrl+Z Eats server to use, and demo mode.

/** The two servers the extension may talk to (each one is a host permission in manifest.json). */
export const SERVERS = [
  { url: "http://localhost:8787", label: "This laptop (npm run dev)" },
  { url: "https://ctrlz-eats.stalerole.workers.dev", label: "Live site" },
] as const;

export interface Settings {
  apiBase: string;
  demo: boolean;
}

export const DEFAULT_SETTINGS: Settings = { apiBase: SERVERS[0].url, demo: false };

export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.local.get(["apiBase", "demo"]);
  const apiBase = SERVERS.some((s) => s.url === raw.apiBase) ? (raw.apiBase as string) : DEFAULT_SETTINGS.apiBase;
  return { apiBase, demo: raw.demo === true };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}

/** Calls `cb` whenever a setting changes (popup → content script). */
export function onSettingsChange(cb: () => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && ("apiBase" in changes || "demo" in changes)) cb();
  });
}
