// Seller app, route /seller (booklet section 5): S1 → S2 → S3 → S4 → S5a / S5b.
import { useEffect, useRef, useState } from "react";
import type { OrderResponse, UndoResponse } from "@shared/api";
import { TAG_LABELS, type Fallback } from "@shared/catalog";
import type { LiveMessage } from "@shared/messages";
import type { OrderStatus } from "@shared/types";
import { Confetti, MuteButton, haptic, sound } from "../ui";
import { AgentScreen } from "./AgentScreen";
import { ConfirmSheet } from "./ConfirmSheet";
import { NotSoldScreen, SoldScreen, type NotSoldKind } from "./EndScreens";
import { LiveScreen, type LiveState } from "./LiveScreen";
import { OrderScreen } from "./OrderScreen";
import { connectSeller, getOrder, patchListing, publishListing, stopListing, undoOrder } from "./sellerApi";
import "./seller.css";

type Screen = "order" | "agent" | "confirm" | "live" | "sold" | "notsold";

/** The server answers within 5 s (agent timeout → defaults). Past this, quietly go back to S1. */
const AGENT_GIVE_UP_MS = 9000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SellerApp() {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [status, setStatus] = useState<OrderStatus>("preparing");
  const [screen, setScreen] = useState<Screen>("order");
  const [sheet, setSheet] = useState<UndoResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0); // confetti when listed
  const [live, setLive] = useState<LiveState | null>(null);
  const [sold, setSold] = useState<{ price: number; pickupBy: number } | null>(null);
  const [notSold, setNotSold] = useState<{ kind: NotSoldKind; code: string } | null>(null);

  const screenRef = useRef<Screen>("order");
  screenRef.current = screen;
  const stopLiveRef = useRef<(() => void) | null>(null);

  // S1 data. Retry quietly until the server answers.
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
      sound.success();
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
    const current = screenRef.current;

    if (current === "live") {
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
        setSold({ price: msg.sold_price, pickupBy: msg.pickup_by });
        setScreen("sold");
      }
    }

    if (msg.type === "listing.closed" && (current === "live" || current === "notsold")) {
      const code = msg.pickup_code ?? order?.order.pickup_code ?? "";
      if (msg.outcome === "stopped") return backToOrder();
      if (msg.outcome === "free_window") {
        setNotSold({ kind: "free", code });
      } else {
        disconnect();
        setNotSold({ kind: msg.outcome === "donated" ? "donated" : "pickup", code });
      }
      setScreen("notsold");
    }

    // Free window: someone took it for $0.
    if (msg.type === "listing.sold" && current === "notsold") {
      disconnect();
      setNotSold((n) => n && { ...n, kind: "free_taken" });
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

  return (
    <div
      onPointerDown={sound.unlock}
      className="relative mx-auto h-dvh max-h-[844px] w-full max-w-[390px] overflow-hidden bg-white font-sans text-ink"
    >
      {order && (screen === "order" || screen === "confirm") && <OrderScreen data={order} status={status} onUndo={onUndo} />}
      {screen === "agent" && <AgentScreen ready={!!sheet} onSee={() => setScreen("confirm")} />}
      {screen === "confirm" && sheet && order && (
        <ConfirmSheet sheet={sheet} items={order.order.items} logoUrl={order.restaurant.logo_url} busy={busy} onList={onList} onNeverMind={backToOrder} />
      )}
      {screen === "live" && live && sheet && order && (
        <LiveScreen
          live={live}
          range={{ min: sheet.floor_min, max: sheet.floor_max, step: sheet.floor_step }}
          restaurant={order.restaurant.name}
          food={sheet.tags[0] ? TAG_LABELS[sheet.tags[0]].toLowerCase() : "good food"}
          onFloor={onFloor}
          onFallback={onFallback}
          onStop={onStop}
        />
      )}
      {screen === "sold" && sold && order && <SoldScreen soldPrice={sold.price} orderTotal={order.order.total} pickupBy={sold.pickupBy} />}
      {screen === "notsold" && notSold && order && <NotSoldScreen kind={notSold.kind} restaurantName={order.restaurant.name} pickupCode={notSold.code} />}
      {screen === "live" && burst > 0 && <Confetti key={burst} pieces={70} durationMs={2000} />}
      <MuteButton className="absolute top-3 left-3 z-40" />
    </div>
  );
}
