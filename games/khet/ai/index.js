// La compu del láser. Recibe la vista (en este juego es todo: no hay nada oculto).
//
// Busca con alfa-beta sobre las jugadas de los dos (cada jugada ya incluye su disparo):
//   · Fácil: piensa solo su jugada (1 de profundidad), con bastante ruido; a veces no ve que su faraón queda expuesto.
//   · Normal: su jugada y la respuesta del otro (2): no deja al faraón a tiro y aprovecha lo que le regalan.
//   · Difícil: 3 jugadas (la suya, la respuesta y la siguiente suya): arma ataques de dos tiempos.
import {
  N, PYRAMID, SCARAB, ANUBIS, PHARAOH, SPHINX, typeOf, ownerOf, rc, step, movesFor, traceBeam, other, sq, theName,
} from "../engine/index.js";

export const STYLES = {
  facil: { name: "Fácil", depth: 1, noise: 6, blunder: 0.25 },
  normal: { name: "Normal", depth: 2, noise: 1.5, blunder: 0 },
  dificil: { name: "Difícil", depth: 3, noise: 0.4, blunder: 0 },
};

const WIN = 100000;
const VALUE = { [PYRAMID]: 100, [ANUBIS]: 130, [SCARAB]: 0, [PHARAOH]: 0, [SPHINX]: 0 };

// Puntos de la posición para `seat`: material, escudo alrededor del faraón y amenaza del láser propio.
export function evaluate(board, seat) {
  let score = 0;
  const ph = [-1, -1];
  for (let i = 0; i < N; i++) {
    const p = board[i];
    if (!p) continue;
    const t = typeOf(p), s = ownerOf(p) === seat ? 1 : -1;
    score += s * VALUE[t];
    if (t === PHARAOH) ph[ownerOf(p)] = i;
  }
  // Piezas propias pegadas al faraón: lo cubren de rayos
  for (const owner of [0, 1]) {
    if (ph[owner] < 0) continue;
    const [r, c] = rc(ph[owner]);
    let guard = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 9) { guard += 0.5; continue; }
      const q = board[nr * 10 + nc];
      if (q && ownerOf(q) === owner) guard += dr && dc ? 0.5 : 1;
    }
    score += (owner === seat ? 1 : -1) * guard * 6;
  }
  // Hasta dónde llega el láser de cada uno sin moverse: si pega en una pieza enemiga, es una amenaza
  for (const owner of [0, 1]) {
    const b = traceBeam(board, owner);
    if (b.end !== "kill") continue;
    const victim = ownerOf(b.hit);
    const w = typeOf(b.hit) === PHARAOH ? 400 : VALUE[typeOf(b.hit)] * 0.3;
    score += (owner === seat ? 1 : -1) * (victim === owner ? -w : w);
  }
  return score;
}

// Orden de búsqueda: primero lo que destruye algo, luego lo demás
function ordered(board, seat) {
  const out = [];
  for (const a of movesFor(board, seat)) {
    const r = step(board, seat, a);
    let k = 0;
    if (r.loser >= 0) k = r.loser === seat ? -WIN : WIN;
    else if (r.killed) k = (ownerOf(r.killed) === seat ? -1 : 1) * VALUE[typeOf(r.killed)];
    out.push({ a, r, k });
  }
  out.sort((x, y) => y.k - x.k);
  return out;
}

// Negamax con alfa-beta. Devuelve el valor para `seat` (quien tira) de ese tablero.
function search(board, seat, depth, alpha, beta, ply) {
  if (depth === 0) return evaluate(board, seat);
  const moves = ordered(board, seat);
  if (!moves.length) return evaluate(board, seat);
  let best = -Infinity;
  for (const { r } of moves) {
    let v;
    if (r.loser >= 0) v = r.loser === seat ? -(WIN - ply) : WIN - ply;
    else v = -search(r.board, other(seat), depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

// Todas las jugadas de `seat` con su valor (de mayor a menor)
export function scoreMoves(v, seat, depth, rnd = () => 0, noise = 0) {
  const moves = ordered(v.board, seat);
  const out = [];
  for (const { a, r } of moves) {
    let val;
    if (r.loser >= 0) val = r.loser === seat ? -WIN : WIN;
    else if (depth <= 1) val = evaluate(r.board, seat);
    else val = -search(r.board, other(seat), depth - 1, -Infinity, Infinity, 1);
    val += noise ? (rnd() - 0.5) * 2 * noise : 0;
    out.push({ a, val, r });
  }
  out.sort((x, y) => y.val - x.val);
  return out;
}

export function decide(v, seat, profile = "normal", rnd = () => 0) {
  if (v.phase !== "play" || v.turn !== seat) return null;
  const style = STYLES[profile] || STYLES.normal;
  const list = scoreMoves(v, seat, style.depth, rnd, style.noise);
  if (!list.length) return null;
  // La fácil a veces toma una jugada cualquiera que no se mata sola
  if (style.blunder && rnd() < style.blunder) {
    const ok = list.filter((x) => x.r.loser !== seat);
    if (ok.length) return ok[Math.floor(rnd() * ok.length) % ok.length].a;
  }
  return list[0].a;
}

// Consejo: la jugada de la compu normal, con una explicación corta
export function advise(v, seat) {
  if (v.phase !== "play" || v.turn !== seat) return null;
  const list = scoreMoves(v, seat, 2);
  if (!list.length) return null;
  const { a, r, val } = list[0];
  let why;
  if (r.loser === other(seat)) why = "¡Tu láser le da al faraón enemigo!";
  else if (r.killed && ownerOf(r.killed) !== seat) why = `Tu láser destruye ${theName(typeOf(r.killed))} de ${sq(r.beam.at)}.`;
  else if (val < -WIN / 2) why = "Todas las jugadas pierden; esta aguanta lo más posible.";
  else if (val < -50) why = "Te van a quitar algo; esta jugada es la que menos pierde.";
  else why = "Deja a tu faraón cubierto y prepara el siguiente disparo.";
  return { action: a, why };
}

// Para el reloj: la jugada de la compu fácil sin ruido
export const quickMove = (v, seat) => (scoreMoves(v, seat, 1)[0] || {}).a || null;
