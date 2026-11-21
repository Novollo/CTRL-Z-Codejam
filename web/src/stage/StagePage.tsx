// /stage, track 0 version: shows the live events the seller and the stage buyer receive.
// Track B replaces this with two phone frames (/seller left, /join right), booklet 10.2.
import { useEffect, useState } from "react";
import { DEMO_ORDER_ID, formatClock, formatPrice } from "@shared/constants";
import type { LiveMessage } from "@shared/messages";
import { MOCK_BUYER_ID } from "@shared/mocks/data";
import { connectLive, type LiveTarget } from "../lib/live";

function describe(m: LiveMessage): string {
  switch (m.type) {
    case "order.status": return `order → ${m.status}`;
    case "listing.tick": return `${formatPrice(m.price)} · ${formatClock(m.seconds_left)} left`;
    case "listing.reach": return `Sent to ${m.reached} people nearby`;
    case "ping": return `PING ${m.listing.title} at ${formatPrice(m.listing.price)}. ${m.reason}`;
    case "listing.locked": return `LOCKED until ${new Date(m.lock_until).toLocaleTimeString()}`;
    case "listing.unlocked": return `UNLOCKED, back at ${formatPrice(m.price)}`;
    case "listing.sold": return `SOLD at ${formatPrice(m.sold_price)}${m.pass ? `, code ${m.pass.pickup_code}` : ""}`;
    case "listing.closed": return `CLOSED: ${m.outcome}`;
  }
}

function Feed({ title, target }: { title: string; target: LiveTarget }) {
  const [log, setLog] = useState<{ t: string; m: LiveMessage }[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(
    () =>
      connectLive(target, (m) => {
        if (m.type === "listing.tick") {
          setPrice(m.price);
          setLeft(m.seconds_left);
        }
        if (m.type === "order.status" && m.status === "preparing") setLog([]); // a new run started
        setLog((l) => [{ t: new Date().toLocaleTimeString(), m }, ...l].slice(0, 60));
      }),
    [],
  );

  return (
    <section className="flex-1 rounded-card border border-line p-4">
      <h2 className="text-h3">{title}</h2>
      <div className="mt-3 flex items-baseline gap-4">
        <span className="font-mono text-h1 font-bold text-forest">{price === null ? "–" : formatPrice(price)}</span>
        <span className="font-mono text-stone">{left === null ? "" : `${formatClock(left)} left`}</span>
      </div>
      <ul className="mt-4 max-h-[60vh] space-y-1 overflow-auto font-mono text-small">
        {log.map(({ t, m }, i) => (
          <li key={i} className={m.type === "listing.tick" ? "text-stone" : "text-ink"}>
            <span className="text-stone">{t}</span> <b>{m.type}</b> {describe(m)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StagePage() {
  return (
    <main className="min-h-screen bg-white p-6">
      <h1 className="text-h2">Stage · mock run</h1>
      <p className="mt-1 text-small text-stone">
        Live events from <code>/ws</code> (mock replay, about 70 s, loops). Add <code>?speed=30</code> to go faster or{" "}
        <code>?mock=local</code> to play without the server.
      </p>
      <div className="mt-6 flex flex-col gap-4 md:flex-row">
        <Feed title="Seller" target={{ role: "seller", orderId: DEMO_ORDER_ID }} />
        <Feed title="Buyer (Sarah)" target={{ role: "buyer", buyerId: MOCK_BUYER_ID }} />
      </div>
    </main>
  );
}
