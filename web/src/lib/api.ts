// Tiny typed fetch helper. Owned by the lead.
//   const sheet = await apiCall<UndoResponse>("POST", API.undo(DEMO_ORDER_ID));
//   const res = await apiCall<BuyResponse>("POST", API.buy(id), undefined, token);

import { BUYER_TOKEN_HEADER } from "@shared/api";

export class ApiCallError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
  }
}

export async function apiCall<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown, buyerToken?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (buyerToken) headers[BUYER_TOKEN_HEADER] = buyerToken;
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiCallError(res.status, data);
  return data as T;
}
