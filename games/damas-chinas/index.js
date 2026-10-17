// Las damas chinas conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en
// engine/ y la compu en ai/.
//
// Acciones: { type: "move", path: [desde, …, hasta] } mover una canica (un paso o una cadena de saltos; los
// números son hoyos del tablero, engine/board.js) · { type: "pass" } solo si no hay ninguna jugada.
// El reloj, al vencerse, aplica la jugada que más acerca una canica a su meta (engine autoAction).
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, autoAction, standings, RULES } from "./engine/index.js";
import { decide, STYLES } from "./ai/index.js";

function setup(config, { now }) {
  const c = { n: config.n, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de damas chinas no válida");
  return newGame(c, config.names || [], now);
}

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  thinkMs: () => 800, // una pausa para que se alcance a ver la jugada anterior
  heavy: false,
};

export default {
  ...manifest,
  setup,
  currentSeats: (st) => (st.phase === "over" ? [] : [st.turn]),
  legalActions,
  apply: (st, seat, action) => applyMove(st, seat, action),
  view: (st) => st, // no hay nada oculto: todos ven el tablero
  isOver: (st) => st.phase === "over",
  result: (st) => ({ winner: st.winner, champions: st.winner === null ? [] : [st.winner], capped: st.capped, standings: standings(st) }),
  timing: {
    turnMs: (st) => (st.phase !== "over" && st.config.timer !== false ? RULES.turnMs : null),
    autoAction: (st) => autoAction(st),
  },
  bots,
  ui: () => import("./ui/index.js"),
};
