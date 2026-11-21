// The offer card's life (booklet 6, B3 → B4 → B5, plus B-hold and B-lost), driven by live messages.
// Used by /join and /buy/:listingId.
import { useCallback, useEffect, useState } from "react";
import { API, type BuyResponse, type BuyTakenResponse, type PassResponse } from "@shared/api";
import { LOCK_SEC, LOST_CARD_CLOSE_SEC } from "@shared/constants";
import type { LiveMessage } from "@shared/messages";
import type { ListingCard, PickupPass } from "@shared/types";
import { ApiCallError, apiCall } from "../lib/api";
import { haptic, sound } from "../ui";

export type Offer =
  /** B3, or B-hold when holdUntil is set (someone else is paying). `watching` from listing.stats. */
  | { step: "card"; card: ListingCard; reason: string; holdUntil: number | null; watching: number | null }
  /** B4: this buyer won the lock. */
  | { step: "locked"; card: ListingCard; price: number; lockUntil: number; checkoutUrl: string; timedOut: boolean }
  /** B-lost: someone else got it. */
  | { step: "lost"; card: ListingCard; soldPrice: number }
  /** B5: pickup pass. `free` when taken in the free window (no payment). */
  | { step: "pass"; pass: PickupPass; free: boolean };

export const openCard = (card: ListingCard, reason: string): Extract<Offer, { step: "card" }> => ({
  step: "card",
  card,
  reason,
  holdUntil: card.status === "locked" ? card.lock_until : null,
  watching: null,
});

/** Pure: the next offer state after one live message. */
export function applyLive(offer: Offer | null, msg: LiveMessage): Offer | null {
  if (msg.type === "listing.sold" && msg.pass) return { step: "pass", pass: msg.pass, free: msg.sold_price === 0 };

  if (msg.type === "ping") {
    if (offer?.step === "card" && offer.card.listing_id === msg.listing.listing_id) return { ...openCard(msg.listing, msg.reason), watching: offer.watching };
    if (offer === null || offer.step === "card" || offer.step === "lost") return openCard(msg.listing, msg.reason);
    return offer; // busy paying or already has a pass
  }

  if (offer === null || offer.step === "pass") return offer;
  if (!("listing_id" in msg) || msg.listing_id !== offer.card.listing_id) return offer;

  if (offer.step === "card") {
    const card = offer.card;
    switch (msg.type) {
      case "listing.tick":
        return { ...offer, card: { ...card, price: msg.price, seconds_left: msg.seconds_left } };
      case "listing.stats":
        return { ...offer, watching: msg.watching };
      case "listing.locked":
        return { ...offer, card: { ...card, status: "locked", lock_until: msg.lock_until }, holdUntil: msg.lock_until };
      case "listing.unlocked":
        return { ...offer, card: { ...card, status: "live", lock_until: null, price: msg.price }, holdUntil: null };
      case "listing.sold":
        return { step: "lost", card, soldPrice: msg.sold_price };
      case "listing.closed":
        if (msg.outcome === "free_window") return { ...offer, card: { ...card, status: "free", price: 0, lock_until: null }, holdUntil: null };
        return null; // the listing ended: close the card
    }
    return offer;
  }

  // B4: the lock countdown is this page's own timer; only a sale without our pass matters.
  if (offer.step === "locked" && msg.type === "listing.sold") return { step: "lost", card: offer.card, soldPrice: msg.sold_price };
  return offer;
}

export function useOfferFlow(token: string | null) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);

  const onLive = useCallback((msg: LiveMessage) => {
    setOffer((o) => applyLive(o, msg));
  }, []);

  // Sound + vibration for each moment (design round 2). A new card (B3) gets the ping.
  const cue = offer === null ? null : offer.step === "card" ? `card:${offer.card.listing_id}` : offer.step;
  useEffect(() => {
    if (cue === null) return;
    if (cue.startsWith("card:")) {
      sound.ping();
      haptic.ping();
    } else if (cue === "locked") {
      sound.lock();
      haptic.medium();
    } else if (cue === "lost") {
      sound.lost();
      haptic.medium();
    } else if (cue === "pass") {
      sound.success();
      haptic.success();
    }
  }, [cue]);

  // B4: the lock runs out → "Time ran out. It's back on the market."
  const lockUntil = offer?.step === "locked" && !offer.timedOut ? offer.lockUntil : null;
  useEffect(() => {
    if (lockUntil === null) return;
    const t = setTimeout(
      () => setOffer((o) => (o?.step === "locked" ? { ...o, timedOut: true } : o)),
      Math.max(0, lockUntil - Date.now()),
    );
    return () => clearTimeout(t);
  }, [lockUntil]);

  // B-lost and the timed-out B4 close by themselves.
  const closing = offer?.step === "lost" || (offer?.step === "locked" && offer.timedOut);
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setOffer(null), LOST_CARD_CLOSE_SEC * 1000);
    return () => clearTimeout(t);
  }, [closing]);

  const buy = async () => {
    if (offer?.step !== "card" || !token || busy) return;
    const card = offer.card;
    setBusy(true);
    try {
      const res = await apiCall<BuyResponse>("POST", API.buy(card.listing_id), undefined, token);
      if (res.kind === "locked") {
        setOffer({ step: "locked", card, price: res.price, lockUntil: res.lock_until, checkoutUrl: res.checkout_url, timedOut: false });
      } else {
        setOffer({ step: "pass", pass: res.pass, free: true });
      }
    } catch (e) {
      if (e instanceof ApiCallError && e.status === 409) {
        const body = e.body as BuyTakenResponse | null;
        const until = body?.lock_until ?? Date.now() + LOCK_SEC * 1000;
        setOffer((o) => (o?.step === "card" ? { ...o, holdUntil: until } : o));
      }
    } finally {
      setBusy(false);
    }
  };

  const notNow = () => {
    if (offer?.step === "card" && token) {
      apiCall("POST", API.dismiss(offer.card.listing_id), undefined, token).catch(() => {});
    }
    setOffer(null);
  };

  const pay = () => {
    if (offer?.step === "locked") window.location.assign(offer.checkoutUrl);
  };

  /** B5 after the Stripe redirect (/join?paid=<listingId>). */
  const loadPass = useCallback(
    async (listingId: string) => {
      if (!token) return;
      try {
        const pass = await apiCall<PassResponse>("GET", API.pass(listingId), undefined, token);
        setOffer({ step: "pass", pass, free: false });
      } catch {
        // not the winner (or not paid yet): stay on B2
      }
    },
    [token],
  );

  return { offer, setOffer, onLive, buy, notNow, pay, loadPass, busy };
}
