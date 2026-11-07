// La mesa de Cucharas, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { CARD_STYLES } from "../../../modules/cards/ui.js";
import { renderTable, wire } from "./table.js";

const STYLES = [CARD_STYLES, ...["../styles/table.css"].map((x) => new URL(x, import.meta.url).href)];

let ui = null;

export function mount(el, ctx) {
  loadStyles("cucharas", STYLES);
  ui = { el, ctx, sel: null };
  wire(ui);
  renderTable(el, ctx, ui);
}

export function update(ctx) { if (ui) { ui.ctx = ctx; renderTable(ui.el, ctx, ui); } }

export function unmount() {
  if (ui && ui.el) { ui.unwire?.(); ui.el.innerHTML = ""; }
  ui = null;
  unloadStyles("cucharas");
}
