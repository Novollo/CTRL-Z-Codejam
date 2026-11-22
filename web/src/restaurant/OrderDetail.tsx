// The detail panel for one order: what changed (Ctrl+Z, handover), who picks it up with which code,
// the items, the timeline (newest at the bottom) and the Mark ready / Picked up button.
import type { ReactNode } from "react";
import { formatPrice } from "@shared/constants";
import type { RestaurantOrderView, RestaurantTimelineEntry } from "@shared/types";
import { Doodles, Icon, Mascot, sound, type IconName } from "../ui";
import { ChannelBadge, CodeSwap, FulfilmentSwap, NameSwap, StatusPill, isListed, time } from "./Moments";

function Callout({ order }: { order: RestaurantOrderView }) {
  const c = order.ctrlz;
  if (!c) return null;
  if (order.channel === "ctrlz") {
    return (
      <div key="handover" className="ui-pop-in flex items-start gap-3 rounded-card bg-forest p-4 text-white">
        <Icon name="swap" size={22} className="mt-0.5 shrink-0 text-leaf" />
        <div>
          <p className="font-semibold">Order changed hands</p>
          <p className="mt-0.5 text-small text-white/80">
            {c.sold_price ? `Resold on Ctrl+Z Eats for ${formatPrice(c.sold_price)}.` : "Taken for free on Ctrl+Z Eats."} Give it to{" "}
            {order.customer_name} with the new code only.
          </p>
        </div>
      </div>
    );
  }
  if (c.status === "draft" || isListed(order)) {
    return (
      <div key="listed" className="ui-pop-in flex items-start gap-3 rounded-card border border-amber/50 bg-amber/10 p-4">
        <Icon name="undo" size={22} className="mt-0.5 shrink-0 text-ink" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {c.status === "draft" ? "Customer pressed Ctrl+Z" : "Customer pressed Ctrl+Z: this order is being resold on Ctrl+Z Eats. Keep preparing."}
          </p>
          {c.status === "draft" && <p className="mt-0.5 text-small text-stone">Keep preparing as normal.</p>}
          {c.status === "locked" && <p className="mt-1 text-small font-semibold text-ink">A buyer is paying right now.</p>}
          {c.status !== "draft" && c.price !== null && (
            <p className="mt-1 text-small text-stone">
              Price on Ctrl+Z Eats now{" "}
              <span key={c.price} className="ui-price-drop inline-block font-mono font-bold text-ink">
                {formatPrice(c.price)}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }
  if (c.status === "stopped") {
    return <Note icon="info" text="The customer stopped the resale. The order is back to normal." />;
  }
  if (c.status === "donated") {
    return <Note icon="heart" text="Nobody bought it. The customer set this meal aside for donation." />;
  }
  return <Note icon="info" text="Not resold. The original customer picks it up with their own code." />;
}

function Note({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="ui-pop-in flex items-start gap-3 rounded-card bg-line/40 p-4">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-stone" />
      <p className="text-small text-ink">{text}</p>
    </div>
  );
}

function Row({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-small text-stone">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

const DOT: Record<RestaurantTimelineEntry["kind"], string> = {
  info: "bg-white ring-2 ring-line",
  ctrlz: "bg-amber",
  handover: "bg-forest",
  done: "bg-leaf",
};

function Timeline({ entries }: { entries: RestaurantTimelineEntry[] }) {
  return (
    <ol className="relative">
      {entries.map((e, i) => (
        <li key={`${e.at}-${e.text}`} className="ui-flow-in relative flex gap-3 pb-4 last:pb-0">
          {i < entries.length - 1 && <span className="absolute left-[5px] top-4 h-full w-0.5 bg-line" aria-hidden />}
          <span className={`relative mt-1.5 h-3 w-3 shrink-0 rounded-full ${DOT[e.kind]}`} aria-hidden />
          <div className="min-w-0">
            <p className={`text-small leading-snug ${e.kind === "info" ? "text-ink" : "font-semibold text-ink"}`}>{e.text}</p>
            <p className="font-mono text-[12px] text-stone">{time(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail({
  order,
  previousName,
  busy,
  onStatus,
  onBack,
}: {
  order: RestaurantOrderView;
  previousName: string | null;
  busy: boolean;
  onStatus: (status: "ready" | "picked_up") => void;
  onBack: () => void;
}) {
  const next = order.status === "ready" ? "picked_up" : order.status === "picked_up" ? null : "ready";
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 px-4 pb-6 pt-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="ui-press -ml-2 mb-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-small font-semibold text-forest lg:hidden"
        >
          <Icon name="chevronLeft" size={16} />
          All orders
        </button>

        <div key={order.order_id} className="rz-slide-in">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="font-mono text-[30px] font-bold leading-none text-ink">{order.short_code}</h2>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-1.5 text-small text-stone">Placed at {time(order.placed_at)}</p>

          <div className="mt-4">
            <Callout order={order} />
          </div>

          <div className="@container mt-2">
            <div className="grid gap-x-8 @2xl:grid-cols-[minmax(0,1fr)_minmax(200px,0.8fr)]">
              <div>
                <div className="divide-y divide-line">
                  <Row icon="user" label="Customer">
                    <NameSwap order={order} previous={previousName} className="text-h3 text-ink" />
                  </Row>
                  <Row icon="qr" label="Pickup code">
                    <CodeSwap order={order} />
                  </Row>
                  <Row icon={order.fulfilment === "pickup" ? "bag" : "courier"} label="Fulfilment">
                    <FulfilmentSwap order={order} />
                  </Row>
                  <Row icon="receipt" label="Channel">
                    <ChannelBadge order={order} />
                  </Row>
                </div>

                <h3 className="mt-5 text-small font-semibold uppercase tracking-wide text-stone">Items</h3>
                <ul className="mt-2 divide-y divide-line rounded-card border border-line">
                  {order.items.map((it) => (
                    <li key={it.name} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{it.name}</p>
                        <p className="mt-0.5 text-small text-stone">{it.description}</p>
                      </div>
                      <span className="font-mono text-body text-ink">{formatPrice(it.price)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between px-4 py-3">
                    <span className="font-semibold text-ink">Food total</span>
                    <span className="font-mono text-body font-bold text-ink">{formatPrice(order.food_price)}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 @2xl:mt-3">
                <h3 className="text-small font-semibold uppercase tracking-wide text-stone">Timeline</h3>
                <div className="mt-3 rounded-card bg-white p-4 ring-1 ring-line">
                  <Timeline entries={order.timeline} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        {next ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              sound.unlock();
              sound.tap();
              onStatus(next);
            }}
            className="ui-press flex h-bottom w-full items-center justify-center gap-2 rounded-card bg-forest text-body font-semibold text-white disabled:opacity-60"
          >
            <Icon name={next === "ready" ? "check" : "bag"} size={20} />
            {busy ? "Saving…" : next === "ready" ? "Mark ready" : "Picked up"}
            <Icon name="arrowRight" size={18} className="ml-1" />
          </button>
        ) : (
          <p className="flex h-bottom items-center justify-center gap-2 rounded-card bg-mint font-semibold text-forest">
            <Icon name="checkCircle" size={20} />
            Picked up by {order.customer_name}
          </p>
        )}
      </div>
    </div>
  );
}

export function EmptyDetail() {
  return (
    <div className="relative flex h-full min-h-[360px] flex-col items-center justify-center overflow-hidden bg-mint/50 p-8 text-center">
      <Doodles variant="food" tone="forest" opacity={0.07} />
      <div className="relative">
        <Mascot pose="pointing" motion="bob" size={120} />
        <p className="mt-3 text-h3 text-ink">Pick an order</p>
        <p className="mt-1 text-small text-stone">Its details and timeline show up here.</p>
      </div>
    </div>
  );
}
