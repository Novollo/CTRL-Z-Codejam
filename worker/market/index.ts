// Track C: the Market Durable Object, a typed handle to it, and notifyBuyerChanged (worker/integrations.ts).
import type { Env } from "../env";
import type { NotifyBuyerChanged } from "../integrations";
import type { Market } from "./Market";

export { Market } from "./Market";
export type { Reply } from "./Market";

/** The one Market instance (booklet 10). Call its public methods over RPC. */
export const market = (env: Env): DurableObjectStub<Market> => {
  const ns = env.MARKET as unknown as DurableObjectNamespace<Market>;
  return ns.get(ns.idFromName("market"));
};

/** A buyer profile changed: re-run matching for that buyer (booklet 9.3). */
export const notifyBuyerChanged: NotifyBuyerChanged = async (env, buyer_id) => {
  await market(env).buyerChanged(buyer_id);
};
