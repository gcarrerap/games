// El tablero de damas chinas en SVG: la estrella, las puntas teñidas con el color de quien sale o llega, los hoyos,
// las canicas, la última jugada y, si escogiste una canica, a dónde puede ir.
//
// El tablero se gira para que tu punta quede abajo (múltiplos de 60°, así las filas siguen horizontales).
import { CELLS, PIXEL, CORNERS, APEX, DIST, CORNER_ANGLE } from "../engine/index.js";

const R = 12; // distancia del centro al vértice de una punta, en unidades de la rejilla
const fx = (n) => n.toFixed(2);

// Los dos hoyos de las esquinas de la base de cada punta (los de distancia 3 al vértice más separados)
const BASE = CORNERS.map((cells, k) => {
  const row = cells.filter((i) => DIST[k][i] === 3).sort((a, b) => PIXEL[a].px - PIXEL[b].px || PIXEL[a].py - PIXEL[b].py);
  return [row[0], row[row.length - 1]];
});

// Contorno de la estrella: los seis vértices y, entre cada dos, la esquina del hexágono del centro (que en la
// rejilla queda justo en un tercio de la suma de los dos vértices)
const STAR = (() => {
  const pts = [];
  APEX.forEach((a, k) => {
    const b = APEX[(k + 1) % 6];
    pts.push(PIXEL[a], { px: (PIXEL[a].px + PIXEL[b].px) / 3, py: (PIXEL[a].py + PIXEL[b].py) / 3 });
  });
  return pts.map((p) => `${fx(p.px)},${fx(p.py)}`).join(" ");
})();

const triangle = (k) => [APEX[k], ...BASE[k]].map((i) => `${fx(PIXEL[i].px)},${fx(PIXEL[i].py)}`).join(" ");

// Giro del tablero para que la punta `home` quede abajo
export const rotationFor = (home) => Math.round(90 - CORNER_ANGLE[home]);

/**
 * opts: { me: asiento que mira (o -1), sel: hoyo escogido o null, dests: { hoyo: camino } de la canica escogida,
 *         movable: hoyos de tus canicas que se pueden mover, fresh: la última jugada es nueva (para animarla) }
 */
export function boardSVG(st, { me = -1, sel = null, dests = {}, movable = [], fresh = false } = {}) {
  const home = st.homes[me >= 0 ? me : 0];
  const rot = rotationFor(home);
  const tints = [];
  st.homes.forEach((k, s) => {
    tints.push(`<polygon class="tint home c${s}" points="${triangle(k)}"/>`);
    if (!st.homes.includes(st.targets[s])) tints.push(`<polygon class="tint goal c${s}" points="${triangle(st.targets[s])}"/>`);
  });
  const last = st.last && st.last.path.length > 1 ? st.last : null;
  const lastLine = last
    ? `<polyline class="lastpath under" points="${last.path.map((i) => `${fx(PIXEL[i].px)},${fx(PIXEL[i].py)}`).join(" ")}"/>
       <polyline class="lastpath c${last.seat}" points="${last.path.map((i) => `${fx(PIXEL[i].px)},${fx(PIXEL[i].py)}`).join(" ")}"/>
       <circle class="lastfrom c${last.seat}" cx="${fx(PIXEL[last.path[0]].px)}" cy="${fx(PIXEL[last.path[0]].py)}" r="0.42"/>`
    : "";
  const movableSet = new Set(movable);
  const holes = [], marbles = [], targets = [];
  CELLS.forEach((_, i) => {
    const { px, py } = PIXEL[i];
    holes.push(`<circle class="hole" cx="${fx(px)}" cy="${fx(py)}" r="0.5"/>`);
    const s = st.board[i];
    if (s >= 0) {
      const cls = ["marble", `c${s}`];
      if (i === sel) cls.push("sel");
      else if (movableSet.has(i)) cls.push("can");
      if (last && i === last.path[last.path.length - 1]) cls.push(fresh ? "moved fresh" : "moved");
      marbles.push(`<g class="${cls.join(" ")}" data-cell="${i}" transform="translate(${fx(px)} ${fx(py)})">
        <circle class="hit" r="0.86"/><circle class="body" r="0.72"/><circle class="shine" cx="-0.22" cy="-0.24" r="0.22"/></g>`);
    }
  });
  for (const to of Object.keys(dests)) {
    const { px, py } = PIXEL[to];
    targets.push(`<g class="dest" data-dest="${to}" transform="translate(${fx(px)} ${fx(py)})"><circle class="hit" r="0.86"/><circle class="ring" r="0.6"/></g>`);
  }
  // Con tu punta abajo, la estrella mide R hacia arriba y abajo y R·cos 30° hacia los lados (más el borde)
  const h = R + 1.4, w = R * Math.cos(Math.PI / 6) + 1.4;
  return `<svg class="cc-board" viewBox="${fx(-w)} ${fx(-h)} ${fx(2 * w)} ${fx(2 * h)}" role="img" aria-label="Tablero de damas chinas">
    <g transform="rotate(${rot})">
      <polygon class="star" points="${STAR}"/>
      ${tints.join("")}
      ${holes.join("")}
      ${lastLine}
      ${marbles.join("")}
      ${targets.join("")}
    </g>
  </svg>`;
}
