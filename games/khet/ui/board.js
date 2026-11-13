// El tablero del Láser en SVG: losas de piedra, casillas reservadas (ankh de Plata, ojo de Horus de Rojo), las
// piezas, lo escogido y las zonas para tocar. El láser y las explosiones van encima, en un canvas (fx.js).
//
// Unidades: una casilla mide 1. La casilla (r, c) se dibuja en (c, r), o en (9 - c, 7 - r) con el tablero volteado
// (cuando Rojo juega en su propio teléfono, para que su lado quede abajo).
import { W, H, N, rc, reservedFor } from "../engine/index.js";
import { defs, pieceSVG, ANKH, EYE, TEAM } from "./art.js";

export const PAD = 0.5; // marco alrededor de las casillas
export const VIEW = { x: -PAD, y: -PAD, w: W + 2 * PAD, h: H + 2 * PAD };

// Dónde se dibuja una casilla: [x, y] de su esquina
export const place = (i, flip) => { const [r, c] = rc(i); return flip ? [W - 1 - c, H - 1 - r] : [c, r]; };
// Un punto del láser (en unidades de casilla, sin voltear) a unidades del dibujo
export const viewPoint = ([x, y], flip) => (flip ? [W - x, H - y] : [x, y]);

let staticCache = { flip: null, svg: "" };

// Lo que no cambia en toda la partida: marco, losas, reservadas y coordenadas
function staticLayer(flip) {
  if (staticCache.flip === flip) return staticCache.svg;
  const out = [];
  out.push(`<rect x="${-PAD + 0.04}" y="${-PAD + 0.04}" width="${W + 2 * PAD - 0.08}" height="${H + 2 * PAD - 0.08}" rx=".22" fill="url(#kframe)" stroke="#c9973a" stroke-width=".05"/>`);
  out.push(`<rect x="-.12" y="-.12" width="${W + 0.24}" height="${H + 0.24}" rx=".08" fill="#0d0b08" stroke="#8a6526" stroke-width=".04"/>`);
  // Greca del marco: pequeños rombos dorados
  for (let k = 0; k <= W * 2; k++) {
    const x = -0.05 + k * ((W + 0.1) / (W * 2));
    for (const y of [-0.31, H + 0.31]) out.push(`<rect x="${(x - 0.045).toFixed(3)}" y="${(y - 0.045).toFixed(3)}" width=".09" height=".09" transform="rotate(45 ${x.toFixed(3)} ${y})" fill="#c9973a" opacity=".55"/>`);
  }
  for (let i = 0; i < N; i++) {
    const [x, y] = place(i, flip);
    const [r, c] = rc(i);
    out.push(`<rect class="tile" x="${x + 0.02}" y="${y + 0.02}" width=".96" height=".96" rx=".05" fill="url(#kstone${(r + c) % 2 ? "2" : ""})"/>`);
    // Vetas de la piedra, fijas por casilla
    const seed = (i * 37) % 11;
    out.push(`<path d="M${x + 0.1} ${y + 0.2 + seed * 0.05} q.3 -.08 .5 .06 t.35 -.04" stroke="#5c5244" stroke-width=".012" fill="none" opacity=".5"/>`);
    const res = reservedFor(i);
    if (res >= 0) {
      const col = res === 0 ? "#cfe3f2" : "#ff5a4a";
      out.push(`<rect x="${x + 0.02}" y="${y + 0.02}" width=".96" height=".96" rx=".05" fill="${col}" opacity=".1"/>`);
      out.push(`<g transform="translate(${x} ${y})" fill="${col}" color="${col}" opacity=".32">${res === 0 ? ANKH : EYE}</g>`);
    }
  }
  // Coordenadas como en el tablero (A–J abajo, 1–8 a la izquierda), volteadas si hace falta
  for (let c = 0; c < W; c++) {
    const x = flip ? W - 1 - c : c;
    out.push(`<text class="coord" x="${x + 0.5}" y="${H + 0.36}">${"ABCDEFGHIJ"[c]}</text>`);
  }
  for (let r = 0; r < H; r++) {
    const y = flip ? H - 1 - r : r;
    out.push(`<text class="coord" x="-.3" y="${y + 0.56}">${H - r}</text>`);
  }
  staticCache = { flip, svg: out.join("") };
  return staticCache.svg;
}

// opts: { flip, sel, targets: [{ i, swap }], lastFrom, lastTo, advice: { from, to, at } | null, doomed: { i, code } | null,
//         cursor: casilla del cursor del teclado o -1, playable, turn }
export function boardSVG(st, opts = {}) {
  const { flip = false, sel = -1, targets = [], lastFrom = -1, lastTo = -1, advice = null, doomed = null, cursor = -1, playable = false } = opts;
  const out = [];
  out.push(`<svg class="kh-board" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" role="img" aria-label="Tablero del láser" xmlns="http://www.w3.org/2000/svg">`);
  out.push(defs());
  out.push(staticLayer(flip));
  // Última jugada
  if (lastFrom >= 0) { const [x, y] = place(lastFrom, flip); out.push(`<rect class="lastfrom" x="${x + 0.06}" y="${y + 0.06}" width=".88" height=".88" rx=".08"/>`); }
  if (lastTo >= 0) { const [x, y] = place(lastTo, flip); out.push(`<rect class="lastto" x="${x + 0.04}" y="${y + 0.04}" width=".92" height=".92" rx=".08"/>`); }
  // Consejo
  if (advice) {
    for (const i of [advice.from, advice.to, advice.at]) {
      if (i === undefined || i < 0) continue;
      const [x, y] = place(i, flip);
      out.push(`<rect class="adv" x="${x + 0.05}" y="${y + 0.05}" width=".9" height=".9" rx=".1"/>`);
    }
  }
  // Pieza escogida
  if (sel >= 0) { const [x, y] = place(sel, flip); out.push(`<rect class="sel" x="${x + 0.03}" y="${y + 0.03}" width=".94" height=".94" rx=".1"/>`); }
  // Piezas
  const rot = flip ? 180 : 0;
  for (let i = 0; i < N; i++) {
    const p = st.board[i];
    if (!p) continue;
    const [x, y] = place(i, flip);
    out.push(`<g class="pc o${p >> 2 & 3}" id="kpc-${i}" data-x="${x}" data-y="${y}" transform="translate(${x} ${y})">${pieceSVG(p, rot)}</g>`);
  }
  // La pieza que el láser va a destruir: se ve hasta que le pega (fx la quita)
  if (doomed) {
    const [x, y] = place(doomed.i, flip);
    out.push(`<g class="pc doomed" id="kdoomed" transform="translate(${x} ${y})">${pieceSVG(doomed.code, rot)}</g>`);
  }
  // Destinos
  for (const t of targets) {
    const [x, y] = place(t.i, flip);
    out.push(t.swap
      ? `<rect class="tgt swap" x="${x + 0.08}" y="${y + 0.08}" width=".84" height=".84" rx=".14"/>`
      : `<circle class="tgt" cx="${x + 0.5}" cy="${y + 0.5}" r=".13"/>`);
  }
  if (cursor >= 0) { const [x, y] = place(cursor, flip); out.push(`<rect class="cursor" x="${x + 0.02}" y="${y + 0.02}" width=".96" height=".96" rx=".1"/>`); }
  // Zonas para tocar
  if (playable) for (let i = 0; i < N; i++) {
    const [x, y] = place(i, flip);
    out.push(`<rect class="hit" data-cell="${i}" x="${x}" y="${y}" width="1" height="1"/>`);
  }
  out.push(`</svg>`);
  return out.join("");
}

export { TEAM };
