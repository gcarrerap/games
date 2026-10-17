// La mesa de Piojos: el marcador con la meta, los dados del tiro, los piojos apartados, lo que llevas en el turno y
// los botones Tirar / Plantarme. Dibuja con ctx.view y juega con ctx.act(). Lo único propio de esta pantalla es
// `ui.seenSeq`, para animar los dados solo cuando hay un tiro nuevo.
import { RULES, isLouse, bustChance, nameOf } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { dieSVG, blankDieSVG } from "./dice.js";

const pct = (p) => `${Math.round(p * 100)}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function rulesHelp(goal = RULES.goal) {
  const V = RULES.values;
  return `<div class="rules">
    <p><b>Material:</b> ${RULES.dice} dados de póker (9, 10, J, Q, K y As).</p>
    <p><b>Piojos:</b> solo el 9 (${V[9]}), el 10 (${V[10]}) y el As (${V.A}) valen puntos. Sin puntos extra por combinaciones.</p>
    <p><b>Tu turno:</b> tira los ${RULES.dice} dados. Los piojos que salgan se apartan y se suman a lo del turno. Entonces te plantas (lo del turno pasa a tu marcador) o tiras los dados que quedan buscando más.</p>
    <p><b>Sin piojos:</b> si en un tiro no sale ningún piojo, pierdes todo lo del turno y pasa al siguiente.</p>
    <p><b>Cinco piojos:</b> si apartas los ${RULES.dice} dados, vuelves a tirar los ${RULES.dice} sin perder lo que llevas.</p>
    <p><b>Gana</b> quien se planta y llega a ${goal} puntos.</p>
  </div>`;
}

function renderMenu(ctx, st) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Meta: ${st.config.goal} puntos · ${st.config.n} jugadores</p>
    <details class="help" open><summary>Cómo se juega</summary>${rulesHelp(st.config.goal)}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderResult(ctx, st, seat) {
  closeOverlay();
  const order = st.scores.map((v, s) => ({ v, s })).sort((a, b) => b.v - a.v);
  const title = st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    <p class="hint">Llegó a ${st.config.goal} puntos.</p>
    <div class="res">${order.map(({ v, s }) => `<div class="resrow ${s === st.winner ? "win" : ""}"><span>${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " (tú)" : ""}</span><b>${v}</b></div>`).join("")}</div>
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

// Lo que se ve en el paño: el tiro de quien tiene el turno, o lo último que pasó (un turno perdido o plantado)
function feltHTML(st, seat, fresh) {
  const me = (s) => s === seat;
  if (st.phase === "choose" || (st.phase === "over" && st.last)) {
    const roll = st.phase === "choose" ? st.roll : st.last.roll;
    return `<div class="roll ${fresh ? "rolling" : ""}">${roll.map((f) => dieSVG(f, 58, { dim: !isLouse(f) })).join("")}</div>`;
  }
  // Empieza un turno: dados sin tirar, y debajo lo que le pasó al anterior
  const blanks = `<div class="roll idle">${Array.from({ length: st.dice }, () => blankDieSVG(58)).join("")}</div>`;
  const l = st.last;
  if (!l) return blanks;
  const who = me(l.seat) ? "Tú" : esc(nameOf(st, l.seat));
  const msg = l.kind === "bust"
    ? `${who}: sin piojos${l.pts ? `, ${me(l.seat) ? "perdiste" : "perdió"} ${l.pts}` : ""}`
    : `${who}: ${me(l.seat) ? "te plantaste" : "se plantó"} con ${l.pts}`;
  return `${blanks}<div class="lastev ${l.kind}">
      ${l.kind === "bust" ? `<div class="lastroll">${l.roll.map((f) => dieSVG(f, 30, { dim: true })).join("")}</div>` : ""}
      <span>${msg}</span></div>`;
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat, goal = st.config.goal;
  app.className = "game piojos";
  const playing = st.phase !== "over";
  const myTurn = playing && seat >= 0 && st.turn === seat;
  const fresh = st.seq !== ui.seenSeq && st.phase === "choose";
  ui.seenSeq = st.seq;
  const clockOn = playing && st.config.timer !== false;
  const err = ctx.err;

  const board = st.scores.map((v, s) => {
    const turn = playing && st.turn === s;
    const pend = turn && st.turnPts ? st.turnPts : 0;
    const w = Math.min(100, (v / goal) * 100), wp = Math.min(100 - w, (pend / goal) * 100);
    return `<div class="prow ${turn ? "turn" : ""} ${s === seat ? "mine" : ""}">
      <span class="pname">${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " <small>(tú)</small>" : ""}</span>
      <span class="pscore"><b>${v}</b>${pend ? ` <em>+${pend}</em>` : ""}</span>
      <span class="pbar" aria-hidden="true"><i style="width:${w.toFixed(1)}%"></i><i class="pend" style="width:${wp.toFixed(1)}%"></i></span>
    </div>`;
  }).join("");

  let statusTxt = "";
  if (playing) {
    if (myTurn) statusTxt = st.phase === "roll" ? `Te toca: tira ${plural(st.dice, "dado", "dados")}` : st.hot ? "¡Los 5 son piojos! Vuelve a tirar los 5 o plántate" : "¿Te plantas o sigues tirando?";
    else statusTxt = `Turno de ${nameOf(st, st.turn)}`;
  } else statusTxt = `Ganó ${nameOf(st, st.winner)}`;

  const apart = st.phase === "choose" && st.apart.length
    ? `<div class="apart"><span class="lbl">Apartados</span>${st.apart.map((f) => dieSVG(f, 26)).join("")}</div>` : "";
  const turnBox = st.phase === "choose"
    ? `<div class="turnpts" aria-live="polite"><span class="lbl">En este turno</span><b>${st.turnPts}</b></div>` : "";

  const risk = myTurn && st.phase === "choose"
    ? `<p class="risk">Con ${plural(st.dice, "dado", "dados")}: ${pct(bustChance(st.dice))} de quedarte sin piojos y perder ${st.turnPts}.</p>` : "";
  const actions = myTurn ? `<div class="actions">
      ${st.phase === "roll"
        ? `<button id="roll" class="primary big">Tirar ${plural(st.dice, "dado", "dados")}</button>`
        : `<button id="bank" class="primary big">Plantarme +${st.turnPts}</button><button id="roll" class="big">Tirar ${st.dice}</button>`}
    </div>` : "";

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Piojos</div>
      <div class="bar-info">Meta <b>${goal}</b></div>
    </header>
    <section class="board" aria-label="Marcador">${board}</section>
    <section class="felt">
      <div class="status ${myTurn ? "me" : ""}">${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${feltHTML(st, seat, fresh)}
      ${turnBox}
      ${apart}
    </section>
    <section class="me">
      ${risk}
      ${actions}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${err ? `<p class="err" role="alert">${esc(err)}</p>` : ""}
    </section>`;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#roll", app)?.addEventListener("click", () => ctx.act({ type: "roll" }));
  $("#bank", app)?.addEventListener("click", () => ctx.act({ type: "bank" }));

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st);
  else if (st.phase === "over") renderResult(ctx, st, seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
