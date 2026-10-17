// Mesa en línea antes de empezar (basado en la pantalla de asientos de myDomino): quién está sentado, sentarte,
// agregar a la compu y escoger su bot, quitarla, levantarte, compartir el enlace y empezar. Genérico: los modos y
// los perfiles de la compu salen del juego.
import { $, esc } from "./dom.js";
import { optionLabels } from "../core/contract.js";

// Equipos: los dice el juego (game.teamOf); si no, no hay equipos
const TEAM_COLORS = ["var(--ta)", "var(--tb)", "var(--tc)", "var(--td)"];
const teamOf = (game, t, i) => (game.teamOf ? game.teamOf(t.config, i) : null);
const teamDot = (game, t, i) => { const k = teamOf(game, t, i); return k === null || k === undefined ? "" : `<span class="teamdot" style="background:${TEAM_COLORS[k % TEAM_COLORS.length]}"></span>`; };
// "Los asientos 1 y 3 contra 2 y 4" / "1 y 4, 2 y 5, 3 y 6"
function teamsHint(game, t) {
  const groups = new Map();
  t.seats.forEach((_, i) => { const k = teamOf(game, t, i); if (k !== null && k !== undefined) { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i + 1); } });
  if (!groups.size) return "";
  const names = [...groups.values()].map((g) => g.length > 1 ? g.slice(0, -1).join(", ") + " y " + g[g.length - 1] : String(g[0]));
  return `Equipos: asientos ${names.join(" contra ")}.`;
}

export function renderSeats(app, { state, actions }) {
  const t = state.table, game = state.game, me = actions.mySeat();
  const mode = game.modes.find((m) => m.id === t.mode);
  const profiles = game.bots ? game.bots.profiles : [];
  const full = t.seats.every(Boolean), missing = t.seats.filter((x) => !x).length;
  const select = (i, value) => `<select class="botsel" data-botsel="${i}" aria-label="Bot del asiento ${i + 1}">${profiles.map((p) => `<option value="${esc(p.id)}"${p.id === value ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`;
  const defBot = profiles.length ? profiles[Math.min(1, profiles.length - 1)].id : null;

  const row = (x, i) => {
    let body = "", actionsHtml = "";
    if (!x) {
      body = `<strong class="free">Libre</strong>`;
      actionsHtml = `<button class="primary" data-sit="${i}">Sentarme aquí</button>`
        + (me >= 0 && profiles.length ? `<div class="addbot">${select(i, defBot)}<button data-addbot="${i}">Agregar compu</button></div>` : "");
    } else if (x.bot) {
      body = `<strong>${esc(x.name)}</strong> <span class="badge">compu</span>`;
      actionsHtml = me >= 0 ? `<div class="addbot">${select(i, x.profile)}<button class="ghost" data-unbot="${i}">Quitar</button></div>` : "";
    } else {
      body = `<strong>${esc(x.name)}${x.id === state.me.id ? " (tú)" : ""}</strong>`;
      actionsHtml = x.id === state.me.id ? `<button class="ghost" data-stand="1">Levantarme</button>` : "";
    }
    return `<li class="seatrow ${x && x.id === state.me.id ? "mine" : ""}"><div class="seatinfo"><span class="lbl">${teamDot(game, t, i)}Asiento ${i + 1}</span>${body}</div>${actionsHtml}</li>`;
  };

  const link = `${location.origin}${location.pathname}#/${game.id}/${t.code}`;
  app.className = "shell";
  app.innerHTML = `
    <header class="shell-head"><button class="ghost" id="back">← Mesas</button>
      <div><h1>Mesa ${esc(t.code)}</h1><small>${esc(game.name)} · ${esc((mode && (mode.label || mode.id)) || "")}${t.config.timer === false ? " · sin límite de tiempo" : ""}${optionLabels(game, t.config).map((x) => " · " + esc(x)).join("")}</small></div></header>
    ${state.me.name ? "" : `<section class="panel"><label class="field-label" for="nm">Tu nombre en la mesa</label><input type="text" id="nm" maxlength="16" placeholder="Ej. Barbara" autocomplete="nickname"></section>`}
    <ul class="seatlist">${t.seats.map(row).join("")}</ul>
    ${teamsHint(game, t) ? `<p class="hint center">${esc(teamsHint(game, t))}</p>` : ""}
    <section class="panel">
      <p class="hint">${full ? "Todos sentados. Cualquiera que esté sentado puede empezar." : `Falta${missing === 1 ? "" : "n"} ${missing}.`}${t.seats.some((x) => x && x.bot) ? " A la compu la mueve el teléfono de quien está en el asiento más bajo." : ""}</p>
      <div class="row"><button id="share" class="ghost">Compartir enlace</button><span class="hint" id="shared"></span></div>
      <p class="err" role="alert">${esc(state.err)}</p>
      <button class="primary big-cta" id="start" ${full && me >= 0 ? "" : "disabled"}>Empezar</button>
    </section>`;

  $("#back").onclick = () => { location.hash = `#/${game.id}`; };
  $("#nm")?.addEventListener("input", (e) => actions.setName(e.target.value));
  app.querySelectorAll("[data-sit]").forEach((b) => b.onclick = () => actions.sitAt(+b.dataset.sit));
  app.querySelectorAll("[data-stand]").forEach((b) => b.onclick = () => actions.standUp());
  app.querySelectorAll("[data-addbot]").forEach((b) => b.onclick = () => {
    const i = +b.dataset.addbot; actions.addBotAt(i, app.querySelector(`[data-botsel="${i}"]`).value);
  });
  app.querySelectorAll("[data-unbot]").forEach((b) => b.onclick = () => actions.removeBotAt(+b.dataset.unbot));
  app.querySelectorAll("[data-botsel]").forEach((sel) => {
    const i = +sel.dataset.botsel;
    if (t.seats[i] && t.seats[i].bot) sel.onchange = () => actions.setSeatBot(i, sel.value);
  });
  $("#start").onclick = () => actions.startGame();
  $("#share").onclick = async () => {
    const done = (msg) => { const e = $("#shared"); if (e) e.textContent = msg; };
    try {
      if (navigator.share) { await navigator.share({ title: `${game.name} · mesa ${t.code}`, url: link }); return; }
      await navigator.clipboard.writeText(link); done("Enlace copiado");
    } catch { done(link); }
  };
}
