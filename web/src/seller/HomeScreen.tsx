// Home (round 4): a generic delivery-app home before S1. "Demo app" only: no real brand's name, logo or colours.
// Location bar, search, category chips, 3 restaurant cards, a sticky "Your order" banner and a bottom tab bar.
import { useEffect, useState } from "react";
import type { Restaurant } from "@shared/types";
import { Doodles, Icon, sound, type IconName } from "../ui";
import { getRestaurants } from "./sellerApi";

/** Card details the data doesn't have (demo values). */
const CARD_INFO: Record<string, { rating: string; time: string; fee: string }> = {
  r_fiveguys: { rating: "4.6", time: "15–25 min", fee: "$2.49 delivery" },
  r_dominos: { rating: "4.4", time: "20–30 min", fee: "$1.99 delivery" },
  r_timhortons: { rating: "4.3", time: "10–20 min", fee: "$0.99 delivery" },
  r_mcgillpizza: { rating: "4.5", time: "20–30 min", fee: "$1.49 delivery" },
  r_onigiri: { rating: "4.7", time: "15–25 min", fee: "$2.99 delivery" },
};
const DEFAULT_INFO = { rating: "4.5", time: "20–30 min", fee: "$1.99 delivery" };

const CATEGORIES: { label: string; icon: IconName }[] = [
  { label: "Deals", icon: "tag" },
  { label: "Burgers", icon: "utensils" },
  { label: "Popular", icon: "flame" },
  { label: "Healthy", icon: "leaf" },
  { label: "Fast", icon: "clock" },
  { label: "Top rated", icon: "star" },
];

const TABS: { label: string; icon: IconName }[] = [
  { label: "Home", icon: "home" },
  { label: "Browse", icon: "search" },
  { label: "Orders", icon: "receipt" },
  { label: "Account", icon: "user" },
];

export interface OrderBanner {
  logoUrl: string;
  title: string;
  line: string;
  good: boolean; // green accent when the order was resolved on Ctrl+Z Eats
}

export function HomeScreen({ banner, featuredId, onOpenOrder }: { banner: OrderBanner; featuredId: string; onOpenOrder: () => void }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    getRestaurants()
      .then((r) => {
        const featured = r.restaurants.filter((x) => x.id === featuredId);
        setRestaurants([...featured, ...r.restaurants.filter((x) => x.id !== featuredId)].slice(0, 3));
      })
      .catch(() => setRestaurants([]));
  }, [featuredId]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Location bar (the mute button sits top-right) */}
      <header className="px-5 pt-4 pb-3 pr-16">
        <span className="rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-forest uppercase">Demo app</span>
        <button className="ui-press mt-2 flex items-center gap-1.5 rounded-full text-left" onClick={() => sound.tap()}>
          <Icon name="pin" size={20} className="text-forest" />
          <span className="text-h3 text-ink">McGill campus</span>
          <Icon name="chevronRight" size={18} className="rotate-90 text-ink" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Search */}
        <div className="ui-flow-in px-5">
          <div className="flex h-12 items-center gap-3 rounded-full bg-[#F3F3F3] px-4 text-body text-stone">
            <Icon name="search" size={20} className="text-ink" />
            Search restaurants or dishes
          </div>
        </div>

        {/* Category chips */}
        <div className="ui-flow-in ui-delay-1 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.label}
              onClick={() => sound.tap()}
              className={`ui-press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-small font-semibold ${
                i === 1 ? "bg-forest text-white" : "bg-[#F3F3F3] text-ink"
              }`}
            >
              <Icon name={c.icon} size={16} />
              {c.label}
            </button>
          ))}
        </div>

        {/* Restaurants */}
        <h2 className="ui-flow-in ui-delay-2 mt-6 px-5 text-h2 text-ink">Near McGill</h2>
        <div className="mt-3 space-y-4 px-5">
          {restaurants.length === 0 && [0, 1].map((k) => <div key={k} className="ui-shimmer h-48 rounded-card" />)}
          {restaurants.map((r, i) => {
            const info = CARD_INFO[r.id] ?? DEFAULT_INFO;
            return (
              <button
                key={r.id}
                onClick={() => sound.tap()}
                className={`ui-flow-in ui-delay-${Math.min(4, i + 2)} ui-press block w-full overflow-hidden rounded-card border border-line text-left`}
              >
                <div className="relative flex h-32 items-center justify-center overflow-hidden bg-mint">
                  <Doodles variant="food" tone="forest" opacity={0.07} size={180} drift={false} />
                  <div className="relative flex h-20 w-40 items-center justify-center rounded-card bg-white p-2.5 shadow-sm">
                    <img src={r.logo_url} alt={r.name} className="h-full w-full object-contain" />
                  </div>
                </div>
                <div className="flex items-start justify-between px-4 py-3">
                  <div>
                    <p className="text-h3 text-ink">{r.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-small text-stone">
                      <Icon name="clock" size={14} />
                      {info.time}
                      <span aria-hidden>·</span>
                      {info.fee}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-[#F3F3F3] px-2 py-1 text-small font-semibold text-ink">
                    <Icon name="star" size={13} className="text-forest" />
                    {info.rating}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky "Your order" banner */}
      <div className="px-3 pb-2">
        <button
          onClick={() => {
            sound.tap();
            onOpenOrder();
          }}
          className="ui-press ui-slide-up flex w-full items-center gap-3 rounded-card bg-forest px-3 py-2.5 text-left text-white shadow-lg shadow-forest/25"
        >
          <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-white p-1">
            <img src={banner.logoUrl} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-bold">{banner.title}</span>
            <span className={`flex items-center gap-1.5 truncate text-small ${banner.good ? "font-semibold text-white" : "text-white/80"}`}>
              {banner.good ? (
                <Icon name="checkCircle" size={14} className="text-leaf" />
              ) : (
                <span className="ui-pulse-ring h-2 w-2 shrink-0 rounded-full bg-leaf" />
              )}
              <span className="truncate">{banner.line}</span>
            </span>
          </span>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      {/* Bottom tab bar */}
      <nav className="grid grid-cols-4 border-t border-line bg-white pt-2 pb-4">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => {
              sound.tap();
              if (t.label === "Orders") onOpenOrder();
            }}
            className={`ui-press flex flex-col items-center gap-0.5 text-[11px] font-semibold ${i === 0 ? "text-ink" : "text-stone"}`}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
