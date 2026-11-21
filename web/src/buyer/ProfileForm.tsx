// B1 profile (booklet 6). Also used for "Edit" from B2.
import { useState, type CSSProperties, type ReactNode } from "react";
import type { BuyerProfileInput } from "@shared/api";
import { BUYER_DIETS, FOOD_TYPES, WALK_CHOICES_MIN, type BuyerDiet, type FoodType } from "@shared/catalog";
import { BUYER_MAX_PRICE, formatPrice } from "@shared/constants";
import { Mascot, haptic } from "../ui";
import { CampusMap } from "./CampusMap";
import { BottomButton, Chip, Logo, Toggle } from "./ui";

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

function Section({ title, step, chips = true, children }: { title: string; step: number; chips?: boolean; children: ReactNode }) {
  return (
    <section className="ui-flow-in mt-7" style={{ animationDelay: `${step * 90}ms` }}>
      <h2 className="text-h3 text-ink">{title}</h2>
      <div className={chips ? "mt-3 flex flex-wrap gap-2" : "mt-3"}>{children}</div>
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
      <div className="ui-fade-in mt-6 flex items-end gap-3">
        <h1 className="flex-1 text-[32px] leading-[1.1] font-bold text-ink">Get fresh food for less, near campus.</h1>
        <Mascot pose="waving" motion="bounce" size={92} className="shrink-0" />
      </div>

      <label className="ui-flow-in ui-delay-1 mt-7 block">
        <span className="text-small font-semibold text-ink">Your first name</span>
        <input
          value={p.name}
          onChange={(e) => set({ name: e.target.value })}
          autoComplete="given-name"
          maxLength={30}
          className="mt-2 block h-14 w-full rounded-card border-2 border-transparent bg-[#F3F3F3] px-4 text-h3 font-medium text-ink outline-none transition-colors focus:border-forest focus:bg-white"
        />
      </label>

      <div className="ui-flow-in ui-delay-2 mt-5">
        <Toggle on={p.notify_on} onChange={(on) => set({ notify_on: on })} label="Notify me about food nearby" />
      </div>

      {p.notify_on && (
        <div>
          <Section title="Where are you?" step={0} chips={false}>
            <CampusMap value={p.spot} onChange={(spot) => set({ spot })} />
          </Section>

          <Section title="How far will you walk?" step={1}>
            {WALK_CHOICES_MIN.map((m) => (
              <Chip key={m} on={p.max_walk_min === m} onClick={() => set({ max_walk_min: m })}>
                {m} min
              </Chip>
            ))}
          </Section>

          <Section title="What do you like?" step={2}>
            {/* "Anything" = no food types (round 3): exclusive with the specific types. */}
            <Chip on={p.food_types.length === 0} onClick={() => set({ food_types: [] })}>
              Anything 🍽️
            </Chip>
            {FOOD_TYPES.map((f) => (
              <Chip key={f.key} on={p.food_types.includes(f.key)} onClick={() => set({ food_types: toggle<FoodType>(p.food_types, f.key) })}>
                {f.label}
              </Chip>
            ))}
          </Section>

          <Section title="Diet" step={3}>
            {/* "No restrictions" = no diet (round 3). */}
            <Chip on={p.diet.length === 0} onClick={() => set({ diet: [] })}>
              No restrictions
            </Chip>
            {BUYER_DIETS.map((d) => (
              <Chip key={d.key} on={p.diet.includes(d.key)} onClick={() => set({ diet: toggle<BuyerDiet>(p.diet, d.key) })}>
                {d.label}
              </Chip>
            ))}
          </Section>

          <section className="ui-flow-in mt-7" style={{ animationDelay: "360ms" }}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-h3 text-ink">Max price</h2>
              <span key={p.max_price} className="ui-pop-in rounded-full bg-mint px-3 py-1 font-mono text-h3 font-bold text-forest">
                {formatPrice(p.max_price)}
              </span>
            </div>
            <input
              type="range"
              min={BUYER_MAX_PRICE.min}
              max={BUYER_MAX_PRICE.max}
              step={1}
              value={p.max_price}
              onChange={(e) => {
                haptic.light();
                set({ max_price: Number(e.target.value) });
              }}
              aria-label="Max price"
              className="buyer-range mt-4 w-full"
              style={{ "--fill": `${((p.max_price - BUYER_MAX_PRICE.min) / (BUYER_MAX_PRICE.max - BUYER_MAX_PRICE.min)) * 100}%` } as CSSProperties}
            />
            <div className="mt-2 flex justify-between font-mono text-small text-stone">
              <span>{formatPrice(BUYER_MAX_PRICE.min)}</span>
              <span>{formatPrice(BUYER_MAX_PRICE.max)}</span>
            </div>
          </section>
        </div>
      )}

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-white from-70% to-transparent pt-8 pb-6 pointer-events-none [&>*]:pointer-events-auto">
        <BottomButton onClick={submit} disabled={!ready || sending}>
          I'm in
        </BottomButton>
      </div>
    </main>
  );
}
