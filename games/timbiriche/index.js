// El timbiriche conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y
// la compu en ai/.
//
// Acciones: { type: "line", line: "h:r:c" | "v:r:c" } trazar una raya (engine/index.js explica los nombres).
// El reloj, si la mesa lo lleva, da config.secs segundos por raya; al vencerse cierra una caja si se puede (así
// nunca castiga) o traza la raya que menos regala (engine autoAction).
import manifest from "./manifest.js";
import { newGame, legalActions, apply as applyMove, autoAction, RULES } from "./engine/index.js";
import { decide, advise, STYLES } from "./ai/index.js";

const num = (x, d) => (x === undefined || x === null || x === "" ? d : Number(x));

function setup(config, { now }) {
  return newGame({
    n: config.n ?? 2,
    size: num(config.size, RULES.defaultSize),
    secs: num(config.secs, RULES.defaultSecs),
    penalty: config.penalty !== "off" && config.penalty !== false,
    timer: config.timer !== false,
  }, config.names || [], now);
}

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  thinkMs: () => 700, // una pausa para que se alcance a ver la raya anterior
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
  result: (st) => ({ winner: st.winner, draw: st.draw, champions: st.winners.slice(), scores: st.scores.slice() }),
  timing: {
    turnMs: (st) => (st.phase !== "over" && st.config.timer !== false ? st.config.secs * 1000 : null),
    autoAction: (st) => autoAction(st),
  },
  bots,
  advise: (v, seat) => advise(v, seat),
  ui: () => import("./ui/index.js"),
};
