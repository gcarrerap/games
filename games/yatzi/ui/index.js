// La mesa de Yatzi, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { SFX_STYLES } from "../../../modules/sfx/ui.js";
import { buildSkeleton, render, paintClock, onKey, initShake } from "./table.js";
import { createSound } from "./sound.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href).concat(SFX_STYLES);

let ui = null;

export function mount(el, ctx) {
  loadStyles("yatzi", STYLES);
  ui = {
    el, ctx, seenSeq: -1, prev: null, held: [false, false, false, false, false], pick: null, fresh: null,
    announced: { key: "", said: new Set() }, resultAt: 0, record: Number(ctx.prefs.get("record")) || 0, quiet: false,
  };
  ui.sound = createSound(ctx.prefs);
  buildSkeleton(el, ui);
  initShake(ui);
  ui.key = (e) => ui && onKey(e, ui);
  document.addEventListener("keydown", ui.key);
  render(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) {
  if (!ui) return;
  render(ui.el, ctx, ui);
  paintClock(ctx.clock);
}

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (!ui) return;
  ui.tray.stopAll();
  if (ui.listener) ui.listener.stop();
  if (ui.askShake) ui.el.removeEventListener("click", ui.askShake, true);
  document.removeEventListener("keydown", ui.key);
  if (ui.ro) ui.ro.disconnect();
  if (ui.onResize) removeEventListener("resize", ui.onResize);
  ui.confetti.destroy();
  ui.sound.destroy();
  document.querySelectorAll(".yz-float").forEach((f) => f.remove());
  if (ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("yatzi");
}
