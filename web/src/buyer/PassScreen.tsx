// B5 pickup pass (booklet 6). Only the winning buyer ever gets this.
import type { PickupPass } from "@shared/types";
import { Icon, Mascot, formatTime } from "./ui";

export function PassScreen({ pass, free, spotLabel }: { pass: PickupPass; free: boolean; spotLabel: string | null }) {
  return (
    <div className="zee-slide-up fixed inset-0 z-50 overflow-y-auto bg-mint">
      <div className="mx-auto flex min-h-full w-full max-w-[390px] flex-col items-center px-5 pt-8 pb-8 text-center">
        <Mascot pose="bag" size={140} className="zee-bounce" />
        <h1 className="mt-4 text-h1 text-ink">{free ? "Go get it!" : "Paid. Go get it!"}</h1>

        <div className="mt-6 w-full rounded-card bg-white p-5 text-left">
          <p className="text-h3 text-ink">{pass.restaurant_name}</p>
          <p className="mt-1 flex items-start gap-1.5 text-small text-stone">
            <Icon name="pin" className="h-4 w-4 shrink-0" />
            {pass.restaurant_address}
          </p>
          {pass.walk_min !== null && (
            <p className="mt-1 flex items-center gap-1.5 text-small text-stone">
              <Icon name="walk" className="h-4 w-4 shrink-0" />
              {pass.walk_min} min walk{spotLabel ? ` from ${spotLabel}` : ""}
            </p>
          )}

          <div className="mt-5 rounded-card border-2 border-dashed border-forest py-5 text-center">
            <p className="font-mono text-[40px] leading-none font-bold tracking-wide text-forest">{pass.pickup_code}</p>
            <p className="mt-2 text-small text-stone">Name on the order: <b className="text-ink">{pass.name_on_order}</b></p>
          </div>

          <p className="mt-5 flex items-center gap-1.5 font-bold text-ink">
            <Icon name="clock" className="h-5 w-5 text-amber" />
            Pick up by <span className="font-mono">{formatTime(pass.pickup_by)}</span>
          </p>
        </div>

        <p className="mt-6 text-h3 text-ink">Show this code at the counter.</p>
      </div>
    </div>
  );
}
