// B2 waiting (booklet 6).
import type { BuyerProfileInput } from "@shared/api";
import { CAMPUS_SPOTS, FOOD_TYPES } from "@shared/catalog";
import { TELEGRAM_BOT_URL } from "@shared/constants";
import { Logo, Mascot, Toggle } from "./ui";

export const spotLabel = (spot: BuyerProfileInput["spot"]): string | null => CAMPUS_SPOTS.find((s) => s.key === spot)?.label ?? null;

/** "Trottier · 10 min walk · Burgers, Pizza · up to $12" */
function summary(p: BuyerProfileInput): string {
  const foods = FOOD_TYPES.filter((f) => p.food_types.includes(f.key)).map((f) => f.label);
  return [spotLabel(p.spot), `${p.max_walk_min} min walk`, foods.length ? foods.join(", ") : "Anything", `up to $${p.max_price}`]
    .filter(Boolean)
    .join(" · ");
}

export function WaitingScreen({ profile, onToggle, onEdit }: { profile: BuyerProfileInput; onToggle: (on: boolean) => void; onEdit: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-5 pt-5 pb-8">
      <Logo />
      <div className="mt-6">
        <Toggle on={profile.notify_on} onChange={onToggle} label="Notify me about food nearby" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <Mascot pose="sitting" size={160} className={profile.notify_on ? "zee-bounce" : "opacity-50 grayscale"} />
        {profile.notify_on ? (
          <h1 className="mt-6 text-h2 text-ink">You're on, {profile.name}. We'll ping you when food near you drops in price.</h1>
        ) : (
          <h1 className="mt-6 text-h2 text-stone">Paused. No pings.</h1>
        )}
        <p className="mt-4 text-small text-stone">
          {summary(profile)}{" "}
          <button type="button" onClick={onEdit} className="font-bold text-forest underline">
            Edit
          </button>
        </p>
      </div>

      <p className="text-center text-small text-stone">
        Keep this page open to get pings.{" "}
        <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className="font-medium text-forest">
          Or get them on Telegram →
        </a>
      </p>
    </main>
  );
}
