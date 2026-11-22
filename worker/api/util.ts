// Small helpers shared by the API route files.
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { BUYER_TOKEN_HEADER } from "@shared/api";
import type { Buyer } from "@shared/types";
import type { Env } from "../env";
import { getBuyerByToken } from "../market/db";
import type { Reply } from "../market";

export type C = Context<{ Bindings: Env }>;

/** Send a Market RPC reply as HTTP. */
export const reply = <T>(c: C, r: Reply<T>) => c.json(r.body as object, r.status as ContentfulStatusCode);

export const error = (c: C, status: ContentfulStatusCode, message: string) => c.json({ error: message }, status);

/** The buyer behind the x-buyer-token header, or null. */
export const caller = (c: C): Promise<Buyer | null> => getBuyerByToken(c.env.DB, c.req.header(BUYER_TOKEN_HEADER));

/** The page origin, for Stripe return URLs and Telegram links. The browser's Origin header wins (dev runs behind Vite). */
export const originOf = (c: C): string => {
  const origin = c.req.header("origin");
  // Track F: the Chrome extension calls from chrome-extension://…, which is no page to send people to.
  return origin && /^https?:\/\//.test(origin) ? origin : new URL(c.req.url).origin;
};

/** JSON body, or {} when missing or broken. */
export const body = async <T>(c: C): Promise<Partial<T>> => (await c.req.json().catch(() => ({}))) ?? {};

export const newId = (prefix: string): string => `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
