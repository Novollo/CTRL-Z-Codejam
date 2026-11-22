// CSS for our Shadow DOM (the host page's CSS can't reach in, ours can't leak out).
// Colours and shapes are the Ctrl+Z Eats tokens (shared/tokens.ts).
import { COLORS, FONTS, SHAPE } from "@shared/tokens";

export const CSS = `
:host { all: initial; display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.root {
  font-family: ${FONTS.ui}; color: ${COLORS.ink}; font-size: 14px; line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}
.mono { font-family: ${FONTS.mono}; font-weight: 700; }
button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
input { font: inherit; color: ${COLORS.ink}; }

/* ---- Hold to confirm ---------------------------------------------------- */
.hold { position: relative; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
.hold::before {
  content: ""; position: absolute; inset: 0; background: ${COLORS.leaf};
  transform: scaleX(0); transform-origin: left center; transition: transform 160ms ease-out;
}
.hold.holding::before { transform: scaleX(1); transition: transform var(--hold-ms, 1000ms) linear; }
.hold > * { position: relative; }
.hold.held { animation: held 380ms ease-out; }
@keyframes held { 0% { transform: scale(1); } 40% { transform: scale(0.97); } 100% { transform: scale(1); } }

/* ---- The Ctrl+Z button ---------------------------------------------------- */
.dock { display: block; max-width: 380px; margin: 12px 16px 16px; }
.dock.floating {
  position: fixed; right: 24px; bottom: 24px; width: 320px; margin: 0; z-index: 2147483646;
  background: ${COLORS.white}; border-radius: 16px; padding: 12px;
  box-shadow: 0 12px 32px rgba(17,17,17,0.18), 0 0 0 1px ${COLORS.line};
}
.ctrlz {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
  height: ${SHAPE.bottomButtonHeight}px; border-radius: ${SHAPE.radius}px; background: ${COLORS.forest}; color: ${COLORS.white};
  font-size: 17px; font-weight: 700; box-shadow: 0 6px 16px rgba(30,86,49,0.28);
}
.ctrlz:focus-visible, .primary:focus-visible { outline: 3px solid ${COLORS.leaf}; outline-offset: 2px; }
.keys { display: inline-flex; align-items: center; gap: 4px; }
.key {
  display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; padding: 0 7px;
  border: 2px solid currentColor; border-radius: 7px; font-family: ${FONTS.mono}; font-weight: 700; font-size: 14px;
  box-shadow: 0 2px 0 currentColor;
}
.plus { font-weight: 700; }
.under { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.hint { color: ${COLORS.stone}; font-size: 12px; }
.demo {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
  background: ${COLORS.mint}; color: ${COLORS.forest}; font-size: 12px; font-weight: 700; white-space: nowrap;
}
.demo::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: ${COLORS.amber}; }

/* ---- Panel ------------------------------------------------------------------ */
.panel {
  position: fixed; top: 24px; right: 24px; width: 384px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
  display: flex; flex-direction: column; z-index: 2147483647; background: ${COLORS.white}; border-radius: 16px;
  box-shadow: 0 20px 48px rgba(17,17,17,0.22), 0 0 0 1px ${COLORS.line}; animation: pop 220ms ease-out;
}
@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: ${COLORS.mint}; border-radius: 16px 16px 0 0; }
.head img { width: 44px; height: 37px; object-fit: contain; }
.head .name { flex: 1; font-weight: 800; font-size: 16px; color: ${COLORS.forest}; display: flex; align-items: center; gap: 4px; }
.head .name .key { min-width: 22px; height: 22px; font-size: 12px; padding: 0 5px; border-width: 1.5px; box-shadow: 0 1.5px 0 currentColor; }
.close { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: ${COLORS.stone}; }
.close:hover { background: ${COLORS.white}; }
.body { padding: 16px; overflow: auto; }
.foot { padding: 12px 16px 16px; border-top: 1px solid ${COLORS.line}; }
.foot:empty { display: none; }
h2 { font-size: 20px; font-weight: 800; line-height: 1.2; }
.sub { color: ${COLORS.stone}; font-size: 13px; margin-top: 4px; }
label.field { display: block; margin-top: 14px; font-size: 12px; font-weight: 700; color: ${COLORS.stone}; text-transform: uppercase; letter-spacing: 0.04em; }
.input {
  display: block; width: 100%; height: 40px; margin-top: 6px; padding: 0 10px; border: 1.5px solid ${COLORS.line};
  border-radius: 10px; background: ${COLORS.white}; font-size: 14px;
}
.input:focus { outline: none; border-color: ${COLORS.forest}; }
.row { display: grid; grid-template-columns: 52px 1fr 84px 28px; gap: 6px; align-items: center; margin-top: 6px; }
.row .input { margin-top: 0; }
.row .x { width: 28px; height: 28px; border-radius: 50%; color: ${COLORS.stone}; display: grid; place-items: center; }
.row .x:hover { background: ${COLORS.mint}; }
.cols { display: grid; grid-template-columns: 52px 1fr 84px 28px; gap: 6px; margin-top: 6px; font-size: 11px; color: ${COLORS.stone}; }
.link { color: ${COLORS.forest}; font-weight: 700; font-size: 13px; margin-top: 8px; }
.total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding-top: 12px; border-top: 1px dashed ${COLORS.line}; }
.note { margin-top: 10px; padding: 8px 10px; border-radius: 10px; background: ${COLORS.mint}; color: ${COLORS.forest}; font-size: 12px; }
.primary {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: ${SHAPE.bottomButtonHeight}px;
  border-radius: ${SHAPE.radius}px; background: ${COLORS.forest}; color: ${COLORS.white}; font-size: 17px; font-weight: 700;
}
.primary:disabled { opacity: 0.45; cursor: default; }
.quiet { display: block; margin: 10px auto 0; color: ${COLORS.stone}; font-size: 13px; text-decoration: underline; }
.center { text-align: center; }
.error { margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(242,169,0,0.14); font-size: 13px; }

/* working */
.steps { list-style: none; margin-top: 16px; display: grid; gap: 12px; }
.steps li { display: flex; align-items: center; gap: 10px; font-weight: 600; opacity: 0.25; transition: opacity 300ms; }
.steps li.on { opacity: 1; }
.dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${COLORS.leaf}; display: grid; place-items: center; flex: none; }
.steps li.done .dot { background: ${COLORS.leaf}; color: ${COLORS.white}; }
.zee { display: block; margin: 4px auto 0; width: 120px; height: 100px; object-fit: contain; animation: bob 1.6s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-5px); } }

/* plan */
.card { padding: 14px; border-radius: ${SHAPE.radius}px; background: ${COLORS.mint}; }
.card .title { font-size: 18px; font-weight: 800; line-height: 1.25; }
.card .line { margin-top: 4px; color: ${COLORS.stone}; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip { padding: 3px 10px; border-radius: 999px; background: ${COLORS.white}; font-size: 12px; font-weight: 600; }
.plan { margin-top: 16px; display: grid; gap: 8px; font-size: 16px; }
.plan .mono { font-size: 17px; }
.grey { margin-top: 12px; color: ${COLORS.stone}; font-size: 12px; }

/* live */
.live { display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.forest}; font-weight: 700; font-size: 13px; }
.live::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: ${COLORS.leaf}; box-shadow: 0 0 0 0 ${COLORS.leaf}; animation: pulse 1.4s infinite; }
@keyframes pulse { 70% { box-shadow: 0 0 0 8px rgba(108,194,74,0); } 100% { box-shadow: 0 0 0 0 rgba(108,194,74,0); } }
.price { font-family: ${FONTS.mono}; font-weight: 700; font-size: 48px; color: ${COLORS.forest}; margin-top: 8px; letter-spacing: -0.02em; }
.price.drop { animation: drop 360ms ease-out; }
@keyframes drop { 0% { transform: translateY(-6px); opacity: 0.4; } 100% { transform: none; opacity: 1; } }
.meta { display: flex; justify-content: space-between; margin-top: 6px; color: ${COLORS.stone}; }
.big { font-size: 28px; font-weight: 800; color: ${COLORS.forest}; }

@media (prefers-reduced-motion: reduce) {
  *, *::before { animation: none !important; transition: none !important; }
}
`;
