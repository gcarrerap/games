// Arranque del sitio: la sesión, las rutas, el reloj y el aviso de versión nueva.
//   #/                     portal
//   #/<juego>              lobby de ese juego
//   #/<juego>/practica     mesa de práctica
//   #/<juego>/<CÓDIGO>     mesa en línea (el enlace que se comparte)
import { createSession } from "./app/session.js";
import { startUpdateChecks } from "./app/updates.js";
import { botDecide, advise } from "./app/ai.js";
import { prefs, gamePrefs, initFirebase, signInWithGoogle, signOut, makeDb, fetchIceServers } from "./services/index.js";
import { installCallUnload } from "../modules/call/ui.js";
import { VERSION } from "./version.js";
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
  botDecide, advise, prefs, gamePrefs, version: VERSION,
  auth: {
    connect: async (onUser) => makeDb(await initFirebase((u) => onUser(u))),
    signIn: signInWithGoogle,
    signOut,
  },
  // Llamadas de voz y video (WebRTC): el entorno del navegador
  callEnv: {
    get RTCPeerConnection() { return globalThis.RTCPeerConnection; },
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    iceServers: () => fetchIceServers(),
  },
});
installCallUnload(); // al cerrar la pestaña, salir de la llamada para que los demás no esperen
const connected = session.actions.connect();
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
  if (sub === "practica") { if (!s.table || !s.practice) location.replace(`#/${gameId}`); return; } // al recargar no hay práctica que retomar
  if (sub && /^[A-Z]{4}$/.test(sub.toUpperCase())) {
    const code = sub.toUpperCase();
    if (s.code === code && s.screen === "table") return;
    await connected; // un enlace a una mesa puede abrirse antes de conectar
    if (location.hash.split("/")[2]?.toUpperCase() === code) session.actions.openTable(code);
    return;
  }
  if (s.screen === "table") session.actions.leave();
}
window.addEventListener("hashchange", route);
route();

// Reloj: se pinta varias veces por segundo y resuelve el turno vencido
setInterval(() => { const c = session.actions.tick(); if (c !== null || app$.state.screen === "table") tickPlay(app$, $("#modal"), c); }, 250);

// Al cambiar el tamaño solo se redibuja la mesa (la cadena y la mano se acomodan al ancho). En el lobby no: en el
// teléfono, abrir el teclado cambia el tamaño, y redibujar ahí quitaba el foco del campo y cerraba el teclado.
window.addEventListener("resize", () => { if (app$.state.screen === "table") draw(); });
startUpdateChecks((v) => session.actions.setUpdateAvailable(v));
