// S3. Confirm sheet: listing preview, price plan, fallback, delivery warning, "List it" (booklet 5, S3).
import { useState } from "react";
import { TAG_LABELS, type Fallback } from "@shared/catalog";
import { formatPrice } from "@shared/constants";
import type { UndoResponse } from "@shared/api";
import { FallbackPicker, FloorStepper } from "./controls";
import { AlertIcon } from "./icons";

export function ConfirmSheet({
  sheet,
  busy,
  onList,
  onNeverMind,
}: {
  sheet: UndoResponse;
  busy: boolean;
  onList: (floor: number, fallback: Fallback) => void;
  onNeverMind: () => void;
}) {
  const [floor, setFloor] = useState(sheet.floor_price);
  const [fallback, setFallback] = useState<Fallback>(sheet.fallback ?? "free");
  const range = { min: sheet.floor_min, max: sheet.floor_max, step: sheet.floor_step };

  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-ink/40">
      <div className="zee-sheet-up flex max-h-[94%] flex-col rounded-t-[20px] bg-white">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
        <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-4 pb-4">
          {/* 1. Listing preview card */}
          <section className="rounded-card border border-line p-4">
            <h2 className="text-h3 text-ink">{sheet.title}</h2>
            <p className="mt-1 text-body text-stone">{sheet.selling_line}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sheet.tags.map((t) => (
                <Chip key={t}>{TAG_LABELS[t]}</Chip>
              ))}
              {sheet.may_contain.length > 0 && <Chip>May contain: {sheet.may_contain.join(", ")}</Chip>}
            </div>
          </section>

          {/* 2. Price plan */}
          <section>
            <p className="text-body text-ink">
              Starts at <span className="font-mono font-bold">{formatPrice(sheet.start_price)}</span>
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-body text-ink">Lowest price:</span>
              <FloorStepper value={floor} range={range} onChange={setFloor} />
            </div>
            <p className="mt-3 text-small text-stone">{sheet.reason}</p>
          </section>

          {/* 3. If nobody buys it */}
          <section>
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
            onClick={() => onList(floor, fallback)}
            className="h-bottom w-full rounded-card bg-forest text-h3 text-white active:opacity-90 disabled:opacity-60"
          >
            List it
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
