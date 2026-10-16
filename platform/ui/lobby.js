// Lobby de un juego: practicar contra la compu (las mesas en línea llegan en la fase 5). Genérico: las opciones
// salen del manifiesto (modos), de si el juego tiene reloj (timing) y de sus perfiles de la compu (bots.profiles).
import { BOT_NAMES } from "../app/session.js";
import { $, esc } from "./dom.js";

export function renderLobby(app, { state, actions }) {
  app.className = "shell";
  const game = state.game;
  const back = `<button class="ghost" id="back">← Juegos</button>`;
  if (!game) {
    app.innerHTML = `<header class="shell-head">${back}</header><p class="hint">${state.loading ? "Cargando…" : ""}</p><p class="err" role="alert">${esc(state.err)}</p>`;
    $("#back").onclick = () => { location.hash = "#/"; };
    return;
  }
  const cfg = actions.practiceSettings();
  const mode = game.modes.find((m) => m.id === cfg.mode);
  const nBots = (mode.n ?? game.players.max) - 1;
  const profiles = game.bots ? game.bots.profiles : [];
  const botSelect = (i) => `<select class="botsel" data-bot="${i}" aria-label="Compu ${i + 1}">${profiles.map((p) => `<option value="${esc(p.id)}"${p.id === cfg.bots[i] ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`;
  app.innerHTML = `
    <header class="shell-head">${back}<div><h1>${esc(game.name)}</h1><small>Practicar contra la compu</small></div></header>
    <section class="panel">
      <label class="field-label" for="nm">Tu nombre en la mesa</label>
      <input type="text" id="nm" maxlength="16" placeholder="Ej. Barbara" value="${esc(state.me.name)}" autocomplete="nickname">
      <span class="field-label">Modo</span>
      <div class="seg col" role="group" aria-label="Modo">${game.modes.map((m) => `<button data-mode="${esc(m.id)}" aria-pressed="${m.id === cfg.mode}">${esc(m.label || m.id)}</button>`).join("")}</div>
      ${game.timing ? `<span class="field-label">Tiempo por turno</span>
      <div class="seg" role="group" aria-label="Tiempo por turno"><button data-timer="1" aria-pressed="${cfg.timer}">Con reloj</button><button data-timer="0" aria-pressed="${!cfg.timer}">Sin límite</button></div>` : ""}
      ${profiles.length && nBots > 0 ? `<span class="field-label">La compu</span>
      <div class="cpu">${Array.from({ length: nBots }, (_, i) => `<div class="cpurow bot"><span class="cpuname">${esc(BOT_NAMES[i % BOT_NAMES.length])}</span>${botSelect(i)}</div>`).join("")}</div>` : ""}
      <p class="err" role="alert">${esc(state.err)}</p>
      <button class="primary big-cta" id="practice">Empezar práctica</button>
    </section>
    <p class="hint center">Mesas en línea con la familia: muy pronto.</p>`;
  $("#back").onclick = () => { location.hash = "#/"; };
  $("#nm").oninput = (e) => actions.setName(e.target.value);
  app.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => actions.savePractice({ mode: b.dataset.mode }));
  app.querySelectorAll("[data-timer]").forEach((b) => b.onclick = () => actions.savePractice({ timer: b.dataset.timer === "1" }));
  app.querySelectorAll("select[data-bot]").forEach((sel) => sel.onchange = () => {
    const bots = actions.practiceSettings().bots; bots[+sel.dataset.bot] = sel.value; actions.savePractice({ bots });
  });
  $("#practice").onclick = () => { location.hash = `#/${game.id}/practica`; actions.startPractice(); };
}
