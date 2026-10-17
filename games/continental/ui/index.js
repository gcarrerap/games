// La mesa del Continental, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { CARD_STYLES } from "../../../modules/cards/ui.js";
import { renderTable, paintClock } from "./table.js";

const STYLES = [CARD_STYLES, ...["../styles/tokens.css", "../styles/table.css"].map((x) => new URL(x, import.meta.url).href)];

let ui = null;

export function mount(el, ctx) {
  loadStyles("continental", STYLES);
  // sel: cartas escogidas; stage: la bajada que vas armando (por ronda); sortBy: orden de la mano
  ui = { el, sel: [], stage: { round: null, groups: [] }, sortBy: ctx.prefs.get("sort") === "suit" ? "suit" : "rank", reveal: false, err: "" };
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("continental");
}
