// Little sound cues, made in the browser with Web Audio (no files). Owned by the lead (round 3).
//
// RULE (team feedback): play a sound ONLY when something happens because of the user or a real app event:
//   sound.tap()       the user taps a button that does something
//   sound.ping()      a new offer arrives (B3 opens)
//   sound.lock()      "It's yours for 1 minute"
//   sound.success()   listed / paid (once)
//   sound.cash()      seller sold (once)
//   sound.lost()      someone else got it (once)
// Never on timers, price ticks, feed lines, stats or animations. `sound.tick()` is kept only so old code
// compiles; it does nothing.
//
// Mute is GLOBAL: one setting in localStorage shared by every tab and every /stage frame, read on every play.
// Pages in the background (hidden tab) never play. The same sound can't repeat within its cooldown.

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number };

const KEY = "ctrlz.muted";
let ctx: AudioContext | null = null;
const lastPlayed = new Map<string, number>();
const listeners = new Set<(muted: boolean) => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  // Another tab or /stage frame changed the mute: update every mute button here.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) listeners.forEach((fn) => fn(readMuted()));
  });
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function play(name: string, cooldownMs: number, notes: Note[]) {
  if (readMuted()) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  const now = Date.now();
  if (now - (lastPlayed.get(name) ?? 0) < cooldownMs) return;
  lastPlayed.set(name, now);
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  for (const n of notes) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.f, t0 + n.t);
    const v = n.v ?? 0.18;
    gain.gain.setValueAtTime(0.0001, t0 + n.t);
    gain.gain.exponentialRampToValueAtTime(v, t0 + n.t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.t + n.d);
    osc.connect(gain).connect(a.destination);
    osc.start(t0 + n.t);
    osc.stop(t0 + n.t + n.d + 0.02);
  }
}

export const sound = {
  /** Call in the first tap handler so the browser allows sound later. */
  unlock: () => void audio(),
  isMuted: readMuted,
  setMuted(m: boolean) {
    try {
      localStorage.setItem(KEY, m ? "1" : "0");
    } catch {
      // storage blocked
    }
    listeners.forEach((fn) => fn(m));
  },
  /** Re-render a mute button when the mute changes (here or in another tab/frame). Returns unsubscribe. */
  subscribe(fn: (muted: boolean) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  tap: () => play("tap", 80, [{ f: 620, t: 0, d: 0.07, type: "triangle", v: 0.12 }]),
  ping: () => play("ping", 2500, [{ f: 880, t: 0, d: 0.18 }, { f: 1320, t: 0.11, d: 0.32 }]),
  lock: () => play("lock", 2000, [{ f: 330, t: 0, d: 0.12, type: "square", v: 0.06 }, { f: 494, t: 0.09, d: 0.2, type: "triangle", v: 0.12 }]),
  success: () => play("success", 4000, [{ f: 523, t: 0, d: 0.16 }, { f: 659, t: 0.1, d: 0.16 }, { f: 784, t: 0.2, d: 0.16 }, { f: 1047, t: 0.3, d: 0.4 }]),
  cash: () => play("cash", 4000, [{ f: 1319, t: 0, d: 0.09, type: "triangle" }, { f: 1760, t: 0.07, d: 0.09, type: "triangle" }, { f: 2093, t: 0.14, d: 0.35, type: "triangle" }]),
  lost: () => play("lost", 4000, [{ f: 392, t: 0, d: 0.18, type: "triangle", v: 0.1 }, { f: 330, t: 0.14, d: 0.3, type: "triangle", v: 0.1 }]),
  /** @deprecated No sound on price ticks (team feedback). Does nothing. */
  tick: () => {},
};

/** Short vibration where the phone allows it (Android; iPhone Safari ignores it). Same rule as sounds. */
export const haptic = {
  light: () => vibrate(12),
  medium: () => vibrate(30),
  ping: () => vibrate([40, 60, 40]),
  success: () => vibrate([20, 40, 20, 40, 60]),
};

function vibrate(p: number | number[]) {
  if (readMuted() || (typeof document !== "undefined" && document.visibilityState !== "visible")) return;
  try {
    navigator.vibrate?.(p);
  } catch {
    // not supported
  }
}
