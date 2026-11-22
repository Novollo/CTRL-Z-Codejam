// Dev-only controls for the story simulator (?sim=1). Not part of the product.
import { Icon } from "../ui";
import { SIM_LAST, SIM_STEPS } from "./sim";

interface Props {
  step: number;
  playing: boolean;
  setStep: (s: number) => void;
  togglePlay: () => void;
  restart: () => void;
}

export function SimBar({ step, playing, setStep, togglePlay, restart }: Props) {
  const btn = "ui-press flex h-8 items-center justify-center rounded-full px-2.5 text-white hover:bg-white/15 disabled:opacity-40";
  return (
    <div className="z-50 m-3 rounded-card bg-ink/95 p-2.5 text-white shadow-lg lg:fixed lg:bottom-4 lg:left-4 lg:m-0 lg:w-[360px]">
      <div className="flex items-center gap-1">
        <span className="mr-1 rounded-full bg-amber px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">Sim</span>
        <span className="min-w-0 flex-1 truncate text-small font-semibold">
          {step + 1}/{SIM_STEPS.length} · {SIM_STEPS[step]}
        </span>
        <button type="button" className={btn} onClick={() => setStep(step - 1)} disabled={step === 0} aria-label="Previous step">
          <Icon name="chevronLeft" size={16} />
        </button>
        <button type="button" className={btn} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
          <span className="text-small font-semibold">{playing ? "Pause" : "Play"}</span>
        </button>
        <button type="button" className={btn} onClick={() => setStep(step + 1)} disabled={step === SIM_LAST} aria-label="Next step">
          <Icon name="chevronRight" size={16} />
        </button>
        <button type="button" className={btn} onClick={restart} aria-label="Restart">
          <Icon name="undo" size={16} />
        </button>
      </div>
      <div className="mt-2 flex gap-1">
        {SIM_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => setStep(i)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-leaf" : "bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}
