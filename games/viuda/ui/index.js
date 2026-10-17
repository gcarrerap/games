// La mesa de La Viuda, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { CARD_STYLES } from "../../../modules/cards/ui.js";
import { renderTable, paintClock } from "./table.js";

const STYLES = [CARD_STYLES, ...["../styles/table.css"].map((x) => new URL(x, import.meta.url).href)];

let ui = null;

export function mount(el, ctx) {
  loadStyles("viuda", STYLES);
  ui = { el, seenSeq: -1, give: null, take: null, knockSeen: null };
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("viuda");
}
