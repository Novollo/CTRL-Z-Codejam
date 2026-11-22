// The green "Ctrl+Z this order" button. Placed after the site's Cancel button or status line,
// or floating in the bottom-right corner when the reader found no place for it.
import { h, keycaps, shadowHost } from "./dom";
import { makeHoldButton } from "./hold";

export class CtrlzButton {
  private host: HTMLElement;
  private dock: HTMLElement;
  private demoLabel: HTMLElement;

  constructor(onConfirm: () => void) {
    const { host, root } = shadowHost("ctrlz-eats-button");
    this.host = host;
    const btn = h(
      "button",
      { class: "ctrlz", type: "button", "aria-label": "Ctrl+Z this order. Press and hold." },
      keycaps(),
      h("span", {}, "this order"),
    );
    makeHoldButton(btn, onConfirm);
    this.demoLabel = h("span", { class: "demo" }, "Demo mode");
    this.dock = h("div", { class: "dock" }, btn, h("div", { class: "under" }, h("span", { class: "hint" }, "Press and hold"), this.demoLabel));
    root.append(this.dock);
  }

  /** Show the button after `anchor`, or floating when anchor is null. Does nothing if it's already there. */
  mount(anchor: Element | null, demo: boolean): void {
    this.demoLabel.style.display = demo ? "" : "none";
    if (anchor) {
      this.dock.classList.remove("floating");
      if (anchor.nextElementSibling !== this.host) anchor.insertAdjacentElement("afterend", this.host);
    } else {
      this.dock.classList.add("floating");
      if (this.host.parentElement !== document.body) document.body.append(this.host);
    }
  }

  unmount(): void {
    this.host.remove();
  }
}
