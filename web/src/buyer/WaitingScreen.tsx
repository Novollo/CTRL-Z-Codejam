// B2 waiting (booklet 6).
import type { BuyerProfileInput } from "@shared/api";
import { CAMPUS_SPOTS, FOOD_TYPES } from "@shared/catalog";
import { TELEGRAM_BOT_URL } from "@shared/constants";
import { Doodles, Mascot, sound } from "../ui";
import { LogoMarquee } from "./logos";
import { Icon, Logo, Toggle } from "./ui";

export const spotLabel = (spot: BuyerProfileInput["spot"]): string | null => CAMPUS_SPOTS.find((s) => s.key === spot)?.label ?? null;

/** "Trottier · 10 min walk · Burgers, Pizza · up to $12" */
function summary(p: BuyerProfileInput): string {
  const foods = FOOD_TYPES.filter((f) => p.food_types.includes(f.key)).map((f) => f.label);
  return [spotLabel(p.spot), `${p.max_walk_min} min walk`, foods.length ? foods.join(", ") : "Anything", `up to $${p.max_price}`]
    .filter(Boolean)
    .join(" · ");
}

/** Friendly static demo lines for the live strip (design round 2). */
const LIVE_STRIP = [
  { icon: "bag", text: "3 orders resold near campus today" },
  { icon: "tag", text: "Average saving: 45%" },
] as const;

export function WaitingScreen({ profile, onToggle, onEdit }: { profile: BuyerProfileInput; onToggle: (on: boolean) => void; onEdit: () => void }) {
  const on = profile.notify_on;
  return (
    <main className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-[390px] flex-col px-5 pt-5 pb-6">
      <div className="absolute inset-0 -z-10">
        <Doodles variant="city" tone="ink" opacity={0.05} />
      </div>
      <Logo />
      <div className="mt-5">
        <Toggle on={on} onChange={onToggle} label="Notify me about food nearby" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <div className="relative">
          <div className={`flex h-48 w-48 items-center justify-center rounded-full ${on ? "ui-pulse-ring bg-mint" : "bg-[#F3F3F3]"}`}>
            <Mascot pose="sitting" motion={on ? "breathe" : "none"} size={150} className={on ? "" : "opacity-50 grayscale"} />
          </div>
          {on && (
            <span className="ui-pop-in absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-forest px-3 py-1 text-small font-bold text-white shadow">
              <span className="buyer-dot h-2 w-2 rounded-full bg-leaf" />
              Live
            </span>
          )}
        </div>
        {on ? (
          <h1 key="on" className="ui-slide-up mt-7 text-h2 text-ink">You're on, {profile.name}. We'll ping you when food near you drops in price.</h1>
        ) : (
          <h1 key="off" className="ui-fade-in mt-7 text-h2 text-stone">Paused. No pings.</h1>
        )}

        <div className="ui-flow-in ui-delay-2 mt-5 flex w-full items-center gap-3 rounded-card border border-line bg-white p-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
            <Icon name="pin" className="h-5 w-5" />
          </span>
          <p className="min-w-0 flex-1 text-small text-ink">{summary(profile)}</p>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onEdit();
            }}
            className="ui-press flex items-center gap-1 rounded-full bg-[#F3F3F3] px-3 py-2 text-small font-bold text-ink"
          >
            <Icon name="edit" className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      <LogoMarquee className="mb-4" />

      <div className="mb-4 grid grid-cols-2 gap-2">
        {LIVE_STRIP.map((l, k) => (
          <div key={l.text} className="ui-slide-up flex items-center gap-2 rounded-card bg-mint px-3 py-2.5" style={{ animationDelay: `${300 + k * 120}ms` }}>
            <Icon name={l.icon} className="h-4 w-4 shrink-0 text-forest" />
            <span className="text-small leading-tight font-medium text-forest">{l.text}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-small text-stone">
        Keep this page open to get pings.{" "}
        <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className="font-semibold text-forest">
          Or get them on Telegram →
        </a>
      </p>
    </main>
  );
}
