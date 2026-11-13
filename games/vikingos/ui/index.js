// La mesa de Vikingos, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { renderTable } from "./table.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href);

let ui = null;

export function mount(el, ctx) {
  loadStyles("vikingos", STYLES);
  ui = { el, sel: -1, msg: "", tab: null, seenSeq: ctx.view.seq, reto: null }; // lo que ya pasó no se anima
  renderTable(el, ctx, ui);
}

export function update(ctx) { if (ui) renderTable(ui.el, ctx, ui); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("vikingos");
}
