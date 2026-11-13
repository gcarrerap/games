// La mesa del timbiriche: los dos jugadores con sus cajas, el tablero y tus botones. Dibuja con ctx.view y juega con
// ctx.act(). Lo propio de esta pantalla vive en `ui`: la raya escogida (`sel`) y la última jugada que ya se animó
// (`seenSeq`).
import { nameOf } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { boardSVG } from "./board.js";
import { rulesHelp } from "./rules.js";

const initial = (name) => (String(name || "?").trim()[0] || "?").toUpperCase();
// En el mismo aparato (varias personas en la práctica) no hay "tú": el aparato pasa de mano en mano
const isHotseat = (ctx) => !!ctx.practice && ctx.table.seats.filter((x) => x && !x.bot).length > 1;
const youTag = (s, seat, st, hot) => (s === seat && !hot && !(st && nameOf(st, s) === "Tú") ? " <small>(tú)</small>" : "");
// La letra que sale en cada caja; si dos se repiten (todos son "Jugador n"), el número de asiento
const initialsOf = (names) => {
  const l = names.map(initial);
  return l.some((x, i) => l.indexOf(x) !== i) ? names.map((_, i) => String(i + 1)) : l;
};

function renderRules(ctx, st) {
  renderSheet(ctx.modal, "rules", "Reglas del timbiriche", `${rulesHelp(st.config)}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderMenu(ctx, st) {
  const c = st.config;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">${st.scores.length} jugadores · ${c.size} × ${c.size} cajas · ${c.timer ? `${c.secs} s por raya` : "sin límite de tiempo"} · ${c.penalty ? "con castigo" : "sin castigo"}</p>
    <details class="help"><summary>Reglas</summary>${rulesHelp(c)}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderResult(ctx, st, seat) {
  closeOverlay();
  const hot = isHotseat(ctx);
  const top = st.winners.map((w) => nameOf(st, w)).join(" y ");
  const title = st.draw ? (st.winners.length === st.scores.length ? "¡Empate!" : `¡Empate entre ${top}!`)
    : !hot && st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`;
  const order = st.scores.map((_, i) => i).sort((a, b) => st.scores[b] - st.scores[a] || a - b);
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    <div class="res">${order.map((s) => `<div class="resrow ${st.winners.includes(s) ? "win" : ""}">
      <span><i class="dot c${s}"></i>${esc(nameOf(st, s))}${youTag(s, seat, st, hot)}${st.penalties[s] ? ` <small class="pen">· ${st.penalties[s]} ${st.penalties[s] === 1 ? "castigo" : "castigos"}</small>` : ""}</span>
      <b>${st.scores[s]}</b></div>`).join("")}</div>
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

function playerHTML(st, s, seat, playing, hot) {
  return `<div class="prow c${s} ${playing && st.turn === s ? "turn" : ""} ${s === seat && !hot ? "mine" : ""}">
    <i class="dot" aria-hidden="true"></i>
    <span class="pname">${esc(nameOf(st, s))}${youTag(s, seat, st, hot)}</span>
    ${st.skip[s] ? `<span class="skip" title="Dejó pasar una caja">pierde turno</span>` : ""}
    <span class="pscore" aria-label="${st.scores[s]} cajas"><b>${st.scores[s]}</b></span>
  </div>`;
}

// Lo que pasó en la última raya, si vale la pena decirlo
function newsOf(st) {
  const l = st.last;
  if (!l) return "";
  const lost = (l.skipped || []).map((x) => nameOf(st, x)).join(" y ");
  if (lost && l.penalized) return `${nameOf(st, l.seat)} dejó pasar una caja y ${lost} pierde este turno por su castigo`;
  if (lost) return `${lost} pierde este turno por el castigo: tira ${nameOf(st, st.turn)}`;
  if (l.penalized) return `${nameOf(st, l.seat)} dejó pasar una caja: pierde su siguiente turno`;
  return "";
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  app.className = "game timbiriche";
  const playing = st.phase !== "over";
  const myTurn = playing && seat >= 0 && st.turn === seat;
  if (!myTurn || (ui.sel && st.lines[ui.sel] !== undefined)) ui.sel = null;
  const fresh = st.seq !== ui.seenSeq;
  ui.seenSeq = st.seq;
  const clockOn = playing && st.config.timer !== false;
  const adv = ctx.advice && ctx.advice.data;
  const advice = myTurn && adv && adv.action ? adv : null;
  const initials = initialsOf(st.names);
  const hot = isHotseat(ctx);
  const news = playing ? newsOf(st) : "";
  const turnName = nameOf(st, st.turn);

  let statusTxt;
  const again = !!(st.last && st.last.seat === st.turn && st.last.closed.length);
  const handOver = hot && myTurn && !!st.last && st.last.seat !== st.turn; // le toca a otra persona: se pasa el aparato
  if (!playing) statusTxt = st.draw ? `Empate entre ${st.winners.map((w) => nameOf(st, w)).join(", ")}` : `Ganó ${nameOf(st, st.winner)}`;
  else if (!myTurn) statusTxt = `Turno de ${turnName}`;
  else if (ui.sel) statusTxt = "Toca otra vez para trazarla";
  else if (hot) statusTxt = again ? `¡Caja! ${turnName} vuelve a tirar` : handOver ? `Pásale el aparato a ${turnName}` : `Turno de ${turnName}`;
  else if (again) statusTxt = "¡Caja! Vuelve a tirar";
  else statusTxt = "Te toca: escoge una raya";

  const advBox = advice ? `<div class="advbox" role="status"><span>Consejo: ${esc(advice.why || "")}</span>
      <button id="advdo" class="primary">Hacerlo</button><button id="advclose" class="ghost" aria-label="Cerrar consejo">✕</button></div>`
    : myTurn && ctx.advice && !ctx.advice.data ? `<div class="advbox"><span>Pensando…</span></div>` : "";

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Timbiriche</div>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <section class="players n${st.scores.length}">${st.scores.map((_, i) => playerHTML(st, i, seat, playing, hot)).join("")}</section>
    <section class="paperwrap">
      <div class="status ${myTurn ? "me" : ""}"><i class="dot c${playing ? st.turn : st.winner ?? 0}" aria-hidden="true"></i>${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${news ? `<div class="news" role="status">${esc(news)}</div>` : ""}
      <div class="boardwrap" id="board">${boardSVG(st, { me: seat, sel: ui.sel, advice: advice && advice.action.line, playable: myTurn, initials, fresh })}</div>
      ${advBox}
    </section>
    <section class="me">
      ${myTurn ? `<div class="actions">
        <button id="draw" class="primary big" ${ui.sel ? "" : "disabled"}>Trazar</button>
        <button id="advice" class="ghost">Consejo</button>
      </div>` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  const draw = (line) => { ui.sel = null; ctx.closeAdvice?.(); ctx.act({ type: "line", line }); };
  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  $("#draw", app)?.addEventListener("click", () => { if (ui.sel) draw(ui.sel); });
  $("#advice", app)?.addEventListener("click", () => ctx.askAdvice());
  $("#advclose", app)?.addEventListener("click", () => ctx.closeAdvice());
  $("#advdo", app)?.addEventListener("click", () => draw(advice.action.line));
  $("#board", app).onclick = (e) => {
    if (!myTurn) return;
    const hit = e.target.closest("[data-line]");
    if (!hit) return;
    const line = hit.dataset.line;
    if (ui.sel === line) { draw(line); return; }
    ui.sel = line;
    renderTable(app, ctx, ui);
  };

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st);
  else if (ov && ov.id === "rules") renderRules(ctx, st);
  else if (!playing) renderResult(ctx, st, seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  const low = c.secs <= Math.min(5, Math.ceil(c.limitMs / 4000));
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", low); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", low); }
}
