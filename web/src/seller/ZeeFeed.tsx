// S4 agent activity feed (design round 2): Zee at work next to a live log, newest on top.
// Lines come from real events (reach, price drops, watchers, lock/unlock, order ready) plus friendly flavour.
import { useEffect, useRef, useState } from "react";
import { CAMPUS_SPOTS } from "@shared/catalog";
import { formatPrice } from "@shared/constants";
import { Mascot } from "../ui";
import { count } from "./plural";
import type { LiveState } from "./LiveScreen";

type Tone = "normal" | "alert" | "good";
interface Line {
  id: number;
  text: string;
  tone: Tone;
}

const EVERY_MS = 2800;
const MAX_LINES = 6;

const pick = <T,>(list: readonly T[], n: number) => list[n % list.length];

export function ZeeFeed({ live, restaurant, food }: { live: LiveState; restaurant: string; food: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;
  const nextId = useRef(0);
  const mem = useRef({ seen: 0, priceLine: live.price, interested: live.stats?.interested ?? 0, watching: 0, ready: false, turn: 0, flavour: 0, locked: live.locked });

  const push = (text: string, tone: Tone = "normal") =>
    setLines((ls) => [{ id: nextId.current++, text, tone }, ...ls].slice(0, MAX_LINES));

  // First line, once (guarded: React dev mode runs effects twice).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    push(`Your order is live at ${formatPrice(liveRef.current.price)}. I'm on it!`, "good");
  }, []);

  // Lock and unlock are told right away.
  useEffect(() => {
    if (live.locked === mem.current.locked) return;
    mem.current.locked = live.locked;
    push(live.locked ? "Someone tapped Buy! Waiting for payment…" : "They didn't pay in time, back on the market", live.locked ? "alert" : "normal");
  }, [live.locked]);

  // One new line every few seconds: the next real event in turn, otherwise flavour.
  useEffect(() => {
    const flavour = [
      () => `Highlighting "fresh, untouched" to people who want ${food}`,
      () => `Checking who's between classes near ${pick(CAMPUS_SPOTS, mem.current.flavour + 2).label}`,
      () => `Telling people who want ${food}: no delivery or service fees`,
      () => `Keeping the price moving so it sells while it's hot`,
      () => `Reminding buyers it's ready at the ${restaurant} counter`,
    ];
    const t = setInterval(() => {
      const l = liveRef.current;
      if (l.locked) return;
      const m = mem.current;
      const seen = l.stats?.seen ?? l.reached;
      const interested = l.stats?.interested ?? 0;
      const watching = l.stats?.watching ?? 0;

      const events: (() => string | null)[] = [
        () => {
          if (seen < m.seen + 3 && !(m.seen === 0 && seen > 0)) return null;
          m.seen = seen;
          return `Shared your order with ${count(seen, "student", "students")} near campus`;
        },
        () => {
          if (l.price > m.priceLine - 1) return null;
          const more = interested - m.interested;
          m.priceLine = l.price;
          m.interested = interested;
          return more > 0 ? `Price dropped to ${formatPrice(l.price)}, ${count(more, "more person", "more people")} can afford it now` : `Price dropped to ${formatPrice(l.price)}`;
        },
        () => {
          const up = watching > m.watching;
          m.watching = watching;
          return up ? `Someone near ${pick(CAMPUS_SPOTS, m.turn).label} is looking at your order 👀` : null;
        },
        () => {
          if (!l.orderReady || m.ready) return null;
          m.ready = true;
          return `${restaurant} says your food is ready at the counter`;
        },
      ];

      for (let k = 0; k < events.length; k++) {
        const text = events[(m.turn + k) % events.length]();
        if (text) {
          m.turn++;
          return push(text);
        }
      }
      m.turn++;
      push(pick(flavour, m.flavour++)());
    }, EVERY_MS);
    return () => clearInterval(t);
  }, [food, restaurant]);

  return (
    <section className="flex gap-3 rounded-card bg-mint p-3">
      <div className="flex shrink-0 flex-col items-center">
        <Mascot cycle={["sitting", "pointing", "thumbsup"]} cycleMs={2200} motion="bob" size={60} />
        <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-forest">
          <span className="ui-pulse-ring h-2 w-2 rounded-full bg-leaf" />
          Zee
        </span>
      </div>
      <ul className="relative h-[228px] flex-1 overflow-hidden">
        {lines.map((line, i) => (
          <li
            key={line.id}
            className={`ui-slide-up border-b border-forest/10 py-1.5 text-small leading-snug last:border-0 ${
              line.tone === "alert" ? "font-semibold text-ink" : line.tone === "good" ? "font-semibold text-forest" : "text-ink"
            }`}
            style={{ opacity: Math.max(0.25, 1 - i * 0.2) }}
          >
            {line.text}
          </li>
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-mint" />
      </ul>
    </section>
  );
}
