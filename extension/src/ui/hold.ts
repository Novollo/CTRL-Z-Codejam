// Press and hold (about 1 s) to confirm: a conscious decision (lead, Nov 21). The button fills up while held;
// letting go early cancels. Works with mouse, touch and keyboard (hold Space or Enter).
export const HOLD_MS = 1000;

export function makeHoldButton(btn: HTMLButtonElement, onConfirm: () => void, ms = HOLD_MS): void {
  btn.classList.add("hold");
  btn.style.setProperty("--hold-ms", `${ms}ms`);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const start = () => {
    if (btn.disabled || timer) return;
    btn.classList.add("holding");
    timer = setTimeout(() => {
      timer = undefined;
      btn.classList.remove("holding");
      btn.classList.add("held");
      setTimeout(() => btn.classList.remove("held"), 400);
      onConfirm();
    }, ms);
  };
  const cancel = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
    btn.classList.remove("holding");
  };

  btn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      btn.setPointerCapture(e.pointerId); // keep holding even if the finger slides a little
    } catch {
      // no capture: still works, letting go anywhere cancels
    }
    start();
  });
  btn.addEventListener("pointerup", cancel);
  btn.addEventListener("pointercancel", cancel);
  btn.addEventListener("lostpointercapture", cancel);
  btn.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      start();
    }
  });
  btn.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") cancel();
  });
  btn.addEventListener("blur", cancel);
  btn.addEventListener("click", (e) => e.preventDefault()); // a quick click alone does nothing
  btn.addEventListener("contextmenu", (e) => e.preventDefault()); // long press on touch screens
}
