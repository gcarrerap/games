// La mesa de Vikingos, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { SFX_STYLES } from "../../../modules/sfx/ui.js";
import { renderTable } from "./table.js";
import { createSound } from "./sound.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href).concat(SFX_STYLES);

let ui = null;

export function mount(el, ctx) {
  loadStyles("vikingos", STYLES);
  ui = { el, sel: -1, msg: "", tab: null, seenSeq: ctx.view.seq, reto: null, sound: createSound(ctx.prefs) }; // lo que ya pasó no se anima
  ui.prev = { reto: ctx.view.reto, boats: ctx.view.boats ? { ...ctx.view.boats } : null }; // ni suena
  renderTable(el, ctx, ui);
}

export function update(ctx) { if (ui) renderTable(ui.el, ctx, ui); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  if (ui) ui.sound.destroy();
  ui = null;
  unloadStyles("vikingos");
}
