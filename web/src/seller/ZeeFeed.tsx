// S4 agent activity feed as a chat (design round 4): Zee's avatar once, then rounded bubbles with a
// small timestamp, newest at the bottom with smooth auto-scroll, and "Zee is typing…" between lines.
// Lines come from real events (reach, price drops, watchers, lock/unlock, order ready) plus short flavour lines.
// No sounds here (round 3) and no emojis (round 4).
import { useEffect, useRef, useState } from "react";
import { CAMPUS_SPOTS } from "@shared/catalog";
import { formatPrice } from "@shared/constants";
import { Doodles, Mascot } from "../ui";
import type { LiveState } from "./LiveScreen";
import { count } from "./plural";

type Tone = "normal" | "alert" | "good";
interface Line {
  id: number;
  text: string;
  tone: Tone;
  at: number;
}

/** A new line this often; "typing…" shows for the last TYPING_MS of each gap. */
const EVERY_MS = 3400;
const TYPING_MS = 1200;
const MAX_LINES = 30;

const pick = <T,>(list: readonly T[], n: number) => list[n % list.length];
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function ZeeFeed({ live, restaurant, food, delivery }: { live: LiveState; restaurant: string; food: string; delivery: boolean }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(live);
  liveRef.current = live;
  const nextId = useRef(0);
  const mem = useRef({
    seen: 0,
    priceLine: live.price,
    interested: live.stats?.interested ?? 0,
    watching: 0,
    ready: false,
    courier: !delivery, // delivery orders: tell the seller the courier was released
    turn: 0,
    flavour: 0,
    locked: live.locked,
  });

  const push = (text: string, tone: Tone = "normal") =>
    setLines((ls) => [...ls, { id: nextId.current++, text, tone, at: Date.now() }].slice(-MAX_LINES));

  // First line, once (guarded: React dev mode runs effects twice).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    push(`Listed at ${formatPrice(liveRef.current.price)}. I'm on it!`, "good");
  }, []);

  // Smooth auto-scroll to the newest line.
  useEffect(() => {
    const el = listRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines.length, typing]);

  // Lock and unlock are told right away.
  useEffect(() => {
    if (live.locked === mem.current.locked) return;
    mem.current.locked = live.locked;
    setTyping(false);
    push(live.locked ? "Someone tapped Buy! Waiting for payment." : "No payment in time. Back on the market.", live.locked ? "alert" : "normal");
  }, [live.locked]);

  // One new line every few seconds, with "typing…" first: the next real event in turn, otherwise flavour.
  useEffect(() => {
    const flavour = [
      () => `Showing it to people who like ${food}.`,
      () => `Checking who's near ${pick(CAMPUS_SPOTS, mem.current.flavour + 2).label}.`,
      () => "No fees for the buyer. Nice.",
      () => "Keeping the price moving.",
      () => `Reminder sent: ready at the ${restaurant} counter.`,
    ];

    const nextLine = (): string => {
      const l = liveRef.current;
      const m = mem.current;
      const seen = l.stats?.seen ?? l.reached;
      const interested = l.stats?.interested ?? 0;
      const watching = l.stats?.watching ?? 0;
      if (!m.courier) {
        m.courier = true;
        return "Courier released. It's pickup now.";
      }
      const events: (() => string | null)[] = [
        () => {
          if (seen < m.seen + 3 && !(m.seen === 0 && seen > 0)) return null;
          m.seen = seen;
          return `Shared with ${count(seen, "student", "students")} nearby.`;
        },
        () => {
          if (l.price > m.priceLine - 1) return null;
          const more = interested - m.interested;
          m.priceLine = l.price;
          m.interested = interested;
          return more > 0
            ? `Now ${formatPrice(l.price)}. ${count(more, "more person", "more people")} can afford it.`
            : `Now ${formatPrice(l.price)}.`;
        },
        () => {
          const up = watching > m.watching;
          m.watching = watching;
          return up ? `Someone near ${pick(CAMPUS_SPOTS, m.turn).label} is looking.` : null;
        },
        () => {
          if (!l.orderReady || m.ready) return null;
          m.ready = true;
          return `${restaurant} says it's ready.`;
        },
      ];
      for (let k = 0; k < events.length; k++) {
        const text = events[(m.turn + k) % events.length]();
        if (text) {
          m.turn++;
          return text;
        }
      }
      m.turn++;
      return pick(flavour, m.flavour++)();
    };

    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    const t = setInterval(() => {
      if (liveRef.current.locked) return;
      setTyping(true);
      typingTimer = setTimeout(() => {
        setTyping(false);
        if (!liveRef.current.locked) push(nextLine());
      }, TYPING_MS);
    }, EVERY_MS);
    return () => {
      clearInterval(t);
      clearTimeout(typingTimer);
    };
  }, [food, restaurant]);

  return (
    <section className="relative flex h-[300px] flex-col overflow-hidden rounded-card bg-mint">
      <Doodles variant="mix" tone="forest" opacity={0.06} size={200} />

      {/* Zee, once */}
      <header className="relative flex items-center gap-2 border-b border-forest/10 px-3 py-1.5">
        <Mascot cycle={["sitting", "pointing", "thumbsup"]} cycleMs={2600} motion="bob" size={44} />
        <div className="flex-1">
          <p className="text-body leading-tight font-bold text-ink">Zee</p>
          <p className="text-[12px] leading-tight text-stone">Your selling agent</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-forest">
          <span className="ui-pulse-ring h-1.5 w-1.5 rounded-full bg-leaf" />
          Live
        </span>
      </header>

      {/* Messages, newest at the bottom */}
      <div ref={listRef} className="relative flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {lines.map((line) => (
          <div key={line.id} className="ui-flow-in flex flex-col items-start">
            <p
              className={`max-w-[88%] rounded-2xl rounded-tl-md px-3 py-2 text-small leading-snug shadow-sm ${
                line.tone === "alert"
                  ? "bg-amber/20 font-semibold text-ink"
                  : line.tone === "good"
                    ? "bg-forest font-semibold text-white"
                    : "bg-white text-ink"
              }`}
            >
              {line.text}
            </p>
            <span className="mt-0.5 ml-1 text-[10px] text-stone">{hhmm(line.at)}</span>
          </div>
        ))}
        {typing && (
          <div className="ui-fade-in flex items-center gap-2" aria-label="Zee is typing">
            <span className="flex gap-1 rounded-2xl rounded-tl-md bg-white px-3 py-2.5 shadow-sm">
              <span className="seller-typing h-1.5 w-1.5 rounded-full bg-stone" />
              <span className="seller-typing h-1.5 w-1.5 rounded-full bg-stone [animation-delay:0.15s]" />
              <span className="seller-typing h-1.5 w-1.5 rounded-full bg-stone [animation-delay:0.3s]" />
            </span>
            <span className="text-[11px] text-stone">Zee is typing…</span>
          </div>
        )}
      </div>
    </section>
  );
}
