// /buy/:listingId?t=<buyerToken>: opened from the Telegram "Buy now" button (booklet 7).
// Opens B3 for that listing at the live price, then B4 / B5 like /join.
import { useEffect, useState } from "react";
import { API, PAGE, type ListingCardResponse } from "@shared/api";
import { connectLive } from "../lib/live";
import { apiCall } from "../lib/api";
import { OfferScreen } from "./OfferScreen";
import { PassScreen } from "./PassScreen";
import { loadBuyer, saveTokenIfNone } from "./storage";
import { Logo, Mascot } from "./ui";
import { openCard, useOfferFlow } from "./useOfferFlow";

/** Without a buyer id (Telegram-only buyer) there is no live connection: refresh the card this often. */
const POLL_MS = 2000;

export function BuyPage({ listingId, token: urlToken }: { listingId: string; token: string | null }) {
  const saved = loadBuyer();
  const token = urlToken ?? saved?.token ?? null;
  const liveId = saved && saved.token === token ? saved.id : null; // same buyer as the saved web profile
  const flow = useOfferFlow(token);
  const { offer, setOffer, onLive } = flow;
  const [opened, setOpened] = useState(false);
  const [missing, setMissing] = useState(false);

  // Open B3 for this listing.
  useEffect(() => {
    if (!token) {
      setMissing(true);
      return;
    }
    saveTokenIfNone(token);
    apiCall<ListingCardResponse>("GET", API.listing(listingId), undefined, token)
      .then((res) => {
        setOffer(openCard(res.listing, res.reason));
        setOpened(true);
      })
      .catch(() => setMissing(true));
  }, [listingId, token, setOffer]);

  // Live updates: the /ws connection when we know the buyer id, else a light refresh of the card.
  const watching = opened && offer?.step === "card";
  useEffect(() => {
    if (!opened || !liveId) return;
    return connectLive({ role: "buyer", buyerId: liveId }, onLive);
  }, [opened, liveId, onLive]);
  useEffect(() => {
    if (!watching || liveId || !token) return;
    const t = setInterval(() => {
      apiCall<ListingCardResponse>("GET", API.listing(listingId), undefined, token)
        .then((res) => setOffer((o) => (o?.step === "card" ? openCard(res.listing, o.reason) : o)))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [watching, liveId, listingId, token, setOffer]);

  // The card closed (Not now, grabbed, time ran out): go to the buyer page (B2, or B1 if no web profile yet).
  useEffect(() => {
    if (opened && offer === null) window.location.replace(PAGE.join);
  }, [opened, offer]);

  if (offer?.step === "pass") return <PassScreen pass={offer.pass} free={offer.free} spotLabel={null} />;
  if (offer) return <OfferScreen offer={offer} busy={flow.busy} onBuy={flow.buy} onNotNow={flow.notNow} onPay={flow.pay} />;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center px-5 pt-5 text-center">
      <div className="self-start">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <Mascot pose="sitting" size={140} className="zee-bounce" />
        {missing && (
          <a href={PAGE.join} className="mt-6 font-bold text-forest underline">
            Get fresh food for less, near campus.
          </a>
        )}
      </div>
    </main>
  );
}
