// Dibuja la pantalla que toca: portal, lobby de un juego o la mesa. Se llama cada vez que cambia el estado.
import { renderPortal } from "./portal.js";
import { renderLobby } from "./lobby.js";
import { renderPlay, unmountPlay } from "./play.js";
import { renderSeats } from "./seats.js";
import { renderTvSeats, keepAwake, markTv } from "./tv.js";
import { renderModeBar } from "./modes.js";
import { renderUpdateBar } from "./update-bar.js";
import { renderCall } from "../../modules/call/ui.js";
import { syncOverlayHistory } from "./sheet.js";
import { $, esc } from "./dom.js";

// Si estás escribiendo en un campo y la pantalla se redibuja (llegó una mesa nueva a la lista, alguien se sentó…),
// el campo nuevo recupera el foco y el cursor. Si no, el teclado del teléfono se cerraría a media palabra.
function keepTyping(draw) {
  const el = document.activeElement;
  const typing = el && el.id && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.closest("#app, #modal");
  const at = typing ? { id: el.id, start: el.selectionStart, end: el.selectionEnd } : null;
  draw();
  if (!at) return;
  const again = document.getElementById(at.id);
  if (!again || again === document.activeElement) return;
  again.focus({ preventScroll: true });
  try { again.setSelectionRange(at.start, at.end); } catch {}
}

export function render(app$) { keepTyping(() => draw(app$)); }

function draw(app$) {
  const app = $("#app"), modal = $("#modal"), { state } = app$;
  if (state.screen !== "table") { unmountPlay(); modal.innerHTML = ""; }
  if (state.screen === "portal") renderPortal(app, app$);
  else if (state.screen === "lobby") renderLobby(app, app$);
  else if (!state.table) { unmountPlay(); modal.innerHTML = ""; app.className = "shell"; app.innerHTML = `<header class="shell-head"><button class="ghost" id="back">← Mesas</button></header><p class="hint">${state.err ? "" : "Cargando la mesa…"}</p><p class="err" role="alert">${esc(state.err)}</p>`; $("#back").onclick = () => { location.hash = `#/${state.gameId}`; }; }
  // Mientras se sientan, el Monitor que se pidió (la tele) ve la espera; quien entra sin asiento ve los asientos para sentarse
  else if (state.table.status === "lobby") { unmountPlay(); modal.innerHTML = ""; (state.want === "monitor" ? renderTvSeats : renderSeats)(app, app$); }
  else renderPlay(app, modal, app$);
  // Monitor: todo más grande y la pantalla siempre encendida
  const monitor = state.screen === "table" && !!state.table && (state.want === "monitor" || state.table.status !== "lobby") && app$.actions.mode() === "monitor";
  markTv(monitor); keepAwake(monitor);
  // Sentado en Monitor y le toca: el aviso para cambiar de modo
  renderModeBar(app$);
  renderUpdateBar(state);
  // La llamada de voz y video: en cualquier mesa en línea abierta (vive fuera de #app; se actualiza en su lugar)
  // (un Monitor sin asiento no entra: es la tele o alguien que solo mira)
  renderCall(app$.actions.call, state.screen === "table" && !state.practice && !!state.table && state.online === "on" && app$.actions.seatedAt() >= 0);
  syncOverlayHistory();
}
