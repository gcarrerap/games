// La mesa del Láser, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { SFX_STYLES } from "../../../modules/sfx/ui.js";
import { buildSkeleton, render, paintClock, onKey, stopAnim } from "./table.js";
import { createSound } from "./sound.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href).concat(SFX_STYLES);

let ui = null;

export function mount(el, ctx) {
  loadStyles("khet", STYLES);
  ui = { el, ctx, sel: -1, seenSeq: -1, anim: null, doomed: null, flip: false, kb: { cursor: -1, mode: "cursor", rot: 1, show: false }, lastErr: "" };
  ui.sound = createSound(ctx.prefs);
  buildSkeleton(el, ui);
  ui.key = (e) => ui && onKey(e, ui.ctx, ui, ui.sound);
  document.addEventListener("keydown", ui.key);
  render(el, ctx, ui, ui.sound);
  paintClock(ctx.clock, ctx.view);
}

export function update(ctx) {
  if (!ui) return;
  ui.ctx = ctx;
  render(ui.el, ctx, ui, ui.sound);
  paintClock(ctx.clock, ctx.view);
}

export function tick(ctx, clock) { if (ui) paintClock(clock, ctx.view); }

export function unmount() {
  if (!ui) return;
  stopAnim(ui, ui.sound);
  document.removeEventListener("keydown", ui.key);
  if (ui.ro) ui.ro.disconnect();
  if (ui.onResize) removeEventListener("resize", ui.onResize);
  ui.fx && ui.fx.destroy();
  ui.sound.destroy();
  if (ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("khet");
}
