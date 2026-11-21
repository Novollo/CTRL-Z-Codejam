// Small UI pieces for the buyer pages (booklet 11). Inline line icons, 2 px stroke.
import { useEffect, useState, type ReactNode } from "react";
import { MASCOT_POSES } from "@shared/tokens";
import "./buyer.css";

/** Current time, refreshed every `ms` while `on` is true. For real-time countdowns (lock, hold). */
export function useNow(on: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  return now;
}

/** "14:52" */
export const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });

export function Icon({ name, className = "h-5 w-5" }: { name: "pin" | "walk" | "clock" | "check" | "bag" | "undo"; className?: string }) {
  const paths: Record<typeof name, ReactNode> = {
    pin: (
      <>
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    walk: (
      <>
        <circle cx="13" cy="4" r="2" />
        <path d="m9 20 3-6 3 3v4M7 12l3-4 4 1 3 3M12 14l-2-3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 5 5L20 7" />,
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    undo: (
      <>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}

/** Logo: "Ctrl" and "Z" keycaps in forest outline, then "Eats" (booklet 11.3). */
export function Logo() {
  const cap = "rounded-md border-2 border-forest px-1.5 py-0.5 font-mono text-small font-bold text-forest";
  return (
    <div className="flex items-center gap-1">
      <span className={cap}>Ctrl</span>
      <span className="font-bold text-forest">+</span>
      <span className={cap}>Z</span>
      <span className="ml-1 text-h3 font-bold text-ink">Eats</span>
    </div>
  );
}

/** Mascot image. If the file is not there yet, a same-size placeholder bear. */
export function Mascot({ pose, size = 120, className = "" }: { pose: keyof typeof MASCOT_POSES; size?: number; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (!missing) {
    return (
      <img src={MASCOT_POSES[pose]} alt="Zee" width={size} height={size} className={`object-contain ${className}`} onError={() => setMissing(true)} />
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Zee">
      <g fill="#fff" stroke="var(--color-forest)" strokeWidth={3} strokeLinejoin="round">
        <path d="M30 30c-6-10 4-22 14-14 4-6 8-6 12 0 10-8 20 4 14 14Z" />
        <circle cx="30" cy="38" r="8" />
        <circle cx="70" cy="38" r="8" />
        <circle cx="50" cy="58" r="26" />
        <ellipse cx="50" cy="66" rx="10" ry="7" />
      </g>
      <circle cx="41" cy="54" r="3" fill="var(--color-forest)" />
      <circle cx="59" cy="54" r="3" fill="var(--color-forest)" />
      <circle cx="50" cy="63" r="3" fill="var(--color-forest)" />
      <path d="M45 70q5 4 10 0" fill="none" stroke="var(--color-forest)" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

/** Restaurant food photo with rounded corners; mint placeholder if the file is missing. */
export function FoodPhoto({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing || !src) {
    return (
      <div className={`flex items-center justify-center rounded-card bg-mint text-forest ${className}`} aria-label={alt}>
        <Icon name="bag" className="h-12 w-12" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={`rounded-card object-cover ${className}`} onError={() => setMissing(true)} />;
}

/** Pill chip. Selected = mint background + forest border. */
export function Chip({ on, onClick, children }: { on: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-4 py-2 text-small font-medium ${on ? "border-forest bg-mint text-forest" : "border-line bg-white text-ink"}`}
    >
      {children}
    </button>
  );
}

/** Static chip for listing tags. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-line bg-white px-3 py-1 text-small text-ink">{children}</span>;
}

/** Big on/off toggle with its label. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-card border border-line p-4 text-left"
    >
      <span className="text-h3 text-ink">{label}</span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-forest" : "bg-line"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
      </span>
    </button>
  );
}

/** The one full-width button stuck to the bottom of the screen (56 px, booklet 11.3). */
export function BottomButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-bottom w-full rounded-card bg-forest text-h3 font-bold text-white disabled:bg-line disabled:text-stone"
    >
      {children}
    </button>
  );
}
