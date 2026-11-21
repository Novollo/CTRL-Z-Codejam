// A number that counts from its old value to the new one (design round 2).
import { useEffect, useRef, useState } from "react";

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function CountUp({
  value,
  from,
  durationMs = 600,
  format = (n: number) => String(Math.round(n)),
  className,
}: {
  value: number;
  /** Start value for the first count (default: show `value` at once). */
  from?: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const start = shownRef.current;
    if (start === value || reducedMotion()) return setShown(value);
    const t0 = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? start + (value - start) * eased : value);
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={className}>{format(shown)}</span>;
}
