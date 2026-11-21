// Little sound cues, made in the browser with Web Audio (no files). Owned by the lead (round 2).
//
//   import { sound } from "../ui";
//   sound.ping();      // an offer arrives (buyer B3)
//   sound.tick();      // the price drops (soft, use sparingly)
//   sound.tap();       // a button press
//   sound.lock();      // "It's yours for 1 minute"
//   sound.success();   // listed / paid / sold
//   sound.cash();      // money back (seller S5a)
//   sound.lost();      // someone else got it
//
// Browsers only allow sound after the user taps something once: call `sound.unlock()` in the first
// click handler (any sound call also unlocks). `sound.setMuted(true)` silences everything (saved per browser).

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number };

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem("ctrlz.muted") === "1";
} catch {
  // storage blocked: not muted
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

function play(notes: Note[]) {
  if (muted) return;
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  for (const n of notes) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.f, now + n.t);
    const v = n.v ?? 0.18;
    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(a.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  }
}

export const sound = {
  unlock: () => void audio(),
  isMuted: () => muted,
  setMuted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem("ctrlz.muted", m ? "1" : "0");
    } catch {
      // ignore
    }
  },
  ping: () => play([{ f: 880, t: 0, d: 0.18 }, { f: 1320, t: 0.11, d: 0.32 }]),
  tick: () => play([{ f: 1500, t: 0, d: 0.04, type: "triangle", v: 0.05 }]),
  tap: () => play([{ f: 620, t: 0, d: 0.07, type: "triangle", v: 0.12 }]),
  lock: () => play([{ f: 330, t: 0, d: 0.12, type: "square", v: 0.06 }, { f: 494, t: 0.09, d: 0.2, type: "triangle", v: 0.12 }]),
  success: () => play([{ f: 523, t: 0, d: 0.16 }, { f: 659, t: 0.1, d: 0.16 }, { f: 784, t: 0.2, d: 0.16 }, { f: 1047, t: 0.3, d: 0.4 }]),
  cash: () => play([{ f: 1319, t: 0, d: 0.09, type: "triangle" }, { f: 1760, t: 0.07, d: 0.09, type: "triangle" }, { f: 2093, t: 0.14, d: 0.35, type: "triangle" }]),
  lost: () => play([{ f: 392, t: 0, d: 0.18, type: "triangle", v: 0.1 }, { f: 330, t: 0.14, d: 0.3, type: "triangle", v: 0.1 }]),
};

/** Short vibration where the phone allows it (Android; iPhone Safari ignores it). */
export const haptic = {
  light: () => vibrate(12),
  medium: () => vibrate(30),
  ping: () => vibrate([40, 60, 40]),
  success: () => vibrate([20, 40, 20, 40, 60]),
};

function vibrate(p: number | number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    // not supported
  }
}
