// S3. Confirm sheet: listing preview, price plan, fallback, delivery warning, "List it" (booklet 5, S3).
import { useState } from "react";
import { TAG_LABELS, type Fallback } from "@shared/catalog";
import { formatPrice } from "@shared/constants";
import type { UndoResponse } from "@shared/api";
import type { OrderItem } from "@shared/types";
import { haptic, sound } from "../ui";
import { FallbackPicker, FloorStepper } from "./controls";
import { AlertIcon, ArrowRightIcon } from "./icons";

/** Positive demand line (design round 2). There are no live counts before the listing opens, so it stays general. */
const demandLine = (sheet: UndoResponse) => {
  const food = sheet.tags[0] ? TAG_LABELS[sheet.tags[0]].toLowerCase() : "food like this";
  return `Lots of people near campus want ${food} right now`;
};

export function ConfirmSheet({
  sheet,
  items,
  logoUrl,
  busy,
  onList,
  onNeverMind,
}: {
  sheet: UndoResponse;
  items: OrderItem[];
  logoUrl: string;
  busy: boolean;
  onList: (floor: number, fallback: Fallback) => void;
  onNeverMind: () => void;
}) {
  const [floor, setFloor] = useState(sheet.floor_price);
  const [fallback, setFallback] = useState<Fallback>(sheet.fallback ?? "free");
  const range = { min: sheet.floor_min, max: sheet.floor_max, step: sheet.floor_step };

  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-ink/40">
      <div className="seller-sheet-up flex max-h-[94%] flex-col rounded-t-[20px] bg-white">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
        <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-4 pb-4">
          {/* 1. Listing preview card */}
          <section className="ui-slide-up ui-delay-1 rounded-card border border-line p-4">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-card border border-line bg-white p-1">
                  <img src={logoUrl} alt="" className="h-full w-full object-contain" />
                </span>
              )}
              <h2 className="text-h2 leading-tight text-ink">{sheet.title}</h2>
            </div>
            <p className="mt-1 text-body text-stone">{sheet.selling_line}</p>
            <ul className="mt-3 space-y-2 border-t border-line pt-3">
              {items.map((item) => (
                <li key={item.name}>
                  <p className="text-body font-semibold text-ink">{item.name}</p>
                  {item.description && <p className="text-small leading-snug text-stone">{item.description}</p>}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {sheet.tags.map((t) => (
                <Chip key={t}>{TAG_LABELS[t]}</Chip>
              ))}
              {sheet.may_contain.length > 0 && <Chip>May contain: {sheet.may_contain.join(", ")}</Chip>}
            </div>
          </section>

          {/* 2. Price plan */}
          <section className="ui-slide-up ui-delay-2">
            <p className="text-body text-ink">
              Starts at <span className="font-mono font-bold">{formatPrice(sheet.start_price)}</span>
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-body text-ink">Lowest price:</span>
              <FloorStepper value={floor} range={range} onChange={setFloor} />
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-card bg-mint px-3 py-2 text-small font-semibold text-forest">
              <span aria-hidden>🔥</span>
              {demandLine(sheet)}
            </p>
          </section>

          {/* 3. If nobody buys it */}
          <section className="ui-slide-up ui-delay-3">
            <h3 className="mb-3 text-h3 text-ink">If nobody buys it:</h3>
            <FallbackPicker value={fallback} onChange={setFallback} />
          </section>

          {/* 4. Delivery orders only */}
          {sheet.order_type === "delivery" && (
            <section className="flex gap-3 rounded-card bg-amber/15 p-4 text-body text-ink">
              <AlertIcon size={20} className="mt-0.5 shrink-0 text-amber" />
              Your courier is released. If nobody buys it, you pick it up at the restaurant.
            </section>
          )}
        </div>

        {/* 5. Button + link */}
        <div className="border-t border-line px-5 pt-3 pb-5">
          <button
            disabled={busy}
            onClick={() => {
              sound.tap();
              haptic.light();
              onList(floor, fallback);
            }}
            className="flex h-bottom w-full items-center justify-center gap-2 rounded-card bg-forest text-h3 text-white shadow-lg shadow-forest/25 active:scale-[0.98] disabled:opacity-60"
          >
            List it
            <ArrowRightIcon size={20} />
          </button>
          <button onClick={onNeverMind} className="mt-3 w-full text-center text-small text-stone underline">
            Never mind, keep my order
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-mint px-3 py-1 text-small font-medium text-forest">{children}</span>;
}
