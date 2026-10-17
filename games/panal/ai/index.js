// La compu de Panal. Solo recibe la vista (en este juego no hay nada oculto: las reservas están a la vista).
//
// Califica cada posición desde un asiento:
//   - lados ocupados alrededor de la reina rival (bueno) y de la propia (malo, un poco más);
//   - fichas que se pueden mover: las que no unen dos partes de la colmena y no están tapadas (las encerradas no
//     sirven); la hormiga y el mayate libres valen más;
//   - un mayate encima de la reina rival la deja sin moverse.
// Fácil y Normal miran una jugada adelante (con más o menos dudas, modules/choice). Difícil mira también la mejor
// respuesta del rival a sus mejores jugadas.
import { legalActions, apply as applyMove, queenAt, topOf, heightOf } from "../engine/index.js";
import { neighbors, cutCells } from "../engine/hex.js";
import { chooseIndex } from "../../../modules/choice/index.js";

export const STYLES = {
  facil: { name: "Fácil", azar: { ventana: 4, temperatura: 1.2, escala: 5 }, depth: 1 },
  normal: { name: "Normal", azar: { ventana: 0.6, temperatura: 0.4, escala: 5 }, depth: 1 },
  dificil: { name: "Difícil", azar: { ventana: 0.25, temperatura: 0.3, escala: 5 }, depth: 2, width: 12 },
};

const WIN = 10000;
const MOBILE = { reina: 1, mayate: 2.2, chapulin: 1.6, hormiga: 3, arana: 1.4 };

// Qué tan buena es la posición para `seat`
export function evaluate(st, seat) {
  if (st.phase === "over") return st.draw ? 0 : st.winner === seat ? WIN : -WIN;
  const cells = st.cells, opp = 1 - seat;
  let score = 0;
  const qMe = queenAt(cells, seat), qOpp = queenAt(cells, opp);
  if (qOpp) {
    score += 14 * neighbors(qOpp).filter((n) => cells[n]).length;
    const t = topOf(cells, qOpp);
    if (t.p === seat) score += 8; // un mayate mío encima de su reina
  }
  if (qMe) {
    score -= 17 * neighbors(qMe).filter((n) => cells[n]).length;
    if (topOf(cells, qMe).p === opp) score -= 10;
    // La reina propia con salida vale algo
    if (topOf(cells, qMe).k === "reina" && heightOf(cells, qMe) === 1) score += 1.5 * neighbors(qMe).filter((n) => !cells[n]).length * 0.3;
  }
  const cut = cutCells(new Set(Object.keys(cells)));
  for (const k in cells) {
    const t = topOf(cells, k);
    const free = heightOf(cells, k) > 1 || !cut.has(k);
    if (!free) continue;
    score += (t.p === seat ? 1 : -1) * MOBILE[t.k];
  }
  // Tener la reina puesta pronto permite mover
  if (!qMe && st.placed[seat] >= 2) score -= 4;
  return score;
}

function scored(st, seat, acts) {
  return acts.map((a) => evaluate(applyMove(st, seat, a), seat));
}

// Lo peor que me puede hacer el rival después de mi jugada (su mejor respuesta, desde mi lado)
function replyScore(st, seat) {
  if (st.phase === "over") return evaluate(st, seat);
  const opp = 1 - seat;
  let worst = Infinity;
  for (const a of legalActions(st, opp)) {
    const v = evaluate(applyMove(st, opp, a), seat);
    if (v < worst) worst = v;
    if (worst <= -WIN) break;
  }
  return worst === Infinity ? evaluate(st, seat) : worst;
}

export function decide(v, seat, style = "normal", rnd = () => 0.5) {
  if (v.phase === "over" || v.turn !== seat) return null;
  const acts = legalActions(v, seat);
  if (acts.length === 1) return acts[0];
  const s = STYLES[style] || STYLES.normal;
  let scores = scored(v, seat, acts);
  // Si alguna jugada gana, esa
  const win = scores.findIndex((x) => x >= WIN);
  if (win >= 0) return acts[win];
  if (s.depth >= 2) {
    const order = scores.map((x, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, s.width);
    const deep = order.map((i) => replyScore(applyMove(v, seat, acts[i]), seat));
    return acts[order[chooseIndex(deep, s.azar, rnd)]];
  }
  return acts[chooseIndex(scores, s.azar, rnd)];
}

// Consejo: lo que haría la compu difícil, sin dudas
export function advise(v, seat) {
  const a = decide(v, seat, "dificil", () => 0);
  return a ? { action: a } : null;
}
