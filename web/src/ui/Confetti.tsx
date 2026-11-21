// Confetti burst in brand colours (round 2). Owned by the lead.
//   {sold && <Confetti />}            // fires once when mounted
//   <Confetti key={burstId} />        // change the key to fire again
import { useEffect, useRef } from "react";
import { COLORS } from "@shared/tokens";

const PALETTE = [COLORS.forest, COLORS.leaf, COLORS.mint, COLORS.amber, "#ffffff"];

export function Confetti({ pieces = 120, durationMs = 2600 }: { pieces?: number; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    g.scale(dpr, dpr);

    const bits = Array.from({ length: pieces }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 11 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      s: 5 + Math.random() * 6,
      c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }));

    const start = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const p = (t - start) / durationMs;
      g.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.vy += 0.32;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;
        b.r += b.vr;
        g.save();
        g.globalAlpha = Math.max(0, 1 - p * p);
        g.translate(b.x, b.y);
        g.rotate(b.r);
        g.fillStyle = b.c;
        g.strokeStyle = COLORS.line;
        g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        g.restore();
      }
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pieces, durationMs]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-50 h-full w-full" aria-hidden />;
}
