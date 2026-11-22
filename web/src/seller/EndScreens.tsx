// S5a. Sold (big celebration), and S5b. Not sold (booklet 5, S5a and S5b + design round 2).
import { useEffect, useState } from "react";
import { formatPrice } from "@shared/constants";
import { Confetti, Icon, Mascot, haptic, sound, type Motion, type Pose } from "../ui";
import { CountUp } from "./CountUp";

/** "14:32" in the phone's local time. */
const clockTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const COUNT_MS = 1400;

export function SoldScreen({ soldPrice, orderTotal, pickupBy, onHome }: { soldPrice: number; orderTotal: number; pickupBy: number; onHome: () => void }) {
  const share = Math.round((soldPrice / orderTotal) * 100);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    sound.purchased(); // once on sold (round 7)
    haptic.success();
    const t = setTimeout(() => setCounted(true), COUNT_MS + 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-mint px-8 text-center">
      <Confetti pieces={160} durationMs={3200} />
      <div className="ui-pop-in">
        <Mascot pose="jumping" motion="jump" sparkles size={200} />
      </div>
      <h1 className="ui-pop-in ui-delay-2 mt-6 text-[44px] leading-tight font-bold text-forest">Sold!</h1>
      <p className="ui-flow-in ui-delay-3 mt-2 text-h2 text-ink">
        You got <CountUp value={soldPrice} from={0} durationMs={COUNT_MS} format={formatPrice} className="font-mono text-[28px] font-bold text-forest" /> back.
      </p>
      <div className="mt-5 h-12">
        {counted && (
          <p className="ui-pop-in rounded-full bg-forest px-5 py-2.5 text-h3 text-white shadow-lg shadow-forest/25">
            You undid <span className="text-leaf">{share}%</span> of your mistake.
          </p>
        )}
      </div>
      <p className="ui-fade-in mt-6 text-body text-balance text-stone" style={{ animationDelay: `${COUNT_MS / 1000 + 0.4}s` }}>
        A buyer picks it up at {clockTime(pickupBy)}. Nothing else to do.
      </p>
      <HomeButton onHome={onHome} />
    </div>
  );
}

export type NotSoldKind = "pickup" | "free" | "free_taken" | "donated";

const LOOK: Record<NotSoldKind, { pose: Pose; motion: Motion; sparkles?: boolean }> = {
  pickup: { pose: "bag", motion: "bob" },
  free: { pose: "waving", motion: "breathe" },
  free_taken: { pose: "jumping", motion: "jump", sparkles: true },
  donated: { pose: "thumbsup", motion: "bounce", sparkles: true },
};

export function NotSoldScreen({
  kind,
  restaurantName,
  pickupCode,
  onHome,
}: {
  kind: NotSoldKind;
  restaurantName: string;
  pickupCode: string;
  onHome: () => void;
}) {
  const look = LOOK[kind];

  useEffect(() => {
    haptic.light(); // no sound: nothing was pressed (round 3)
  }, [kind]);

  return (
    <div key={kind} className="relative flex h-full flex-col items-center justify-center bg-white px-8 text-center text-balance">
      {kind === "free_taken" && <Confetti pieces={90} />}
      <div className="ui-pop-in">
        <Mascot pose={look.pose} motion={look.motion} sparkles={look.sparkles} size={180} />
      </div>
      {kind === "pickup" && (
        <>
          <p className="ui-flow-in ui-delay-2 mt-8 text-h2 text-ink">Nobody grabbed it. Your order is waiting at {restaurantName}.</p>
          <div className="ui-pop-in mt-6 rounded-card bg-mint px-6 py-4" style={{ animationDelay: "0.5s" }}>
            <span className="font-mono text-[36px] font-bold tracking-wide text-forest">{pickupCode}</span>
          </div>
        </>
      )}
      {kind === "free" && (
        <p className="ui-flow-in ui-delay-2 mt-8 text-h2 text-ink">
          Nobody bought it, so it's now free for someone nearby. You'll get a thank-you when it's taken.
        </p>
      )}
      {kind === "free_taken" && <p className="ui-pop-in ui-delay-2 mt-8 text-h1 text-forest">Someone nearby took it. Thank you!</p>}
      {kind === "donated" && <p className="ui-flow-in ui-delay-2 mt-8 text-h2 text-ink">Thanks! Your meal is set aside for donation.</p>}
      <HomeButton onHome={onHome} />
    </div>
  );
}

/** "Back to home" (round 4): returns to the delivery-app Home, where the banner shows the result. */
function HomeButton({ onHome }: { onHome: () => void }) {
  return (
    <button
      onClick={() => {
        sound.tap();
        onHome();
      }}
      className="ui-press ui-flow-in absolute inset-x-5 bottom-6 flex h-bottom items-center justify-center gap-2 rounded-card border border-line bg-white text-h3 text-ink shadow-sm"
      style={{ animationDelay: "1.6s" }}
    >
      <Icon name="home" size={20} />
      Back to home
    </button>
  );
}
