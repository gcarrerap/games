// La mesa de Panal, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { renderTable, paintClock } from "./table.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href);

let ui = null;

export function mount(el, ctx) {
  loadStyles("panal", STYLES);
  ui = { el, sel: null, seenSeq: -1, movable: new Set() };
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("panal");
}
