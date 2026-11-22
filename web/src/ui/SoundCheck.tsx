// /sounds: listen to every sound cue (round 5). Owned by the lead. For the team to judge the sounds.
import { MuteButton } from "./MuteButton";
import { sound } from "./sound";

const CUES: { key: keyof typeof sound; label: string; when: string }[] = [
  { key: "tap", label: "Tap", when: "A button press" },
  { key: "ping", label: "Ping", when: "A new offer arrives (buyer)" },
  { key: "lock", label: "Lock", when: "“It's yours for 1 minute”" },
  { key: "success", label: "Success", when: "Listed (seller) / paid (buyer)" },
  { key: "cash", label: "Cash", when: "Sold: money back (seller)" },
  { key: "lost", label: "Lost", when: "Someone else got it (buyer)" },
];

export function SoundCheck() {
  return (
    <main className="mx-auto max-w-md p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-ink">Sound check</h1>
        <MuteButton />
      </div>
      <p className="mt-2 text-small text-stone">Tap each one. Each sound has a short cooldown, so wait a second before replaying it.</p>
      <ul className="mt-6 space-y-3">
        {CUES.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => {
                sound.unlock();
                (sound[c.key] as () => void)();
              }}
              className="ui-press flex w-full items-center justify-between rounded-card border border-line bg-white px-4 py-3 text-left"
            >
              <span>
                <span className="block font-bold text-ink">{c.label}</span>
                <span className="text-small text-stone">{c.when}</span>
              </span>
              <span className="font-bold text-forest">Play</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
