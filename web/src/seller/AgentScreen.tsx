// S2. Agent at work (booklet 5, S2 + design round 2). Lines appear ~1.6 s apart, each gets a checkmark
// when done. When the agent has answered, a 4th line "Your listing is ready!" and a "See my listing →"
// button appear. The seller taps it to open S3 (no automatic jump).
import { useEffect, useState } from "react";
import { Doodles, Mascot, haptic, sound } from "../ui";
import { CheckIcon } from "./icons";

const LINES = ["Reading your order…", "Checking who's hungry nearby…", "Cooking up your listing…"];
export const AGENT_LINE_MS = 2200;

export function AgentScreen({ ready, onSee }: { ready: boolean; onSee: () => void }) {
  // step 1..3 = that many lines shown; step 4 = the last line has had its time.
  const [step, setStep] = useState(1);
  const done = step >= 4 && ready;

  useEffect(() => {
    if (step >= 4) return;
    const t = setTimeout(() => setStep((n) => n + 1), AGENT_LINE_MS);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (done) haptic.success(); // no sound here: sounds only on real button presses and big moments (round 3)
  }, [done]);

  const shown = Math.min(step, LINES.length);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-mint">
      <Doodles variant="food" tone="forest" opacity={0.08} />
      <div className="relative flex flex-1 flex-col items-center justify-center px-8">
        {done ? (
          <Mascot key="done" pose="thumbsup" motion="bounce" sparkles size={180} />
        ) : (
          <Mascot key="work" cycle={["thinking", "pointing"]} cycleMs={2200} motion="stir" size={180} />
        )}

        <ul className="mt-10 w-full max-w-[330px] space-y-4">
          {LINES.slice(0, shown).map((line, i) => {
            const checked = i < shown - 1 || done;
            return (
              <li key={line} className="ui-slide-up flex items-center gap-3 text-h3 text-forest">
                <StepDot checked={checked} />
                <span className={checked ? "" : "opacity-80"}>{line}</span>
              </li>
            );
          })}
          {done && (
            <li className="ui-pop-in flex items-center gap-3 text-h3 text-forest">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-white">
                <CheckIcon size={14} />
              </span>
              <span className="font-bold">Your listing is ready!</span>
            </li>
          )}
        </ul>
      </div>

      <div className="relative h-[104px] px-5 pb-8">
        {done && (
          <button
            onClick={() => {
              sound.tap();
              onSee();
            }}
            className="ui-pop-in ui-press flex h-bottom w-full items-center justify-center gap-2 rounded-card bg-forest text-h3 text-white shadow-lg shadow-forest/25"
          >
            See my listing →
          </button>
        )}
      </div>
    </div>
  );
}

function StepDot({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <span className="ui-pop-in flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-white">
        <CheckIcon size={14} />
      </span>
    );
  }
  return <span className="seller-spin h-6 w-6 shrink-0 rounded-full border-[3px] border-forest/20 border-t-forest" />;
}
