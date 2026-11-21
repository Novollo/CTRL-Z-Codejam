// Zee, the team's red bird mascot (round 2, replaces the booklet's bear chef), animated. Owned by the lead; tracks A and B use this one.
//
//   <Mascot pose="thinking" motion="stir" size={160} />
//   <Mascot cycle={["thinking", "sitting", "bag"]} cycleMs={1400} motion="bob" />   // loading screens
//   <Mascot pose="jumping" motion="jump" sparkles />                                  // celebrations
//
// Shows /mascot/<pose>.webp. If the file is missing, a simple line drawing of the same size stands in.
import { useEffect, useState } from "react";
import { MASCOT_POSES } from "@shared/tokens";

export type Pose = keyof typeof MASCOT_POSES;
export type Motion = "none" | "bob" | "bounce" | "wiggle" | "stir" | "jump" | "breathe";

interface Props {
  pose?: Pose;
  /** Switch between these poses (crossfade). Overrides `pose`. */
  cycle?: Pose[];
  cycleMs?: number;
  motion?: Motion;
  size?: number;
  sparkles?: boolean;
  className?: string;
}

export function Mascot({ pose = "sitting", cycle, cycleMs = 1500, motion = "bob", size = 120, sparkles = false, className = "" }: Props) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!cycle || cycle.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % cycle.length), cycleMs);
    return () => clearInterval(t);
  }, [cycle, cycleMs]);
  const shown: Pose = cycle?.length ? cycle[i % cycle.length] : pose;

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div className={motion === "none" ? "" : `zee-${motion}`} style={{ width: size, height: size }}>
        <PoseImage key={shown} pose={shown} size={size} />
      </div>
      {sparkles && <Sparkles size={size} />}
    </div>
  );
}

function PoseImage({ pose, size }: { pose: Pose; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <BearPlaceholder size={size} pose={pose} />;
  return (
    <img
      src={MASCOT_POSES[pose]}
      alt="Zee"
      width={size}
      height={size}
      draggable={false}
      className="ui-fade-in select-none object-contain"
      style={{ width: size, height: size }}
      onError={() => setMissing(true)}
    />
  );
}

function Sparkles({ size }: { size: number }) {
  const spots = [
    { x: 0.05, y: 0.15, d: 0 },
    { x: 0.85, y: 0.05, d: 0.3 },
    { x: 0.92, y: 0.6, d: 0.6 },
    { x: 0.0, y: 0.7, d: 0.9 },
  ];
  return (
    <>
      {spots.map((s, k) => (
        <svg
          key={k}
          viewBox="0 0 20 20"
          width={size * 0.16}
          height={size * 0.16}
          className="ui-sparkle pointer-events-none absolute text-leaf"
          style={{ left: s.x * size, top: s.y * size, animationDelay: `${s.d}s` }}
        >
          <path d="M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

/** Line-drawn bear with a chef hat, in forest outline. Stand-in until the team's pose images are in /web/public/mascot. */
function BearPlaceholder({ size, pose }: { size: number; pose: Pose }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="text-forest" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Zee the bear chef">
      <path d="M34 34c-8 0-11-10-4-14 2-8 12-10 16-4 4-6 14-4 16 2 8-2 12 8 6 13" fill="#fff" />
      <path d="M34 34h34v-6H34z" fill="#fff" />
      <circle cx="26" cy="44" r="7" fill="#fff" />
      <circle cx="76" cy="44" r="7" fill="#fff" />
      <circle cx="51" cy="60" r="27" fill="#fff" />
      {pose === "bag" ? <path d="M38 55q4-4 8 0" /> : <circle cx="42" cy="55" r="2" fill="currentColor" stroke="none" />}
      <circle cx="60" cy="55" r="2" fill="currentColor" stroke="none" />
      <ellipse cx="51" cy="67" rx="9" ry="7" />
      <path d="M48 65h6" />
      {pose === "jumping" ? <path d="M45 71c3 4 9 4 12 0" /> : <path d="M47 71c2 2 6 2 8 0" />}
      {pose === "thinking" && <text x="80" y="24" fontSize="18" fill="currentColor" stroke="none" fontFamily="Inter, sans-serif" fontWeight="700">?</text>}
      {pose === "bag" && <rect x="72" y="70" width="18" height="20" rx="3" fill="var(--color-mint)" />}
    </svg>
  );
}
