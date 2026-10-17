// El tutorial de Panal: una ventana con lecciones cortas, cada una con una colmena chica donde haces la jugada que
// se explica. Las jugadas usan las reglas del juego (engine/); las lecciones están en lessons.js.
//
// Lo que guarda (en este módulo, para que sobreviva a los redibujos de la mesa mientras la compu juega):
//   i: lección actual · st: la colmena de la lección · sel: lo escogido · msg: el aviso · done/failed: cómo terminó
//   show: "Muéstrame" está marcando la solución.
import { legalActions, apply, topOf, canLift } from "../engine/index.js";
import { $ } from "../../../platform/ui/dom.js";
import { renderSheet, closeOverlay } from "../../../platform/ui/sheet.js";
import { boardSVG, trayHTML } from "./board.js";
import { LESSONS, lessonState } from "./lessons.js";

const tut = { i: 0, st: null, sel: null, msg: null, done: false, failed: false, show: false, focus: null };

function load(i) {
  const l = LESSONS[i];
  Object.assign(tut, { i, st: l.spec ? lessonState(l) : null, sel: null, msg: null, done: !l.spec, failed: false, show: false });
}

export function tutorialProgress() { return { lesson: tut.i, total: LESSONS.length }; }

// Por qué no se puede escoger esa ficha (para que el tutorial explique en lugar de no hacer nada)
function whyNot(st, k) {
  const t = topOf(st.cells, k);
  if (t.p !== 0) return "Esa ficha es del rival: tú juegas con las claras.";
  if (st.hand[0].reina) return "Mientras tu reina no esté en la colmena, no puedes mover nada.";
  if (!canLift(st.cells, k)) return "Esa ficha une dos partes de la colmena: si se mueve, la colmena se parte. Por eso no se puede mover.";
  if (legalActions(st, 0).some((a) => a.type === "move" && a.from === k)) return "Esa sí se puede mover, pero en esta lección toca otra ficha.";
  return "Esa ficha no tiene a dónde ir: no cabe por ningún lado.";
}

export function renderTutorial(ctx, { onFinish } = {}) {
  if (tut.st === null && LESSONS[tut.i].spec) load(tut.i);
  const l = LESSONS[tut.i], last = tut.i === LESSONS.length - 1, st = tut.st;
  const active = !!st && !tut.done && !tut.failed;
  const legal = active ? legalActions(st, 0).filter(l.only) : [];
  const movable = new Set(legal.filter((a) => a.type === "move").map((a) => a.from));
  const kinds = [...new Set(legal.filter((a) => a.type === "place").map((a) => a.kind))];
  let targets = [];
  if (tut.sel && tut.sel.kind) targets = [...new Set(legal.filter((a) => a.type === "place" && a.kind === tut.sel.kind).map((a) => a.to))];
  if (tut.sel && tut.sel.from) targets = legal.filter((a) => a.type === "move" && a.from === tut.sel.from).map((a) => a.to);

  const dots = LESSONS.map((_, j) => `<i class="${j < tut.i ? "past" : j === tut.i ? "now" : ""}"></i>`).join("");
  const msg = tut.msg ? `<p class="tut-msg ${tut.done ? "ok" : tut.failed ? "warn" : "info"}" role="status">${tut.msg}</p>` : "";
  const board = st ? `<div class="tut-felt">${boardSVG(st, { sel: tut.sel, movable, targets, advice: tut.show && active ? l.solution : null, goal: active ? l.goalCell : null, minCells: 4 })}</div>` : "";
  const tray = st && l.tray ? `<div class="tray mine tut-tray" aria-label="Tu reserva">${trayHTML(st, 0, true, active, kinds, tut.sel)}</div>` : "";
  const nextLabel = last ? "¡A jugar!" : tut.done ? "Siguiente" : "Saltar";

  renderSheet(ctx.modal, "tutorial", "Aprende a jugar", `
    <div class="panal tut">
      <div class="tut-prog"><span>Lección ${tut.i + 1} de ${LESSONS.length}</span><span class="tut-dots" aria-hidden="true">${dots}</span></div>
      <h4 class="tut-title">${l.title}</h4>
      <div class="tut-text">${l.text}</div>
      ${l.task ? `<p class="tut-task"><b>Tu turno:</b> ${l.task}</p>` : ""}
      ${board}
      ${tray}
      ${msg}
      <div class="tut-nav">
        <button id="tutprev" class="ghost" ${tut.i ? "" : "disabled"}>Atrás</button>
        ${st ? (active ? `<button id="tutshow" class="ghost">Muéstrame</button>` : `<button id="tutagain" class="ghost">Otra vez</button>`) : ""}
        <button id="tutnext" class="${tut.done || last ? "primary" : ""}">${nextLabel}</button>
      </div>
    </div>`);

  const m = ctx.modal;
  // Después de tocar algo, que se vea lo que pasó (el aviso o la colmena), aunque la ventana sea más alta que la
  // pantalla y los botones de abajo tapen el final
  if (tut.focus) { m.querySelector(tut.focus)?.scrollIntoView({ block: "center" }); tut.focus = null; }
  const redraw = (focus = null) => { tut.focus = focus; renderTutorial(ctx, { onFinish }); };
  const top = () => { const sheet = m.querySelector(".sheet"); if (sheet) sheet.scrollTop = 0; };
  $("#tutprev", m).onclick = () => { load(tut.i - 1); redraw(); top(); };
  $("#tutnext", m).onclick = () => {
    if (last) { load(0); closeOverlay(); if (onFinish) onFinish(); return; }
    load(tut.i + 1); redraw(); top();
  };
  $("#tutagain", m)?.addEventListener("click", () => { load(tut.i); redraw(); });
  $("#tutshow", m)?.addEventListener("click", () => {
    const s = l.solution;
    tut.show = true;
    tut.sel = s.type === "place" ? { kind: s.kind } : { from: s.from };
    tut.msg = s.type === "place" ? "Ya está escogido el bicho: toca la casilla azul." : "Ya está escogida la ficha: toca la casilla azul.";
    redraw(".tut-felt");
  });
  m.querySelectorAll(".tut-tray .handbtn").forEach((b) => b.onclick = () => {
    const k = b.dataset.kind;
    tut.sel = tut.sel && tut.sel.kind === k ? null : { kind: k };
    tut.msg = tut.sel ? "Ahora toca una de las casillas marcadas." : null;
    redraw(".tut-felt");
  });
  m.querySelector(".tut .hive")?.addEventListener("click", (e) => {
    if (!active) return;
    const t = e.target.closest("[data-target]");
    if (t && tut.sel) {
      const a = tut.sel.kind ? { type: "place", kind: tut.sel.kind, to: t.dataset.target } : { type: "move", from: tut.sel.from, to: t.dataset.target };
      const after = apply(st, 0, a);
      tut.st = after; tut.sel = null; tut.show = false;
      if (l.goal(a, after)) { tut.done = true; tut.msg = `<b>¡Bien!</b> ${l.ok}`; }
      else { tut.failed = true; tut.msg = "Esa jugada se vale, pero no es la que pide la lección. Toca <b>Otra vez</b> para intentarlo de nuevo."; }
      redraw(".tut-msg");
      return;
    }
    const c = e.target.closest("[data-cell]");
    if (c && movable.has(c.dataset.cell)) {
      tut.sel = tut.sel && tut.sel.from === c.dataset.cell ? null : { from: c.dataset.cell };
      tut.msg = tut.sel ? "Las casillas marcadas son a donde puede ir. Toca una." : null;
    } else if (c) { tut.sel = null; tut.msg = whyNot(st, c.dataset.cell); }
    else { tut.sel = null; tut.msg = null; }
    redraw(tut.sel ? ".tut-felt" : tut.msg ? ".tut-msg" : null);
  });
}
