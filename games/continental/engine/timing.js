// Se acabó el tiempo del turno: el reloj roba del mazo si hace falta y descarta. Puro.
import { RULES } from "./config.js";
import { isWild, cardPoints } from "./cards.js";
import { apply } from "./moves.js";
import { pushLog, nameOf } from "./table.js";

export const limitMs = () => RULES.turnMs;

// La carta que descarta el reloj: la natural que más puntos cuesta (nunca un comodín si hay otra)
export function autoDiscard(hand) {
  const score = (c) => (isWild(c) ? -100 + cardPoints(c) : cardPoints(c));
  return hand.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

export function autoMove(st, env = {}) {
  if (!st || st.status !== "playing") return st;
  const seat = st.hand.turn;
  let s = st;
  if (s.hand.phase === "draw") s = apply(s, seat, { type: "draw" }, env);
  if (s.status === "playing" && s.hand.turn === seat && s.hand.phase === "play") {
    const c = autoDiscard(s.hand.hands[seat]);
    if (c) s = apply(s, seat, { type: "discard", card: c }, env);
  }
  if (s === st) return st;
  return { ...s, log: pushLog(s.log, `Se acabó el tiempo de ${nameOf(st, seat)}.`) };
}
