// La compu de Vikingos y el consejo. Las dos usan el solucionador (solve.js): la compu hace el siguiente paso de la
// solución más corta y el consejo dice cuál es y cuántos faltan. Solo reciben la vista (que aquí es todo el estado).
import { solve } from "./solve.js";
import { boardOfState, LEVELS } from "../engine/index.js";

export { solve };

export const STYLES = { vikinga: { name: "Vikinga" } };

const ARROW = { 1: "un cuarto de vuelta a la derecha ↻", 2: "media vuelta", 3: "un cuarto de vuelta a la izquierda ↺" };
const PIECE = ["de arriba a la izquierda", "de arriba al centro", "de arriba a la derecha", "de en medio a la izquierda",
  "del centro", "de en medio a la derecha", "de abajo a la izquierda", "de abajo al centro", "de abajo a la derecha"];

export const describeMove = (m) => `Gira la pieza ${PIECE[m.piece]} ${ARROW[m.turns]}`;

// La compu: en "pick" escoge un reto del nivel Inicial; jugando, el siguiente paso de la solución más corta
export function decide(v, seat, profile, rnd = () => 0) {
  if (seat !== 0 || v.phase === "over") return null;
  if (v.phase === "pick") {
    const l = LEVELS[0];
    return { type: "pick", n: l.from + Math.floor(rnd() * (l.to - l.from + 1)) };
  }
  const path = solve(boardOfState(v));
  if (!path) return v.history.length ? { type: "reset" } : { type: "choose" };
  if (!path.length) return null;
  return { type: "rotate", ...path[0] };
}

// Consejo: el siguiente giro de la solución más corta desde donde vas
export function advise(v, seat) {
  if (seat !== 0 || v.phase !== "play") return null;
  const path = solve(boardOfState(v));
  if (!path || !path.length) return null;
  const left = path.length;
  return {
    action: { type: "rotate", ...path[0] },
    why: `${describeMove(path[0])}. ${left === 1 ? "¡Con eso llegas!" : `Desde aquí se puede en ${left} movimientos.`}`,
    left,
  };
}
