// The buyer's id and token live in the browser, so a reload keeps the profile (booklet 6).
const ID_KEY = "ctrlz.buyer_id";
const TOKEN_KEY = "ctrlz.buyer_token";

export interface SavedBuyer {
  id: string;
  token: string;
}

export function loadBuyer(): SavedBuyer | null {
  try {
    const id = localStorage.getItem(ID_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    return id && token ? { id, token } : null;
  } catch {
    return null;
  }
}

export function saveBuyer(b: SavedBuyer): void {
  try {
    localStorage.setItem(ID_KEY, b.id);
    localStorage.setItem(TOKEN_KEY, b.token);
  } catch {
    // private mode: the profile just won't survive a reload
  }
}

/** The token alone. A buyer from a Telegram link (/buy) has a token but no saved web profile. */
export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Keep a Telegram buyer's token for the return from Stripe (/join?paid=), unless a web profile is saved. */
export function saveTokenIfNone(token: string): void {
  try {
    if (!localStorage.getItem(ID_KEY)) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearBuyer(): void {
  try {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** ?mock=local plays the run in the browser with no server (see web/src/lib/live.ts). */
export const isLocalMock = (): boolean => new URLSearchParams(window.location.search).get("mock") === "local";
