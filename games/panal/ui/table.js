// La mesa de Panal: los dos jugadores con la presión sobre su reina, la colmena (se acomoda sola al tamaño de la
// pantalla), tu reserva y tus botones. Dibuja con ctx.view y juega con ctx.act().
//
// Para jugar: tocas un bicho de tu reserva o uno tuyo en la colmena, se marcan las casillas a donde puede ir, y
// tocas una. Lo único propio de esta pantalla es `ui.sel` (lo que tienes escogido) y `ui.seenSeq`.
import { legalActions, placeableKinds, queenPressure, topOf, NAMES, THE, ONE, KINDS, PIECES, nameOf } from "../engine/index.js";
import { parse } from "../engine/hex.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { bugArt, tileSVG, hexPoints } from "./art.js";
import { rulesHelp } from "./rules.js";

const R = 50, SQ3 = Math.sqrt(3);
const center = (k) => { const [q, r] = parse(k); return [R * SQ3 * (q + r / 2), R * 1.5 * r]; };
const COLOR = ["claras", "oscuras"];

function describe(st, a) {
  if (!a) return "";
  if (a.type === "pass") return "Pasar";
  if (a.type === "place") return a.kind === "reina" ? "Pon tu abeja reina" : `Pon ${ONE[a.kind]}`;
  return `Mueve ${THE[topOf(st.cells, a.from).k]}`;
}

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de Panal", `${rulesHelp()}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
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

function boardSVG(st, ui, targets, advice) {
  const keys = Object.keys(st.cells);
  const pts = [...keys, ...targets].map(center);
  if (!pts.length) pts.push([0, 0]);
  let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  let y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const pad = R * 1.25, minW = R * SQ3 * 5, minH = R * 5;
  if (x1 - x0 + 2 * pad < minW) { const c = (x0 + x1) / 2; x0 = c - minW / 2 + pad; x1 = c + minW / 2 - pad; }
  if (y1 - y0 + 2 * pad < minH) { const c = (y0 + y1) / 2; y0 = c - minH / 2 + pad; y1 = c + minH / 2 - pad; }
  const vb = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map((v) => v.toFixed(1)).join(" ");

  const last = st.last && st.last.type !== "pass" ? st.last : null;
  const advFrom = advice && advice.from, advTo = advice && advice.to;
  let html = "";
  if (last && last.from && !st.cells[last.from]) {
    const [x, y] = center(last.from);
    html += `<polygon class="ghost" points="${hexPoints(R * 0.9, x, y)}"/>`;
  }
  // Las pilas se dibujan de atrás hacia adelante para que las de abajo no tapen a las de arriba
  for (const k of keys.slice().sort((a, b) => parse(a)[1] - parse(b)[1] || parse(a)[0] - parse(b)[0])) {
    const [x, y] = center(k), stack = st.cells[k], t = topOf(st.cells, k), h = stack.length;
    const sel = ui.sel && ui.sel.from === k;
    let under = "";
    for (let i = 0; i < h - 1; i++) under += `<polygon class="tile p${stack[i].p}" points="${hexPoints(R * 0.92, x + 5 * (h - 1 - i), y + 5 * (h - 1 - i))}"/>`;
    const cls = ["cell", sel ? "sel" : "", last && last.to === k ? "last" : "", advFrom === k || advTo === k ? "adv" : "", ui.movable.has(k) ? "can" : ""].join(" ");
    html += `<g class="${cls}" data-cell="${k}" role="button" aria-label="${esc(NAMES[t.k])} ${COLOR[t.p]}${h > 1 ? `, pila de ${h}` : ""}">
      ${under}
      <polygon class="tile p${t.p}" points="${hexPoints(R * 0.92, x, y)}"/>
      <polygon class="tile-in p${t.p}" points="${hexPoints(R * 0.78, x, y)}"/>
      <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.98)">${bugArt(t.k)}</g>
      ${h > 1 ? `<g class="badge"><circle cx="${(x + R * 0.58).toFixed(1)}" cy="${(y - R * 0.58).toFixed(1)}" r="12"/><text x="${(x + R * 0.58).toFixed(1)}" y="${(y - R * 0.58 + 5).toFixed(1)}">${h}</text></g>` : ""}
      <polygon class="ring" points="${hexPoints(R * 0.95, x, y)}"/>
    </g>`;
  }
  for (const k of targets) {
    const [x, y] = center(k);
    const onTop = !!st.cells[k];
    html += `<g class="target ${onTop ? "ontop" : ""} ${advTo === k ? "adv" : ""}" data-target="${k}" role="button" aria-label="Aquí">
      <polygon points="${hexPoints(R * (onTop ? 0.95 : 0.86), x, y)}"/>${onTop ? "" : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>`}</g>`;
  }
  if (advTo && !targets.includes(advTo) && !st.cells[advTo]) {
    const [x, y] = center(advTo);
    html += `<polygon class="advto" points="${hexPoints(R * 0.86, x, y)}"/>`;
  }
  return `<svg class="hive" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-label="La colmena">${html}</svg>`;
}

function trayHTML(st, s, mine, myTurn, kinds, sel) {
  return KINDS.map((k) => {
    const n = st.hand[s][k];
    const can = mine && myTurn && n > 0 && kinds.includes(k);
    return `<button class="handbtn ${sel && sel.kind === k ? "sel" : ""} ${n ? "" : "empty"}" data-kind="${k}" ${can ? "" : "disabled"}
      aria-label="${esc(NAMES[k])}: ${n} de ${PIECES[k]}">${tileSVG(s, k, mine ? 46 : 26)}<span class="cnt">${n}</span></button>`;
  }).join("");
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
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <section class="players">${playerHTML(st, opp, seat, playing)}<div class="tray opp" aria-label="Reserva de ${esc(nameOf(st, opp))}">${trayHTML(st, opp, false, false, [], null)}</div></section>
    <section class="felt" id="felt">
      <div class="status ${myTurn ? "me" : ""}">${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${boardSVG(st, ui, targets, advice)}
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
  else if (st.phase === "over") renderResult(ctx, st, seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
