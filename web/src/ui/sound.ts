// Little sound cues, made in the browser with Web Audio (no files). Owned by the lead (round 3, soft voices round 5).
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

// Soft, melodic voices (round 5): bell-like tones (sine + faint overtones), gentle attack, long smooth decay,
// one shared chain (soft low-pass → compressor → quiet master) so nothing clicks, clips or sounds harsh.
// All notes come from C major pentatonic, so any two sounds played close together still sound nice.

/** Note frequencies (Hz). */
const N = { G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, D6: 1174.66, E6: 1318.51 } as const;

/** One note: `at` seconds after the start, `len` seconds of decay, `vol` 0..1 (relative). */
type Note = { f: number; at: number; len: number; vol?: number; glideTo?: number; bright?: number };

const KEY = "ctrlz.muted";
const MASTER = 0.55;
let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;
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
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // soft low-pass → gentle compressor → quiet master
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      lp.Q.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.005;
      comp.release.value = 0.25;
      const master = ctx.createGain();
      master.gain.value = MASTER;
      lp.connect(comp).connect(master).connect(ctx.destination);
      bus = lp;
    }
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
  if (!a || !bus) return;
  const t0 = a.currentTime + 0.02;
  for (const n of notes) bell(a, bus, t0 + n.at, n);
}

/** A soft bell: sine fundamental + faint 2nd and 3rd partials, 10 ms attack, smooth exponential decay. */
function bell(a: AudioContext, out: AudioNode, t: number, n: Note) {
  const peak = 0.16 * (n.vol ?? 1);
  const env = a.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0005, t + n.len);
  env.gain.linearRampToValueAtTime(0, t + n.len + 0.03);
  env.connect(out);
  const partials: [number, number][] = [[1, 1], [2, 0.22 * (n.bright ?? 1)], [3, 0.06 * (n.bright ?? 1)]];
  for (const [mult, gain] of partials) {
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(n.f * mult, t);
    if (n.glideTo) osc.frequency.exponentialRampToValueAtTime(n.glideTo * mult, t + Math.min(0.08, n.len));
    const g = a.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(env);
    osc.start(t);
    osc.stop(t + n.len + 0.05);
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
  /** A soft little "pop" for button presses. */
  tap: () => play("tap", 90, [{ f: N.A5, glideTo: N.E5, at: 0, len: 0.12, vol: 0.45, bright: 0.3 }]),
  /** New offer: a friendly two-note chime (G5 → C6). */
  ping: () => play("ping", 2500, [{ f: N.G5, at: 0, len: 0.7, vol: 0.8 }, { f: N.C6, at: 0.13, len: 0.9, vol: 0.75 }]),
  /** "It's yours for 1 minute": calm and warm (A4 → E5). */
  lock: () => play("lock", 2000, [{ f: N.A4, at: 0, len: 0.55, vol: 0.7 }, { f: N.E5, at: 0.11, len: 0.7, vol: 0.6 }]),
  /** Listed / paid: a gentle rising arpeggio (C5 E5 G5 C6). */
  success: () => play("success", 4000, [
    { f: N.C5, at: 0, len: 0.55, vol: 0.6 }, { f: N.E5, at: 0.09, len: 0.55, vol: 0.6 },
    { f: N.G5, at: 0.18, len: 0.6, vol: 0.6 }, { f: N.C6, at: 0.28, len: 1.1, vol: 0.7 },
  ]),
  /** Sold, money back: a light sparkle (G5 C6 E6) over a soft C5. */
  cash: () => play("cash", 4000, [
    { f: N.C5, at: 0, len: 0.9, vol: 0.45 }, { f: N.G5, at: 0.02, len: 0.4, vol: 0.5 },
    { f: N.C6, at: 0.1, len: 0.45, vol: 0.5 }, { f: N.E6, at: 0.18, len: 0.9, vol: 0.45, bright: 0.5 },
  ]),
  /** Someone else got it: a soft, falling pair (E5 → C5), not harsh. */
  lost: () => play("lost", 4000, [{ f: N.E5, at: 0, len: 0.5, vol: 0.5, bright: 0.5 }, { f: N.C5, at: 0.16, len: 0.8, vol: 0.5, bright: 0.5 }]),
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
