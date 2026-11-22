// The Ctrl+Z panel: 1 check the order (editable) → 2 agent at work → 3 the agent's plan → 4 live price.
// Wording follows the seller app (booklet S2–S5). The panel opens even if the reader found nothing.
import type { UndoResponse } from "@shared/api";
import { TAG_LABELS } from "@shared/catalog";
import { formatClock, formatPrice } from "@shared/constants";
import type { LiveMessage } from "@shared/messages";
import mark from "../../img/mark.webp";
import type { ScrapedItem, ScrapedOrder } from "../../sites/types";
import { ServerError, server, startLive, stopLive } from "../server";
import { fill, h, keycaps, shadowHost } from "./dom";
import { makeHoldButton } from "./hold";

interface Draft {
  restaurant: string;
  items: ScrapedItem[];
}

const WORKING_LINES = ["Reading your order…", "Checking who's hungry nearby…", "Cooking up your listing…"];
const LINE_MS = 900;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cents = (n: number) => Math.round(n * 100) / 100;
const foodPrice = (items: ScrapedItem[]) => cents(items.reduce((s, it) => s + (it.price > 0 ? it.price : 0), 0));
const validItems = (items: ScrapedItem[]) => items.filter((it) => it.name.trim() && it.price > 0);

function problem(e: unknown): string {
  if (e instanceof ServerError && e.status === 0) return "Can't reach Ctrl+Z Eats. Check the server in the extension popup, then try again.";
  return "Something went wrong on the Ctrl+Z Eats server. Try again.";
}

export class Panel {
  private host: HTMLElement;
  private root: HTMLElement;
  private body!: HTMLElement;
  private foot!: HTMLElement;
  private demo = false;
  private run = 0; // bumps on every open/close, so late answers from an old run are ignored

  constructor() {
    const { host, root } = shadowHost("ctrlz-eats-panel");
    this.host = host;
    this.root = root;
  }

  get isOpen(): boolean {
    return this.host.isConnected;
  }

  open(scraped: ScrapedOrder | null, demo: boolean): void {
    this.close();
    this.demo = demo;
    const draft: Draft = {
      restaurant: scraped?.restaurant_name ?? "",
      items: scraped?.items.length ? scraped.items.map((it) => ({ ...it })) : [{ name: "", qty: 1, price: 0 }],
    };
    this.frame();
    document.body.append(this.host);
    this.showEdit(draft, !scraped || scraped.items.length === 0);
  }

  close(): void {
    this.run++;
    stopLive();
    this.host.remove();
  }

  /** Header (logo, name, Demo mode label, close) + body + footer. */
  private frame(): void {
    const closeBtn = h("button", { class: "close", type: "button", "aria-label": "Close" }, "✕");
    closeBtn.addEventListener("click", () => this.close());
    const img = h("img", { src: mark, alt: "" });
    this.body = h("div", { class: "body" });
    this.foot = h("div", { class: "foot" });
    this.root.replaceChildren(
      h(
        "section",
        { class: "panel", role: "dialog", "aria-label": "Ctrl+Z Eats" },
        h("div", { class: "head" }, img, h("span", { class: "name" }, keycaps(), h("span", {}, "Eats")), this.demo && h("span", { class: "demo" }, "Demo mode"), closeBtn),
        this.body,
        this.foot,
      ),
    );
  }

  // ---- 1. Check the order -------------------------------------------------------
  private showEdit(draft: Draft, readFailed: boolean, error = ""): void {
    const total = h("span", { class: "mono" }, formatPrice(foodPrice(draft.items)));
    const cont = h("button", { class: "primary", type: "button" }, "Continue");
    const refresh = () => {
      total.textContent = formatPrice(foodPrice(draft.items));
      cont.disabled = !draft.restaurant.trim() || validItems(draft.items).length === 0;
    };

    const restaurant = h("input", { class: "input", value: draft.restaurant, placeholder: "e.g. Tim Hortons", "aria-label": "Restaurant" });
    restaurant.addEventListener("input", () => {
      draft.restaurant = restaurant.value;
      refresh();
    });

    const rows = h("div", {});
    const drawRows = () => {
      rows.replaceChildren(
        ...draft.items.map((it, i) => {
          const qty = h("input", { class: "input", type: "number", min: "1", max: "20", value: String(it.qty), "aria-label": "Quantity" });
          const name = h("input", { class: "input", value: it.name, placeholder: "Item", "aria-label": "Item name" });
          const price = h("input", { class: "input", inputmode: "decimal", value: it.price ? it.price.toFixed(2) : "", placeholder: "0.00", "aria-label": "Price in dollars" });
          const x = h("button", { class: "x", type: "button", "aria-label": "Remove item" }, "✕");
          qty.addEventListener("input", () => { it.qty = Math.max(1, Math.round(Number(qty.value) || 1)); });
          name.addEventListener("input", () => { it.name = name.value; refresh(); });
          price.addEventListener("input", () => { it.price = cents(Math.max(0, Number(price.value.replace(",", ".").replace(/[^0-9.]/g, "")) || 0)); refresh(); });
          x.addEventListener("click", () => {
            draft.items.splice(i, 1);
            if (draft.items.length === 0) draft.items.push({ name: "", qty: 1, price: 0 });
            drawRows();
            refresh();
          });
          return h("div", { class: "row" }, qty, name, price, x);
        }),
      );
    };
    drawRows();

    const add = h("button", { class: "link", type: "button" }, "+ Add item");
    add.addEventListener("click", () => {
      draft.items.push({ name: "", qty: 1, price: 0 });
      drawRows();
      refresh();
    });

    fill(this.body, 
      h("h2", {}, "Ctrl+Z this order"),
      h("p", { class: "sub" }, "Check the order. Only the restaurant, items and prices are sent."),
      readFailed && h("p", { class: "note" }, "We couldn't read this page. Type the order in."),
      h("label", { class: "field" }, "Restaurant", restaurant),
      h("label", { class: "field" }, "Items"),
      h("div", { class: "cols" }, h("span", {}, "Qty"), h("span", {}, "Name"), h("span", {}, "Price ($)"), h("span", {})),
      rows,
      add,
      h("div", { class: "total" }, h("span", {}, "Food price (no fees)"), total),
      error && h("p", { class: "error" }, error),
    );
    cont.addEventListener("click", () => this.submit(draft, readFailed));
    fill(this.foot, cont);
    refresh();
  }

  // ---- 2. Agent at work ------------------------------------------------------------
  private async submit(draft: Draft, readFailed: boolean): Promise<void> {
    const run = this.run;
    const items = validItems(draft.items).map((it) => ({ name: it.name.trim(), qty: it.qty, price: it.price }));
    const steps = WORKING_LINES.map((t) => h("li", {}, h("span", { class: "dot" }), h("span", {}, t)));
    fill(this.body, h("img", { class: "zee", src: mark, alt: "" }), h("ul", { class: "steps" }, ...steps));
    fill(this.foot);

    const animate = (async () => {
      for (const li of steps) {
        li.classList.add("on");
        await wait(LINE_MS);
        li.classList.add("done");
        li.querySelector(".dot")!.textContent = "✓";
      }
    })();
    try {
      const imported = await server.importOrder({
        source: "doordash",
        restaurant_name: draft.restaurant.trim(),
        items,
        food_price: foodPrice(items),
        demo: this.demo,
      });
      const plan = await server.undo(imported.order_id);
      await animate;
      if (run === this.run) this.showPlan(imported.order_id, draft.restaurant.trim(), plan);
    } catch (e) {
      if (run === this.run) this.showEdit(draft, readFailed, problem(e));
    }
  }

  // ---- 3. The agent's plan (S3 wording) ---------------------------------------------
  private showPlan(orderId: string, restaurant: string, plan: UndoResponse, error = ""): void {
    const chips = [...plan.tags.map((t) => TAG_LABELS[t]), ...(plan.may_contain.length ? [`May contain: ${plan.may_contain.join(", ")}`] : [])];
    fill(this.body, 
      h(
        "div",
        { class: "card" },
        h("p", { class: "title" }, plan.title),
        h("p", { class: "line" }, plan.selling_line),
        chips.length > 0 && h("div", { class: "chips" }, ...chips.map((c) => h("span", { class: "chip" }, c))),
      ),
      h(
        "div",
        { class: "plan" },
        h("p", {}, "Starts at ", h("span", { class: "mono" }, formatPrice(plan.start_price))),
        h("p", {}, "Lowest price: ", h("span", { class: "mono" }, formatPrice(plan.floor_price))),
      ),
      h("p", { class: "grey" }, "Demo: the restaurant handover runs in the Ctrl+Z Eats app."),
      error && h("p", { class: "error" }, error),
    );

    const list = h("button", { class: "primary", type: "button", "aria-label": "List it. Press and hold." }, h("span", {}, "List it"), h("span", { "aria-hidden": "true" }, "→"));
    const never = h("button", { class: "quiet", type: "button" }, "Never mind, keep my order");
    never.addEventListener("click", () => this.close());
    makeHoldButton(list, async () => {
      const run = this.run;
      list.disabled = true;
      try {
        const live = await server.publish(plan.listing_id, { floor_price: plan.floor_price, fallback: plan.fallback });
        if (run === this.run) this.showLive(orderId, restaurant, plan.listing_id, live.price, live.seconds_left);
      } catch (e) {
        if (run === this.run) this.showPlan(orderId, restaurant, plan, problem(e));
      }
    });
    fill(this.foot, list, h("p", { class: "hint center" }, "Press and hold"), never);
  }

  // ---- 4. Live (S4) and the endings (S5) ------------------------------------------------
  private showLive(orderId: string, restaurant: string, listingId: string, startPrice: number, secondsLeft: number): void {
    const price = h("p", { class: "price" }, formatPrice(startPrice));
    const left = h("span", {}, `${formatClock(secondsLeft)} left`);
    const reach = h("span", {}, "");
    const state = h("p", { class: "sub" }, "");
    fill(this.body, 
      h("p", { class: "live" }, "Listed on Ctrl+Z Eats"),
      price,
      h("div", { class: "meta" }, left, reach),
      state,
      h("p", { class: "grey" }, "Demo: the restaurant handover runs in the Ctrl+Z Eats app."),
    );
    fill(this.foot);
    let last = startPrice;

    const end = (...lines: (string | Node)[]) => {
      stopLive();
      fill(this.body, ...lines.map((l) => (typeof l === "string" ? l && h("p", { class: "sub" }, l) : l)));
      const done = h("button", { class: "primary", type: "button" }, "Close");
      done.addEventListener("click", () => this.close());
      fill(this.foot, done);
    };

    startLive(orderId, (m: LiveMessage) => {
      if ("listing_id" in m && m.listing_id !== listingId) return;
      switch (m.type) {
        case "listing.tick":
          if (m.price < last) {
            price.classList.remove("drop");
            void price.offsetWidth; // restart the animation
            price.classList.add("drop");
          }
          last = m.price;
          price.textContent = formatPrice(m.price);
          left.textContent = `${formatClock(m.seconds_left)} left`;
          break;
        case "listing.reach":
          reach.textContent = `Sent to ${m.reached} people nearby`;
          break;
        case "listing.locked":
          state.textContent = "Someone is paying…";
          break;
        case "listing.unlocked":
          state.textContent = "";
          break;
        case "listing.sold":
          if (m.sold_price > 0) end(h("p", { class: "big" }, "Sold!"), `You got ${formatPrice(m.sold_price)} back.`, `A buyer picks it up at ${new Date(m.pickup_by).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Nothing else to do.`);
          else end(h("p", { class: "big" }, "Taken!"), "Someone nearby took it. Thank you!");
          break;
        case "listing.closed":
          if (m.outcome === "free_window") {
            state.textContent = "Nobody bought it, so it's now free for someone nearby. You'll get a thank-you when it's taken.";
            price.textContent = formatPrice(0);
          } else if (m.outcome === "donated") end(h("p", { class: "big" }, "Thanks!"), "Thanks! Your meal is set aside for donation.");
          else if (m.outcome === "stopped") end(h("p", { class: "big" }, "Stopped"), "Your order is back to normal.");
          else end(h("p", { class: "big" }, "Time is up"), `Nobody grabbed it. Your order is waiting at ${restaurant}.`, m.pickup_code ? `Pickup code ${m.pickup_code}` : "");
          break;
      }
    });
  }
}
