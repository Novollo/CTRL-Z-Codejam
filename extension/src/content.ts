// Content script: runs on the delivery site. Order pages are a single-page app, so we re-check
// whenever the page changes (MutationObserver) or the address changes (no reload between orders).
import { readerFor } from "../sites";
import type { ScrapedOrder } from "../sites";
import { getSettings, onSettingsChange } from "./settings";
import type { Settings } from "./settings";
import { CtrlzButton } from "./ui/button";
import { Panel } from "./ui/panel";

const CHECK_EVERY_MS = 400; // at most this often while the page is busy: the button shows well within 2 s
/** The site's own app (React) must finish starting before we add anything to its page, or it reports errors. */
const SETTLE_AFTER_LOAD_MS = 800;

const pageSettled = new Promise<void>((resolve) => {
  const later = () => setTimeout(resolve, SETTLE_AFTER_LOAD_MS);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
});

async function main() {
  const reader = readerFor(location.hostname);
  if (!reader) return;
  await pageSettled;
  let settings: Settings = await getSettings();
  let latest: ScrapedOrder | null = null;

  const panel = new Panel();
  const button = new CtrlzButton(() => panel.open(reader.read(document) ?? latest, settings));

  /** R1: the button only exists while the order is "Preparing". Demo mode shows it on any order page. */
  const check = () => {
    const onOrder = reader.isOrderPage(document, new URL(location.href));
    latest = onOrder ? reader.read(document) : null;
    if (onOrder && (settings.demo || latest?.is_preparing === true)) button.mount(reader.anchor(document), settings.demo);
    else button.unmount();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastRun = 0;
  const schedule = () => {
    if (timer) return;
    const delay = Math.max(0, CHECK_EVERY_MS - (Date.now() - lastRun));
    timer = setTimeout(() => {
      timer = undefined;
      lastRun = Date.now();
      check();
    }, delay);
  };

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  let href = location.href;
  setInterval(() => {
    if (location.href === href) return;
    href = location.href;
    schedule();
  }, 300);
  window.addEventListener("popstate", schedule);

  onSettingsChange(async () => {
    settings = await getSettings();
    schedule();
  });

  schedule();
}

void main();
