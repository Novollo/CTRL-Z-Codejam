// B5 pickup pass (booklet 6, design round 2): big celebration and a ticket. Only the winning buyer gets this.
import type { PickupPass } from "@shared/types";
import { Confetti, Mascot } from "../ui";
import { Icon, formatTime } from "./ui";

export function PassScreen({ pass, free, spotLabel }: { pass: PickupPass; free: boolean; spotLabel: string | null }) {
  return (
    <div className="buyer-sheet-up fixed inset-0 z-50 overflow-y-auto bg-white">
      <Confetti />
      <div className="mx-auto flex min-h-full w-full max-w-[390px] flex-col items-center px-5 pt-8 pb-8 text-center">
        <Mascot pose="bag" motion="bounce" size={150} sparkles />
        <h1 className="ui-pop-in ui-delay-2 mt-3 text-[32px] leading-tight font-bold text-ink">{free ? "Go get it!" : "Paid. Go get it!"}</h1>

        <div className="ui-slide-up ui-delay-3 relative mt-6 w-full rounded-[20px] bg-mint text-left shadow-sm">
          <div className="p-5">
            <p className="text-h3 text-ink">{pass.restaurant_name}</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-small text-stone">
              <Icon name="pin" className="h-4 w-4 shrink-0 text-forest" />
              {pass.restaurant_address}
            </p>
            {pass.walk_min !== null && (
              <p className="mt-1 flex items-center gap-1.5 text-small text-stone">
                <Icon name="walk" className="h-4 w-4 shrink-0 text-forest" />
                {pass.walk_min} min walk{spotLabel ? ` from ${spotLabel}` : ""}
              </p>
            )}
          </div>

          {/* Tear line: perforated edge with round notches */}
          <div className="relative">
            <span className="buyer-ticket-notch -left-3.5" />
            <span className="buyer-ticket-notch -right-3.5" />
            <div className="mx-5 border-t-2 border-dashed border-forest/40" />
          </div>

          <div className="p-5 text-center">
            <p className="buyer-flip-in font-mono text-[44px] leading-none font-bold tracking-wide text-forest">{pass.pickup_code}</p>
            <p className="mt-2 text-small text-stone">
              Name on the order: <b className="text-ink">{pass.name_on_order}</b>
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-bold text-ink">
              <Icon name="clock" className="h-5 w-5 text-amber" />
              Pick up by <span className="font-mono">{formatTime(pass.pickup_by)}</span>
            </p>
          </div>
        </div>

        <p className="ui-fade-in ui-delay-4 mt-6 text-h3 text-ink">Show this code at the counter.</p>
      </div>
    </div>
  );
}
