// S5a. Sold, and S5b. Not sold (booklet 5, S5a and S5b).
import { formatPrice } from "@shared/constants";
import { Sparkle } from "./icons";
import { Mascot } from "./Mascot";

/** "14:32" in the phone's local time. */
const clockTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function SoldScreen({ soldPrice, orderTotal, pickupBy }: { soldPrice: number; orderTotal: number; pickupBy: number }) {
  const share = Math.round((soldPrice / orderTotal) * 100);
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center">
      <div className="relative">
        <Sparkle size={22} className="zee-sparkle absolute -top-2 -left-6 text-leaf" />
        <Sparkle size={16} className="zee-sparkle absolute top-6 -right-8 text-leaf [animation-delay:0.4s]" />
        <Sparkle size={14} className="zee-sparkle absolute bottom-4 -left-8 text-leaf [animation-delay:0.8s]" />
        <div className="zee-bounce">
          <Mascot pose="jumping" size={190} />
        </div>
      </div>
      <h1 className="mt-8 text-[40px] leading-tight font-bold text-ink">Sold!</h1>
      <p className="mt-2 text-h2 text-ink">
        You got <span className="font-mono">{formatPrice(soldPrice)}</span> back.
      </p>
      <p className="mt-4 text-h3 text-leaf">You undid {share}% of your mistake.</p>
      <p className="mt-6 text-body text-stone">A buyer picks it up at {clockTime(pickupBy)}. Nothing else to do.</p>
    </div>
  );
}

export type NotSoldKind = "pickup" | "free" | "free_taken" | "donated";

export function NotSoldScreen({ kind, restaurantName, pickupCode }: { kind: NotSoldKind; restaurantName: string; pickupCode: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center">
      <Mascot pose={kind === "pickup" ? "bag" : "sitting"} size={170} />
      {kind === "pickup" && (
        <>
          <p className="mt-8 text-h2 text-ink">Nobody grabbed it. Your order is waiting at {restaurantName}.</p>
          <div className="mt-6 rounded-card bg-mint px-6 py-4">
            <span className="font-mono text-[36px] font-bold tracking-wide text-forest">{pickupCode}</span>
          </div>
        </>
      )}
      {kind === "free" && (
        <p className="mt-8 text-h2 text-ink">
          Nobody bought it, so it's now free for someone nearby. You'll get a thank-you when it's taken.
        </p>
      )}
      {kind === "free_taken" && <p className="mt-8 text-h2 text-ink">Someone nearby took it. Thank you!</p>}
      {kind === "donated" && <p className="mt-8 text-h2 text-ink">Thanks! Your meal is set aside for donation.</p>}
    </div>
  );
}
