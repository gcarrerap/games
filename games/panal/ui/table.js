// La mesa de Panal: los dos jugadores con la presión sobre su reina, la colmena (se acomoda sola al tamaño de la
// pantalla), tu reserva y tus botones. Dibuja con ctx.view y juega con ctx.act().
//
// Para jugar: tocas un bicho de tu reserva o uno tuyo en la colmena, se marcan las casillas a donde puede ir, y
// tocas una. Lo único propio de esta pantalla es `ui.sel` (lo que tienes escogido) y `ui.seenSeq`.
import { legalActions, placeableKinds, queenPressure, topOf, THE, ONE, KINDS, nameOf } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { boardSVG, trayHTML, COLOR } from "./board.js";
import { rulesHelp } from "./rules.js";
import { renderTutorial } from "./tutorial.js";

function describe(st, a) {
  if (!a) return "";
  if (a.type === "pass") return "Pasar";
  if (a.type === "place") return a.kind === "reina" ? "Pon tu abeja reina" : `Pon ${ONE[a.kind]}`;
  return `Mueve ${THE[topOf(st.cells, a.from).k]}`;
}

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de Panal", `
    <button class="big-cta" id="rulestut">Aprender paso a paso</button>
    ${rulesHelp()}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
  $("#rulestut", ctx.modal).onclick = () => openTutorial(ctx);
}

// El tutorial: al abrirlo una vez, el botón "Aprender" deja de llamar la atención
function openTutorial(ctx) {
  ctx.prefs.set("tutorial", "visto");
  openOverlay("tutorial");
}

function renderMenu(ctx, st) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">${esc(nameOf(st, 0))} (claras) contra ${esc(nameOf(st, 1))} (oscuras) · jugada ${st.plies}</p>
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderResult(ctx, st, seat) {
  closeOverlay();
  const title = st.draw ? "¡Empate!" : st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`;
  const why = st.draw ? (queenPressure(st.cells, 0) === 6 ? "Las dos reinas quedaron rodeadas." : "Se acabaron las jugadas.") : 1 - st.winner === seat ? "Tu reina quedó rodeada." : `La reina de ${esc(nameOf(st, 1 - st.winner))} quedó rodeada.`;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    <p class="hint">${why} ${st.plies} jugadas.</p>
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

// Los seis lados de la reina: llenos los ocupados
function pressureHTML(st, s) {
  const n = queenPressure(st.cells, s);
  return `<span class="press" title="Lados ocupados de su reina: ${n} de 6" aria-label="Reina: ${n} de 6 lados ocupados">${
    Array.from({ length: 6 }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
}

function playerHTML(st, s, seat, playing) {
  const turn = playing && st.turn === s;
  const left = KINDS.reduce((a, k) => a + st.hand[s][k], 0);
  return `<div class="pl ${turn ? "turn" : ""} ${s === seat ? "mine" : ""}">
    <span class="chip p${s}" aria-hidden="true"></span>
    <span class="pname">${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " <small>(tú)</small>" : ""}<small class="pinfo">${COLOR[s]} · ${left} en reserva</small></span>
    ${pressureHTML(st, s)}
  </div>`;
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  app.className = "game panal";
  const playing = st.phase !== "over";
  const me = seat >= 0 ? seat : 0, opp = 1 - me;
  const myTurn = playing && seat >= 0 && st.turn === seat;
  if (st.seq !== ui.seenSeq) { ui.sel = null; ui.seenSeq = st.seq; }
  const legal = myTurn ? legalActions(st, seat) : [];
  ui.movable = new Set(legal.filter((a) => a.type === "move").map((a) => a.from));
  const kinds = myTurn ? placeableKinds(st, seat) : [];
  const onlyPass = legal.length === 1 && legal[0].type === "pass";

  let targets = [];
  if (ui.sel && ui.sel.kind) targets = [...new Set(legal.filter((a) => a.type === "place" && a.kind === ui.sel.kind).map((a) => a.to))];
  if (ui.sel && ui.sel.from) targets = legal.filter((a) => a.type === "move" && a.from === ui.sel.from).map((a) => a.to);
  const adv = ctx.advice && ctx.advice.data && ctx.advice.data.action;
  const advice = adv && adv.type !== "pass" ? adv : null;

  let statusTxt;
  if (!playing) statusTxt = st.draw ? "Empate" : `Ganó ${nameOf(st, st.winner)}`;
  else if (!myTurn) statusTxt = `Turno de ${nameOf(st, st.turn)}`;
  else if (onlyPass) statusTxt = "No tienes jugadas: te toca pasar";
  else if (ui.sel) statusTxt = targets.length ? "Toca a dónde va" : "Ese no se puede mover ahora";
  else if (kinds.join() === "reina" && st.hand[seat].reina) statusTxt = `Pon a tu abeja reina: es tu ${st.placed[seat] + 1}.ª ficha`;
  else if (st.hand[seat].reina) statusTxt = "Te toca: pon un bicho de tu reserva";
  else statusTxt = "Te toca: pon un bicho o mueve uno tuyo";
  const clockOn = playing && st.config.timer !== false;

  const advBox = advice ? `<div class="advbox" role="status"><span>Consejo: <b>${esc(describe(st, advice))}</b></span>
      <button id="advdo" class="primary">Hacerlo</button><button id="advclose" class="ghost" aria-label="Cerrar consejo">✕</button></div>`
    : ctx.advice && !ctx.advice.data ? `<div class="advbox"><span>Pensando…</span></div>` : "";

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Panal</div>
      <button class="rulesbtn ${ctx.prefs.get("tutorial") ? "" : "fresh"}" id="learn" aria-haspopup="dialog">Aprender</button>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <section class="players">${playerHTML(st, opp, seat, playing)}<div class="tray opp" aria-label="Reserva de ${esc(nameOf(st, opp))}">${trayHTML(st, opp, false, false, [], null)}</div></section>
    <section class="felt" id="felt">
      <div class="status ${myTurn ? "me" : ""}">${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${boardSVG(st, { sel: ui.sel, movable: ui.movable, targets, advice })}
      ${advBox}
    </section>
    <section class="me">
      ${playerHTML(st, me, seat, playing)}
      <div class="tray mine" aria-label="Tu reserva">${trayHTML(st, me, seat >= 0, myTurn, kinds, ui.sel)}</div>
      <div class="actions">
        ${onlyPass ? `<button id="pass" class="primary big">Pasar</button>` : ""}
        ${seat >= 0 && playing ? `<button id="advice" class="ghost" ${myTurn && !onlyPass ? "" : "disabled"}>Consejo</button>` : ""}
      </div>
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  const redraw = () => renderTable(app, ctx, ui);
  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  $("#learn", app).onclick = () => openTutorial(ctx);
  $("#pass", app)?.addEventListener("click", () => ctx.act({ type: "pass" }));
  $("#advice", app)?.addEventListener("click", () => ctx.askAdvice());
  $("#advclose", app)?.addEventListener("click", () => ctx.closeAdvice());
  $("#advdo", app)?.addEventListener("click", () => { ctx.closeAdvice(); ctx.act(advice); });
  app.querySelectorAll(".tray.mine .handbtn").forEach((b) => b.onclick = () => {
    const k = b.dataset.kind;
    ui.sel = ui.sel && ui.sel.kind === k ? null : { kind: k };
    redraw();
  });
  $(".hive", app).addEventListener("click", (e) => {
    const t = e.target.closest("[data-target]");
    if (t && ui.sel) {
      const to = t.dataset.target, sel = ui.sel;
      ui.sel = null;
      ctx.act(sel.kind ? { type: "place", kind: sel.kind, to } : { type: "move", from: sel.from, to });
      return;
    }
    const c = e.target.closest("[data-cell]");
    if (c && ui.movable.has(c.dataset.cell)) ui.sel = ui.sel && ui.sel.from === c.dataset.cell ? null : { from: c.dataset.cell };
    else ui.sel = null;
    redraw();
  });

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st);
  else if (ov && ov.id === "rules") renderRules(ctx);
  else if (ov && ov.id === "tutorial") renderTutorial(ctx);
  else if (st.phase === "over") renderResult(ctx, st, seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
