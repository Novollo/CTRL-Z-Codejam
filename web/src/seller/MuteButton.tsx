// Small speaker button in the top-left corner: sound on / off (design round 2). Saved per browser by the kit.
import { useState } from "react";
import { sound } from "../ui";
import { SpeakerIcon, SpeakerOffIcon } from "./icons";

export function MuteButton() {
  const [muted, setMuted] = useState(sound.isMuted());
  return (
    <button
      aria-label={muted ? "Sound on" : "Sound off"}
      onClick={() => {
        sound.setMuted(!muted);
        setMuted(!muted);
        if (muted) sound.tap();
      }}
      className="absolute top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm active:scale-95"
    >
      {muted ? <SpeakerOffIcon size={18} /> : <SpeakerIcon size={18} />}
    </button>
  );
}
