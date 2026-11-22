// /demo (round 4): the whole story on three phones, same frames as /stage, scaled to fit.
// Seller (left) · buyer (middle) · restaurant (right). The page's query (?speed=30, ?mock=local) goes to every frame.
// Every load starts FRESH (team request): local demo memory is cleared and the demo is reset on the server BEFORE
// the phones load. Add ?keep=1 to skip that (e.g. to reload the page mid-demo without losing the run).
import { useEffect, useState } from "react";
import { API, PAGE } from "@shared/api";
import { DEMO_RESTAURANT_ID } from "@shared/constants";
import { FRAME_H, FRAME_W, Phone } from "./StagePage";
import { apiCall } from "../lib/api";
import { Mascot } from "../ui";

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

/** Clear every saved bit of demo state in this browser (buyer profile, restaurant memory), but keep the mute choice. */
function clearLocalDemoState() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("ctrlz.") && k !== "ctrlz.muted")
      .forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("ctrlz."))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // storage blocked: nothing saved anyway
  }
}

export function DemoPage() {
  const keep = new URLSearchParams(window.location.search).get("keep") === "1";
  const [ready, setReady] = useState(keep);
  useEffect(() => {
    if (keep) return;
    clearLocalDemoState();
    apiCall("POST", API.adminReset())
      .catch(() => {}) // the phones still load; /admin can reset by hand
      .finally(() => setReady(true));
  }, [keep]);

  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const query = new URLSearchParams(window.location.search);
  query.delete("keep");
  const frames = [
    { src: "/seller", caption: "Customer who regrets" },
    { src: PAGE.join, caption: "Student nearby" },
    { src: `/restaurant?r=${DEMO_RESTAURANT_ID}`, caption: "Five Guys kitchen" },
  ];
  const w = FRAME_W * 3 + GAP * 2;
  const h = FRAME_H + CAPTION_H;

  if (!ready) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <Mascot pose="thinking" motion="bob" size={120} />
        <p className="text-h3 text-stone">Setting up the demo…</p>
      </main>
    );
  }

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
