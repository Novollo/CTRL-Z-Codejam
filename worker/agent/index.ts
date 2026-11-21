// Track D replaces this placeholder with the real agent (booklet 8). Same name, same type.
import { MOCK_UNDO } from "@shared/mocks/data";
import type { RunSellerAgent } from "../integrations";

export const runSellerAgent: RunSellerAgent = async () => {
  const { tags, diet, may_contain, start_price, floor_price, drop_speed, title, selling_line, reason } = MOCK_UNDO;
  return { tags, diet, may_contain, start_price, floor_price, drop_speed, title, selling_line, reason, agent_source: "default" };
};
