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
  // Espera a que se vea lo anterior: los dados en el aire (~1.3 s), los piojos yendo a la repisa, o el "sin piojos"
  thinkMs: (v) => (v.phase === "choose" ? 2600 : !v.last ? 1000 : v.last.kind === "bust" ? 2600 : 1700),
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
