// La compu de las damas chinas. Recibe la vista (que en este juego es todo: no hay nada oculto).
//
// Califica cada jugada por cuánto acerca la canica al vértice de su meta, y le suma:
//   · un premio por mover las canicas rezagadas (así el grupo avanza junto y hay más puentes para saltar),
//   · al final, un premio por acercarse al hoyo libre más cercano de la meta (para no quedarse dando vueltas
//     afuera cuando el vértice ya está lleno),
//   · un castigo por deshacer su jugada anterior.
// La difícil además mira su siguiente jugada (sin contar lo que hagan los demás): prefiere la que le deja un buen
// salto para después. Cada estilo agrega un poco de duda, para que no juegue siempre igual.
import { DIST, CORNERS, CORNER_OF, legalActions, piecesOf, destinations, distance } from "../engine/index.js";

export const STYLES = {
  facil: { name: "Fácil", noise: 2.2, lookahead: false, straggler: 0 },
  normal: { name: "Normal", noise: 0.5, lookahead: false, straggler: 0.25 },
  dificil: { name: "Difícil", noise: 0.15, lookahead: true, straggler: 0.3 },
};

// Lo que le falta a la canica más cercana para entrar a un hoyo libre de la meta
function toHole(board, target, cell) {
  let best = Infinity;
  for (const h of CORNERS[target]) if (board[h] === -1) best = Math.min(best, distance(cell, h));
  return best === Infinity ? 0 : best;
}

// Puntaje de una jugada (sin azar)
export function score(v, seat, path, style = STYLES.normal) {
  const k = v.targets[seat], d = DIST[k];
  const from = path[0], to = path[path.length - 1];
  let s = d[from] - d[to];
  // Rezagadas: cuánto más lejos está esta canica que el promedio de las suyas
  if (style.straggler) {
    const mine = piecesOf(v, seat), avg = mine.reduce((a, i) => a + d[i], 0) / mine.length;
    s += style.straggler * Math.max(0, d[from] - avg) / 4;
  }
  // Hacia un hoyo libre de la meta: cuenta poco, solo desempata cuando avanzar ya no se puede
  if (CORNER_OF[to] !== k || CORNER_OF[from] !== k) {
    const after = v.board.slice(); after[from] = -1; after[to] = seat;
    s += 0.3 * (toHole(v.board, k, from) - toHole(after, k, to));
  }
  const prev = v.prev && v.prev[seat];
  if (prev && prev.from === to && prev.to === from) s -= 2;
  return s;
}

// La mejor ganancia que le quedaría en su siguiente turno si nadie más moviera
function bestFollowUp(v, seat, path) {
  const from = path[0], to = path[path.length - 1];
  const board = v.board.slice(); board[from] = -1; board[to] = seat;
  const after = { ...v, board, prev: v.prev ? v.prev.map((p, s) => (s === seat ? { from, to } : p)) : null };
  const d = DIST[v.targets[seat]];
  let best = 0;
  for (const a of piecesOf(after, seat)) {
    for (const p of Object.values(destinations(after, seat, a))) best = Math.max(best, d[a] - d[p[p.length - 1]]);
  }
  return best;
}

export function decide(v, seat, styleId = "normal", rnd = () => 0.5) {
  if (v.phase === "over" || v.turn !== seat) return null;
  const acts = legalActions(v, seat);
  if (acts[0].type === "pass") return acts[0];
  const style = STYLES[styleId] || STYLES.normal;
  let ranked = acts.map((a) => ({ a, s: score(v, seat, a.path, style) + style.noise * (rnd() - 0.5) }));
  ranked.sort((x, y) => y.s - x.s);
  if (style.lookahead) {
    ranked = ranked.slice(0, 8).map((r) => ({ a: r.a, s: r.s + 0.5 * bestFollowUp(v, seat, r.a.path) }));
    ranked.sort((x, y) => y.s - x.s);
  }
  return ranked[0].a;
}
