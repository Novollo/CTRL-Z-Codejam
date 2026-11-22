// Small pieces of the restaurant tablet: status, fulfilment, channel, and the animated swaps
// (Delivery → Pickup, old name → new name, old code → new code) plus the two moment banners.
import { formatPrice } from "@shared/constants";
import type { Fulfilment, OrderStatus, RestaurantOrderView } from "@shared/types";
import { Icon, Mascot } from "../ui";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "New",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked up",
};

/** True once the courier was released for this order (it was delivery, Ctrl+Z made it pickup). */
export const courierReleased = (o: RestaurantOrderView) =>
  o.fulfilment === "pickup" && o.ctrlz !== null && o.timeline.some((t) => /courier/i.test(t.text));

export const isListed = (o: RestaurantOrderView) => o.ctrlz !== null && ["live", "locked", "free"].includes(o.ctrlz.status);

/** One short line about the order's Ctrl+Z state, or null. */
export function ctrlzLabel(o: RestaurantOrderView): string | null {
  const c = o.ctrlz;
  if (!c) return null;
  switch (c.status) {
    case "draft":
      return "Ctrl+Z pressed";
    case "live":
      return c.price !== null ? `On Ctrl+Z Eats · ${formatPrice(c.price)}` : "On Ctrl+Z Eats";
    case "locked":
      return "Buyer paying now";
    case "free":
      return "Free on Ctrl+Z Eats";
    case "sold":
      return c.sold_price ? `Resold · ${formatPrice(c.sold_price)}` : "Taken for free";
    case "closed":
      return "Not resold";
    case "donated":
      return "Set aside for donation";
    case "stopped":
      return "Ctrl+Z stopped";
  }
}

export const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function StatusDot({ status }: { status: OrderStatus }) {
  const cls =
    status === "preparing" ? "bg-leaf ui-pulse-ring"
    : status === "ready" ? "bg-forest"
    : status === "received" ? "border-2 border-ink bg-white"
    : "bg-line";
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const cls =
    status === "ready" ? "bg-forest text-white"
    : status === "preparing" ? "bg-mint text-forest"
    : status === "received" ? "bg-white text-ink ring-1 ring-line"
    : "bg-line text-stone";
  return (
    <span key={status} className={`ui-pop-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-semibold ${cls}`}>
      {status === "ready" && <Icon name="check" size={14} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function FulfilmentChip({ value, muted = false }: { value: Fulfilment; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-semibold ${
        muted ? "bg-line/60 text-stone" : value === "pickup" ? "bg-mint text-forest" : "bg-white text-ink ring-1 ring-line"
      }`}
    >
      <Icon name={value === "pickup" ? "bag" : "courier"} size={15} />
      {value === "pickup" ? "Pickup" : "Delivery"}
    </span>
  );
}

/** "Delivery → Pickup" with the old chip crossed out, or just the chip. */
export function FulfilmentSwap({ order, showNote = true, compact = false }: { order: RestaurantOrderView; showNote?: boolean; compact?: boolean }) {
  if (!courierReleased(order)) return <FulfilmentChip value={order.fulfilment} />;
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="rz-strike text-small font-medium text-stone">Delivery</span>
        <Icon name="arrowRight" size={12} className="rz-arrow-in text-stone" />
        <span className="rz-swap-in">
          <FulfilmentChip value="pickup" />
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="rz-strike text-stone">
        <FulfilmentChip value="delivery" muted />
      </span>
      <Icon name="arrowRight" size={14} className="rz-arrow-in text-stone" />
      <span className="rz-swap-in">
        <FulfilmentChip value="pickup" />
      </span>
      {showNote && <span className="rz-swap-in text-small font-medium text-stone">Courier released</span>}
    </span>
  );
}

export function ChannelBadge({ order, dark = false }: { order: RestaurantOrderView; dark?: boolean }) {
  const app = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-semibold ${dark ? "bg-white/15 text-white" : "bg-line/60 text-stone"}`}>
      <Icon name="phone" size={14} />
      Delivery app
    </span>
  );
  if (order.channel !== "ctrlz") return app;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rz-strike ${dark ? "text-white/60" : "text-stone"}`}>{app}</span>
      <Icon name="arrowRight" size={14} className={`rz-arrow-in ${dark ? "text-white/70" : "text-stone"}`} />
      <span className={`rz-swap-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-bold ${dark ? "bg-white text-forest" : "bg-forest text-white"}`}>
        <Icon name="undo" size={14} />
        Ctrl+Z Eats
      </span>
    </span>
  );
}

/** Customer name; after the handover the old name is crossed out. */
export function NameSwap({
  order,
  previous,
  dark = false,
  wrap = true,
  className = "",
}: {
  order: RestaurantOrderView;
  previous: string | null;
  dark?: boolean;
  wrap?: boolean;
  className?: string;
}) {
  if (order.channel !== "ctrlz" || !previous || previous === order.customer_name) {
    return <span className={className}>{order.customer_name}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-2 ${wrap ? "flex-wrap" : "whitespace-nowrap"} ${className}`}>
      <span className={`rz-strike ${dark ? "text-white/60" : "text-stone"}`}>{previous}</span>
      <Icon name="arrowRight" size={16} className={`rz-arrow-in ${dark ? "text-white/70" : "text-stone"}`} />
      <span className="rz-swap-in">{order.customer_name}</span>
    </span>
  );
}

/** The pickup code valid now, big in mono; the old one crossed out above it after the handover. */
export function CodeSwap({ order, dark = false, big = true }: { order: RestaurantOrderView; dark?: boolean; big?: boolean }) {
  const prev = order.previous_pickup_code;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {prev && (
        <>
          <span className={`rz-strike font-mono text-body font-bold ${dark ? "text-white/60" : "text-stone"}`}>{prev}</span>
          <Icon name="arrowRight" size={16} className={`rz-arrow-in ${dark ? "text-white/70" : "text-stone"}`} />
        </>
      )}
      <span
        key={order.pickup_code}
        className={`${prev ? "rz-code-in" : ""} rounded-card font-mono font-bold tracking-wider ${
          big ? "px-3 py-1.5 text-[26px] leading-none" : "px-2 py-0.5 text-body"
        } ${dark ? "bg-white text-forest" : prev ? "bg-forest text-white" : "bg-mint text-forest"}`}
      >
        {order.pickup_code}
      </span>
    </span>
  );
}

/** The page-level banner for the latest moment. */
export function MomentBanner({
  order,
  kind,
  previousName,
  onOpen,
  onClose,
}: {
  order: RestaurantOrderView;
  kind: "listed" | "handover";
  previousName: string | null;
  onOpen: () => void;
  onClose: () => void;
}) {
  if (kind === "listed") {
    return (
      <div role="status" className="ui-pop-in relative overflow-hidden rounded-card border border-amber/50 bg-amber/10">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber text-ink">
            <Icon name="undo" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-small font-semibold uppercase tracking-wide text-ink/70">
              Order <span className="font-mono">{order.short_code}</span> · {order.customer_name}
            </p>
            <p className="mt-0.5 font-semibold leading-snug text-ink">
              Customer pressed Ctrl+Z: this order is being resold on Ctrl+Z Eats. Keep preparing.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
              <FulfilmentSwap order={order} />
              <OpenButton onOpen={onOpen} />
            </div>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="rz-banner-bar h-1 bg-amber" />
      </div>
    );
  }
  return (
    <div role="status" className="ui-pop-in relative overflow-hidden rounded-card bg-forest text-white">
      <div className="flex items-start gap-3 p-4">
        <span className="hidden h-[76px] w-[76px] shrink-0 items-end justify-center rounded-full bg-mint sm:flex">
          <Mascot pose="thumbsup" motion="bob" size={68} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold uppercase tracking-wide text-white/70">
            Order <span className="font-mono">{order.short_code}</span>
            {order.ctrlz?.sold_price ? ` · resold for ${formatPrice(order.ctrlz.sold_price)}` : ""}
          </p>
          <p className="mt-0.5 text-h3 leading-snug">Order changed hands</p>
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
            <div>
              <p className="text-small text-white/70">Customer</p>
              <NameSwap order={order} previous={previousName} dark className="text-h3" />
            </div>
            <div>
              <p className="text-small text-white/70">Pickup code</p>
              <CodeSwap order={order} dark />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
            <ChannelBadge order={order} dark />
            <OpenButton onOpen={onOpen} dark />
          </div>
        </div>
        <CloseButton onClose={onClose} dark />
      </div>
      <div className="rz-banner-bar h-1 bg-leaf" />
    </div>
  );
}

function CloseButton({ onClose, dark = false }: { onClose: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Hide this message"
      className={`ui-press -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${dark ? "text-white/80 hover:bg-white/10" : "text-ink/70 hover:bg-amber/20"}`}
    >
      <Icon name="x" size={18} />
    </button>
  );
}

function OpenButton({ onOpen, dark = false }: { onOpen: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`ui-press inline-flex items-center gap-1 rounded-full px-3.5 py-2 sm:ml-auto text-small font-semibold ${dark ? "bg-white text-forest" : "bg-ink text-white"}`}
    >
      Open order
      <Icon name="chevronRight" size={14} />
    </button>
  );
}
