// Tabs (Active / Completed) and the order rows. Rows switch to a table layout when the list is wide enough.
import { formatPrice } from "@shared/constants";
import type { RestaurantOrderView } from "@shared/types";
import { Icon, Mascot, sound } from "../ui";
import { FulfilmentSwap, NameSwap, STATUS_LABEL, StatusDot, ctrlzLabel, isListed } from "./Moments";
import type { Flash } from "./useOrders";

export type Tab = "active" | "completed";

export const isDone = (o: RestaurantOrderView) => o.status === "picked_up";

export function OrderTabs({ tab, onTab, counts }: { tab: Tab; onTab: (t: Tab) => void; counts: Record<Tab, number> }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
  ];
  return (
    <div role="tablist" className="relative flex border-b border-line">
      {tabs.map((t) => {
        const on = tab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => {
              if (on) return;
              sound.unlock();
              sound.tap();
              onTab(t.id);
            }}
            className={`relative flex items-center gap-2 px-4 pb-3 pt-1 text-body font-semibold transition-colors ${on ? "text-ink" : "text-stone hover:text-ink"}`}
          >
            {t.label}
            <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-small font-bold ${on ? "bg-forest text-white" : "bg-line text-stone"}`}>
              {counts[t.id]}
            </span>
            {on && <span className="ui-pop-in absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-forest" />}
          </button>
        );
      })}
    </div>
  );
}

const itemsLine = (o: RestaurantOrderView) => o.items.map((i) => i.name).join(", ");

function CtrlzBadge({ order }: { order: RestaurantOrderView }) {
  const label = ctrlzLabel(order);
  if (!label) return null;
  const sold = order.channel === "ctrlz";
  const hot = order.ctrlz?.status === "draft" || isListed(order);
  return (
    <span
      key={label.split(" ·")[0]}
      className={`ui-pop-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-semibold ${
        sold ? "bg-forest text-white" : hot ? "bg-amber/15 text-ink ring-1 ring-amber/50" : "bg-line/60 text-stone"
      }`}
    >
      <Icon name={sold ? "swap" : "undo"} size={14} />
      {label}
    </span>
  );
}

function OrderRow({
  order,
  selected,
  flash,
  previousName,
  onSelect,
  className,
}: {
  className: string;
  order: RestaurantOrderView;
  selected: boolean;
  flash: Flash | undefined;
  previousName: string | null;
  onSelect: () => void;
}) {
  const flashCls = flash ? (flash.kind === "handover" ? "rz-flash-forest" : flash.kind === "ready" ? "rz-flash-leaf" : "rz-flash-amber") : "";
  const accent = order.channel === "ctrlz" ? "bg-forest" : order.ctrlz && order.ctrlz.status !== "stopped" ? "bg-amber" : selected ? "bg-forest" : "";
  return (
    <li className={className}>
      <button
        type="button"
        onClick={() => {
          sound.unlock();
          sound.tap();
          onSelect();
        }}
        aria-current={selected}
        className={`relative grid w-full gap-x-4 gap-y-2 @lg:gap-x-3 px-4 py-4 text-left transition-colors @lg:grid-cols-[76px_minmax(140px,1fr)_auto_80px_68px] @lg:items-center @lg:py-3.5 ${
          selected ? "bg-mint/70" : "hover:bg-mint/40"
        }`}
      >
        {flash && <span key={flash.n} className={`pointer-events-none absolute inset-0 ${flashCls}`} aria-hidden />}
        {accent && <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${accent}`} aria-hidden />}

        {/* code + (narrow) total */}
        <span className="relative flex items-center gap-2.5">
          <StatusDot status={order.status} />
          <span className="font-mono text-body font-bold text-ink">{order.short_code}</span>
          <span className="ml-auto font-mono text-body font-bold text-ink @lg:hidden">{formatPrice(order.food_price)}</span>
        </span>

        {/* customer + items */}
        <span className="relative min-w-0">
          <NameSwap order={order} previous={previousName} wrap={false} className="font-semibold text-ink" />
          <span className="mt-0.5 block truncate text-small text-stone">
            {order.items.length} {order.items.length === 1 ? "item" : "items"} · {itemsLine(order)}
          </span>
        </span>

        {/* fulfilment + Ctrl+Z */}
        <span className="relative flex flex-wrap items-center gap-1.5 @lg:flex-col @lg:items-end">
          <FulfilmentSwap order={order} showNote={false} compact />
          <CtrlzBadge order={order} />
        </span>

        {/* status (wide) */}
        <span className="relative hidden text-small font-semibold text-ink @lg:block">{STATUS_LABEL[order.status]}</span>
        {/* total (wide) */}
        <span className="relative hidden text-right font-mono text-body font-bold text-ink @lg:block">{formatPrice(order.food_price)}</span>
      </button>
    </li>
  );
}

export function OrderList({
  orders,
  selectedId,
  flashes,
  previousName,
  onSelect,
  tab,
}: {
  orders: RestaurantOrderView[];
  selectedId: string | null;
  flashes: Record<string, Flash>;
  previousName: (id: string) => string | null;
  onSelect: (id: string) => void;
  tab: Tab;
}) {
  if (orders.length === 0) {
    return (
      <div className="ui-flow-in flex flex-col items-center px-6 py-14 text-center">
        <Mascot pose="sitting" motion="breathe" size={110} />
        <p className="mt-3 text-h3 text-ink">{tab === "active" ? "No active orders" : "No completed orders yet"}</p>
        <p className="mt-1 text-small text-stone">{tab === "active" ? "New orders show up here by themselves." : "Orders move here once they are picked up."}</p>
      </div>
    );
  }
  return (
    <div className="@container">
      <div className="hidden grid-cols-[76px_minmax(140px,1fr)_auto_80px_68px] gap-x-3 border-b border-line px-4 pb-2 pt-3 text-small font-semibold text-stone @lg:grid">
        <span>Order</span>
        <span>Customer and items</span>
        <span className="text-right">Fulfilment</span>
        <span>Status</span>
        <span className="text-right">Total</span>
      </div>
      <ul className="divide-y divide-line">
        {orders.map((o, i) => (
          <OrderRow
            key={o.order_id}
            className={`ui-flow-in ui-delay-${Math.min(4, i + 1)}`}
            order={o}
            selected={o.order_id === selectedId}
            flash={flashes[o.order_id]}
            previousName={previousName(o.order_id)}
            onSelect={() => onSelect(o.order_id)}
          />
        ))}
      </ul>
    </div>
  );
}
