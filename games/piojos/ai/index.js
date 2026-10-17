// La compu de Piojos. Solo recibe la vista (que en este juego es todo: no hay nada oculto).
//
// Regla de un paso: seguir tirando con k dados vale la pena si lo que se espera ganar en ese tiro es mayor que lo
// que se espera perder. Ganancia esperada con k dados = k × (suma de valores / 6). Pérdida esperada = P(sin piojos)
// × lo del turno. Así se planta cuando lo del turno pasa de un límite = ganancia / P(sin piojos). Cada estilo
// multiplica ese límite (prudente lo baja, arriesgado lo sube), y se arriesga más si alguien está por ganar.
import { RULES, FACES, bustChance } from "../engine/index.js";

export const STYLES = {
  prudente: { name: "Prudente", risk: 0.5 },
  normal: { name: "Normal", risk: 1 },
  arriesgado: { name: "Arriesgado", risk: 2 },
};

const meanPerDie = () => Object.values(RULES.values).reduce((a, b) => a + b, 0) / FACES.length;

// Hasta cuántos puntos del turno conviene seguir tirando con k dados (sin estilo)
export const limitFor = (k) => (k * meanPerDie()) / bustChance(k);

export function decide(v, seat, style = "normal", rnd = () => 0.5) {
  if (v.phase === "over" || v.turn !== seat) return null;
  if (v.phase === "roll") return { type: "roll" };
  const goal = v.config.goal, mine = v.scores[seat];
  if (mine + v.turnPts >= goal) return { type: "bank" }; // con plantarse gana
  const best = Math.max(...v.scores.filter((_, s) => s !== seat));
  const s = STYLES[style] || STYLES.normal;
  let risk = s.risk * (0.85 + 0.3 * rnd());
  // Si alguien está a un buen turno de ganar y yo voy lejos, hay que arriesgar
  if (goal - best <= 60 && goal - mine > goal - best) risk *= 3;
  return v.turnPts < limitFor(v.dice) * risk ? { type: "roll" } : { type: "bank" };
}
