// Dibuja la pantalla que toca: portal, lobby de un juego o la mesa. Se llama cada vez que cambia el estado.
import { renderPortal } from "./portal.js";
import { renderLobby } from "./lobby.js";
import { renderPlay, unmountPlay } from "./play.js";
import { renderUpdateBar } from "./update-bar.js";
import { syncOverlayHistory } from "./sheet.js";
import { $ } from "./dom.js";

export function render(app$) {
  const app = $("#app"), modal = $("#modal"), { state } = app$;
  if (state.screen !== "table") { unmountPlay(); modal.innerHTML = ""; }
  if (state.screen === "portal") renderPortal(app, app$);
  else if (state.screen === "lobby") renderLobby(app, app$);
  else renderPlay(app, modal, app$);
  renderUpdateBar(state);
  syncOverlayHistory();
}
