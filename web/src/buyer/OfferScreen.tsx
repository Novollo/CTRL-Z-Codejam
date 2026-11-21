// B3 offer card, B-hold, B-lost and B4 locked (booklet 6, design round 2). Full-screen, slides up.
import { useEffect, useRef } from "react";
import { TAG_LABELS } from "@shared/catalog";
import { LOCK_SEC, formatClock, formatPrice } from "@shared/constants";
import { sound } from "../ui";
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

/** A soft tick when the price drops, at most every 3 s (design round 2). */
function usePriceTick(price: number) {
  const prev = useRef(price);
  const last = useRef(0);
  useEffect(() => {
    if (price < prev.current && Date.now() - last.current > 3000) {
      sound.tick();
      last.current = Date.now();
    }
    prev.current = price;
  }, [price]);
}

/** B4: big amber ring that empties over the 60 s lock. */
function LockRing({ lockUntil, now }: { lockUntil: number; now: number }) {
  const r = 96;
  const c = 2 * Math.PI * r;
  const share = Math.max(0, Math.min(1, (lockUntil - now) / (LOCK_SEC * 1000)));
  return (
    <div className="ui-pop-in relative mx-auto h-56 w-56">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
        <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-line)" strokeWidth="12" />
        <circle
          cx="110"
          cy="110"
          r={r}
          fill="none"
          stroke="var(--color-amber)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          style={{ transition: "stroke-dashoffset .25s linear" }}
        />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center font-mono text-[56px] font-bold text-ink">{formatClock(secondsUntil(lockUntil, now))}</p>
    </div>
  );
}

export function OfferScreen({ offer, busy, onBuy, onNotNow, onPay }: Props) {
  const holdUntil = offer.step === "card" ? offer.holdUntil : null;
  const now = useNow(holdUntil !== null || offer.step === "locked");
  usePriceTick(offer.card.price);

  if (offer.step === "locked") {
    return (
      <div className="buyer-sheet-up fixed inset-0 z-50 flex flex-col bg-white">
        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col px-5 pt-12">
          {offer.timedOut ? (
            <div className="ui-fade-in flex flex-1 flex-col items-center justify-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber/15">
                <Icon name="clock" className="h-10 w-10 text-amber" />
              </span>
              <p className="mt-5 text-h2 text-ink">Time ran out. It's back on the market.</p>
            </div>
          ) : (
            <>
              <h1 className="ui-pop-in text-center text-[30px] leading-tight font-bold text-ink">It's yours for 1 minute.</h1>
              <div className="mt-8">
                <LockRing lockUntil={offer.lockUntil} now={now} />
              </div>
              <div className="ui-slide-up ui-delay-2 mt-8 flex items-center gap-3 rounded-card border border-line p-3">
                <FoodPhoto src={offer.card.photo_url} alt={offer.card.restaurant_name} className="h-14 w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-small text-stone">{offer.card.restaurant_name}</p>
                  <p className="truncate font-bold text-ink">{offer.card.title}</p>
                </div>
                <p className="font-mono text-h2 font-bold text-ink">{formatPrice(offer.price)}</p>
              </div>
              <div className="mt-auto pb-6">
                <BottomButton onClick={onPay} className="buyer-pulse-btn">
                  Pay {formatPrice(offer.price)}
                </BottomButton>
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
  const watching = offer.step === "card" ? offer.watching : null;

  return (
    <div className="buyer-sheet-up fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className={`mx-auto flex min-h-full w-full max-w-[390px] flex-col px-5 pt-5 ${lost ? "buyer-shake buyer-grey" : ""}`}>
        <FoodPhoto src={card.photo_url} alt={card.restaurant_name} className="h-44 w-full" />

        <p className="mt-4 flex items-center gap-1.5 text-small font-semibold text-stone">
          {card.restaurant_name}
          {card.walk_min !== null && (
            <>
              <span>·</span>
              <Icon name="walk" className="h-4 w-4" />
              {card.walk_min} min
            </>
          )}
        </p>
        <h1 className="mt-1 text-[26px] leading-tight font-bold text-ink">{card.title}</h1>
        <p className="mt-1 text-stone">{card.selling_line}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <Tag key={t}>{TAG_LABELS[t]}</Tag>
          ))}
          {card.may_contain.length > 0 && <Tag>May contain: {card.may_contain.join(", ")}</Tag>}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span key={card.price} className="ui-price-drop inline-block font-mono text-[52px] leading-none font-bold text-ink">
              {formatPrice(card.price)}
            </span>
            <span className="font-mono text-h3 text-stone line-through">{formatPrice(card.food_price)}</span>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 font-mono text-small font-bold ${lastMinute ? "bg-amber/20 text-ink" : "bg-[#F3F3F3] text-ink"}`}>
            <Icon name="clock" className="h-4 w-4" />
            {formatClock(card.seconds_left)} left
          </span>
        </div>

        {!lost && watching !== null && watching > 0 && (
          <p className="mt-4 flex items-center gap-2 font-semibold text-ink">
            <span className="buyer-dot h-2.5 w-2.5 rounded-full bg-amber" />
            👀 {watching} {watching === 1 ? "person" : "people"} watching right now
          </p>
        )}

        {offer.step === "card" && (
          <p className="mt-3 flex items-start gap-2 rounded-card bg-mint px-3 py-2.5 font-semibold text-forest">
            <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-leaf" />
            {offer.reason}
          </p>
        )}

        {card.items.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-card border border-line">
            {card.items.map((it) => (
              <li key={it.name} className="px-4 py-3">
                <p className="font-bold text-ink">{it.name}</p>
                {it.description && <p className="mt-0.5 text-small text-stone">{it.description}</p>}
              </li>
            ))}
          </ul>
        )}

        {held && !lost && (
          <p className="ui-pop-in mt-4 rounded-card bg-amber/15 px-4 py-3 font-medium text-ink">
            Someone is paying… back in <span className="font-mono font-bold">{formatClock(secondsUntil(holdUntil, now))}</span> if they don't
          </p>
        )}

        <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-white from-75% to-transparent pt-6 pb-5">
          {!lost && (
            <>
              <BottomButton onClick={onBuy} disabled={held || busy} arrow={false} className={held || busy ? "" : "buyer-pulse-btn"}>
                Buy for <span key={card.price} className="ui-price-drop inline-block font-mono">{formatPrice(card.price)}</span>
              </BottomButton>
              <button type="button" onClick={onNotNow} className="mt-2 w-full py-2 text-small font-semibold text-stone">
                Not now
              </button>
            </>
          )}
        </div>
      </div>

      {lost && (
        <div className="fixed inset-x-0 top-1/3 z-10 mx-auto w-full max-w-[390px] px-5">
          <p className="ui-pop-in rounded-card bg-ink px-5 py-6 text-center text-h2 text-white shadow-xl">
            Grabbed by someone at {formatPrice(offer.soldPrice)}.
          </p>
        </div>
      )}
    </div>
  );
}
