// /join first screen (design round 2): 3 swipeable cards, Robinhood-style, then "Get started →" → B1.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatPrice, roundPriceDown } from "@shared/constants";
import { Mascot, haptic, sound, type Motion, type Pose } from "../ui";
import { LogoMarquee } from "./logos";
import { BottomButton, Logo } from "./ui";

type Card = { bg: string; pose: Pose; motion: Motion; title: string; text: string; extra?: ReactNode; below?: ReactNode };

/** Card 2: a mini price that ticks down from the food price to the floor, then starts again. */
function MiniTicker() {
  const steps = 8;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % (steps + 3)), 900);
    return () => clearInterval(t);
  }, []);
  const k = Math.min(i, steps);
  const price = roundPriceDown(17.78 - ((17.78 - 8.9) * k) / steps);
  const under = price <= 12;
  return (
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg">
      <span key={price} className="buyer-ticker font-mono text-h3 font-bold text-ink">
        {formatPrice(price)}
      </span>
      <span className={`rounded-full px-2 py-0.5 text-small font-bold transition-colors ${under ? "bg-forest text-white" : "bg-line text-stone"}`}>
        {under ? "Ping!" : "max $12"}
      </span>
    </div>
  );
}

const CARDS: Card[] = [
  {
    bg: "bg-mint",
    pose: "waving",
    motion: "bounce",
    title: "Get fresh food for less, near campus.",
    text: "Regretted orders near McGill, at a falling price.",
    below: <LogoMarquee className="mt-5" />,
  },
  {
    bg: "bg-leaf",
    pose: "pointing",
    motion: "bob",
    title: "Watch the price drop.",
    text: "Set your max price. We ping you when it's under.",
    extra: <MiniTicker />,
  },
  {
    bg: "bg-forest",
    pose: "bag",
    motion: "wiggle",
    title: "Grab it at the counter.",
    text: "First to tap Buy wins. Pay, show your code, eat.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);

  const go = (n: number) => {
    const next = Math.max(0, Math.min(CARDS.length - 1, n));
    if (next !== i) {
      sound.tap();
      haptic.light();
    }
    setI(next);
  };

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-[390px] flex-col overflow-hidden bg-white">
      <div
        className="relative flex-1 touch-pan-y overflow-hidden"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {CARDS.map((c, k) => (
            <section key={k} className="flex h-full w-full shrink-0 flex-col" aria-hidden={k !== i}>
              <div className={`relative flex flex-[1.15] items-center justify-center rounded-b-[32px] ${c.bg}`}>
                <div className="absolute top-4 left-5 rounded-lg bg-white/90 px-2 py-1">
                  <Logo />
                </div>
                <div className="flex h-52 w-52 items-center justify-center rounded-full bg-white shadow-sm">
                  <Mascot pose={c.pose} motion={c.motion} size={170} />
                </div>
                {c.extra}
              </div>
              <div className="flex flex-1 flex-col px-6 pt-7">
                <h1 className={`text-[32px] leading-[1.1] font-bold text-ink ${k === i ? "ui-slide-up" : ""}`}>{c.title}</h1>
                <p className={`mt-3 text-body text-stone ${k === i ? "ui-slide-up ui-delay-2" : ""}`}>{c.text}</p>
                {c.below}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="mb-4 flex min-h-10 items-center justify-between">
          <div className="flex gap-2" role="tablist">
            {CARDS.map((_, k) => (
              <button
                key={k}
                type="button"
                aria-label={`Card ${k + 1}`}
                aria-selected={k === i}
                onClick={() => go(k)}
                className={`h-2.5 rounded-full transition-all duration-300 ${k === i ? "w-7 bg-forest" : "w-2.5 bg-line"}`}
              />
            ))}
          </div>
          {i < CARDS.length - 1 && (
            <button type="button" onClick={() => go(i + 1)} className="rounded-full px-3 py-2 font-bold text-forest">
              Next
            </button>
          )}
        </div>
        <BottomButton
          onClick={() => {
            sound.tap();
            onDone();
          }}
        >
          Get started
        </BottomButton>
      </div>
    </main>
  );
}
