// /stage: the laptop on stage (booklet 10.2, 12). Two phone frames side by side:
// the seller app on the left, the teammate's buyer page on the right. Nothing else on screen.
// The page's query (?speed=30, ?mock=local) is passed to both frames.
import { useEffect, useState } from "react";
import { PAGE } from "@shared/api";
import { PHONE } from "@shared/tokens";

export const BEZEL = 14;
const GAP = 64;
export const FRAME_W = PHONE.width + BEZEL * 2;
export const FRAME_H = PHONE.height + BEZEL * 2;

function fitScale(): number {
  const byHeight = (window.innerHeight - 32) / FRAME_H;
  const byWidth = (window.innerWidth - 32) / (FRAME_W * 2 + GAP);
  return Math.min(1, byHeight, byWidth);
}

export function Phone({ src, title }: { src: string; title: string }) {
  return (
    <div className="rounded-[56px] bg-ink shadow-2xl" style={{ padding: BEZEL, width: FRAME_W, height: FRAME_H }}>
      <iframe src={src} title={title} width={PHONE.width} height={PHONE.height} className="block rounded-[44px] border-0 bg-white" />
    </div>
  );
}

export function StagePage() {
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const query = window.location.search;
  const join = PAGE.join + query;
  const w = FRAME_W * 2 + GAP;

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <div style={{ width: w * scale, height: FRAME_H * scale }}>
        <div className="flex origin-top-left" style={{ width: w, gap: GAP, transform: `scale(${scale})` }}>
          <Phone src={`/seller${query}`} title="Seller" />
          <Phone src={join} title="Buyer" />
        </div>
      </div>
    </main>
  );
}
