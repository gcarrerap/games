// La mesa de Memoria Veloz, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { renderTable, onTick, wire } from "./table.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href);

let ui = null;

export function mount(el, ctx) {
  loadStyles("memoria", STYLES);
  ui = { el, ctx, seenSeq: -1, seenAt: 0, sig: "" };
  wire(ui);
  renderTable(el, ctx, ui);
}

export function update(ctx) { if (ui) { ui.ctx = ctx; renderTable(ui.el, ctx, ui); } }

export function tick(ctx) { if (ui) { ui.ctx = ctx; onTick(ctx, ui); } }

export function unmount() {
  if (ui && ui.el) { ui.unwire?.(); ui.el.innerHTML = ""; }
  ui = null;
  unloadStyles("memoria");
}
