// Arranque del sitio: la sesión, las rutas, el reloj y el aviso de versión nueva.
//   #/                     portal
//   #/<juego>              lobby de ese juego
//   #/<juego>/practica     mesa de práctica
import { createSession } from "./app/session.js";
import { startUpdateChecks } from "./app/updates.js";
import { botDecide, advise } from "./app/ai.js";
import { prefs, gamePrefs } from "./services/index.js";
import { findGame } from "../games/registry.js";
import { render } from "./ui/render.js";
import { tickPlay } from "./ui/play.js";
import { installOverlayKeys, setOverlayListener, closeOverlay } from "./ui/sheet.js";
import { $ } from "./ui/dom.js";

const session = createSession({
  now: () => Date.now(),
  schedule: (fn, ms) => setTimeout(fn, ms),
  cancel: (id) => clearTimeout(id),
  random: Math.random,
  loadGame: async (id) => { const g = findGame(id); if (!g) throw new Error("Juego desconocido"); return (await g.load()).default; },
  botDecide, advise, prefs, gamePrefs,
});
const app$ = { state: session.store.state, actions: session.actions, store: session.store };

let frame = 0;
const draw = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(app$); }); };
session.store.subscribe(draw);
setOverlayListener(draw);
installOverlayKeys();

// Rutas
async function route() {
  const [, gameId, sub] = (location.hash || "#/").replace(/^#/, "").split("/");
  const s = app$.state;
  closeOverlay();
  if (!gameId || !findGame(gameId)) { if (s.screen !== "portal") session.actions.goPortal(); else draw(); return; }
  if (s.gameId !== gameId || !s.game) await session.actions.openGame(gameId);
  if (sub === "practica") { if (!s.table) location.replace(`#/${gameId}`); return; } // al recargar no hay práctica que retomar
  if (s.screen === "table") session.actions.leave();
}
window.addEventListener("hashchange", route);
route();

// Reloj: se pinta varias veces por segundo y resuelve el turno vencido
setInterval(() => { const c = session.actions.tick(); if (c !== null || app$.state.screen === "table") tickPlay(app$, $("#modal"), c); }, 250);

window.addEventListener("resize", draw);
startUpdateChecks((v) => session.actions.setUpdateAvailable(v));
