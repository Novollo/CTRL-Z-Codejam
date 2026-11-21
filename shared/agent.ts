// Seller agent input/output (booklet 8.2, 8.3). Plain data, used by track C (caller) and track D (agent).
// FROZEN: only the lead changes this file (see CLAUDE.md).

import type { DropSpeed, ListingDiet, Tag } from "./catalog";
import type { AgentSource } from "./types";

/** What our code sends to the model (booklet 8.2). */
export interface AgentInput {
  restaurant: string;
  items: string[];
  food_price: number;
  minutes_until_ready: number;
  active_nearby: number;
  active_nearby_liking_category: number;
  allowed_tags: Tag[];
}

/** What the model must return (booklet 8.3), after the code checks in 8.5. */
export interface AgentOutput {
  tags: Tag[];
  diet: ListingDiet;
  may_contain: string[];
  start_price: number;
  floor_price: number;
  drop_speed: DropSpeed;
  title: string;
  selling_line: string;
  reason: string;
}

/** AgentOutput + where it came from ("default" = model failed, timed out, or AGENT_MODE=default). */
export interface AgentResult extends AgentOutput {
  agent_source: AgentSource;
}
