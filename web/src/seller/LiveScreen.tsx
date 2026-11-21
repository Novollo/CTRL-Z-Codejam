// S4. Listed (live): falling price + countdown ring, stats row, Zee's activity feed,
// floor/fallback edits and "Stop listing" (booklet 5, S4 + design round 2).
import { useEffect, useRef, useState } from "react";
import type { Fallback } from "@shared/catalog";
import { formatClock, formatPrice } from "@shared/constants";
import { sound } from "../ui";
import { FallbackPicker, FloorStepper, type FloorRange } from "./controls";
import { CountUp } from "./CountUp";
import { ClockIcon, TagIcon } from "./icons";
import { ZeeFeed } from "./ZeeFeed";

/** Short fallback names for the S4 control line ("If nobody buys: Give it free"). */
const FALLBACK_SHORT: Record<Fallback, string> = {
  pickup_self: "I'll pick it up",
  free: "Give it free",
  donate: "Donate it",
};

export interface LiveStats {
  seen: number;
  watching: number;
  interested: number;
}

export interface LiveState {
  price: number;
  secondsLeft: number;
  totalSeconds: number;
  reached: number;
  stats: LiveStats | null;
  locked: boolean;
  orderReady: boolean;
  floor: number;
  fallback: Fallback;
}

/** Soft tick on price drops, at most this often. */
const TICK_SOUND_GAP_MS = 3000;

export function LiveScreen({
  live,
  range,
  restaurant,
  food,
  onFloor,
  onFallback,
  onStop,
}: {
  live: LiveState;
  range: FloorRange;
  restaurant: string;
  food: string;
  onFloor: (v: number) => void;
  onFallback: (f: Fallback) => void;
  onStop: () => void;
}) {
  const [editFloor, setEditFloor] = useState(false);
  const [changeFallback, setChangeFallback] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const lastMinute = live.secondsLeft <= 60;

  // Soft tick when the price drops (not on every tick).
  const lastTick = useRef(0);
  const lastPrice = useRef(live.price);
  useEffect(() => {
    if (live.price < lastPrice.current && Date.now() - lastTick.current > TICK_SOUND_GAP_MS) {
      sound.tick();
      lastTick.current = Date.now();
    }
    lastPrice.current = live.price;
  }, [live.price]);

  const seen = live.stats?.seen ?? live.reached;

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-5 pt-6 pb-3">
        <Ring share={live.totalSeconds ? live.secondsLeft / live.totalSeconds : 1} warn={lastMinute}>
          <span key={live.price} className="ui-price-drop font-mono text-[46px] leading-none font-bold text-ink">
            {formatPrice(live.price)}
          </span>
          <span className={`mt-2 font-mono text-h3 font-bold ${lastMinute ? "text-amber" : "text-stone"}`}>
            {formatClock(live.secondsLeft)} left
          </span>
          {live.locked && <span className="ui-pop-in mt-2 rounded-full bg-amber/20 px-2.5 py-0.5 text-small font-semibold text-ink">Someone is paying…</span>}
        </Ring>

        {live.stats ? (
          <div className="grid w-full grid-cols-3 gap-2">
            <StatPill emoji="👀" value={live.stats.seen} before="Seen by " after="" />
            <StatPill emoji="🔥" value={live.stats.interested} before="" after=" want it" />
            <StatPill emoji="⚡" value={live.stats.watching} before="" after=" watching now" />
          </div>
        ) : (
          // Until the first listing.stats arrives: shimmering pills (and the reach line once people are pinged).
          <div className="w-full">
            <div className="grid grid-cols-3 gap-2" aria-hidden>
              {[0, 1, 2].map((k) => (
                <div key={k} className="ui-shimmer h-[58px] rounded-card" />
              ))}
            </div>
            {seen > 0 && <p className="ui-fade-in mt-2 text-center text-body font-semibold text-forest">Sent to {seen} people nearby</p>}
          </div>
        )}

        <div className="w-full">
          <ZeeFeed live={live} restaurant={restaurant} food={food} />
        </div>
      </div>

      <div className="border-t border-line px-5 pt-1 pb-5">
        <div className="flex min-h-12 items-center gap-3 text-body text-ink">
          <TagIcon size={18} className="shrink-0 text-forest" />
          <span className="flex-1">
            Lowest price {!editFloor && <span className="font-mono font-bold">{formatPrice(live.floor)}</span>}
          </span>
          {editFloor && <FloorStepper value={live.floor} range={range} onChange={onFloor} />}
          <button onClick={() => setEditFloor((v) => !v)} className={`font-semibold ${editFloor ? "text-ink" : "text-forest"}`}>
            Edit
          </button>
        </div>

        <div className="flex min-h-12 items-center gap-3 border-t border-line text-body text-ink">
          <ClockIcon size={18} className="shrink-0 text-forest" />
          <span className="flex-1">If nobody buys: {FALLBACK_SHORT[live.fallback]}</span>
          <button onClick={() => setChangeFallback((v) => !v)} className="font-semibold text-forest">
            Change
          </button>
        </div>
        {changeFallback && (
          <div className="ui-slide-up pb-2">
            <FallbackPicker
              value={live.fallback}
              onChange={(f) => {
                onFallback(f);
                setChangeFallback(false);
              }}
            />
          </div>
        )}

        <button onClick={() => setConfirmStop(true)} className="w-full pt-2 text-center text-body font-semibold text-stone underline">
          Stop listing
        </button>
      </div>

      {confirmStop && (
        <div className="ui-fade-in absolute inset-0 z-30 flex items-center justify-center bg-ink/40 px-8">
          <div className="ui-pop-in w-full rounded-card bg-white p-5 text-center">
            <p className="text-h3 text-ink">Stop and keep your order?</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmStop(false)} className="h-12 flex-1 rounded-card border border-line text-body font-semibold text-ink">
                No
              </button>
              <button onClick={onStop} className="h-12 flex-1 rounded-card bg-ink text-body font-semibold text-white">
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** One of the three pill cards. Counts up when the number changes, with a little "+N" bubble. */
function StatPill({ emoji, value, before, after }: { emoji: string; value: number; before: string; after: string }) {
  const prev = useRef(value);
  const [bump, setBump] = useState<{ id: number; n: number } | null>(null);
  useEffect(() => {
    const n = value - prev.current;
    prev.current = value;
    if (n > 0) setBump({ id: Date.now(), n });
  }, [value]);

  return (
    <div className="ui-pop-in relative flex flex-col items-center rounded-card border border-line bg-white px-1 py-2 text-center shadow-sm">
      <span className="text-[18px] leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="mt-1 text-[12px] leading-tight text-stone">
        {before}
        <CountUp value={value} className="font-mono text-body font-bold text-ink" />
        {after}
      </span>
      {bump && (
        <span key={bump.id} className="ui-float-up pointer-events-none absolute -top-2 right-2 text-small font-bold text-leaf">
          +{bump.n}
        </span>
      )}
    </div>
  );
}

/** Thin progress ring: full at the start, empty when time is up. Pulses softly while live. */
function Ring({ share, warn, children }: { share: number; warn: boolean; children: React.ReactNode }) {
  const size = 216;
  const r = 102;
  const c = 2 * Math.PI * r;
  const s = Math.max(0, Math.min(1, share));
  return (
    <div className="ui-pop-in relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="ui-pulse-ring absolute rounded-full" style={{ inset: size / 2 - r }} />
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={warn ? "var(--color-amber)" : "var(--color-leaf)"}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - s)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}
