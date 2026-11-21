// /buy/:listingId?t=<buyerToken>: opened from the Telegram "Buy now" button (booklet 7).
// Opens B3 for that listing at the live price, then B4 / B5 like /join.
import { useEffect, useState } from "react";
import { API, PAGE, type ListingCardResponse } from "@shared/api";
import { connectLive } from "../lib/live";
import { apiCall } from "../lib/api";
import { OfferScreen } from "./OfferScreen";
import { PassScreen } from "./PassScreen";
import { loadBuyer, saveBuyer } from "./storage";
import { Mascot } from "../ui";
import { Logo, CornerMute, useSoundUnlock } from "./ui";
import { openCard, useOfferFlow } from "./useOfferFlow";

export function BuyPage({ listingId, token: urlToken }: { listingId: string; token: string | null }) {
  const token = urlToken ?? loadBuyer()?.token ?? null;
  useSoundUnlock();
  const flow = useOfferFlow(token);
  const { offer, setOffer, onLive } = flow;
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const opened = buyerId !== null;

  // Open B3 for this listing, and save id + token so /join (and the return from Stripe) knows this buyer.
  useEffect(() => {
    if (!token) {
      setMissing(true);
      return;
    }
    apiCall<ListingCardResponse>("GET", API.listing(listingId), undefined, token)
      .then((res) => {
        saveBuyer({ id: res.buyer_id, token });
        setOffer(openCard(res.listing, res.reason));
        setBuyerId(res.buyer_id);
      })
      .catch(() => setMissing(true));
  }, [listingId, token, setOffer]);

  // Live updates: ticks, B-hold, B-lost, the pass.
  useEffect(() => {
    if (!buyerId) return;
    return connectLive({ role: "buyer", buyerId }, onLive);
  }, [buyerId, onLive]);

  // The card closed (Not now, grabbed, time ran out): go to the buyer page (B2, or B1 if no web profile yet).
  useEffect(() => {
    if (opened && offer === null) window.location.replace(PAGE.join);
  }, [opened, offer]);

  if (offer?.step === "pass")
    return (
      <>
        <CornerMute />
        <PassScreen pass={offer.pass} free={offer.free} spotLabel={null} />
      </>
    );
  if (offer)
    return (
      <>
        <CornerMute />
        <OfferScreen offer={offer} busy={flow.busy} onBuy={flow.buy} onNotNow={flow.notNow} onPay={flow.pay} />
      </>
    );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center px-5 pt-5 text-center">
      <div className="self-start">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <Mascot cycle={["sitting", "thinking"]} motion="bob" size={140} />
        {missing && (
          <a href={PAGE.join} className="mt-6 font-bold text-forest underline">
            Get fresh food for less, near campus.
          </a>
        )}
      </div>
    </main>
  );
}
