// La mesa de la Carrera de Chihuahuas, montada por la plataforma (platform/ui/play.js). Solo usa lo que recibe en ctx.
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { createMusic, armOnGesture, MUSIC_STYLES } from "../../../modules/music/ui.js";
import { createSfx, armOnGesture as armSfx, SFX_STYLES } from "../../../modules/sfx/ui.js";
import { renderTable, paintClock } from "./table.js";
import { stopFx } from "./fx.js";
import { stopCover } from "./cover.js";
import { playPress } from "./sound.js";
import { SONGS } from "../music/index.js";
import { CLIPS, gapFor } from "../sfx/index.js";

const STYLES = ["../styles/table.css"].map((x) => new URL(x, import.meta.url).href).concat(MUSIC_STYLES, SFX_STYLES);

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

// Los efectos sí suenan en el teléfono (el clic, el error, "te toca"). Lo de la partida, con tele, solo en la tele:
// syncSounds decide según ctx.display para que en el cuarto no se oiga dos veces.
function syncSfx(ctx) {
  if (ui.sfx) return;
  ui.sfx = createSfx({ clips: CLIPS, prefs: ctx.prefs, gapFor });
  ui.unarmSfx = armSfx(document, ui.sfx);
  const s = ui.sfx;
  s.unlock().then((ok) => { if (ok && ui && ui.sfx === s && ui.unarmSfx) { ui.unarmSfx(); ui.unarmSfx = null; } });
}
function stopSfx() {
  if (ui.unarmSfx) ui.unarmSfx();
  if (ui.sfx) ui.sfx.destroy();
  ui.sfx = null; ui.unarmSfx = null;
}

// El clic de un botón. La jugada (tazón, boleto, tapete, secreta, el consejo que se juega) no lleva clic en la mesa
// sin tele: esa ya suena sola. En el teléfono de una mesa con tele, el clic es lo que se oye aquí.
function onPress(e) {
  if (!ui || !ui.sfx) return;
  const t = e.target && e.target.closest && e.target.closest("button, .cell.can");
  if (!t || t.disabled) return;
  if (t.closest("[data-music], [data-sfx]")) return;
  const inGame = (ui.el && ui.el.contains(t)) || (ui.modal && ui.modal.contains(t));
  if (!inGame) return;
  playPress(ui, { action: t.matches("#roll, [data-ticket], [data-pick], .cell.can, [data-final], #advdo") });
}
function onCellKey(e) {
  if (!ui || (e.key !== "Enter" && e.key !== " ")) return;
  const t = e.target && e.target.closest && e.target.closest(".cell.can");
  if (!t || !ui.el || !ui.el.contains(t)) return;
  playPress(ui, { action: true });
}

export function mount(el, ctx) {
  loadStyles("chihuahuas", STYLES);
  ui = { el, seenSeq: -1, mode: null, kind: "hueso", music: null, unarm: null, sfx: null, unarmSfx: null, soundSnap: null };
  syncMusic(ctx);
  syncSfx(ctx);
  document.addEventListener("click", onPress, true);
  document.addEventListener("keydown", onCellKey, true);
  renderTable(el, ctx, ui);
  paintClock(ctx.clock);
}

export function update(ctx) { if (ui) { syncMusic(ctx); syncSfx(ctx); renderTable(ui.el, ctx, ui); paintClock(ctx.clock); } }

export function tick(ctx, clock) { if (ui) paintClock(clock); }

export function unmount() {
  document.removeEventListener("click", onPress, true);
  document.removeEventListener("keydown", onCellKey, true);
  if (ui) { stopMusic(); stopSfx(); stopFx(ui); stopCover(ui); clearTimeout(ui.holdTimer); (ui.scrollTimers || []).forEach(clearTimeout); }
  if (ui && ui.el) ui.el.innerHTML = "";
  ui = null;
  unloadStyles("chihuahuas");
}
