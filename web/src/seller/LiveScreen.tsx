// S4. Listed (live): falling price, countdown ring, reach, floor/fallback edits, "Stop listing" (booklet 5, S4).
import { useState } from "react";
import type { Fallback } from "@shared/catalog";
import { formatClock, formatPrice } from "@shared/constants";
import { FallbackPicker, FloorStepper, type FloorRange } from "./controls";
import { UsersIcon } from "./icons";
import { Mascot } from "./Mascot";

/** Short fallback names for the S4 control line ("If nobody buys: Give it free"). */
const FALLBACK_SHORT: Record<Fallback, string> = {
  pickup_self: "I'll pick it up",
  free: "Give it free",
  donate: "Donate it",
};

export interface LiveState {
  price: number;
  secondsLeft: number;
  totalSeconds: number;
  reached: number;
  floor: number;
  fallback: Fallback;
}

export function LiveScreen({
  live,
  range,
  onFloor,
  onFallback,
  onStop,
}: {
  live: LiveState;
  range: FloorRange;
  onFloor: (v: number) => void;
  onFallback: (f: Fallback) => void;
  onStop: () => void;
}) {
  const [editFloor, setEditFloor] = useState(false);
  const [changeFallback, setChangeFallback] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const lastMinute = live.secondsLeft <= 60;

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pt-10">
        <Ring share={live.totalSeconds ? live.secondsLeft / live.totalSeconds : 1} warn={lastMinute}>
          <span className="font-mono text-[52px] leading-none font-bold text-ink">{formatPrice(live.price)}</span>
          <span className={`mt-3 font-mono text-h3 font-bold ${lastMinute ? "text-amber" : "text-stone"}`}>
            {formatClock(live.secondsLeft)} left
          </span>
        </Ring>

        {live.reached > 0 && (
          <p className="mt-6 flex items-center gap-2 text-body font-semibold text-forest">
            <UsersIcon size={18} />
            Sent to {live.reached} people nearby
          </p>
        )}

        <div className="zee-breathe mt-6">
          <Mascot pose="sitting" size={140} />
        </div>
      </div>

      <div className="space-y-1 border-t border-line px-5 pt-3 pb-6">
        <div className="flex items-center justify-between py-2 text-body text-ink">
          <span>
            Lowest price <span className="font-mono font-bold">{formatPrice(live.floor)}</span>
          </span>
          <button onClick={() => setEditFloor((v) => !v)} className="font-semibold text-forest">
            Edit
          </button>
        </div>
        {editFloor && (
          <div className="flex justify-end pb-2">
            <FloorStepper value={live.floor} range={range} onChange={onFloor} />
          </div>
        )}

        <div className="flex items-center justify-between py-2 text-body text-ink">
          <span>If nobody buys: {FALLBACK_SHORT[live.fallback]}</span>
          <button onClick={() => setChangeFallback((v) => !v)} className="font-semibold text-forest">
            Change
          </button>
        </div>
        {changeFallback && (
          <div className="pb-2">
            <FallbackPicker
              value={live.fallback}
              onChange={(f) => {
                onFallback(f);
                setChangeFallback(false);
              }}
            />
          </div>
        )}

        <button onClick={() => setConfirmStop(true)} className="w-full pt-3 text-center text-body font-semibold text-stone underline">
          Stop listing
        </button>
      </div>

      {confirmStop && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/40 px-8">
          <div className="w-full rounded-card bg-white p-5 text-center">
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

/** Thin progress ring: full at the start, empty when time is up. */
function Ring({ share, warn, children }: { share: number; warn: boolean; children: React.ReactNode }) {
  const size = 260;
  const r = 124;
  const c = 2 * Math.PI * r;
  const s = Math.max(0, Math.min(1, share));
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={warn ? "var(--color-amber)" : "var(--color-leaf)"}
          strokeWidth={4}
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
