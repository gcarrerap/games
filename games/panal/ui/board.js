// La colmena y las reservas dibujadas en SVG. Las usan la mesa (table.js) y el tutorial (tutorial.js).
import { topOf, NAMES, KINDS, PIECES } from "../engine/index.js";
import { parse } from "../engine/hex.js";
import { esc } from "../../../platform/ui/dom.js";
import { bugArt, tileSVG, hexPoints } from "./art.js";

const R = 50, SQ3 = Math.sqrt(3);
const center = (k) => { const [q, r] = parse(k); return [R * SQ3 * (q + r / 2), R * 1.5 * r]; };
export const COLOR = ["claras", "oscuras"];

// La colmena. sel: lo escogido ({ from } o { kind }); movable: casillas con fichas que se pueden mover; targets: a
// dónde puede ir lo escogido; advice: la jugada del consejo; goal: casilla meta de una lección; minCells: tamaño
// mínimo de la vista, en fichas (para que una colmena chica no se vea gigante).
export function boardSVG(st, { sel = null, movable = new Set(), targets = [], advice = null, goal = null, minCells = 5 } = {}) {
  const keys = Object.keys(st.cells);
  const pts = [...keys, ...targets, ...(goal ? [goal] : [])].map(center);
  if (!pts.length) pts.push([0, 0]);
  let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  let y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const pad = R * 1.25, minW = R * SQ3 * minCells, minH = R * minCells;
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
    const isSel = !!sel && sel.from === k;
    let under = "";
    for (let i = 0; i < h - 1; i++) under += `<polygon class="tile p${stack[i].p}" points="${hexPoints(R * 0.92, x + 5 * (h - 1 - i), y + 5 * (h - 1 - i))}"/>`;
    const cls = ["cell", isSel ? "sel" : "", last && last.to === k ? "last" : "", advFrom === k || advTo === k ? "adv" : "", movable.has(k) ? "can" : "", goal === k ? "goal" : ""].join(" ");
    html += `<g class="${cls}" data-cell="${k}" role="button" aria-label="${esc(NAMES[t.k])} ${COLOR[t.p]}${h > 1 ? `, pila de ${h}` : ""}">
      ${under}
      <polygon class="tile p${t.p}" points="${hexPoints(R * 0.92, x, y)}"/>
      <polygon class="tile-in p${t.p}" points="${hexPoints(R * 0.78, x, y)}"/>
      <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.98)">${bugArt(t.k)}</g>
      <polygon class="ring" points="${hexPoints(R * 0.95, x, y)}"/>
      ${h > 1 ? `<g class="badge"><circle cx="${(x + R * 0.58).toFixed(1)}" cy="${(y - R * 0.58).toFixed(1)}" r="12"/><text x="${(x + R * 0.58).toFixed(1)}" y="${(y - R * 0.58 + 5).toFixed(1)}">${h}</text></g>` : ""}
    </g>`;
  }
  for (const k of targets) {
    const [x, y] = center(k);
    const onTop = !!st.cells[k];
    html += `<g class="target ${onTop ? "ontop" : ""} ${advTo === k || goal === k ? "adv" : ""}" data-target="${k}" role="button" aria-label="Aquí">
      <polygon points="${hexPoints(R * (onTop ? 0.95 : 0.86), x, y)}"/>${onTop ? "" : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>`}</g>`;
  }
  // La meta de una lección del tutorial: una casilla marcada en azul
  if (goal && !st.cells[goal]) {
    const [x, y] = center(goal);
    html = `<polygon class="goalcell" points="${hexPoints(R * 0.86, x, y)}"/>` + html;
  }
  if (advTo && !targets.includes(advTo) && !st.cells[advTo]) {
    const [x, y] = center(advTo);
    html += `<polygon class="advto" points="${hexPoints(R * 0.86, x, y)}"/>`;
  }
  return `<svg class="hive" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-label="La colmena">${html}</svg>`;
}

export function trayHTML(st, s, mine, myTurn, kinds, sel) {
  return KINDS.map((k) => {
    const n = st.hand[s][k];
    const can = mine && myTurn && n > 0 && kinds.includes(k);
    return `<button class="handbtn ${sel && sel.kind === k ? "sel" : ""} ${n ? "" : "empty"}" data-kind="${k}" ${can ? "" : "disabled"}
      aria-label="${esc(NAMES[k])}: ${n} de ${PIECES[k]}">${tileSVG(s, k, mine ? 46 : 26)}<span class="cnt">${n}</span></button>`;
  }).join("");
}

