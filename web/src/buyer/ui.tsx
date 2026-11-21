// Small UI pieces for the buyer pages (booklet 11, design round 2). Inline line icons, 2 px stroke.
// Zee, sound, haptics and confetti come from the shared kit in web/src/ui.
import { useEffect, useState, type ReactNode } from "react";
import { MuteButton, haptic, sound } from "../ui";
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

/** Browsers allow sound only after a first tap: unlock it on the first touch anywhere. */
export function useSoundUnlock(): void {
  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
}

/** "14:52" */
export const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });

type IconName = "pin" | "walk" | "clock" | "check" | "bag" | "arrow" | "edit" | "spark" | "tag";

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
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
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
    spark: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6" />,
    tag: (
      <>
        <path d="M3 12V4h8l10 10-8 8L3 12Z" />
        <circle cx="7.5" cy="8.5" r="1.5" />
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

/** The kit's global mute button, fixed in the top-right corner. */
export function CornerMute() {
  return (
    <div className="fixed top-3 right-3 z-[60]">
      <MuteButton />
    </div>
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

/** Pill chip. Pops when selected (mint + forest), with a soft tap. */
export function Chip({ on, onClick, small, children }: { on: boolean; onClick?: () => void; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        sound.tap();
        haptic.light();
        onClick?.();
      }}
      aria-pressed={on}
      className={`ui-press flex items-center gap-1.5 rounded-full border-2 text-small font-semibold transition-colors ${small ? "px-3 py-1.5" : "px-4 py-2.5"} ${
        on ? "ui-pop-in border-forest bg-mint text-forest" : "border-line bg-white text-ink active:scale-95"
      }`}
    >
      {on && <Icon name="check" className="h-4 w-4" />}
      {children}
    </button>
  );
}

/** Static chip for listing tags. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#F3F3F3] px-3 py-1.5 text-small font-medium text-ink">{children}</span>;
}

/** Big round on/off toggle with its label. Springy knob, tap sound, vibration. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        sound.tap();
        haptic.medium();
        onChange(!on);
      }}
      className={`buyer-toggle ui-press flex w-full items-center justify-between gap-4 rounded-card border-2 p-4 text-left transition-colors ${
        on ? "border-forest bg-mint" : "border-line bg-white"
      }`}
    >
      <span className="text-h3 text-ink">{label}</span>
      <span className={`relative h-9 w-16 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-forest" : "bg-line"}`}>
        <span className={`buyer-knob absolute top-1 h-7 w-7 rounded-full bg-white shadow-md ${on ? "left-8" : "left-1"}`} />
      </span>
    </button>
  );
}

/** The one full-width button stuck to the bottom (56 px, with → arrow, design round 2). */
export function BottomButton({
  children,
  onClick,
  disabled,
  arrow = true,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sound.tap();
        onClick?.();
      }}
      disabled={disabled}
      className={`ui-press flex h-bottom w-full items-center justify-center gap-2 rounded-card bg-forest text-h3 font-bold text-white disabled:bg-line disabled:text-stone ${className}`}
    >
      {children}
      {arrow && <Icon name="arrow" className="h-5 w-5" />}
    </button>
  );
}
