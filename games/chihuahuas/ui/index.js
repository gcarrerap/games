// La mesa de la Carrera de Chihuahuas, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { createMusic, armOnGesture, MUSIC_STYLES } from "../../../modules/music/ui.js";
import { renderTable, paintClock } from "./table.js";
import { stopFx } from "./fx.js";
import { SONGS } from "../music/index.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href).concat(MUSIC_STYLES);

let ui = null;

// La música suena en la tele y en la mesa de siempre; en los teléfonos de una mesa con tele no (sonarían todos a la
// vez). Si cambia lo que es este aparato, se prende o se apaga.
function syncMusic(ctx) {
  const want = ctx.display !== "phone";
  if (want && !ui.music) {
    ui.music = createMusic({ songs: SONGS, prefs: ctx.prefs });
    ui.unarm = armOnGesture(document, ui.music); // arranca con el primer toque dentro de la mesa…
    const m = ui.music; // …o ya, si el navegador deja (la persona ya tocó algo en el sitio para llegar aquí)
    m.start().then((ok) => { if (ok && ui && ui.music === m && ui.unarm) { ui.unarm(); ui.unarm = null; } });
  } else if (!want && ui.music) stopMusic();
}
function stopMusic() {
  if (ui.unarm) ui.unarm();
  if (ui.music) ui.music.destroy();
  ui.music = null; ui.unarm = null;
}

export function mount(el, ctx) {
  loadStyles("chihuahuas", STYLES);
  ui = { el, seenSeq: -1, mode: null, kind: "hueso", music: null, unarm: null };
  syncMusic(ctx);
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { syncMusic(ctx); renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  if (ui) { stopMusic(); stopFx(ui); clearTimeout(ui.holdTimer); (ui.scrollTimers || []).forEach(clearTimeout); }
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("chihuahuas");
}
