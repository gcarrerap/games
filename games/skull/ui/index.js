// La mesa de Skull, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { renderTable, paintClock } from "./table.js";

const STYLES = ["../styles/table.css", "../styles/tutorial.css"].map((x) => new URL(x, import.meta.url).href);

let ui = null;

export function mount(el, ctx) {
  loadStyles("skull", STYLES);
  ui = { el, seenSeq: -1, bid: null };
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("skull");
}
