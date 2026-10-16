// Dibuja la pantalla que toca: portal, lobby de un juego o la mesa. Se llama cada vez que cambia el estado.
import { renderPortal } from "./portal.js";
import { renderLobby } from "./lobby.js";
import { renderPlay, unmountPlay } from "./play.js";
import { renderSeats } from "./seats.js";
import { renderUpdateBar } from "./update-bar.js";
import { renderCall } from "../../modules/call/ui.js";
import { syncOverlayHistory } from "./sheet.js";
import { $, esc } from "./dom.js";

export function render(app$) {
  const app = $("#app"), modal = $("#modal"), { state } = app$;
  if (state.screen !== "table") { unmountPlay(); modal.innerHTML = ""; }
  if (state.screen === "portal") renderPortal(app, app$);
  else if (state.screen === "lobby") renderLobby(app, app$);
  else if (!state.table) { unmountPlay(); modal.innerHTML = ""; app.className = "shell"; app.innerHTML = `<header class="shell-head"><button class="ghost" id="back">← Mesas</button></header><p class="hint">${state.err ? "" : "Cargando la mesa…"}</p><p class="err" role="alert">${esc(state.err)}</p>`; $("#back").onclick = () => { location.hash = `#/${state.gameId}`; }; }
  else if (state.table.status === "lobby") { unmountPlay(); modal.innerHTML = ""; renderSeats(app, app$); }
  else renderPlay(app, modal, app$);
  renderUpdateBar(state);
  // La llamada de voz y video: en cualquier mesa en línea abierta (vive fuera de #app; se actualiza en su lugar)
  renderCall(app$.actions.call, state.screen === "table" && !state.practice && !!state.table && state.online === "on");
  syncOverlayHistory();
}
