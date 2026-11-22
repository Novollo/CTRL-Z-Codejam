// Little sound cues, made in the browser with Web Audio (no files). Owned by the lead (round 3, soft voices round 5).
//
// RULE (team, round 7): exactly TWO sounds, each a short clean melody:
//   sound.listed()      the seller's order is listed (rising: progress)
//   sound.purchased()   the order is bought: seller "Sold!" and buyer "Paid" (two notes up + warm C major finish)
// Every other cue (tap, ping, lock, lost, success, cash, tick) is SILENT and kept only so old code compiles.
//
// Mute is GLOBAL: one setting in localStorage shared by every tab and every /stage frame, read on every play.
// Pages in the background (hidden tab) never play. The same sound can't repeat within its cooldown.

// Voices (round 7, team brief): pure sine tones with 2 quiet overtones, like a glass marimba / gentle bell.
// Soft attack (1–12 ms), smooth exponential fade (≈170 ms per note, up to 1.5 s on the final chord).
// Only C major pentatonic (C D E G A), mostly 520–880 Hz, sparkles up to ~2.6 kHz. Quiet, with a short subtle room reverb.

/** Note frequencies (Hz), C major pentatonic. */
const N = { C3: 130.81, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.51, G6: 1567.98, C7: 2093.0, E7: 2637.02 } as const;

/** One note: start `at` (s), fade length `len` (s), relative `vol`, `attack` (s), overtone brightness. */
type Note = { f: number; at: number; len: number; vol?: number; attack?: number; bright?: number; dropTo?: number };

const KEY = "ctrlz.muted";
const MASTER = 0.5;
let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;
const lastPlayed = new Map<string, number>();
const listeners = new Set<(muted: boolean) => void>();

/** A short, soft room: decaying noise impulse (0.6 s), mixed in quietly. */
function roomImpulse(a: AudioContext): AudioBuffer {
  const len = Math.floor(a.sampleRate * 0.6);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

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
      lp.frequency.value = 5200; // keep sparkles up to ~2.6 kHz soft but present
      lp.Q.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.005;
      comp.release.value = 0.25;
      const master = ctx.createGain();
      master.gain.value = MASTER;
      comp.connect(master).connect(ctx.destination);
      // dry + a subtle room
      lp.connect(comp);
      const verb = ctx.createConvolver();
      verb.buffer = roomImpulse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.16;
      lp.connect(verb).connect(wet).connect(comp);
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

/** A glassy bell: sine + 2 quiet overtones, soft attack, smooth exponential fade. `dropTo` = pitch drop (the low thump). */
function bell(a: AudioContext, out: AudioNode, t: number, n: Note) {
  const peak = 0.17 * (n.vol ?? 1);
  const atk = n.attack ?? 0.006;
  const env = a.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + atk);
  env.gain.exponentialRampToValueAtTime(0.0003, t + atk + n.len);
  env.gain.linearRampToValueAtTime(0, t + atk + n.len + 0.02);
  env.connect(out);
  const b = n.bright ?? 1;
  const partials: [number, number][] = [[1, 1], [2, 0.16 * b], [3.01, 0.05 * b]];
  for (const [mult, gain] of partials) {
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(n.f * mult, t);
    if (n.dropTo) osc.frequency.exponentialRampToValueAtTime(n.dropTo * mult, t + Math.min(0.12, n.len));
    const g = a.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(env);
    osc.start(t);
    osc.stop(t + atk + n.len + 0.05);
  }
}

const silent = () => {};

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
  /** The seller's order is listed: a short rising melody (progress). E5 → G5 → C6, light sparkle on top. */
  listed: () => play("listed", 3000, [
    { f: N.E5, at: 0, len: 0.17, vol: 0.7, attack: 0.004 },
    { f: N.G5, at: 0.085, len: 0.17, vol: 0.72, attack: 0.004 },
    { f: N.C6, at: 0.17, len: 0.5, vol: 0.75, attack: 0.006 },
    { f: N.G6, at: 0.24, len: 0.4, vol: 0.18, attack: 0.008, bright: 0.4 },
  ]),
  /** Bought (seller "Sold!", buyer "Paid"): two notes up, then a warm C major chord with a soft low thump. */
  purchased: () => play("purchased", 4000, [
    { f: N.G5, at: 0, len: 0.16, vol: 0.65, attack: 0.004 },
    { f: N.C6, at: 0.09, len: 0.18, vol: 0.7, attack: 0.004 },
    { f: N.C3, at: 0.2, len: 0.22, vol: 0.55, attack: 0.002, dropTo: 82, bright: 0.2 },
    { f: N.C5, at: 0.2, len: 1.4, vol: 0.42, attack: 0.012 },
    { f: N.E5, at: 0.21, len: 1.4, vol: 0.38, attack: 0.012 },
    { f: N.G5, at: 0.22, len: 1.4, vol: 0.36, attack: 0.012 },
    { f: N.C6, at: 0.23, len: 1.2, vol: 0.3, attack: 0.012 },
    { f: N.E7, at: 0.3, len: 0.55, vol: 0.08, attack: 0.01, bright: 0.2 },
  ]),
  /** @deprecated silent (round 7: only listed + purchased make sound) */
  tap: silent,
  /** @deprecated silent */
  ping: silent,
  /** @deprecated silent */
  lock: silent,
  /** @deprecated silent: use purchased() */
  success: silent,
  /** @deprecated silent: use purchased() */
  cash: silent,
  /** @deprecated silent */
  lost: silent,
  /** @deprecated No sound on price ticks (team feedback). Does nothing. */
  tick: silent,
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
