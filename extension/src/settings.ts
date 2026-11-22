// Popup settings, saved in chrome.storage.local: which Ctrl+Z Eats server to use, and demo mode.

/** The two servers the extension may talk to (each one is a host permission in manifest.json). The first is the default. */
export const SERVERS = [
  { url: "https://ctrlz-eats.stalerole.workers.dev", name: "Live site", label: "Live site (judges' phones)" },
  { url: "http://localhost:8787", name: "This laptop", label: "This laptop (npm run dev)" },
] as const;

/** "Live site" or "This laptop", shown in the panel so it's obvious on stage. */
export const serverName = (url: string): string => SERVERS.find((s) => s.url === url)?.name ?? url;

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
