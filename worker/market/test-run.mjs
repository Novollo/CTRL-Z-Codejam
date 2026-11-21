// Track C test: runs one listing from publish to sold against a running `npm run dev`, and prints each step.
//
//   node worker/market/test-run.mjs                     publish → ticks → ping → buy → mark-paid → sold   (~10 s)
//   node worker/market/test-run.mjs --lock              same, but the first buyer lets the 60 s lock run out (~75 s)
//   node worker/market/test-run.mjs --stop              publish → ping → "Stop listing"                     (~5 s)
//   node worker/market/test-run.mjs --close=free        nobody buys → free window → taken for free          (~4 min at DEMO_SPEED 7)
//   node worker/market/test-run.mjs --close=pickup_self nobody buys → seller picks it up                     (~4 min)
//   node worker/market/test-run.mjs --close=donate      nobody buys → donated                               (~4 min)
//   add --base=http://localhost:8787 to point somewhere else (default: the worker on 8787)
//   add --crowd=off when the worker runs with DEMO_CROWD "off" (default "on", as in wrangler.jsonc),
//       e.g. npx wrangler dev --port 8798 --var DEMO_CROWD:off  →  node worker/market/test-run.mjs --crowd=off --base=http://localhost:8798
//
// WARNING: it calls /api/admin/reset first (wipes listings, pings and payments). Run it on your laptop, not on stage.
// Plain Node 22 (built-in fetch + WebSocket). Exit code 0 = every check passed.

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const flag = (name) => args.includes(`--${name}`);

const BASE = (arg("base") ?? "http://localhost:8787").replace(/\/$/, "");
const ORDER = "ord_4821";
const CLOSE = arg("close");
const CROWD = arg("crowd") ?? "on";
const SCENARIO = CLOSE ? "close" : flag("lock") ? "lock" : flag("stop") ? "stop" : "sold";

const t0 = Date.now();
const clock = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s`;
const log = (...parts) => console.log(clock(), ...parts);
let failures = 0;
let orderTotal = 0;
const created = []; // this run's test buyers
const screens = []; // this run's live connections
const check = (ok, label) => {
  console.log(clock(), ok ? "  ✔" : "  ✘", label);
  if (!ok) failures++;
};

// ---- HTTP ----
async function call(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers["x-buyer-token"] = token;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ---- Live connection: collects every message, lets the test wait for one ----
function live(name, query) {
  const url = BASE.replace(/^http/, "ws") + "/ws?" + query;
  const ws = new WebSocket(url);
  const msgs = [];
  const waiters = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(String(e.data));
    msgs.push(msg);
    for (const w of [...waiters]) w();
  };
  const opened = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error(`${name}: could not open ${url}`));
  });
  /** Resolves with the first message (received so far or later) that matches. */
  const waitFor = (label, pred, timeoutMs = 15_000) =>
    new Promise((resolve, reject) => {
      const tryNow = () => {
        const hit = msgs.find(pred);
        if (!hit) return false;
        waiters.splice(waiters.indexOf(tryNow), 1);
        clearTimeout(timer);
        resolve(hit);
        return true;
      };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(tryNow), 1);
        reject(new Error(`${name}: timed out waiting for ${label}`));
      }, timeoutMs);
      waiters.push(tryNow);
      tryNow();
    });
  const count = (type) => msgs.filter((m) => m.type === type).length;
  return { name, msgs, opened, waitFor, count, close: () => ws.close() };
}

/** Restaurant tablet (round 4): the newest restaurant.order for the stage order that matches. */
const NEW_CODE = /^ZEE-[A-HJ-NP-Z2-9]{4}$/;
const view = (pred) => (m) => m.type === "restaurant.order" && m.order.order_id === ORDER && pred(m.order);
const said = (v, words) => v.timeline.some((e) => e.text.includes(words));
let kitchen; // the restaurant socket

const of = (type, listingId) => (m) => m.type === type && (!listingId || m.listing_id === listingId || m.listing?.listing_id === listingId);

// ---- The run ----
async function main() {
  log(`Track C test "${SCENARIO}${CLOSE ? ` ${CLOSE}` : ""}" against ${BASE}, DEMO_CROWD expected ${CROWD}`);

  const health = await call("GET", "/api/health");
  check(health.status === 200 && health.data?.mode === "real", `health: ${JSON.stringify(health.data)}`);

  const rest = await call("GET", "/api/restaurants");
  const list = rest.data?.restaurants ?? [];
  check(rest.status === 200 && list[0]?.id === "r_fiveguys" && list.length >= 2 && list.every((r) => r.name && r.logo_url),
    `GET restaurants: ${list.map((r) => r.name).join(", ")} (Five Guys first, all with logo_url)`);

  const state = await call("GET", "/api/admin/state");
  const speed = state.data?.demo_speed ?? 7;
  log(`DEMO_SPEED ${speed}, AGENT_MODE ${state.data?.agent_mode}`);

  check((await call("POST", "/api/admin/reset")).status === 200, "admin reset");

  // Two test buyers who match the stage order at any price: Trottier, 10 min, Burgers, up to $25.
  const profile = (name) => ({ name, notify_on: true, spot: "trottier", max_walk_min: 10, food_types: ["burgers"], diet: [], max_price: 25 });
  const a = (await call("POST", "/api/buyers", profile("Test Alice"))).data;
  const b = (await call("POST", "/api/buyers", profile("Test Bob"))).data;
  created.push(a, b);
  check(Boolean(a?.id && a?.token && b?.id && b?.token), `buyers created: ${a?.id}, ${b?.id}`);
  const me = await call("GET", `/api/buyers/${a.id}`, undefined, a.token);
  check(me.status === 200 && me.data.name === "Test Alice" && !("token" in me.data), "GET buyer profile (no token in it)");
  check((await call("GET", `/api/buyers/${a.id}`, undefined, b.token)).status === 401, "GET buyer with someone else's token → 401");

  const seller = live("seller", `role=seller&order=${ORDER}`);
  const alice = live("alice", `role=buyer&id=${a.id}`);
  const bob = live("bob", `role=buyer&id=${b.id}`);
  kitchen = live("restaurant", "role=restaurant&restaurant=r_fiveguys");
  screens.push(seller, alice, bob, kitchen);
  await Promise.all([seller.opened, alice.opened, bob.opened, kitchen.opened]);
  log("4 live connections open (seller, Alice, Bob, Five Guys tablet)");
  const v0 = (await kitchen.waitFor("restaurant.order on connect", view(() => true))).order;
  check(v0.fulfilment === "delivery" && v0.channel === "delivery_app" && v0.customer_name === "Alex" && v0.pickup_code === "ZEE-4821" && v0.ctrlz === null,
    `tablet on connect: ${v0.short_code} ${v0.customer_name} · ${v0.fulfilment} · ${v0.channel} · ${v0.pickup_code}`);
  const status0 = await seller.waitFor("order.status", of("order.status"));
  check(status0.status === "preparing", `seller sees order.status "${status0.status}"`);

  const order = await call("GET", `/api/orders/${ORDER}`);
  check(order.status === 200 && order.data.order.status === "preparing" && order.data.listing_id === null, "GET order: preparing, no listing");
  orderTotal = order.data.order.total;
  check(order.data.order.customer_name === "Alex" && order.data.order.type === "delivery", `GET order: delivery order for ${order.data.order.customer_name}, total $${orderTotal}`);
  const tablet = await call("GET", "/api/restaurant/r_fiveguys/orders");
  const ids = tablet.data?.orders?.map((o) => o.order_id) ?? [];
  check(tablet.status === 200 && tablet.data.restaurant.id === "r_fiveguys" && ids.includes(ORDER) && ids.length >= 3, `GET restaurant orders: ${ids.join(", ")}`);

  // Ctrl+Z → agent → draft
  const undo = await call("POST", `/api/orders/${ORDER}/undo`);
  check(undo.status === 200, `undo → draft ${undo.data?.listing_id}`);
  await kitchen.waitFor("Ctrl+Z on the timeline", view((v) => said(v, "Ctrl+Z")));
  check(true, 'tablet timeline: "Customer pressed Ctrl+Z"');
  const sheet = undo.data;
  log(`  "${sheet.title}" · start $${sheet.start_price} · floor $${sheet.floor_price} (range $${sheet.floor_min}–$${sheet.floor_max}) · ${sheet.drop_speed} · agent ${sheet.agent_source}`);
  log(`  reason: "${sheet.reason}"`);
  check(sheet.floor_price >= sheet.floor_min && sheet.floor_price <= sheet.floor_max, "floor inside 30–70%");
  const id = sheet.listing_id;

  // Publish
  const fallback = CLOSE ?? "free";
  const pub = await call("POST", `/api/listings/${id}/publish`, { floor_price: sheet.floor_price, fallback });
  check(pub.status === 200 && pub.data.status === "live", `publish (fallback ${fallback}) → live, $${pub.data?.price}, ${pub.data?.seconds_left} story s left`);
  const v1 = (await kitchen.waitFor("courier released", view((v) => v.fulfilment === "pickup"))).order;
  check(v1.ctrlz?.status === "live" && said(v1, "Courier released") && v1.customer_name === "Alex", "tablet: delivery → pickup, courier released, still Alex");
  check((await call("POST", `/api/listings/${id}/publish`, { floor_price: 9, fallback })).status === 409, "publish again → 409");

  const patch = await call("PATCH", `/api/listings/${id}`, { floor_price: 1 });
  check(patch.status === 200 && patch.data.floor_price === sheet.floor_min, `PATCH floor $1 → clipped to $${patch.data?.floor_price}`);
  await call("PATCH", `/api/listings/${id}`, { floor_price: sheet.floor_price });

  // Ticks
  await seller.waitFor("3 ticks", () => seller.count("listing.tick") >= 3, 15_000);
  const ticks = seller.msgs.filter(of("listing.tick", id));
  log(`  seller ticks: ${ticks.map((t) => `$${t.price.toFixed(2)} (${t.seconds_left}s)`).join(", ")}`);
  check(ticks.every((t, i) => i === 0 || (t.price <= ticks[i - 1].price && t.seconds_left <= ticks[i - 1].seconds_left)), "price and time only go down");

  // Pings
  const pingA = await alice.waitFor("ping", of("ping", id));
  const pingB = await bob.waitFor("ping", of("ping", id));
  log(`  Alice pinged at $${pingA.listing.price}: "${pingA.reason}"`);
  check(pingA.reason.startsWith("Why you got this: Burgers · 6 min walk · under your $25"), "reason line");
  check(!JSON.stringify(pingA).includes("ZEE-"), "ping card has no pickup code");
  check(Boolean(pingB), "Bob pinged too");
  const reach = await seller.waitFor("reach ≥ 2", (m) => m.type === "listing.reach" && m.reached >= 2);
  check(reach.reached >= 2, `seller: "Sent to ${reach.reached} people nearby"`);
  await alice.waitFor("tick on the open card", of("listing.tick", id));
  check(true, "buyers with the card get ticks");
  await statsChecks(id, seller, alice);
  const card = await call("GET", `/api/listings/${id}`, undefined, a.token);
  check(card.status === 200 && card.data.listing.walk_min === 6 && card.data.reason === pingA.reason && card.data.buyer_id === a.id, "GET listing card for Alice (Telegram link), with her buyer_id");

  if (SCENARIO === "stop") return stopScenario(id, seller, alice);
  if (SCENARIO === "close") return closeScenario(id, speed, seller, alice, bob, a, b);

  // Buy: Alice is first, Bob loses the race.
  const buyA = await call("POST", `/api/listings/${id}/buy`, undefined, a.token);
  check(buyA.status === 200 && buyA.data.kind === "locked", `Alice taps Buy → locked at $${buyA.data?.price}, checkout ${buyA.data?.checkout_url}`);
  const buyB = await call("POST", `/api/listings/${id}/buy`, undefined, b.token);
  check(buyB.status === 409 && buyB.data.error === "taken", `Bob taps Buy → ${buyB.status} ${JSON.stringify(buyB.data)}`);
  const lockedB = await bob.waitFor("listing.locked", of("listing.locked", id));
  check(lockedB.lock_until === buyA.data.lock_until, "Bob sees listing.locked (B-hold)");
  await seller.waitFor("listing.locked", of("listing.locked", id));
  check((await call("GET", `/api/listings/${id}/pass`, undefined, a.token)).status === 404, "no pass before payment");
  const lockedCard = await call("GET", `/api/listings/${id}`, undefined, b.token);
  check(lockedCard.data?.listing.status === "locked" && lockedCard.data.listing.lock_until === buyA.data.lock_until, "GET listing card while locked → status locked + lock_until");

  let winner = { name: "Alice", token: a.token, live: alice, price: buyA.data.price };
  let loser = { name: "Bob", token: b.token, live: bob };

  if (SCENARIO === "lock") {
    log("  Alice does not pay. Waiting for the 60 s lock to run out…");
    const unlocked = await bob.waitFor("listing.unlocked", of("listing.unlocked", id), 75_000);
    check(unlocked.price <= buyA.data.price, `listing.unlocked after ${((Date.now() - buyA.data.lock_until + 60_000) / 1000).toFixed(0)} s, back at $${unlocked.price}`);
    const buyB2 = await call("POST", `/api/listings/${id}/buy`, undefined, b.token);
    check(buyB2.status === 200 && buyB2.data.kind === "locked", `Bob taps Buy → locked at $${buyB2.data?.price}`);
    winner = { name: "Bob", token: b.token, live: bob, price: buyB2.data.price };
    loser = { name: "Alice", token: a.token, live: alice };
  }

  // Pay (/admin "Mark paid" stands in for the Stripe webhook)
  check((await call("POST", "/api/admin/mark-paid", { listing_id: id })).status === 200, "admin mark-paid");
  const soldW = await winner.live.waitFor("listing.sold", of("listing.sold", id));
  const soldL = await loser.live.waitFor("listing.sold", of("listing.sold", id));
  const soldS = await seller.waitFor("listing.sold", of("listing.sold", id));
  const newCode = soldW.pass?.pickup_code;
  check(NEW_CODE.test(newCode ?? "") && newCode !== "ZEE-4821" && soldW.pass.name_on_order === `Test ${winner.name}`, `${winner.name} gets listing.sold WITH the pass and a NEW code (${newCode})`);
  await checkHandover(`Test ${winner.name}`, newCode);
  check(!soldL.pass && !soldS.pass, `${loser.name} and the seller get listing.sold WITHOUT the pass`);
  check(soldS.sold_price === winner.price, `sold at the lock price $${soldS.sold_price}`);
  const minutes = Math.round(((soldS.pickup_by - Date.now()) * speed) / 60_000);
  check(minutes >= 29 && minutes <= 30, `pick up by = payment + ${minutes} story min`);
  log(`  seller S5a: "You got $${soldS.sold_price.toFixed(2)} back." "You undid ${Math.round((soldS.sold_price / orderTotal) * 100)}% of your mistake."`);

  const passW = await call("GET", `/api/listings/${id}/pass`, undefined, winner.token);
  check(passW.status === 200 && passW.data.pickup_code === newCode, `GET pass for ${winner.name} → ${passW.data?.pickup_code}`);
  check((await call("GET", `/api/listings/${id}/pass`, undefined, loser.token)).status === 404, `GET pass for ${loser.name} → 404`);
  check((await call("POST", `/api/listings/${id}/buy`, undefined, loser.token)).status === 409, "buy after sold → 409");
  check((await call("POST", `/api/orders/${ORDER}/undo`)).status === 409, "undo a sold order → 409");
}

/** Round 2: listing.stats on every tick to the seller and card holders; reach = seen; the invariants hold. */
async function statsChecks(id, seller, alice) {
  await alice.waitFor("listing.stats on the card", of("listing.stats", id));
  if (CROWD === "off") {
    const real = await seller.waitFor("stats with both pings", (m) => m.type === "listing.stats" && m.listing_id === id && m.seen === 2);
    log(`  stats (real only): seen ${real.seen} · watching ${real.watching} · interested ${real.interested}`);
    check(real.watching === 2 && real.interested >= 2, "crowd off: seen 2, watching 2 (Alice and Bob), interested ≥ 2");
  } else {
    await seller.waitFor("stats with the crowd", (m) => m.type === "listing.stats" && m.listing_id === id && m.seen > 2, 20_000);
    const last = seller.msgs.filter(of("listing.stats", id)).at(-1);
    log(`  stats (real + crowd): seen ${last.seen} · watching ${last.watching} · interested ${last.interested}`);
    check(last.seen > 2, "crowd on: seen grows above the 2 real pings");
    const first = seller.msgs.find(of("listing.stats", id));
    check(first.seen >= 16 && first.interested >= 10, `crowd on: busy from the first stats (seen ${first.seen}, interested ${first.interested}; 45% of 36 / 22)`);
  }
  const stats = seller.msgs.filter(of("listing.stats", id));
  log(`  seller got ${stats.length} stats so far (seen: ${stats.map((m) => m.seen).join(",")})`);
  check(stats.length >= 2, "seller gets listing.stats on every tick");
  // Every reach follows its stats message and carries the same `seen`.
  const pairs = seller.msgs.map((m, i) => [seller.msgs[i - 1], m]).filter(([, m]) => m.type === "listing.reach" && m.listing_id === id);
  check(pairs.length > 0 && pairs.every(([prev, m]) => prev?.type === "listing.stats" && prev.seen === m.reached), "listing.reach.reached = stats.seen");
}

/** Checked at the end of every run, over every stats message anyone got. */
function checkInvariants(...screens) {
  const all = screens.flatMap((s) => s.msgs.filter((m) => m.type === "listing.stats"));
  const bad = all.filter((m) => !(m.interested >= m.watching && m.seen >= m.watching && m.watching >= 0));
  check(all.length > 0 && bad.length === 0, `invariants interested ≥ watching and seen ≥ watching hold in all ${all.length} stats (${bad.length} bad)`);
}

/** Round 4: the tablet sees the order change hands, then Mark ready and Picked up. */
async function checkHandover(name, code) {
  const v = (await kitchen.waitFor("handover", view((o) => o.channel === "ctrlz"))).order;
  log(`  tablet: ${v.customer_name} · ${v.fulfilment} · ${v.channel} · ${v.pickup_code} (was ${v.previous_pickup_code})`);
  check(v.customer_name === name && v.pickup_code === code && v.previous_pickup_code === "ZEE-4821" && v.fulfilment === "pickup",
    "tablet handover: buyer's name, new code (old one as previous), pickup, channel ctrlz");
  check(said(v, `New pickup code ${code}`) && said(v, name), "tablet timeline: resold/given free + new pickup code");
  check((await call("POST", `/api/restaurant/orders/${ORDER}/picked-up`)).status === 409, "Picked up before ready → 409");
  check((await call("POST", `/api/restaurant/orders/${ORDER}/ready`)).status === 200, "tablet: Mark ready");
  await kitchen.waitFor("ready", view((o) => o.status === "ready" && said(o, "Ready for pickup")));
  check((await call("POST", `/api/restaurant/orders/${ORDER}/picked-up`)).status === 200, "tablet: Picked up");
  const done = (await kitchen.waitFor("picked up", view((o) => o.status === "picked_up"))).order;
  check(said(done, `Picked up by ${name}`), `tablet timeline: "Picked up by ${name}"`);
  log(`  timeline: ${done.timeline.map((e) => e.text).join(" → ")}`);
}

async function stopScenario(id, seller, alice) {
  const stop = await call("POST", `/api/listings/${id}/stop`);
  check(stop.status === 200 && stop.data.status === "stopped", "Stop listing → stopped");
  const closedS = await seller.waitFor("listing.closed", of("listing.closed", id));
  await alice.waitFor("listing.closed", of("listing.closed", id));
  check(closedS.outcome === "stopped", "seller and Alice get listing.closed (stopped)");
  const order = await call("GET", `/api/orders/${ORDER}`);
  check(order.data.listing_id === null && order.data.order.status !== "picked_up", "order back to normal");
  const back = (await kitchen.waitFor("back to delivery", view((v) => v.fulfilment === "delivery" && said(v, "stopped")))).order;
  check(back.channel === "delivery_app" && back.customer_name === "Alex" && back.pickup_code === "ZEE-4821", "tablet: back to delivery, Alex, ZEE-4821");
  check((await call("POST", `/api/orders/${ORDER}/undo`)).status === 200, "Ctrl+Z works again after stopping");
}

async function closeScenario(id, speed, seller, alice, bob, a, b) {
  const waitMs = ((4 + 20) * 60 * 1000) / speed + 20_000;
  log(`  Nobody buys. Waiting up to ${Math.round(waitMs / 1000)} s for the listing to close…`);
  const ready = await seller.waitFor("order ready", (m) => m.type === "order.status" && m.status === "ready", waitMs);
  check(Boolean(ready), "order became ready on its own (ready_at reached)");
  const closed = await seller.waitFor("listing.closed", of("listing.closed", id), waitMs);
  const closedA = await alice.waitFor("listing.closed", of("listing.closed", id));
  check(!closedA.pickup_code, "buyers' listing.closed has no pickup code");

  if (CLOSE === "pickup_self") {
    check(closed.outcome === "pickup_self" && closed.pickup_code === "ZEE-4821", `seller: outcome pickup_self, code ${closed.pickup_code}`);
    return;
  }
  if (CLOSE === "donate") {
    check(closed.outcome === "donated", "seller: outcome donated");
    return;
  }
  check(closed.outcome === "free_window" && closed.free_until > Date.now(), `free window open for ${Math.round(((closed.free_until - Date.now()) * speed) / 60_000)} story min`);
  const zero = await alice.waitFor("tick at $0", (m) => m.type === "listing.tick" && m.listing_id === id && m.price === 0);
  check(zero.price === 0, "price is $0 in the free window");
  const take = await call("POST", `/api/listings/${id}/buy`, undefined, a.token);
  const freeCode = take.data?.pass?.pickup_code;
  check(take.status === 200 && take.data.kind === "free" && NEW_CODE.test(freeCode ?? "") && freeCode !== "ZEE-4821", `Alice taps → straight to the pass with a NEW code ${freeCode} (no lock, no payment)`);
  await checkHandover("Test Alice", freeCode);
  check((await call("POST", `/api/listings/${id}/buy`, undefined, b.token)).status === 409, "Bob taps after → 409");
  const soldS = await seller.waitFor("listing.sold", of("listing.sold", id));
  check(soldS.sold_price === 0 && !soldS.pass, "seller: listing.sold at $0, no pass");
  const peak = seller.msgs.filter(of("listing.stats", id)).at(-1);
  log(`  last stats: seen ${peak.seen} · watching ${peak.watching} · interested ${peak.interested}`);
  await bob.waitFor("listing.sold", of("listing.sold", id));
}

main()
  .catch((e) => {
    console.error(clock(), "  ✘", e.message);
    failures++;
  })
  .finally(async () => {
    if (screens.length) checkInvariants(...screens);
    // Leave no active test buyers behind: turn their pings off.
    for (const buyer of created) await call("PATCH", `/api/buyers/${buyer.id}`, { notify_on: false }, buyer.token).catch(() => null);
    console.log(failures === 0 ? `\nPASS: all checks passed in ${clock().trim()}` : `\nFAIL: ${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
