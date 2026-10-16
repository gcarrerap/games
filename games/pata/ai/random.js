// Azar de la compu: para que no juegue siempre igual, sin que eso la haga jugar al tanteo.
//
// El azar sale de una semilla hecha solo con datos públicos de la mesa (la partida, la ronda, el turno, el asiento y
// cuántas jugadas van). Así:
//   - Ante la misma mesa, la compu decide lo mismo: el teléfono principal y el de respaldo coinciden, y la prueba de
//     que no hace trampa (revolver lo que no puede ver no cambia su jugada) sigue valiendo.
//   - Entre partidas, turnos y asientos, la semilla cambia y con ella las decisiones parejas.
//
// Dos usos:
//   1. Personalidad (personalize): al empezar cada partida, cada compu recibe pequeñas variaciones de sus
//      parámetros (qué tanto cuida el descarte, cuándo se arriesga con especiales). Dos compus del mismo nivel no
//      juegan igual y la misma compu no juega igual en la siguiente partida.
//   2. Votación del descarte (heuristics.js, chooseDiscard): cuando varias cartas son casi igual de buenas, escoge
//      entre ellas al azar, con más peso a la mejor. Las que son claramente peores nunca entran.
// Las reglas de sentido común (no tirar comodines, no ensuciar la limpia que falta, no irse con una especial
// incompleta) no tienen azar.

// Hash FNV-1a y generador mulberry32 de modules/random (los mismos que tenía este archivo en myPata)
import { seededRandom } from "../../../modules/random/index.js";
import { chooseIndex } from "../../../modules/choice/index.js";
export { seededRandom };

// Azar para una decisión: cambia con cada jugada, pero solo depende de lo público
export const decisionRandom = (st, seat) =>
  seededRandom(["d", st.gameId, st.roundNo, st.hand.turns, st.hand.history.length, st.hand.phase, seat].join("|"));

// Personalidad de una compu en esta partida: copia de sus parámetros con variaciones pequeñas
export function personalize(t, st, seat) {
  const s = t.jitter || 0;
  if (!s) return t;
  const r = seededRandom(["p", st.gameId, seat].join("|"));
  const scale = (x) => x * (1 + s * (2 * r() - 1)); // ±s
  const step = (x, lo, hi) => Math.min(hi, Math.max(lo, x + [-1, 0, 0, 1][Math.floor(r() * 4)])); // −1, 0 o +1
  const p = { ...t };
  if (p.danger) p.danger = scale(p.danger);
  if (p.known) p.known = scale(p.known);
  if (p.wildFrom) p.wildFrom = step(p.wildFrom, 3, 6);
  if (p.lateAt) p.lateAt = step(p.lateAt, 4, 8);
  if (p.wildShare) p.wildShare = scale(p.wildShare);
  if (p.red3Share) p.red3Share = scale(p.red3Share);
  return p;
}

// Escoge entre opciones con puntaje (más bajo = mejor): solo las que están a no más de `slack` de la mejor, con
// peso exp(−diferencia / temp). Sin azar (rnd null) o sin margen, la mejor.
// Es la misma regla que usa el dominó: se hace con modules/choice (que trabaja con "más alto = mejor", por eso los
// puntajes van con signo cambiado, y en las mismas unidades: escala 1). tests/games/pata/vote.test.js comprueba
// que escoge lo mismo que la versión que tenía myPata.
export function vote(scored, slack, temp, rnd) {
  const best = scored.reduce((b, x) => (x.score < b.score ? x : b));
  if (!rnd || !slack) return best;
  return scored[chooseIndex(scored.map((x) => -x.score), { ventana: slack, temperatura: temp || 1, escala: 1 }, rnd)];
}
