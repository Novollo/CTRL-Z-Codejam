// /join: B1 profile, B2 waiting, then B3–B5 as pop-ups (booklet 6, 10.2).
import { useEffect, useState } from "react";
import { API, type BuyerProfile, type BuyerProfileInput, type CreateBuyerResponse } from "@shared/api";
import { MOCK_BUYER, MOCK_BUYER_ID, MOCK_BUYER_TOKEN } from "@shared/mocks/data";
import { ApiCallError, apiCall } from "../lib/api";
import { connectLive } from "../lib/live";
import { OfferScreen } from "./OfferScreen";
import { Onboarding } from "./Onboarding";
import { PassScreen } from "./PassScreen";
import { EMPTY_PROFILE, ProfileForm } from "./ProfileForm";
import { clearBuyer, isLocalMock, loadBuyer, loadToken, saveBuyer, type SavedBuyer } from "./storage";
import { CornerMute, useSoundUnlock } from "./ui";
import { useOfferFlow } from "./useOfferFlow";
import { WaitingScreen, spotLabel } from "./WaitingScreen";

const toInput = (b: BuyerProfile): BuyerProfileInput => ({
  name: b.name,
  notify_on: b.notify_on,
  spot: b.spot,
  max_walk_min: b.max_walk_min,
  food_types: b.food_types,
  diet: b.diet,
  max_price: b.max_price,
});

type View = { kind: "loading" } | { kind: "intro" } | { kind: "form"; initial: BuyerProfileInput } | { kind: "waiting" };

export function JoinPage() {
  const [saved, setSaved] = useState<SavedBuyer | null>(loadBuyer);
  const [profile, setProfile] = useState<BuyerProfileInput | null>(null);
  const [view, setView] = useState<View>(saved ? { kind: "loading" } : { kind: "intro" });
  const [error, setError] = useState(false);
  useSoundUnlock();
  const flow = useOfferFlow(saved?.token ?? loadToken()); // token alone: came from a Telegram link (/buy)
  const { onLive, loadPass } = flow;

  // Reload keeps the profile: GET /api/buyers/:id with the saved token.
  useEffect(() => {
    if (!saved) return;
    apiCall<BuyerProfile>("GET", API.buyer(saved.id), undefined, saved.token)
      .then((b) => {
        setProfile(toInput(b));
        setView({ kind: "waiting" });
      })
      .catch((e) => {
        if (isLocalMock()) {
          setProfile(toInput(MOCK_BUYER));
          setView({ kind: "waiting" });
          return;
        }
        if (e instanceof ApiCallError && [401, 403, 404].includes(e.status)) {
          clearBuyer(); // unknown buyer: start again
          setSaved(null);
          setView({ kind: "intro" });
          return;
        }
        setView({ kind: "form", initial: EMPTY_PROFILE });
      });
  }, []); // only on first load

  // Live connection for pings, ticks and results.
  const buyerId = saved?.id ?? null;
  useEffect(() => {
    if (!buyerId) return;
    return connectLive({ role: "buyer", buyerId }, onLive);
  }, [buyerId, onLive]);

  // Back from Stripe: /join?paid=<listingId> → B5.
  useEffect(() => {
    const paid = new URLSearchParams(window.location.search).get("paid");
    if (paid) loadPass(paid);
  }, [loadPass]);

  const submit = async (input: BuyerProfileInput) => {
    setError(false);
    try {
      if (saved) {
        await apiCall("PATCH", API.buyer(saved.id), input, saved.token);
      } else {
        const res = await apiCall<CreateBuyerResponse>("POST", API.buyers(), input);
        saveBuyer(res);
        setSaved(res);
      }
    } catch {
      if (!isLocalMock()) {
        setError(true);
        return;
      }
      if (!saved) {
        const mock = { id: MOCK_BUYER_ID, token: MOCK_BUYER_TOKEN };
        saveBuyer(mock);
        setSaved(mock);
      }
    }
    setProfile(input);
    setView({ kind: "waiting" });
  };

  const toggleNotify = (on: boolean) => {
    if (!profile || !saved) return;
    if (on && profile.spot === null) {
      setView({ kind: "form", initial: { ...profile, notify_on: true } }); // criteria are needed first
      return;
    }
    setProfile({ ...profile, notify_on: on });
    apiCall("PATCH", API.buyer(saved.id), { notify_on: on }, saved.token).catch(() => {});
  };

  const offer = flow.offer;

  return (
    <>
      <CornerMute />
      {view.kind === "intro" && <Onboarding onDone={() => setView({ kind: "form", initial: EMPTY_PROFILE })} />}
      {view.kind === "form" && (
        <>
          <ProfileForm initial={view.initial} onSubmit={submit} />
          {error && <p className="fixed inset-x-0 top-0 bg-amber px-5 py-2 text-center text-small font-medium text-ink">Couldn't connect. Try again.</p>}
        </>
      )}
      {view.kind === "waiting" && profile && (
        <WaitingScreen profile={profile} onToggle={toggleNotify} onEdit={() => setView({ kind: "form", initial: profile })} />
      )}

      {offer?.step === "pass" && <PassScreen pass={offer.pass} free={offer.free} spotLabel={spotLabel(profile?.spot ?? null)} />}
      {offer && offer.step !== "pass" && (
        <OfferScreen offer={offer} busy={flow.busy} onBuy={flow.buy} onNotNow={flow.notNow} onPay={flow.pay} />
      )}
    </>
  );
}
