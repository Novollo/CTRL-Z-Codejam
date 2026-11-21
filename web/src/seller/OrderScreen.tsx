// S1. Order tracker: the generic "Demo app" food delivery screen (booklet 5, S1).
import { useState } from "react";
import { formatPrice } from "@shared/constants";
import type { OrderResponse } from "@shared/api";
import type { OrderStatus } from "@shared/types";
import { CheckIcon, StoreIcon, UndoIcon } from "./icons";
import { Mascot } from "./Mascot";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "received", label: "Order received" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready for pickup" },
];

export function OrderScreen({ data, status, onUndo }: { data: OrderResponse; status: OrderStatus; onUndo: () => void }) {
  const { order, restaurant } = data;
  const orderNumber = `#${order.id.replace(/^\D+/, "")}`;
  const { service_fee, delivery_fee, tax } = order.fees;
  const stepIndex = status === "picked_up" ? STEPS.length : STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          <RestaurantPhoto src={restaurant.photo_url} />
          <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-small font-semibold text-ink shadow-sm">
            Demo app
          </span>
        </div>

        <div className="px-5 pt-5">
          <h1 className="text-h1 text-ink">
            {restaurant.name} · {order.type === "pickup" ? "Pickup" : "Delivery"}
          </h1>
          <p className="mt-1 text-body text-stone">Order {orderNumber}</p>

          <ProgressBar stepIndex={stepIndex} />

          <div className="mt-6 border-t border-line pt-4">
            {order.items.map((item) => (
              <Row key={item.name} label={item.name} value={formatPrice(item.price)} strong />
            ))}
            <div className="mt-3 border-t border-line pt-3">
              <Row label="Service fee" value={formatPrice(service_fee)} />
              {delivery_fee > 0 && <Row label="Delivery fee" value={formatPrice(delivery_fee)} />}
              <Row label="Tax" value={formatPrice(tax)} />
              <Row label="Total" value={formatPrice(order.total)} strong />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-line px-5 pt-4 pb-6">
        <button disabled className="h-bottom w-full rounded-card bg-line text-body font-semibold text-stone">
          Cancel order
        </button>
        <p className="text-center text-small text-stone">Orders can't be cancelled once the restaurant starts preparing.</p>
        {status === "preparing" && (
          <button
            onClick={onUndo}
            className="flex h-bottom w-full items-center justify-center gap-2 rounded-card bg-forest text-h3 text-white active:opacity-90"
          >
            <UndoIcon size={22} />
            Ctrl+Z this order
            <span className="ml-1 overflow-hidden rounded-full bg-white">
              <Mascot pose="sitting" size={32} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function RestaurantPhoto({ src }: { src: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div className="flex h-44 w-full items-center justify-center bg-mint text-forest">
        <StoreIcon size={44} />
      </div>
    );
  }
  return <img src={src} alt="" className="h-44 w-full object-cover" onError={() => setMissing(true)} />;
}

function ProgressBar({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mt-5">
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.status} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-forest" : "bg-line"}`} />
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        {STEPS.map((s, i) => (
          <div
            key={s.status}
            className={`flex items-center gap-1 text-small ${i === stepIndex ? "font-bold text-ink" : i < stepIndex ? "text-ink" : "text-stone"}`}
          >
            {i < stepIndex && <CheckIcon size={14} className="text-forest" />}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? "text-body font-semibold text-ink" : "text-small text-stone"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
