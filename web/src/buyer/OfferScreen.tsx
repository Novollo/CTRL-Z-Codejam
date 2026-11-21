// B3 offer card, B-hold, B-lost and B4 locked (booklet 6). Full-screen, slides up.
import { TAG_LABELS } from "@shared/catalog";
import { formatClock, formatPrice } from "@shared/constants";
import type { Offer } from "./useOfferFlow";
import { BottomButton, FoodPhoto, Icon, Tag, useNow } from "./ui";

type Props = {
  offer: Extract<Offer, { step: "card" | "locked" | "lost" }>;
  busy: boolean;
  onBuy: () => void;
  onNotNow: () => void;
  onPay: () => void;
};

const secondsUntil = (ms: number, now: number) => Math.max(0, Math.floor((ms - now) / 1000));

export function OfferScreen({ offer, busy, onBuy, onNotNow, onPay }: Props) {
  const holdUntil = offer.step === "card" ? offer.holdUntil : null;
  const now = useNow(holdUntil !== null || offer.step === "locked");

  if (offer.step === "locked") {
    const left = secondsUntil(offer.lockUntil, now);
    return (
      <div className="zee-slide-up fixed inset-0 z-50 flex flex-col bg-white">
        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col px-5 pt-10">
          {offer.timedOut ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Icon name="clock" className="h-12 w-12 text-amber" />
              <p className="mt-4 text-h2 text-ink">Time ran out. It's back on the market.</p>
            </div>
          ) : (
            <>
              <h1 className="text-h1 text-ink">It's yours for 1 minute.</h1>
              <p className="mt-6 text-center font-mono text-[72px] leading-none font-bold text-amber">{formatClock(left)}</p>
              <div className="mt-8 flex items-center gap-3 rounded-card border border-line p-4">
                <FoodPhoto src={offer.card.photo_url} alt={offer.card.restaurant_name} className="h-16 w-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-small text-stone">{offer.card.restaurant_name}</p>
                  <p className="truncate font-bold text-ink">{offer.card.title}</p>
                </div>
                <p className="font-mono text-h2 font-bold text-ink">{formatPrice(offer.price)}</p>
              </div>
              <div className="mt-auto pb-6">
                <BottomButton onClick={onPay}>Pay {formatPrice(offer.price)}</BottomButton>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const card = offer.card;
  const lost = offer.step === "lost";
  const held = holdUntil !== null;
  const lastMinute = card.seconds_left <= 60;

  return (
    <div className="zee-slide-up fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className={`mx-auto flex min-h-full w-full max-w-[390px] flex-col px-5 pt-5 ${lost ? "opacity-60 grayscale" : ""}`}>
        <FoodPhoto src={card.photo_url} alt={card.restaurant_name} className="h-48 w-full" />
        <p className="mt-4 text-small font-medium text-stone">{card.restaurant_name}</p>
        <h1 className="mt-1 text-h2 text-ink">{card.title}</h1>
        <p className="mt-1 text-stone">{card.selling_line}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <Tag key={t}>{TAG_LABELS[t]}</Tag>
          ))}
          {card.may_contain.length > 0 && <Tag>May contain: {card.may_contain.join(", ")}</Tag>}
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="font-mono text-[48px] leading-none font-bold text-ink">{formatPrice(card.price)}</span>
          <span className="font-mono text-h3 text-stone line-through">{formatPrice(card.food_price)}</span>
        </div>
        <p className={`mt-2 flex items-center gap-1.5 font-mono font-bold ${lastMinute ? "text-amber" : "text-ink"}`}>
          <Icon name="clock" className="h-4 w-4" />
          {formatClock(card.seconds_left)} left
        </p>

        <p className="mt-4 flex items-start gap-2 font-medium text-forest">
          <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-leaf" />
          {offer.step === "card" ? offer.reason : ""}
        </p>

        {held && !lost && (
          <p className="mt-4 rounded-card bg-amber/15 px-4 py-3 font-medium text-ink">
            Someone is paying… back in <span className="font-mono font-bold">{formatClock(secondsUntil(holdUntil, now))}</span> if they don't
          </p>
        )}

        <div className="mt-auto pt-6 pb-6">
          {!lost && (
            <>
              <BottomButton onClick={onBuy} disabled={held || busy}>
                Buy for {formatPrice(card.price)}
              </BottomButton>
              <button type="button" onClick={onNotNow} className="mt-3 w-full py-2 text-small font-medium text-stone">
                Not now
              </button>
            </>
          )}
        </div>
      </div>

      {lost && (
        <div className="fixed inset-x-0 top-1/3 z-10 mx-auto w-full max-w-[390px] px-5">
          <p className="rounded-card bg-stone px-5 py-6 text-center text-h2 text-white">
            Grabbed by someone at {formatPrice(offer.soldPrice)}.
          </p>
        </div>
      )}
    </div>
  );
}
