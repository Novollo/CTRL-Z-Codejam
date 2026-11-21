// Seller app, route /seller (booklet section 5 + design round 4):
// Home → S1 → S2 → S3 → S4 → S5a / S5b → "Back to home" (the banner shows the result).
import { useEffect, useRef, useState } from "react";
import type { OrderResponse, UndoResponse } from "@shared/api";
import { TAG_LABELS, type Fallback } from "@shared/catalog";
import { formatPrice } from "@shared/constants";
import type { LiveMessage } from "@shared/messages";
import type { OrderStatus } from "@shared/types";
import { Confetti, MuteButton, haptic, sound } from "../ui";
import { AgentScreen } from "./AgentScreen";
import { ConfirmSheet } from "./ConfirmSheet";
import { NotSoldScreen, SoldScreen, type NotSoldKind } from "./EndScreens";
import { HomeScreen, type OrderBanner } from "./HomeScreen";
import { LiveScreen, type LiveState } from "./LiveScreen";
import { OrderScreen } from "./OrderScreen";
import { connectSeller, getOrder, patchListing, publishListing, stopListing, undoOrder } from "./sellerApi";
import "./seller.css";

type Screen = "home" | "order" | "agent" | "confirm" | "live" | "end";

/** How the listing ended. null while there is no ending yet. */
type Outcome = null | { kind: "sold"; price: number; pickupBy: number } | { kind: NotSoldKind; code: string };

/** The server answers within 5 s (agent timeout → defaults). Past this, quietly go back to S1. */
const AGENT_GIVE_UP_MS = 9000;
/** Demo arrival time on the banner: food ready + this long for the courier. */
const DELIVERY_MIN = 15;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function SellerApp() {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [status, setStatus] = useState<OrderStatus>("preparing");
  const [screen, setScreen] = useState<Screen>("home");
  const [sheet, setSheet] = useState<UndoResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0); // confetti when listed
  const [live, setLive] = useState<LiveState | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const outcomeRef = useRef<Outcome>(null);
  outcomeRef.current = outcome;
  const stopLiveRef = useRef<(() => void) | null>(null);

  // Order data. Retry quietly until the server answers.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getOrder()
        .then((data) => {
          if (cancelled) return;
          setOrder(data);
          setStatus(data.order.status);
        })
        .catch(() => {
          if (!cancelled) setTimeout(load, 2000);
        });
    load();
    return () => {
      cancelled = true;
      stopLiveRef.current?.();
    };
  }, []);

  const disconnect = () => {
    stopLiveRef.current?.();
    stopLiveRef.current = null;
  };

  const backToOrder = () => {
    disconnect();
    setSheet(null);
    setLive(null);
    setScreen("order");
  };

  // Banner / "Orders" tab: the order tracker, or the ending once there is one.
  const openOrder = () => setScreen(outcomeRef.current ? "end" : "order");

  // S1 → S2. The agent runs in the background; S2 shows "See my listing →" once it has answered.
  const onUndo = async () => {
    sound.tap();
    haptic.light();
    setSheet(null);
    setScreen("agent");
    try {
      const res = await Promise.race([undoOrder(), wait(AGENT_GIVE_UP_MS).then(() => Promise.reject(new Error("timeout")))]);
      setSheet(res);
    } catch {
      setScreen("order"); // the seller never sees an error (booklet S2)
    }
  };

  // S3 → S4
  const onList = async (floor: number, fallback: Fallback) => {
    if (!sheet) return;
    setBusy(true);
    try {
      const res = await publishListing(sheet.listing_id, { floor_price: floor, fallback });
      setLive({
        price: res.price,
        secondsLeft: res.seconds_left,
        totalSeconds: res.seconds_left,
        reached: 0,
        stats: null,
        locked: false,
        orderReady: false,
        floor,
        fallback,
      });
      setScreen("live");
      setBurst((b) => b + 1);
      sound.success(); // once when listed (round 3)
      haptic.success();
      disconnect();
      stopLiveRef.current = connectSeller((msg) => onLiveMessage(sheet.listing_id, msg));
    } catch {
      // stay on S3; the seller can tap "List it" again
    } finally {
      setBusy(false);
    }
  };

  const onLiveMessage = (listingId: string, msg: LiveMessage) => {
    if (msg.type === "order.status") {
      setStatus(msg.status);
      setLive((l) => l && { ...l, orderReady: msg.status === "ready" });
      return;
    }
    if (!("listing_id" in msg) || msg.listing_id !== listingId) return;
    const ended = outcomeRef.current;

    if (!ended) {
      if (msg.type === "listing.tick") {
        setLive((l) => l && { ...l, price: msg.price, secondsLeft: msg.seconds_left, totalSeconds: Math.max(l.totalSeconds, msg.seconds_left) });
      } else if (msg.type === "listing.locked") {
        setLive((l) => l && { ...l, locked: true });
        haptic.medium();
      } else if (msg.type === "listing.unlocked") {
        setLive((l) => l && { ...l, price: msg.price, locked: false });
      } else if (msg.type === "listing.stats") {
        setLive((l) => l && { ...l, stats: { seen: msg.seen, watching: msg.watching, interested: msg.interested } });
      } else if (msg.type === "listing.reach") {
        setLive((l) => l && { ...l, reached: msg.reached });
      } else if (msg.type === "listing.sold") {
        disconnect();
        setOutcome({ kind: "sold", price: msg.sold_price, pickupBy: msg.pickup_by });
        setScreen("end");
      }
    }

    if (msg.type === "listing.closed" && (!ended || ended.kind === "free")) {
      const code = msg.pickup_code ?? order?.order.pickup_code ?? "";
      if (msg.outcome === "stopped") return backToOrder();
      if (msg.outcome === "free_window") {
        setOutcome({ kind: "free", code });
      } else {
        disconnect();
        setOutcome({ kind: msg.outcome === "donated" ? "donated" : "pickup", code });
      }
      if (!ended) setScreen("end");
    }

    // Free window: someone took it for $0 (the seller may be on Home by now; the banner updates).
    if (msg.type === "listing.sold" && ended?.kind === "free") {
      disconnect();
      setOutcome({ kind: "free_taken", code: ended.code });
    }
  };

  // S4 edits
  const onFloor = async (floor: number) => {
    if (!sheet) return;
    setLive((l) => l && { ...l, floor });
    const res = await patchListing(sheet.listing_id, { floor_price: floor }).catch(() => null);
    if (res) setLive((l) => l && { ...l, floor: res.floor_price });
  };
  const onFallback = async (fallback: Fallback) => {
    if (!sheet) return;
    setLive((l) => l && { ...l, fallback });
    const res = await patchListing(sheet.listing_id, { fallback }).catch(() => null);
    if (res) setLive((l) => l && { ...l, fallback: res.fallback });
  };
  const onStop = async () => {
    if (sheet) await stopListing(sheet.listing_id).catch(() => null);
    backToOrder();
  };

  const goHome = () => setScreen("home");
  const restaurantName = order?.restaurant.name ?? "";
  const banner: OrderBanner = order
    ? bannerFor(outcome, status, restaurantName, order.restaurant.logo_url, order.order.ready_at)
    : { logoUrl: "", title: "Your order", line: "Loading…", good: false };

  return (
    <div
      onPointerDown={sound.unlock}
      className="relative mx-auto h-dvh max-h-[844px] w-full max-w-[390px] overflow-hidden bg-white font-sans text-ink"
    >
      {screen === "home" && <HomeScreen banner={banner} featuredId={order?.restaurant.id ?? "r_fiveguys"} onOpenOrder={openOrder} />}
      {order && (screen === "order" || screen === "confirm") && (
        <div className="seller-sheet-up h-full">
          <OrderScreen data={order} status={status} onUndo={onUndo} onBack={goHome} />
        </div>
      )}
      {screen === "agent" && <AgentScreen ready={!!sheet} onSee={() => setScreen("confirm")} />}
      {screen === "confirm" && sheet && order && (
        <ConfirmSheet sheet={sheet} items={order.order.items} logoUrl={order.restaurant.logo_url} busy={busy} onList={onList} onNeverMind={backToOrder} />
      )}
      {screen === "live" && live && sheet && order && (
        <LiveScreen
          live={live}
          range={{ min: sheet.floor_min, max: sheet.floor_max, step: sheet.floor_step }}
          restaurant={restaurantName}
          food={sheet.tags[0] ? TAG_LABELS[sheet.tags[0]].toLowerCase() : "good food"}
          delivery={order.order.type === "delivery"}
          onFloor={onFloor}
          onFallback={onFallback}
          onStop={onStop}
        />
      )}
      {screen === "end" && outcome?.kind === "sold" && order && (
        <SoldScreen soldPrice={outcome.price} orderTotal={order.order.total} pickupBy={outcome.pickupBy} onHome={goHome} />
      )}
      {screen === "end" && outcome && outcome.kind !== "sold" && (
        <NotSoldScreen kind={outcome.kind} restaurantName={restaurantName} pickupCode={outcome.code} onHome={goHome} />
      )}
      {screen === "live" && burst > 0 && <Confetti key={burst} pieces={70} durationMs={2000} />}
      <MuteButton className="absolute top-3 right-3 z-40" />
    </div>
  );
}

/** The sticky banner on Home: where the order stands. */
function bannerFor(outcome: Outcome, status: OrderStatus, restaurant: string, logoUrl: string, readyAt: number | null): OrderBanner {
  const base = { logoUrl, title: "Your order" };
  if (outcome?.kind === "sold") return { ...base, line: `Resold on Ctrl+Z Eats · ${formatPrice(outcome.price)} back`, good: true };
  if (outcome?.kind === "free") return { ...base, line: "Free for someone nearby", good: false };
  if (outcome?.kind === "free_taken") return { ...base, line: "Taken by someone nearby. Thank you!", good: true };
  if (outcome?.kind === "donated") return { ...base, line: "Set aside for donation", good: true };
  if (outcome?.kind === "pickup") return { ...base, line: `Waiting at ${restaurant} for you`, good: false };
  const arriving = clock((readyAt ?? Date.now()) + DELIVERY_MIN * 60_000);
  if (status === "ready") return { ...base, line: `Ready · arriving ${arriving}`, good: false };
  if (status === "picked_up") return { ...base, line: "On its way", good: false };
  return { ...base, line: `Preparing · arriving ${arriving}`, good: false };
}
