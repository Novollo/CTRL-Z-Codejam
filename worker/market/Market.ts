// Market Durable Object: the one referee (booklet 10).
// TODAY: a stub. Every screen that opens /ws gets its own replay of the mock run (shared/mocks/player.ts),
// filtered by role (?role=seller&order=… or ?role=buyer&id=…). Add &speed=30 to replay faster.
// Track C replaces this with the real engine (price clock, matching, pings, lock, timers, fallbacks).

import { DurableObject } from "cloudflare:workers";
import { DEFAULT_DEMO_SPEED } from "@shared/constants";
import type { LiveRole } from "@shared/messages";
import { playMockRun } from "@shared/mocks/player";
import type { Env } from "../env";

export class Market extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const role: LiveRole = url.searchParams.get("role") === "seller" ? "seller" : "buyer";
    const speed = Number(url.searchParams.get("speed")) || Number(this.env.DEMO_SPEED) || DEFAULT_DEMO_SPEED;

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();

    const stop = playMockRun({
      role,
      speed,
      loop: true,
      onMessage: (msg) => {
        try {
          server.send(JSON.stringify(msg));
        } catch {
          stop();
        }
      },
    });
    server.addEventListener("close", () => stop());
    server.addEventListener("error", () => stop());

    return new Response(null, { status: 101, webSocket: client });
  }
}
