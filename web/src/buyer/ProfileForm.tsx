// B1 profile (booklet 6). Also used for "Edit" from B2.
import { useState, type ReactNode } from "react";
import type { BuyerProfileInput } from "@shared/api";
import { BUYER_DIETS, CAMPUS_SPOTS, FOOD_TYPES, WALK_CHOICES_MIN, type BuyerDiet, type FoodType } from "@shared/catalog";
import { BUYER_MAX_PRICE, formatPrice } from "@shared/constants";
import { BottomButton, Chip, Logo, Mascot, Toggle } from "./ui";

export const EMPTY_PROFILE: BuyerProfileInput = {
  name: "",
  notify_on: false,
  spot: null,
  max_walk_min: 10,
  food_types: [],
  diet: [],
  max_price: BUYER_MAX_PRICE.default,
};

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-h3 text-ink">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function ProfileForm({ initial, onSubmit }: { initial: BuyerProfileInput; onSubmit: (p: BuyerProfileInput) => Promise<void> }) {
  const [p, setP] = useState<BuyerProfileInput>(initial);
  const [sending, setSending] = useState(false);
  const set = (patch: Partial<BuyerProfileInput>) => setP((old) => ({ ...old, ...patch }));

  const ready = p.name.trim() !== "" && (!p.notify_on || p.spot !== null);

  const submit = async () => {
    if (!ready || sending) return;
    setSending(true);
    try {
      await onSubmit({ ...p, name: p.name.trim() });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-5 pt-5">
      <Logo />
      <div className="mt-6 flex items-end gap-3">
        <h1 className="flex-1 text-h1 text-ink">Get fresh food for less, near campus.</h1>
        <Mascot pose="sitting" size={96} className="zee-bounce shrink-0" />
      </div>

      <label className="mt-6 block">
        <span className="text-small font-medium text-stone">Your first name</span>
        <input
          value={p.name}
          onChange={(e) => set({ name: e.target.value })}
          autoComplete="given-name"
          maxLength={30}
          className="mt-1 block h-12 w-full rounded-card border border-line px-4 text-body text-ink outline-none focus:border-forest"
        />
      </label>

      <div className="mt-5">
        <Toggle on={p.notify_on} onChange={(on) => set({ notify_on: on })} label="Notify me about food nearby" />
      </div>

      {p.notify_on && (
        <div>
          <Section title="Where are you?">
            {CAMPUS_SPOTS.map((s) => (
              <Chip key={s.key} on={p.spot === s.key} onClick={() => set({ spot: s.key })}>
                {s.label}
              </Chip>
            ))}
          </Section>

          <Section title="How far will you walk?">
            {WALK_CHOICES_MIN.map((m) => (
              <Chip key={m} on={p.max_walk_min === m} onClick={() => set({ max_walk_min: m })}>
                {m} min
              </Chip>
            ))}
          </Section>

          <Section title="What do you like?">
            {FOOD_TYPES.map((f) => (
              <Chip key={f.key} on={p.food_types.includes(f.key)} onClick={() => set({ food_types: toggle<FoodType>(p.food_types, f.key) })}>
                {f.label}
              </Chip>
            ))}
          </Section>

          <Section title="Diet">
            {BUYER_DIETS.map((d) => (
              <Chip key={d.key} on={p.diet.includes(d.key)} onClick={() => set({ diet: toggle<BuyerDiet>(p.diet, d.key) })}>
                {d.label}
              </Chip>
            ))}
          </Section>

          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-h3 text-ink">Max price</h2>
              <span className="font-mono text-h3 font-bold text-forest">{formatPrice(p.max_price)}</span>
            </div>
            <input
              type="range"
              min={BUYER_MAX_PRICE.min}
              max={BUYER_MAX_PRICE.max}
              step={1}
              value={p.max_price}
              onChange={(e) => set({ max_price: Number(e.target.value) })}
              className="mt-3 w-full accent-forest"
            />
            <div className="flex justify-between font-mono text-small text-stone">
              <span>{formatPrice(BUYER_MAX_PRICE.min)}</span>
              <span>{formatPrice(BUYER_MAX_PRICE.max)}</span>
            </div>
          </section>
        </div>
      )}

      <div className="sticky bottom-0 mt-auto bg-white pt-6 pb-6">
        <BottomButton onClick={submit} disabled={!ready || sending}>
          I'm in
        </BottomButton>
      </div>
    </main>
  );
}
