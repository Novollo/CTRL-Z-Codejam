// /demo (round 4): the whole story on three phones, same frames as /stage, scaled to fit.
// Seller (left) · buyer (middle) · restaurant (right). The page's query (?speed=30, ?mock=local) goes to every frame.
import { useEffect, useState } from "react";
import { PAGE } from "@shared/api";
import { DEMO_RESTAURANT_ID } from "@shared/constants";
import { FRAME_H, FRAME_W, Phone } from "./StagePage";

const GAP = 48;
const CAPTION_H = 44;

function fitScale(): number {
  const byHeight = (window.innerHeight - 32) / (FRAME_H + CAPTION_H);
  const byWidth = (window.innerWidth - 32) / (FRAME_W * 3 + GAP * 2);
  return Math.min(1, byHeight, byWidth);
}

/** Add the page's own query (?speed=…, ?mock=…) to a frame URL that may already have one. */
function withQuery(src: string, query: URLSearchParams): string {
  const url = new URL(src, window.location.origin);
  query.forEach((v, k) => url.searchParams.set(k, v));
  return url.pathname + url.search;
}

export function DemoPage() {
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const query = new URLSearchParams(window.location.search);
  const frames = [
    { src: "/seller", caption: "Customer who regrets" },
    { src: PAGE.join, caption: "Student nearby" },
    { src: `/restaurant?r=${DEMO_RESTAURANT_ID}`, caption: "Five Guys kitchen" },
  ];
  const w = FRAME_W * 3 + GAP * 2;
  const h = FRAME_H + CAPTION_H;

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <div style={{ width: w * scale, height: h * scale }}>
        <div className="flex origin-top-left" style={{ width: w, gap: GAP, transform: `scale(${scale})` }}>
          {frames.map((f) => (
            <figure key={f.caption} className="flex flex-col items-center">
              <Phone src={withQuery(f.src, query)} title={f.caption} />
              <figcaption className="mt-3 text-h3 font-semibold text-stone">{f.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}
