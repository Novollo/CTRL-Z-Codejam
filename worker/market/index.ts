// Track C: export the Market Durable Object and notifyBuyerChanged from here.
import type { NotifyBuyerChanged } from "../integrations";

export { Market } from "./Market";

/** Placeholder until the real Market exists. */
export const notifyBuyerChanged: NotifyBuyerChanged = async () => {};
