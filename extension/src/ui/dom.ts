// Tiny DOM helpers. Text always goes in as textContent (never innerHTML), so page text can't inject markup.
import { CSS } from "./styles";

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string | boolean>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

/** Replace an element's children; false/null/"" children are skipped. */
export function fill(el: Element, ...children: Child[]): void {
  el.replaceChildren(...children.filter((c): c is Node | string => !!c));
}

/** The keycaps from our logo: [Ctrl] + [Z]. */
export const keycaps = (): HTMLElement =>
  h("span", { class: "keys", "aria-hidden": "true" }, h("span", { class: "key" }, "Ctrl"), h("span", { class: "plus" }, "+"), h("span", { class: "key" }, "Z"));

/** A host element with its own closed-off Shadow DOM and our CSS inside. */
export function shadowHost(tagName: string): { host: HTMLElement; root: HTMLElement } {
  const host = document.createElement(tagName);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(h("style", {}, CSS));
  const root = h("div", { class: "root" });
  shadow.append(root);
  return { host, root };
}
