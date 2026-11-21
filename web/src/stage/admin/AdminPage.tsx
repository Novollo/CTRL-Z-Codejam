// /admin: demo controls for the team (booklet 10.2, 12.1, 12.3).
// Reset demo, "Mark order ready", "Mark paid", AGENT_MODE switch, list of joined buyers.
import { useCallback, useEffect, useState } from "react";
import { API, type AdminStateResponse, type AgentModeRequest, type MarkPaidRequest, type OrderResponse } from "@shared/api";
import { CAMPUS_SPOTS, FOOD_TYPES } from "@shared/catalog";
import { DEMO_ORDER_ID, type AgentMode } from "@shared/constants";
import { apiCall } from "../../lib/api";

const spotName = (key: string | null) => CAMPUS_SPOTS.find((s) => s.key === key)?.label ?? "–";
const foodNames = (keys: string[]) => (keys.length ? FOOD_TYPES.filter((f) => keys.includes(f.key)).map((f) => f.label).join(", ") : "Anything");

export function AdminPage() {
  const [state, setState] = useState<AdminStateResponse | null>(null);
  const [listingId, setListingId] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await apiCall<AdminStateResponse>("GET", API.adminState()));
      const order = await apiCall<OrderResponse>("GET", API.order(DEMO_ORDER_ID));
      if (order.listing_id) setListingId(order.listing_id);
    } catch {
      setNote({ ok: false, text: "Can't reach the server." });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (label: string, method: "POST", path: string, body?: unknown) => {
    setBusy(true);
    try {
      await apiCall(method, path, body);
      setNote({ ok: true, text: `${label}: done` });
    } catch (e) {
      setNote({ ok: false, text: `${label}: failed${e instanceof Error ? ` (${e.message})` : ""}` });
    }
    setBusy(false);
    refresh();
  };

  const setMode = (agent_mode: AgentMode) => run(`AGENT_MODE ${agent_mode}`, "POST", API.adminAgentMode(), { agent_mode } satisfies AgentModeRequest);
  const button = "h-12 rounded-card px-4 font-bold disabled:opacity-50";

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-h1 text-ink">Admin</h1>
      <p className="mt-1 text-small text-stone">
        Order {DEMO_ORDER_ID}: <b className="text-ink">{state?.order_status ?? "…"}</b> · DEMO_SPEED <b className="text-ink">{state?.demo_speed ?? "…"}</b>
      </p>

      {note && (
        <p className={`mt-4 rounded-card px-4 py-2 text-small font-medium ${note.ok ? "bg-mint text-forest" : "bg-amber/20 text-ink"}`}>{note.text}</p>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <button disabled={busy} onClick={() => run("Reset demo", "POST", API.adminReset())} className={`${button} bg-forest text-white`}>
          Reset demo
        </button>
        <button disabled={busy} onClick={() => run("Mark order ready", "POST", API.adminOrderReady())} className={`${button} border border-line text-ink`}>
          Mark order ready
        </button>
      </section>

      <section className="mt-6 rounded-card border border-line p-4">
        <h2 className="text-h3 text-ink">Mark paid</h2>
        <p className="mt-1 text-small text-stone">If Stripe does not open: the locked buyer's payment is marked as done.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            placeholder="listing id"
            className="h-12 min-w-0 flex-1 rounded-card border border-line px-3 font-mono text-small"
          />
          <button
            disabled={busy || !listingId}
            onClick={() => run("Mark paid", "POST", API.adminMarkPaid(), { listing_id: listingId } satisfies MarkPaidRequest)}
            className={`${button} border border-line text-ink`}
          >
            Mark paid
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-card border border-line p-4">
        <h2 className="text-h3 text-ink">AGENT_MODE</h2>
        <p className="mt-1 text-small text-stone">Weak Wi-Fi? Switch to default: the seller agent is skipped and defaults are used.</p>
        <div className="mt-3 flex gap-2">
          {(["live", "default"] as const).map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => setMode(m)}
              aria-pressed={state?.agent_mode === m}
              className={`${button} flex-1 border ${state?.agent_mode === m ? "border-forest bg-mint text-forest" : "border-line text-ink"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-h3 text-ink">Joined buyers ({state?.buyers.length ?? 0})</h2>
          <button onClick={refresh} className="text-small font-bold text-forest underline">
            Refresh
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-small">
            <thead className="text-stone">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Pings</th>
                <th className="py-2 pr-3">Spot</th>
                <th className="py-2 pr-3">Walk</th>
                <th className="py-2 pr-3">Likes</th>
                <th className="py-2 pr-3">Max</th>
                <th className="py-2">Telegram</th>
              </tr>
            </thead>
            <tbody>
              {state?.buyers.map((b) => (
                <tr key={b.id} className="border-b border-line">
                  <td className="py-2 pr-3 font-medium text-ink">{b.name}</td>
                  <td className="py-2 pr-3">{b.notify_on ? "on" : "off"}</td>
                  <td className="py-2 pr-3">{spotName(b.spot)}</td>
                  <td className="py-2 pr-3">{b.max_walk_min} min</td>
                  <td className="py-2 pr-3">{foodNames(b.food_types)}</td>
                  <td className="py-2 pr-3 font-mono">${b.max_price}</td>
                  <td className="py-2">{b.telegram_chat_id ? "yes" : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
