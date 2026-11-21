// The one mute button for every screen (round 3). Owned by the lead.
// Mute is global (all tabs and /stage frames) and stays in sync everywhere.
import { useEffect, useState } from "react";
import { sound } from "./sound";

export function MuteButton({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(sound.isMuted);
  useEffect(() => sound.subscribe(setMuted), []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !muted;
        sound.setMuted(next);
        if (!next) {
          sound.unlock();
          sound.tap();
        }
      }}
      aria-label={muted ? "Turn sound on" : "Mute sound"}
      aria-pressed={muted}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm ring-1 ring-line transition active:scale-90 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        {muted ? (
          <>
            <path d="m23 9-6 6" />
            <path d="m17 9 6 6" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a10 10 0 0 1 0 14" />
          </>
        )}
      </svg>
    </button>
  );
}
