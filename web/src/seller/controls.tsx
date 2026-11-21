// Controls shared by S3 (confirm sheet) and S4 (listed): the floor − / + and the fallback choice.
import { FALLBACKS, type Fallback } from "@shared/catalog";
import { formatPrice, roundPrice } from "@shared/constants";
import { CheckIcon, MinusIcon, PlusIcon } from "./icons";

export interface FloorRange {
  min: number;
  max: number;
  step: number;
}

/** Next floor after a − or + tap, kept inside 30%–70% of the food price. */
export const stepFloor = (floor: number, dir: -1 | 1, r: FloorRange): number =>
  Math.min(r.max, Math.max(r.min, roundPrice(floor + dir * r.step)));

export function FloorStepper({ value, range, onChange }: { value: number; range: FloorRange; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <StepButton label="Lower" disabled={value <= range.min} onClick={() => onChange(stepFloor(value, -1, range))}>
        <MinusIcon size={18} />
      </StepButton>
      <span className="w-20 text-center font-mono text-h3 font-bold text-ink">{formatPrice(value)}</span>
      <StepButton label="Higher" disabled={value >= range.max} onClick={() => onChange(stepFloor(value, 1, range))}>
        <PlusIcon size={18} />
      </StepButton>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink disabled:text-line"
    >
      {children}
    </button>
  );
}

export function FallbackPicker({ value, onChange }: { value: Fallback; onChange: (f: Fallback) => void }) {
  return (
    <div className="space-y-2">
      {FALLBACKS.map((f) => {
        const on = f.key === value;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`flex w-full items-center justify-between rounded-card border px-4 py-3 text-left text-body ${
              on ? "border-forest bg-mint font-semibold text-forest" : "border-line text-ink"
            }`}
          >
            {f.label}
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-forest bg-forest text-white" : "border-line"}`}>
              {on && <CheckIcon size={12} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
