// La mesa de damas chinas: los jugadores con cuántas canicas llevan en su meta, el tablero y tus botones.
// Dibuja con ctx.view y juega con ctx.act(). Lo único propio de esta pantalla vive en `ui`: la canica escogida
// (`sel`) y la última jugada que ya se animó (`seenSeq`).
import { legalActions, destinations, arrived, nameOf, COLORS, RULES } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { boardSVG } from "./board.js";
import { rulesHelp } from "./rules.js";

const you = (st, s, seat) => (s === seat && nameOf(st, s) !== "Tú" ? " (tú)" : "");

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de las damas chinas", `${rulesHelp()}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderMenu(ctx, st) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">${st.config.n} jugadores · ${st.moves} jugadas</p>
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
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
  const title = st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`;
  const order = st.names.map((_, s) => ({ s, a: arrived(st, s) })).sort((x, y) => (y.s === st.winner) - (x.s === st.winner) || y.a - x.a);
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    <p class="hint">${st.capped ? "Se llegó al tope de jugadas; ganó quien iba más adelante." : `Llenó su meta en ${Math.ceil(st.moves / st.config.n)} turnos.`}</p>
    <div class="res">${order.map(({ s, a }) => `<div class="resrow ${s === st.winner ? "win" : ""}">
      <span><i class="dot c${s}"></i>${esc(nameOf(st, s))}${you(st, s, seat)}</span><b>${a}/${RULES.pieces}</b></div>`).join("")}</div>
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  app.className = "game damas-chinas";
  const playing = st.phase !== "over";
  const myTurn = playing && seat >= 0 && st.turn === seat;
  const acts = myTurn ? legalActions(st, seat) : [];
  const mustPass = acts.length === 1 && acts[0].type === "pass";
  const movable = [...new Set(acts.filter((a) => a.type === "move").map((a) => a.path[0]))];
  if (!myTurn || !movable.includes(ui.sel)) ui.sel = null;
  const dests = ui.sel !== null ? destinations(st, seat, ui.sel) : {};
  const fresh = st.seq !== ui.seenSeq;
  ui.seenSeq = st.seq;
  const clockOn = playing && st.config.timer !== false;

  const players = st.names.map((_, s) => {
    const a = arrived(st, s);
    return `<div class="prow ${playing && st.turn === s ? "turn" : ""} ${s === seat ? "mine" : ""}" title="${esc(COLORS[s])}">
      <i class="dot c${s}" aria-hidden="true"></i>
      <span class="pname">${esc(nameOf(st, s))}${you(st, s, seat) ? " <small>(tú)</small>" : ""}</span>
      <span class="parr" aria-label="${a} de ${RULES.pieces} en la meta"><b>${a}</b>/${RULES.pieces}</span>
    </div>`;
  }).join("");

  let statusTxt;
  if (!playing) statusTxt = `Ganó ${nameOf(st, st.winner)}`;
  else if (!myTurn) statusTxt = `Turno de ${nameOf(st, st.turn)}`;
  else if (mustPass) statusTxt = "No tienes jugada: pasa";
  else if (ui.sel !== null) statusTxt = "Toca a dónde llevarla";
  else statusTxt = "Te toca: escoge una canica";

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Damas chinas</div>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <section class="board" aria-label="Jugadores">${players}</section>
    <section class="felt">
      <div class="status ${myTurn ? "me" : ""}"><i class="dot c${playing ? st.turn : st.winner}" aria-hidden="true"></i>${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      <div class="boardwrap" id="board">${boardSVG(st, { me: seat, sel: ui.sel, dests, movable, fresh })}</div>
    </section>
    <section class="me">
      ${mustPass ? `<div class="actions"><button id="pass" class="primary big">Pasar</button></div>` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  $("#pass", app)?.addEventListener("click", () => ctx.act({ type: "pass" }));
  $("#board", app).onclick = (e) => {
    if (!myTurn) return;
    const dest = e.target.closest("[data-dest]");
    if (dest && ui.sel !== null) {
      const path = dests[dest.dataset.dest];
      ui.sel = null;
      if (path) ctx.act({ type: "move", path });
      return;
    }
    const m = e.target.closest("[data-cell]");
    const cell = m ? Number(m.dataset.cell) : null;
    ui.sel = cell !== null && movable.includes(cell) && cell !== ui.sel ? cell : null;
    renderTable(app, ctx, ui);
  };

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st);
  else if (ov && ov.id === "rules") renderRules(ctx);
  else if (!playing) renderResult(ctx, st, seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
