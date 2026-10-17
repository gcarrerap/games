// Piojos conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/.
//
// Acciones: { type: "roll" } tirar los dados que quedan · { type: "bank" } plantarse con lo del turno.
// El reloj, al vencerse, aplica una de esas dos (engine autoAction), así queda grabado como cualquier jugada.
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, autoAction, RULES } from "./engine/index.js";
import { decide, STYLES } from "./ai/index.js";

function setup(config, { now }) {
  const c = { n: config.n, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de Piojos no válida");
  return newGame(c, config.names || [], now);
}

const timerOn = (st) => st.config.timer !== false;

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  // Una pausa para que se alcance a ver el tiro
  thinkMs: (v) => (v.phase === "roll" ? 900 : 1300),
  heavy: false,
};

export default {
  ...manifest,
  setup,
  currentSeats: (st) => (st.phase === "over" ? [] : [st.turn]),
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view: (st) => st, // no hay nada oculto: todos ven los dados y los marcadores
  isOver: (st) => st.phase === "over",
  result: (st) => ({ scores: st.scores.slice(), winner: st.winner, champions: st.winner === null ? [] : [st.winner], goal: st.config.goal }),
  timing: {
    turnMs: (st) => (st.phase !== "over" && timerOn(st) ? RULES.turnMs : null),
    autoAction: (st) => autoAction(st),
  },
  bots,
  ui: () => import("./ui/index.js"),
};
