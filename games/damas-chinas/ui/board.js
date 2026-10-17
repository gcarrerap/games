// El tablero de damas chinas en SVG: la estrella, las puntas teñidas con el color de quien sale o llega, los hoyos,
// las canicas, la última jugada y, si escogiste una canica, a dónde puede ir.
//
// El tablero se gira para que tu punta quede abajo (múltiplos de 60°, así las filas siguen horizontales).
import { CELLS, PIXEL, APEX, CORNER_ANGLE } from "../engine/index.js";

const R = 12; // distancia del centro al vértice de una punta, en unidades de la rejilla
const fx = (n) => n.toFixed(2);

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

// Cada punta de la estrella pintada de un color. La punta va del vértice a las dos esquinas del hexágono del centro;
// su base se recorre medio renglón hacia afuera para no pintar los hoyos del hexágono. Se dibuja con el mismo borde
// redondo que la estrella (llega hasta su orilla) y se recorta para que no pase de su base ni se encime en sus vecinas.
const pt = (p) => `${fx(p.px)},${fx(p.py)}`;
const lerp = (a, b, t) => ({ px: a.px + (b.px - a.px) * t, py: a.py + (b.py - a.py) * t });
const TIPS = APEX.map((a, k) => {
  const A = PIXEL[a];
  const inner = (j) => ({ px: (PIXEL[APEX[j]].px + A.px) / 3, py: (PIXEL[APEX[j]].py + A.py) / 3 });
  const I1 = inner((k + 5) % 6), I2 = inner((k + 1) % 6);
  // De la orilla del hexágono al vértice hay 4 renglones: medio renglón es 1/8 del camino
  const B1 = lerp(I1, A, 0.125), B2 = lerp(I2, A, 0.125);
  // El recorte: del lado de afuera de la base, y entre las dos líneas que van del centro a cada esquina interior
  // (las que parten en dos el borde entre dos puntas), así el borde redondo de una no se encima en la vecina
  const ux = B2.px - B1.px, uy = B2.py - B1.py;
  const onRay = (I) => { const t = -(B1.px * I.py - B1.py * I.px) / (ux * I.py - uy * I.px); return { px: B1.px + ux * t, py: B1.py + uy * t }; };
  const Q1 = onRay(I1), Q2 = onRay(I2);
  const far = (Q) => ({ px: Q.px * 3, py: Q.py * 3 }); // sobre la misma línea que sale del centro
  const clip = [Q1, far(Q1), far(Q2), Q2];
  return { shape: [A, B1, B2].map(pt).join(" "), clip: clip.map(pt).join(" ") };
});

// El color de cada punta: la de salida de cada asiento con su color; una meta vacía (con 3 jugadores) con el color
// de quien va hacia ella; las demás con los colores que nadie usa, para que la estrella se vea completa.
export function cornerColors(st) {
  const out = Array(6).fill(-1);
  st.homes.forEach((k, s) => { out[k] = s; });
  st.targets.forEach((k, s) => { if (out[k] < 0) out[k] = s; });
  const free = [0, 1, 2, 3, 4, 5].filter((c) => !out.includes(c));
  return out.map((c) => (c >= 0 ? c : free.shift()));
}

// Giro del tablero para que la punta `home` quede abajo
export const rotationFor = (home) => Math.round(90 - CORNER_ANGLE[home]);

/**
 * opts: { me: asiento que mira (o -1), sel: hoyo escogido o null, dests: { hoyo: camino } de la canica escogida,
 *         movable: hoyos de tus canicas que se pueden mover, fresh: la última jugada es nueva (para animarla) }
 */
export function boardSVG(st, { me = -1, sel = null, dests = {}, movable = [], fresh = false } = {}) {
  const home = st.homes[me >= 0 ? me : 0];
  const rot = rotationFor(home);
  const colors = cornerColors(st);
  const defs = TIPS.map((t, k) => `<clipPath id="cc-tip-${k}"><polygon points="${t.clip}"/></clipPath>`).join("");
  // La silueta de la estrella (con su borde) como máscara: así el borde redondo de una punta no se sale de la madera
  const mask = `<mask id="cc-star" maskUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40"><polygon class="star-mask" points="${STAR}"/></mask>`;
  const tips = TIPS.map((t, k) => {
    const goalOnly = !st.homes.includes(k) && st.targets.includes(k);
    return `<polygon class="tip c${colors[k]}${goalOnly ? " goal" : ""}" points="${t.shape}" clip-path="url(#cc-tip-${k})"/>`;
  }).join("");
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
      <defs>${defs}${mask}</defs>
      <polygon class="star" points="${STAR}"/>
      <g mask="url(#cc-star)">${tips}</g>
      ${holes.join("")}
      ${lastLine}
      ${marbles.join("")}
      ${targets.join("")}
    </g>
  </svg>`;
}
