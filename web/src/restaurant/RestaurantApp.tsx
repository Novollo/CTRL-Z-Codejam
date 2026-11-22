import { BrandLogo } from "../ui";
// The restaurant tablet (round 4, docs/design-round-2.md "Restaurant tablet (track E)").
// /restaurant?r=r_fiveguys      real API + live socket (demo data until the API answers)
// /restaurant?r=r_fiveguys&sim=1  dev-only story simulator for the stage order
import { useEffect, useMemo, useState } from "react";
import { DEMO_ORDER_ID } from "@shared/constants";
import type { Restaurant, RestaurantOrderView } from "@shared/types";
import { Doodles, Icon, MuteButton, type IconName } from "../ui";
import { MomentBanner, isListed } from "./Moments";
import { EmptyDetail, OrderDetail } from "./OrderDetail";
import { OrderList, OrderTabs, isDone, type Tab } from "./OrderList";
import { SimBar } from "./SimBar";
import { useOrders, type Mode } from "./useOrders";
import "./restaurant.css";

const NAV: { label: string; icon: IconName; on: boolean }[] = [
  { label: "Orders", icon: "receipt", on: true },
  { label: "Menu", icon: "utensils", on: false },
  { label: "Performance", icon: "bolt", on: false },
];

const wide = () => window.matchMedia("(min-width: 1024px)").matches;

/** The latest order the kitchen must notice, for the banner. */
function bannerFor(orders: RestaurantOrderView[]): { order: RestaurantOrderView; kind: "listed" | "handover" } | null {
  const lastAt = (o: RestaurantOrderView) => o.timeline[o.timeline.length - 1]?.at ?? o.placed_at;
  const hits = orders
    .filter((o) => !isDone(o) && (o.channel === "ctrlz" || isListed(o)))
    .sort((a, b) => lastAt(b) - lastAt(a));
  const o = hits[0];
  return o ? { order: o, kind: o.channel === "ctrlz" ? "handover" : "listed" } : null;
}

function Logo() {
  return <BrandLogo height={22} />;
}

function ModePill({ mode }: { mode: Mode }) {
  if (mode === "real") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-small font-semibold text-forest">
        <span className="ui-pulse-ring h-2 w-2 rounded-full bg-leaf" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-line/60 px-3 py-1 text-small font-semibold text-stone">
      <span className={`h-2 w-2 rounded-full ${mode === "sim" ? "bg-amber" : "bg-stone"}`} />
      {mode === "sim" ? "Simulator" : "Demo data"}
    </span>
  );
}

function LogoTile({ restaurant, size }: { restaurant: Restaurant; size: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-card bg-white p-1.5 ring-1 ring-line" style={{ width: size, height: size }}>
      <img src={restaurant.logo_url} alt="" className="h-full w-full object-contain" />
    </span>
  );
}

function Sidebar({ restaurant }: { restaurant: Restaurant }) {
  return (
    <aside className="relative hidden w-60 shrink-0 flex-col overflow-hidden border-r border-line bg-white md:flex">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <LogoTile restaurant={restaurant} size={48} />
        <div className="min-w-0">
          <p className="truncate text-h3 text-ink">{restaurant.name}</p>
          <p className="text-small text-stone">Kitchen</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 border-t border-line px-3 pt-4">
        {NAV.map((n) => (
          <span
            key={n.label}
            aria-current={n.on ? "page" : undefined}
            aria-disabled={!n.on}
            title={n.on ? undefined : "Not part of this demo"}
            className={`relative flex items-center gap-3 rounded-card px-3 py-2.5 font-semibold ${
              n.on ? "bg-mint text-forest" : "cursor-not-allowed text-stone/60"
            }`}
          >
            {n.on && <span className="absolute -left-3 inset-y-1.5 w-1 rounded-r-full bg-forest" />}
            <Icon name={n.icon} size={20} />
            {n.label}
          </span>
        ))}
      </nav>
      <div className="relative mt-auto h-40">
        <Doodles variant="food" tone="forest" opacity={0.07} />
        <div className="absolute inset-x-5 bottom-5 rounded-card bg-white/90 p-3 ring-1 ring-line">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone">Connected to</p>
          <div className="mt-1.5">
            <Logo />
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Phones and narrow frames: the sidebar collapses into this top bar. */
function TopBar({ restaurant, mode }: { restaurant: Restaurant; mode: Mode }) {
  return (
    <header className="border-b border-line bg-white px-4 pb-3 pt-4 md:hidden">
      <div className="flex items-center gap-3">
        <LogoTile restaurant={restaurant} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight text-ink">{restaurant.name}</p>
          <p className="text-small text-stone">Order manager</p>
        </div>
        <ModePill mode={mode} />
        <MuteButton />
      </div>
      <nav className="mt-3 flex gap-1.5">
        {NAV.map((n) => (
          <span
            key={n.label}
            aria-disabled={!n.on}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-small font-semibold ${
              n.on ? "bg-forest text-white" : "bg-line/50 text-stone/60"
            }`}
          >
            <Icon name={n.icon} size={14} />
            {n.label}
          </span>
        ))}
      </nav>
    </header>
  );
}

export function RestaurantApp() {
  const { mode, restaurant, orders, flashes, lastMoment, previousName, busy, setStatus, sim } = useOrders();
  const [tab, setTab] = useState<Tab>("active");
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_ORDER_ID);
  const [phoneDetail, setPhoneDetail] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const active = useMemo(() => orders.filter((o) => !isDone(o)), [orders]);
  const completed = useMemo(() => orders.filter(isDone), [orders]);
  const shown = tab === "active" ? active : completed;
  const selected = orders.find((o) => o.order_id === selectedId) ?? null;

  // A new moment on wide screens: open that order so the change is right in front of the kitchen.
  useEffect(() => {
    if (lastMoment && (wide() || !phoneDetail)) setSelectedId(lastMoment.orderId);
  }, [lastMoment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the selected order in the tab it now belongs to (e.g. after "Picked up").
  useEffect(() => {
    if (selected) setTab(isDone(selected) ? "completed" : "active");
  }, [selected?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restart in the simulator brings the banners back.
  useEffect(() => {
    if (sim.step === 0) setDismissed(new Set());
  }, [sim.step]);

  const banner = bannerFor(orders);
  const bannerKey = banner ? `${banner.order.order_id}:${banner.kind}` : "";
  const showBanner = banner && !dismissed.has(bannerKey);

  const open = (id: string) => {
    setSelectedId(id);
    setPhoneDetail(true);
    if (!wide()) window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-dvh bg-white text-ink lg:h-dvh">
      <Sidebar restaurant={restaurant} />

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        {mode === "sim" && <SimBar {...sim} />}
        <TopBar restaurant={restaurant} mode={mode} />

        <header className="hidden items-center gap-4 border-b border-line px-6 py-4 md:flex">
          <h1 className="min-w-0 flex-1 truncate text-h2 text-ink">
            {restaurant.name} <span className="text-stone">·</span> Order manager
          </h1>
          <ModePill mode={mode} />
          <MuteButton />
        </header>

        {showBanner && (
          // On phones the open order's own detail already shows the same news, so the banner steps aside there.
          <div className={`px-4 pt-4 sm:px-6 ${phoneDetail && banner.order.order_id === selectedId ? "hidden lg:block" : ""}`}>
            <MomentBanner
              key={bannerKey}
              order={banner.order}
              kind={banner.kind}
              previousName={previousName(banner.order.order_id)}
              onOpen={() => open(banner.order.order_id)}
              onClose={() => setDismissed((d) => new Set(d).add(bannerKey))}
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* list */}
          <section className={`min-w-0 flex-1 lg:flex lg:flex-col lg:overflow-y-auto ${phoneDetail ? "hidden lg:flex" : ""}`}>
            <div className="px-4 pt-5 sm:px-6">
              <h2 className="text-[30px] font-bold leading-tight text-ink">Orders</h2>
              <div className="mt-3">
                <OrderTabs tab={tab} onTab={setTab} counts={{ active: active.length, completed: completed.length }} />
              </div>
            </div>
            <div className="px-0 pb-8 sm:px-2">
              <OrderList
                key={tab}
                tab={tab}
                orders={shown}
                selectedId={selectedId}
                flashes={flashes}
                previousName={previousName}
                onSelect={open}
              />
            </div>
          </section>

          {/* detail */}
          <section
            className={`min-w-0 border-line lg:block lg:w-[44%] lg:min-w-[400px] lg:max-w-[640px] lg:overflow-y-auto lg:border-l ${
              phoneDetail ? "" : "hidden"
            }`}
          >
            {selected ? (
              <OrderDetail
                order={selected}
                previousName={previousName(selected.order_id)}
                busy={busy === selected.order_id}
                onStatus={(s) => void setStatus(selected.order_id, s)}
                onBack={() => setPhoneDetail(false)}
              />
            ) : (
              <EmptyDetail />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
