// El mar de Vikingos en SVG: las 9 piezas, los barcos y las flechas de la orilla. Coordenadas: el centro de la
// pieza (r, c) está en (c, r); cada pieza es un disco de radio R que se encima con sus vecinas.
//
// Cada pieza se dibuja con giro 0 en su propio marco y luego se gira con rotate(); así una animación SMIL de la
// pieza gira también los barcos que van en ella. Los demás barcos se dibujan encima, en coordenadas del tablero.
import { notches, sidesOf, COLORS } from "../engine/board.js";

export const R = 0.62;
const TH = Math.acos(0.5 / R); // medio ángulo de una muesca, visto desde el centro de la pieza
const PHI = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // N, E, S, O en el SVG (y hacia abajo)
const U = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const f = (x) => Math.round(x * 1000) / 1000;
const pt = (a, r = R) => `${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}`;

export const COLOR_NAME = { R: "rojo", G: "verde", Y: "amarillo", B: "azul" };

// El contorno de una pieza con sus muescas en los lados `ns` (marco propio, centro en 0,0)
export function piecePath(ns) {
  let d = `M ${pt(PHI[0] + TH)}`;
  for (let k = 1; k <= 4; k++) {
    const s = k % 4, a = PHI[0] + k * Math.PI / 2;
    d += ` A ${R} ${R} 0 0 1 ${pt(a - TH)}`; // la orilla llena hasta el siguiente lado
    d += ns.includes(s) ? ` A ${R} ${R} 0 0 0 ${pt(a + TH)}` : ` A ${R} ${R} 0 0 1 ${pt(a + TH)}`; // muesca o lleno
  }
  return d + " Z";
}

// Las rayas blancas de adentro (solo en el tablero grande): anillos en el remolino, arcos en la corriente
function decor(kind) {
  if (kind === "C") return `<circle r=".11"/><circle r=".27"/><circle r=".43"/>`;
  // Corriente con muescas arriba y abajo: arcos paralelos a cada muesca
  const arc = (side, rr) => {
    const cy = side === 0 ? -1 : 1;
    const half = Math.acos((1 + rr * rr - R * R) / (2 * rr)); // dónde corta el disco de la pieza
    const a0 = (side === 0 ? Math.PI / 2 : -Math.PI / 2) - half, a1 = a0 + 2 * half;
    const p = (a) => `${f(Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
    return `<path d="M ${p(a0)} A ${rr} ${rr} 0 0 1 ${p(a1)}"/>`;
  };
  return [0, 2].map((sd) => arc(sd, R + 0.14) + arc(sd, R + 0.3)).join("");
}

// Un barco a lo largo del eje x, centrado en 0,0 (se gira para cada lente)
function boatShape(col, extra = "") {
  return `<g class="boat b${col}${extra}">
    <path class="hull" d="M -.35 0 Q 0 -.25 .35 0 Q 0 .25 -.35 0 Z"/>
    <rect class="sail" x="-.14" y="-.12" width=".25" height=".24" rx=".06"/>
    <path class="stripes" d="M -.08 -.1 V .1 M -.02 -.11 V .11 M .04 -.11 V .11"/>
  </g>`;
}

// Dónde va una lente: centro y si es vertical
export function lensSpot(lens) {
  const [[i, d]] = sidesOf(lens);
  const r = Math.floor(i / 3), c = i % 3;
  return { x: c + U[d][0] * 0.5, y: r + U[d][1] * 0.5, vertical: d === 1 || d === 3 };
}

const boatAt = (col, x, y, vertical, extra) => `<g transform="translate(${f(x)} ${f(y)})${vertical ? " rotate(90)" : ""}">${boatShape(col, extra)}</g>`;

// Flecha de la orilla, apuntando hacia el tablero
function arrowAt(col, lens, home) {
  const t = lens[0], k = Number(lens[1]);
  const [x, y, rot] = t === "N" ? [k, -0.86, 90] : t === "S" ? [k, 2.86, -90] : t === "W" ? [-0.86, k, 0] : [2.86, k, 180];
  return `<g class="arrow a${col}${home ? " home" : ""}" transform="translate(${x} ${y}) rotate(${rot})"><path d="M -.13 -.16 L .15 0 L -.13 .16 Z"/></g>`;
}

// opts: { sel, can: [piezas que se pueden girar], advice: pieza, fresh: last para animar, still: sin animación,
//         mini: dibujo chico sin rayas ni zonas para tocar }
export function boardSVG(st, opts = {}) {
  const { sel = -1, can = [], advice = -1, fresh = null, still = false, mini = false } = opts;
  const anim = !mini && !still && fresh && (fresh.type === "rotate" || fresh.type === "undo") ? fresh : null;
  const moving = anim ? new Set(anim.boats) : new Set();
  const out = [];
  out.push(`<svg class="vk-board${mini ? " mini" : ""}" viewBox="-1.05 -1.05 4.1 4.1" ${mini ? `aria-hidden="true"` : `role="img" aria-label="${esc(describe(st))}"`} xmlns="http://www.w3.org/2000/svg">`);
  out.push(`<rect class="frame" x="-1" y="-1" width="4" height="4" rx=".3"/><rect class="sea" x="-.74" y="-.74" width="3.48" height="3.48" rx=".22"/>`);

  const pieceSVG = (i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const kind = st.kinds[i], rot = st.rots[i];
    const ns = notches(kind, 0);
    const cls = ["piece", kind === "C" ? "whirl" : "flow", can.includes(i) ? "can" : "", sel === i ? "sel" : "", advice === i ? "adv" : ""].join(" ").trim();
    let inner = `<path class="body" d="${piecePath(ns)}"/>`;
    if (!mini) inner += `<g class="lines" clip-path="url(#vk-clip-${kind})">${decor(kind)}</g><path class="edge" d="${piecePath(ns)}"/>`;
    let boats = "";
    if (anim && anim.piece === i) {
      // Los barcos que giran con ella van en su marco: su lado actual, deshecho el giro de la pieza
      for (const col of anim.boats) {
        const [[, d]] = sidesOf(st.boats[col]).filter(([p]) => p === i);
        const ld = (d - rot + 4) % 4;
        boats += boatAt(col, U[ld][0] * 0.5, U[ld][1] * 0.5, ld === 1 || ld === 3, home(st, col) ? " home" : "");
      }
    }
    const deg = rot * 90;
    let spin = "";
    if (anim && anim.piece === i) {
      const delta = anim.turns === 3 ? -90 : anim.turns * 90;
      spin = `<animateTransform attributeName="transform" type="rotate" from="${deg - delta}" to="${deg}" dur="${0.25 + 0.12 * Math.abs(delta) / 90}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/>`;
    }
    return `<g class="slot" data-piece="${i}" transform="translate(${c} ${r})">
      <g transform="rotate(${deg})">${spin}<g class="${cls}">${inner}</g>${boats}</g>
      ${!mini ? `<circle class="hit" r="${R * 0.92}"/>` : ""}</g>`;
  };

  if (!mini) out.push(`<defs>${["C", "X"].map((k) => `<clipPath id="vk-clip-${k}"><path d="${piecePath(notches(k, 0))}"/></clipPath>`).join("")}</defs>`);
  const order = [...Array(9).keys()].filter((i) => !(anim && anim.piece === i));
  for (const i of order) out.push(pieceSVG(i));
  // Las orillas de las piezas que se pueden girar, la escogida y la del consejo (encima de las piezas)
  if (!mini) for (let i = 0; i < 9; i++) {
    const cls = sel === i ? "sel" : advice === i ? "adv" : can.includes(i) ? "can" : "";
    if (cls) out.push(`<circle class="halo ${cls}" cx="${i % 3}" cy="${Math.floor(i / 3)}" r="${R + 0.04}"/>`);
  }
  // Flechas
  for (const col of COLORS) if (st.arrows[col]) out.push(arrowAt(col, st.arrows[col], home(st, col)));
  // Barcos quietos
  for (const col of COLORS) {
    if (!st.boats[col] || moving.has(col)) continue;
    const s = lensSpot(st.boats[col]);
    out.push(boatAt(col, s.x, s.y, s.vertical, home(st, col) ? " home" : ""));
  }
  // La pieza que gira, encima de todo
  if (anim) out.push(pieceSVG(anim.piece));
  out.push(`</svg>`);
  return out.join("");
}

const home = (st, col) => st.boats[col] === st.arrows[col];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Para lectores de pantalla: dónde va cada barco y su flecha
export function describe(st) {
  const where = (L) => {
    const t = L[0];
    if ("NSWE".includes(t)) return { N: "arriba", S: "abajo", W: "a la izquierda", E: "a la derecha" }[t] + ` (${Number(L[1]) + 1})`;
    return "entre dos piezas";
  };
  return "Tablero de 3 por 3. " + COLORS.filter((c) => st.boats[c]).map((c) => `Barco ${COLOR_NAME[c]} ${home(st, c) ? "ya llegó a su flecha" : `${where(st.boats[c])}, su flecha está ${where(st.arrows[c])}`}`).join(". ");
}

