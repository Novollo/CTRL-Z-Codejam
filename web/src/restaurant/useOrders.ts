// Where the restaurant tablet gets its orders.
//   real: GET API.restaurantOrders + live `restaurant.order` messages (the API answered)
//   demo: the API is not there yet → MOCK_RESTAURANT_QUEUE + the stage order, retried every 5 s
//   sim:  ?sim=1 → the same local data, the stage order stepped by the simulator (no API, no socket)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API, type RestaurantOrdersResponse } from "@shared/api";
import { DEMO_ORDER_ID, DEMO_RESTAURANT_ID } from "@shared/constants";
import { MOCK_RESTAURANT, MOCK_RESTAURANT_QUEUE } from "@shared/mocks/data";
import type { OrderStatus, Restaurant, RestaurantOrderView } from "@shared/types";
import { apiCall } from "../lib/api";
import { connectLive } from "../lib/live";
import { SIM_LAST, newSimCode, nextSimPrice, simStageOrder, simStartPrice } from "./sim";

export type Mode = "real" | "demo" | "sim";
/** A moment the kitchen must notice. Drives the row highlight and the banner. */
export type MomentKind = "ctrlz" | "listed" | "handover" | "ready";
export interface Flash {
  kind: MomentKind;
  n: number; // bumps every time, so the highlight animation restarts
}

const NAMES_KEY = "ctrlz-restaurant-names";
/** How long the simulator stays on each step (ms). Longer on the moments worth watching. */
const SIM_STEP_MS = [3000, 3500, 7000, 3500, 7000, 4000];

function readNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NAMES_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveNames(names: Record<string, string>) {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch {
    // storage blocked: the old name is only kept in memory
  }
}

const isListed = (o: RestaurantOrderView) => o.ctrlz !== null && ["live", "locked", "free"].includes(o.ctrlz.status);

/** What changed between two versions of one order, if it is worth a highlight. */
function momentOf(prev: RestaurantOrderView | undefined, next: RestaurantOrderView): MomentKind | null {
  if (!prev) return null;
  if (prev.channel !== "ctrlz" && next.channel === "ctrlz") return "handover";
  if (!isListed(prev) && isListed(next)) return "listed";
  if (prev.ctrlz === null && next.ctrlz !== null) return "ctrlz";
  if (prev.status !== "ready" && next.status === "ready") return "ready";
  return null;
}

const byNewest = (a: RestaurantOrderView, b: RestaurantOrderView) => b.placed_at - a.placed_at;

function withStatus(o: RestaurantOrderView, status: OrderStatus): RestaurantOrderView {
  const text = status === "ready" ? "Ready for pickup" : `Picked up by ${o.customer_name}`;
  return { ...o, status, timeline: [...o.timeline, { at: Date.now(), text, kind: "done" }] };
}

export function useOrders() {
  const params = new URLSearchParams(window.location.search);
  const restaurantId = params.get("r") || DEMO_RESTAURANT_ID;
  const startSim = params.get("sim") === "1";

  const [mode, setMode] = useState<Mode>(startSim ? "sim" : "demo");
  const [restaurant, setRestaurant] = useState<Restaurant>(MOCK_RESTAURANT);
  const [orders, setOrders] = useState<RestaurantOrderView[]>([]);
  const [flashes, setFlashes] = useState<Record<string, Flash>>({});
  const [lastMoment, setLastMoment] = useState<{ orderId: string; kind: MomentKind; n: number } | null>(null);
  const [names, setNames] = useState<Record<string, string>>(readNames);
  const [busy, setBusy] = useState<string | null>(null);

  // ---- simulator state (sim mode, and the frozen stage order in demo mode) ----
  const [t0, setT0] = useState(() => Date.now());
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(startSim);
  const [price, setPrice] = useState(simStartPrice);
  const [code, setCode] = useState(newSimCode);
  const queue = useMemo(() => (restaurantId === DEMO_RESTAURANT_ID ? MOCK_RESTAURANT_QUEUE(t0) : []), [restaurantId, t0]);
  /** Local status changes from Mark ready / Picked up when there is no API. */
  const [local, setLocal] = useState<Record<string, OrderStatus>>({});

  const n = useRef(0);
  const prevRef = useRef<Map<string, RestaurantOrderView>>(new Map());

  // ---- real API: load, and keep trying while it is missing ----
  const load = useCallback(async () => {
    try {
      const res = await apiCall<RestaurantOrdersResponse>("GET", API.restaurantOrders(restaurantId));
      setRestaurant(res.restaurant);
      setOrders([...res.orders].sort(byNewest));
      setMode("real");
      return true;
    } catch {
      return false;
    }
  }, [restaurantId]);

  useEffect(() => {
    if (startSim) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tryLoad = async () => {
      const ok = await load();
      if (!ok && !stopped) timer = setTimeout(tryLoad, 5000);
    };
    void tryLoad();
    const stopLive = connectLive({ role: "restaurant", restaurantId }, (msg) => {
      if (msg.type !== "restaurant.order") return;
      setMode("real");
      setOrders((list) => [msg.order, ...list.filter((o) => o.order_id !== msg.order.order_id)].sort(byNewest));
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      stopLive();
    };
  }, [startSim, restaurantId, load]);

  // ---- local data (demo + sim): rebuild the list from the simulator ----
  useEffect(() => {
    if (mode === "real") return;
    const stage = restaurantId === DEMO_RESTAURANT_ID ? [simStageOrder(step, t0, code, price)] : [];
    const list = [...stage, ...queue].map((o) => {
      const s = local[o.order_id];
      return s && s !== o.status ? withStatus(o, s) : o;
    });
    setOrders(list.sort(byNewest));
  }, [mode, restaurantId, step, t0, code, price, queue, local]);

  // Sim: auto-play steps, and let the price fall while the order is listed.
  useEffect(() => {
    if (mode !== "sim" || !playing) return;
    if (step >= SIM_LAST) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), SIM_STEP_MS[step] ?? 4000);
    return () => clearTimeout(t);
  }, [mode, playing, step]);

  useEffect(() => {
    if (mode !== "sim" || step !== 2) return;
    const t = setInterval(() => setPrice(nextSimPrice), 600);
    return () => clearInterval(t);
  }, [mode, step]);

  // ---- moments: compare every order with its last version ----
  useEffect(() => {
    const prev = prevRef.current;
    const nextFlashes: Record<string, Flash> = {};
    let moment: { orderId: string; kind: MomentKind; n: number } | null = null;
    const newNames: Record<string, string> = {};
    for (const o of orders) {
      const kind = momentOf(prev.get(o.order_id), o);
      if (kind) {
        n.current += 1;
        nextFlashes[o.order_id] = { kind, n: n.current };
        if (kind !== "ready") moment = { orderId: o.order_id, kind, n: n.current };
      }
      // Remember the original customer's name, to show it crossed out after the handover.
      if (o.channel === "delivery_app" && names[o.order_id] !== o.customer_name) newNames[o.order_id] = o.customer_name;
    }
    prevRef.current = new Map(orders.map((o) => [o.order_id, o]));
    if (Object.keys(nextFlashes).length) setFlashes((f) => ({ ...f, ...nextFlashes }));
    if (moment) setLastMoment(moment);
    if (Object.keys(newNames).length) {
      const merged = { ...names, ...newNames };
      setNames(merged);
      saveNames(merged);
    }
  }, [orders, names]);

  // ---- buttons ----
  const setStatus = useCallback(
    async (orderId: string, status: "ready" | "picked_up") => {
      if (mode === "real") {
        setBusy(orderId);
        try {
          await apiCall("POST", status === "ready" ? API.restaurantReady(orderId) : API.restaurantPickedUp(orderId));
        } catch {
          // the live message or the reload below shows the true state
        }
        await load();
        setBusy(null);
        return;
      }
      if (orderId === DEMO_ORDER_ID) {
        // Keep the simulator story in order: ready is step 5, picked up is step 6.
        setStep((s) => Math.max(s, status === "ready" ? 5 : 6));
        return;
      }
      setLocal((l) => ({ ...l, [orderId]: status }));
    },
    [mode, load],
  );

  const sim = {
    step,
    playing,
    setStep: (s: number) => setStep(Math.max(0, Math.min(SIM_LAST, s))),
    togglePlay: () => setPlaying((p) => !p),
    restart: () => {
      prevRef.current = new Map();
      setFlashes({});
      setLastMoment(null);
      setLocal({});
      setPrice(simStartPrice);
      setCode(newSimCode());
      setT0(Date.now());
      setStep(0);
      setPlaying(true);
    },
  };

  /** The crossed-out name after a handover: from the engine; the name remembered here is only a fallback. */
  const previousName = (id: string) => orders.find((o) => o.order_id === id)?.previous_customer_name ?? names[id] ?? null;

  return { mode, restaurant, orders, flashes, lastMoment, previousName, busy, setStatus, sim };
}
