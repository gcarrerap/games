// La mesa del dominó, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx: su vista
// (lo que tu asiento puede saber), act(), el consejo y el reloj. Lo que es solo de la pantalla (ficha seleccionada,
// modo Girar, el orden de tu mano, tus notas) vive aquí.
import { renderTable, paintClock } from "./table.js";

import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";

const STYLES = ["../styles/tokens.css", "../styles/table.css"].map((x) => new URL(x, import.meta.url).href);
const ensureStyles = () => loadStyles("domino", STYLES);

// Estado de la pantalla (no del juego)
let ui = null;
const fresh = () => ({ sel: null, rotMode: false, reveal: false, arr: null, spec: { key: null, data: null } });

export function mount(el, ctx) {
  ensureStyles();
  ui = fresh();
  ui.el = el;
  ui.arr = ctx.prefs.getJSON("arr", null);
  ui.notes = ctx.prefs.getJSON("notes", {}) || {};
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

// Después de cada dibujo se pinta el reloj, para que no se vea vacío hasta el siguiente tick
export function update(ctx) { if (ui) { renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("domino");
}
