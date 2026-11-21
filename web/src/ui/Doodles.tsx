// Soft line-doodle backgrounds (round 3), like the Uber Eats pattern but ours. Owned by the lead.
//
//   <div className="relative overflow-hidden bg-mint">
//     <Doodles variant="food" />          // food icons (S2 agent screen, B3, onboarding)
//     ...content (give it `relative`)...
//   </div>
//   <Doodles variant="city" tone="forest" opacity={0.08} />   // campus / city skyline (onboarding, B2, map)
//
// Always decorative, never prominent: thin lines, low opacity, behind everything (absolute, pointer-events-none).
// `drift` slowly moves the pattern for a little life (off when the user prefers reduced motion).

type Variant = "food" | "city" | "mix";
type Tone = "ink" | "forest" | "white";

const FOOD = [
  // burger
  "M6 22a18 10 0 0 1 36 0z M5 28h38 M7 33c4 3 8-3 12 0s8-3 12 0 8-3 10 0 M8 38h32a4 4 0 0 1-4 5H12a4 4 0 0 1-4-5z M17 16h.1 M24 14h.1 M31 16h.1",
  // fries
  "M12 22h24l-3 22H15z M16 22l-2-14 M21 22V6 M27 22V8 M32 22l2-13 M19 32a5 5 0 0 0 10 0",
  // pizza slice
  "M8 8c11 0 22 3 32 8L16 42z M14 18h.1 M22 24a2 2 0 1 0 0 .1 M28 16a2 2 0 1 0 0 .1 M19 32a2 2 0 1 0 0 .1",
  // drumstick
  "M30 8a10 10 0 1 1-10 18l-7 7a3 3 0 1 1-4 0 3 3 0 1 1 0-4l7-7A10 10 0 0 1 30 8z",
  // leaf
  "M10 38C10 20 22 10 38 10c0 16-10 28-28 28z M10 38 26 22",
  // noodle bowl
  "M6 22h36a18 18 0 0 1-36 0z M14 22c2-8 6-10 8-14 M22 22c2-8 6-10 8-14 M30 22c1-6 4-8 6-11 M18 40h12",
  // coffee cup
  "M10 16h24v14a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z M34 20h4a5 5 0 0 1 0 10h-4 M16 6c-2 3 2 4 0 7 M24 6c-2 3 2 4 0 7",
  // onigiri
  "M24 6c8 0 18 26 14 32H10C6 32 16 6 24 6z M17 30h14v8H17z",
];

const CITY = [
  // two towers
  "M4 42h40 M8 42V10h14v32 M12 16h2 M17 16h2 M12 22h2 M17 22h2 M12 28h2 M17 28h2 M22 42V20h12v22 M26 26h4 M26 32h4",
  // domed hall (campus)
  "M4 42h40 M8 42V26h32v16 M14 26v-6a10 8 0 0 1 20 0v6 M24 12V6 M12 42V32 M20 42V32 M28 42V32 M36 42V32",
  // tree
  "M24 42V28 M24 30a10 10 0 1 1 0-20 10 10 0 1 1 0 20z M24 34l-5-4 M24 32l5-4",
  // bike
  "M12 34a7 7 0 1 0 0 .1 M36 34a7 7 0 1 0 0 .1 M12 34l8-12h10l6 12 M20 22l4 12h-12 M28 16h5",
  // cloud
  "M12 32h22a8 8 0 0 0 0-16 11 11 0 0 0-21 2 7 7 0 0 0-1 14z",
  // street lamp
  "M24 42V12 M17 12h14 M20 12l4-6 4 6 M18 42h12",
  // mountain with cross (Mount Royal)
  "M4 40 18 22l8 10 6-6 12 14z M30 14v10 M27 17h6",
  // tram
  "M10 10h28a4 4 0 0 1 4 4v20H6V14a4 4 0 0 1 4-4z M10 16h12v8H10z M26 16h12v8H26z M14 34l-3 6 M34 34l3 6",
];

const TONE: Record<Tone, string> = { ink: "#111111", forest: "#1E5631", white: "#FFFFFF" };

// Scattered layout inside one 240 × 240 tile: [x, y, rotation, scale]
const SPOTS: [number, number, number, number][] = [
  [8, 10, -12, 0.95], [128, 6, 8, 0.85], [70, 70, 14, 1], [184, 78, -8, 0.9],
  [10, 130, 6, 0.9], [120, 140, -16, 1], [60, 190, 10, 0.8], [180, 182, -4, 0.95],
];

function tileSvg(icons: string[], color: string): string {
  const groups = SPOTS.map(([x, y, r, s], i) => {
    const d = icons[i % icons.length];
    return `<g transform="translate(${x} ${y}) rotate(${r} 24 24) scale(${s})"><path d="${d}"/></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${groups}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const cache = new Map<string, string>();

export function Doodles({
  variant = "food",
  tone = "ink",
  opacity = 0.07,
  size = 240,
  drift = true,
  className = "",
}: {
  variant?: Variant;
  tone?: Tone;
  opacity?: number;
  size?: number;
  drift?: boolean;
  className?: string;
}) {
  const key = `${variant}-${tone}`;
  let bg = cache.get(key);
  if (!bg) {
    const icons = variant === "food" ? FOOD : variant === "city" ? CITY : FOOD.flatMap((f, i) => [f, CITY[i]]);
    bg = tileSvg(icons, TONE[tone]);
    cache.set(key, bg);
  }
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${drift ? "ui-doodle-drift" : ""} ${className}`}
      style={{ backgroundImage: bg, backgroundSize: `${size}px ${size}px`, opacity }}
    />
  );
}
