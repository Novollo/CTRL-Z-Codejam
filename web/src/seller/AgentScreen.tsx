// S2. Agent at work: the chef animation (booklet 5, S2). Three lines appear one by one.
import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";

const LINES = ["Reading your order…", "Checking who's hungry nearby…", "Cooking up your listing…"];
/** ms between lines. All three are shown within ~1.4 s. */
export const AGENT_LINE_MS = 700;

export function AgentScreen() {
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const t = setInterval(() => setShown((n) => Math.min(LINES.length, n + 1)), AGENT_LINE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-mint px-8">
      <div className="zee-stir">
        <Mascot pose="thinking" size={180} />
      </div>
      <ul className="mt-10 space-y-3 text-center">
        {LINES.slice(0, shown).map((line) => (
          <li key={line} className="zee-fade-in text-h3 text-forest">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
