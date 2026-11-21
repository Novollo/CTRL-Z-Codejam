// Zee the bear chef (booklet 11.4). Shows /mascot/<pose>.png; if the image is missing,
// a simple line drawing of the same size takes its place.
import { useState } from "react";
import { MASCOT_POSES } from "@shared/tokens";

export type Pose = keyof typeof MASCOT_POSES;

export function Mascot({ pose, size, className = "" }: { pose: Pose; size: number; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <BearPlaceholder size={size} className={className} />;
  return (
    <img
      src={MASCOT_POSES[pose]}
      width={size}
      height={size}
      alt="Zee the bear chef"
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      onError={() => setMissing(true)}
    />
  );
}

/** Round bear head with a chef hat, in forest outline. Placeholder until the team's images land. */
function BearPlaceholder({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`text-forest ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Zee the bear chef"
    >
      {/* chef hat */}
      <path d="M34 34c-8 0-11-10-4-14 2-8 12-10 16-4 4-6 14-4 16 2 8-2 12 8 6 13" fill="#fff" />
      <path d="M34 34h34v-6H34z" fill="#fff" />
      {/* ears */}
      <circle cx="26" cy="44" r="7" fill="#fff" />
      <circle cx="76" cy="44" r="7" fill="#fff" />
      {/* head */}
      <circle cx="51" cy="60" r="27" fill="#fff" />
      {/* eyes, snout, mouth */}
      <circle cx="42" cy="55" r="2" fill="currentColor" stroke="none" />
      <circle cx="60" cy="55" r="2" fill="currentColor" stroke="none" />
      <ellipse cx="51" cy="67" rx="9" ry="7" />
      <path d="M48 65h6" />
      <path d="M47 71c2 2 6 2 8 0" />
    </svg>
  );
}
