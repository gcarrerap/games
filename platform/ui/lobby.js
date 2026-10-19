// Lobby de un juego: tu nombre y cuenta, el modo, practicar contra la compu, crear una mesa en línea y las mesas
// abiertas. Genérico: las opciones salen del manifiesto (modos), de si el juego tiene reloj (timing) y de sus
// perfiles de la compu (bots.profiles).
import { BOT_NAMES } from "../app/session.js";
import { $, esc } from "./dom.js";
import { optionLabels } from "../core/contract.js";

function account(state, actions) {
  if (state.online === "connecting") return `<p class="hint">Conectando con las mesas en línea…</p>`;
  if (state.online === "off") return `<p class="hint">Sin conexión con las mesas en línea: por ahora solo puedes practicar.</p>`;
  if (actions.isGoogle()) return `<div class="row"><p class="hint" style="flex:1">Con Google: <b>${esc(state.user.email || state.user.displayName || "")}</b></p><button class="ghost" id="gout">Salir</button></div>`;
  return `<div class="row"><button id="gin">Entrar con Google</button><p class="hint" style="flex:1">o sigue como invitado. Con Google eres el mismo jugador en cualquier teléfono.</p></div>`;
}

function tableRow(t, state, game) {
  const mode = game.modes.find((m) => m.id === t.mode);
  const filled = t.seats.filter(Boolean).length, mine = t.seats.some((x) => x && !x.bot && x.id === state.me.id);
  const status = t.status === "lobby" ? `${filled}/${t.seats.length} sentados` : t.status === "over" ? "Partida terminada" : `Jugando · partida ${t.round}`;
  const who = t.seats.filter(Boolean).map((x) => esc(x.name) + (x.bot ? " (compu)" : "")).join(", ") || "Sin jugadores";
  const opts = optionLabels(game, t.config).map((x) => " · " + esc(x)).join("");
  return `<li class="trow"><span class="code">${esc(t.code)}</span>
    <span class="meta">${esc((mode && (mode.label || mode.id)) || "")}${opts} · ${status}<br>${who}</span>
    <button data-tv="${esc(t.code)}" class="ghost" aria-label="Abrir la mesa ${esc(t.code)} en Monitor (la tele, o para mirar)">📺 Monitor</button>
    <button data-open="${esc(t.code)}" class="${mine ? "primary" : "ghost"}">${mine ? "Volver" : "Entrar"}</button></li>`;
}

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
  const online = state.online === "on";
  app.innerHTML = `
    <header class="shell-head">${back}<div><h1>${esc(game.name)}</h1><small>Solo contra la compu o con la familia</small></div></header>
    <section class="panel">
      <label class="field-label" for="nm">Tu nombre en la mesa</label>
      <input type="text" id="nm" maxlength="16" placeholder="Ej. Barbara" value="${esc(state.me.name)}" autocomplete="nickname">
      ${account(state, actions)}
    </section>
    <section class="panel">
      <span class="field-label">Modo</span>
      <div class="seg col" role="group" aria-label="Modo">${game.modes.map((m) => `<button data-mode="${esc(m.id)}" aria-pressed="${m.id === cfg.mode}">${esc(m.label || m.id)}</button>`).join("")}</div>
      ${game.timing ? `<span class="field-label">Tiempo por turno</span>
      <div class="seg" role="group" aria-label="Tiempo por turno"><button data-timer="1" aria-pressed="${cfg.timer}">Con reloj</button><button data-timer="0" aria-pressed="${!cfg.timer}">Sin límite</button></div>` : ""}
      ${(game.options || []).map((o) => `<span class="field-label">${esc(o.label)}</span>
      <div class="seg col" role="group" aria-label="${esc(o.label)}">${o.choices.map((c) => `<button data-opt="${esc(o.id)}" data-val="${esc(c.id)}" aria-pressed="${cfg.options[o.id] === c.id}">${esc(c.label)}</button>`).join("")}</div>
      ${(() => { const c = o.choices.find((x) => x.id === cfg.options[o.id]); return c && c.hint ? `<p class="hint">${esc(c.hint)}</p>` : ""; })()}`).join("")}
      <p class="err" role="alert">${esc(state.err)}</p>
      <button class="primary big-cta" id="create" ${online ? "" : "disabled"}>Crear mesa en línea</button>
      <p class="hint">Los asientos libres se pueden llenar con la compu.</p>
    </section>
    <section class="panel">
      <h2>Practicar contra la compu</h2>
      ${profiles.length && nBots > 0 ? `<div class="cpu">${Array.from({ length: nBots }, (_, i) => `<div class="cpurow bot"><span class="cpuname">${esc(BOT_NAMES[i % BOT_NAMES.length])}</span>${botSelect(i)}</div>`).join("")}</div>` : ""}
      <button class="big-cta" id="practice">Empezar práctica</button>
    </section>
    <section class="panel">
      <h2>Mesas abiertas${state.tables.length ? ` · ${state.tables.length}` : ""}</h2>
      ${!online ? `<p class="hint">${state.online === "connecting" ? "Buscando mesas…" : "Sin conexión."}</p>`
        : state.tables.length ? `<ul class="tables">${state.tables.map((t) => tableRow(t, state, game)).join("")}</ul>`
          : `<p class="hint">Todavía no hay mesas. Crea una y comparte el enlace con tu familia.</p>`}
    </section>`;
  $("#back").onclick = () => { location.hash = "#/"; };
  $("#nm").oninput = (e) => actions.setName(e.target.value);
  $("#gin")?.addEventListener("click", () => actions.googleIn());
  $("#gout")?.addEventListener("click", () => actions.googleOut());
  app.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => actions.savePractice({ mode: b.dataset.mode }));
  app.querySelectorAll("[data-opt]").forEach((b) => b.onclick = () => actions.savePractice({ options: { ...actions.practiceSettings().options, [b.dataset.opt]: b.dataset.val } }));
  app.querySelectorAll("[data-tv]").forEach((b) => b.onclick = () => { location.hash = `#/${game.id}/${b.dataset.tv}/tele`; });
  app.querySelectorAll("[data-timer]").forEach((b) => b.onclick = () => actions.savePractice({ timer: b.dataset.timer === "1" }));
  app.querySelectorAll("select[data-bot]").forEach((sel) => sel.onchange = () => {
    const bots = actions.practiceSettings().bots; bots[+sel.dataset.bot] = sel.value; actions.savePractice({ bots });
  });
  $("#practice").onclick = () => { location.hash = `#/${game.id}/practica`; actions.startPractice(); };
  $("#create").onclick = async () => { const code = await actions.createTable(); if (code) location.hash = `#/${game.id}/${code}`; };
  app.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => { location.hash = `#/${game.id}/${b.dataset.open}`; });
}
