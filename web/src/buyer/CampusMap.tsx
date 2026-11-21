// B1 "Where are you?" (round 3): a tappable schematic campus map from CAMPUS_MAP, plus a chip list fallback.
import { CAMPUS_SPOTS, type CampusSpot } from "@shared/catalog";
import { CAMPUS_MAP, type MapBuilding } from "@shared/campusMap";
import { Doodles, haptic, sound } from "../ui";
import { Chip } from "./ui";

const RED = "#D94B45";
const RED_DARK = "#A3201B";
const GREY = "#DADADA";
const STREET = "#EDEDED";

/** First word of the label, so it fits on the small building ("McLennan Library" → "McLennan"). */
const shortLabel = (label: string) => label.split(" ")[0].replace(/\.$/, "");

const centre = (b: MapBuilding) => b.labelAt;

function Pin({ b }: { b: MapBuilding }) {
  const [x, y] = centre(b);
  const w = Math.max(44, b.label.length * 5.6 + 14);
  // Keep the name tag inside the map.
  const left = Math.min(Math.max(x - w / 2, 2), 360 - w - 2);
  return (
    <g className="ui-pop-in" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }} pointerEvents="none">
      <rect x={left} y={y - 50} width={w} height={20} rx={10} fill="#fff" stroke={RED_DARK} strokeWidth={1.5} />
      <text x={left + w / 2} y={y - 36.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#111">
        {b.label}
      </text>
      <path d={`M${x} ${y - 4}c-6-8-9-11-9-16a9 9 0 0 1 18 0c0 5-3 8-9 16z`} fill={RED_DARK} stroke="#fff" strokeWidth={1.5} />
      <circle cx={x} cy={y - 20} r={3.2} fill="#fff" />
    </g>
  );
}

export function CampusMap({ value, onChange }: { value: CampusSpot | null; onChange: (spot: CampusSpot) => void }) {
  const pick = (spot: CampusSpot) => {
    sound.tap();
    haptic.light();
    onChange(spot);
  };
  const picked = CAMPUS_MAP.buildings.find((b) => b.spot && b.spot === value) ?? null;
  const pickedLabel = CAMPUS_SPOTS.find((s) => s.key === value)?.label ?? null;

  return (
    <div>
      <div className="relative overflow-hidden rounded-card border border-line bg-white">
        <Doodles variant="city" tone="ink" opacity={0.04} drift={false} />
        <svg viewBox={CAMPUS_MAP.viewBox} className="relative block h-auto w-full select-none" role="group" aria-label="Campus map">
          {CAMPUS_MAP.green.map((d, k) => (
            <path key={k} d={d} fill="#E3F1DC" />
          ))}
          {CAMPUS_MAP.streets.map((s) => (
            <path key={s.name} d={s.d} stroke={STREET} strokeWidth={12} strokeLinecap="round" fill="none" />
          ))}
          {CAMPUS_MAP.streets.map((s) => (
            <text
              key={s.name}
              x={s.labelAt[0]}
              y={s.labelAt[1]}
              transform={`rotate(${s.rotate} ${s.labelAt[0]} ${s.labelAt[1]})`}
              textAnchor="middle"
              fontSize={7.5}
              fill="#8A8A8A"
            >
              {s.name}
            </text>
          ))}
          {CAMPUS_MAP.paths.map((d, k) => (
            <path key={k} d={d} stroke="#C9C9C9" strokeWidth={2} strokeDasharray="4 4" fill="none" />
          ))}
          <text x={CAMPUS_MAP.gates.at[0]} y={CAMPUS_MAP.gates.at[1]} textAnchor="middle" fontSize={7} fill="#8A8A8A">
            {CAMPUS_MAP.gates.label}
          </text>

          {/* Grey decoration first, then the red pickable buildings on top. */}
          {CAMPUS_MAP.buildings
            .filter((b) => !b.spot)
            .map((b, k) => (
              <g key={`d${k}`} pointerEvents="none">
                <polygon points={b.points} fill={GREY} />
                {b.label && (
                  <text x={b.labelAt[0]} y={b.labelAt[1] + 2.5} textAnchor="middle" fontSize={6.5} fill="#7A7A7A">
                    {shortLabel(b.label)}
                  </text>
                )}
              </g>
            ))}
          {CAMPUS_MAP.buildings
            .filter((b) => b.spot)
            .map((b) => {
              const on = b.spot === value;
              const spot = b.spot as CampusSpot;
              return (
                <g
                  key={b.spot}
                  role="button"
                  tabIndex={0}
                  aria-label={b.label}
                  aria-pressed={on}
                  onClick={() => pick(spot)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(spot)}
                  className="cursor-pointer outline-none"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transform: on ? "scale(1.1)" : "scale(1)",
                    transition: "transform .3s cubic-bezier(.3,1.6,.5,1)",
                  }}
                >
                  {/* Wider invisible edge: easier to hit with a finger. */}
                  <polygon points={b.points} fill="transparent" stroke="transparent" strokeWidth={14} strokeLinejoin="round" />
                  <polygon points={b.points} fill={on ? RED_DARK : RED} stroke={on ? "#fff" : "none"} strokeWidth={2.5} strokeLinejoin="round" />
                  <text x={b.labelAt[0]} y={b.labelAt[1] + 2.5} textAnchor="middle" fontSize={6.8} fontWeight={700} fill="#fff" pointerEvents="none">
                    {shortLabel(b.label)}
                  </text>
                </g>
              );
            })}
          {picked && <Pin key={picked.spot} b={picked} />}
        </svg>
        <span className="pointer-events-none absolute top-1 right-2 rounded-full bg-white/80 px-1.5 text-[11px] text-stone">{CAMPUS_MAP.note}</span>
      </div>

      <p className="mt-2 min-h-6 text-body font-bold text-ink" aria-live="polite">
        {pickedLabel ? <span key={pickedLabel} className="ui-pop-in inline-block">📍 {pickedLabel}</span> : <span className="font-medium text-stone">Tap your building on the map</span>}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {CAMPUS_SPOTS.map((s) => (
          <Chip key={s.key} small on={value === s.key} onClick={() => onChange(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
