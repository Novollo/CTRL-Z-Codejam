// Restaurant logos (design round 2b): a white rounded tile, and the "Campus favourites" marquee.
import { useEffect, useState } from "react";
import { API, type RestaurantsResponse } from "@shared/api";
import type { Restaurant } from "@shared/types";
import { apiCall } from "../lib/api";

let cache: Promise<Restaurant[]> | null = null;

/** All restaurants (GET /api/restaurants), loaded once per page. Empty list if the call fails: callers hide their row. */
export function useRestaurants(): Restaurant[] {
  const [list, setList] = useState<Restaurant[]>([]);
  useEffect(() => {
    cache ??= apiCall<RestaurantsResponse>("GET", API.restaurants())
      .then((r) => r.restaurants.filter((x) => x.logo_url))
      .catch(() => {
        cache = null; // try again next time
        return [];
      });
    let live = true;
    cache.then((r) => live && setList(r));
    return () => {
      live = false;
    };
  }, []);
  return list;
}

/** Logo on a white rounded tile. Logos have white backgrounds: object-contain, never stretched. Hidden if the file is missing. */
export function LogoTile({ src, alt, size = 40, className = "" }: { src: string | null | undefined; alt: string; size?: number; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (!src || missing) return null;
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-white ${className}`}
      style={{ width: size, height: size, padding: Math.round(size * 0.12) }}
    >
      <img src={src} alt={alt} className="h-full w-full object-contain" draggable={false} onError={() => setMissing(true)} />
    </span>
  );
}

/** "Campus favourites": all logos, gently auto-scrolling. Pauses while touched. Hidden until the list loads. */
export function LogoMarquee({ className = "" }: { className?: string }) {
  const list = useRestaurants();
  const [paused, setPaused] = useState(false);
  if (list.length === 0) return null;
  const loop = [...list, ...list]; // two copies: the strip moves by half its width, then starts again seamlessly
  return (
    <div className={`ui-fade-in ${className}`}>
      <p className="text-small font-semibold text-stone">Campus favourites</p>
      <div
        className="buyer-marquee-mask mt-2 overflow-hidden"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        <div className="buyer-marquee flex w-max gap-3" style={{ animationPlayState: paused ? "paused" : "running" }}>
          {loop.map((r, k) => (
            <LogoTile key={k} src={r.logo_url} alt={r.name} size={56} />
          ))}
        </div>
      </div>
    </div>
  );
}
