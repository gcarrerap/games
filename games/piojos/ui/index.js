// La mesa de Piojos, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { SFX_STYLES } from "../../../modules/sfx/ui.js";
import { DICE_STYLES } from "../../../modules/dice/ui.js";
import { buildSkeleton, render, paintClock, onKey, initShake } from "./table.js";
import { createSound } from "./sound.js";

// Primero los del módulo, para que los del juego (marco, colores) ganen
const STYLES = [DICE_STYLES, SFX_STYLES].concat(["../styles/table.css"].map((x) => new URL(x, import.meta.url).href));

let ui = null;

export function mount(el, ctx) {
  loadStyles("piojos", STYLES);
  ui = { el, ctx, seenSeq: -1, prev: null, fresh: null, anim: false, resultAt: 0, quiet: false, potShown: 0, idleValues: [1, 2, 3, 4, 6] };
  ui.sound = createSound(ctx.prefs);
  buildSkeleton(el, ui);
  initShake(ui);
  ui.key = (e) => ui && onKey(e, ui);
  document.addEventListener("keydown", ui.key);
  render(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { render(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (!ui) return;
  ui.tray.stopAll();
  ui.shake.destroy();
  document.removeEventListener("keydown", ui.key);
  if (ui.ro) ui.ro.disconnect();
  if (ui.onResize) removeEventListener("resize", ui.onResize);
  ui.confetti.destroy();
  ui.sound.destroy();
  document.querySelectorAll(".pj-float").forEach((f) => f.remove());
  if (ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("piojos");
}
