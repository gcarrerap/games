// La Viuda conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y
// la compu en ai/.
//
// Acciones: { type: "all" } tomar las 5 de la viuda (a ciegas en la primera ronda) · { type: "swap", give, take }
// cambiar una · { type: "knock" } tocar · { type: "pass" } pasar · { type: "next" } repartir la siguiente mano
// (cualquier asiento, entre manos). El reloj, al vencerse, aplica una de esas (engine autoAction).
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, autoAction, isPlaying, RULES } from "./engine/index.js";
import { decide, STYLES } from "./ai/index.js";

function setup(config, { now, rnd }) {
  const c = { n: config.n, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de La Viuda no válida");
  return newGame(c, config.names || [], now, rnd);
}

const timerOn = (st) => st.config.timer !== false;

// Cada quien ve su mano; de los demás, cuántas cartas tienen. La viuda tapada no se ve. Al mostrar las manos, todo
// queda en showdown.
function view(st, seat) {
  return {
    ...st,
    hands: st.hands.map((h, s) => (s === seat ? h.slice() : h.length)),
    widow: st.phase === "blind" ? null : st.widow.slice(),
    widowCount: st.widow.length,
  };
}

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  thinkMs: (v) => (v.phase === "blind" ? 1100 : 1500),
  heavy: false,
};

export default {
  ...manifest,
  setup,
  currentSeats: (st) => (isPlaying(st) ? [st.turn] : []),
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view,
  isOver: (st) => st.phase === "over",
  result: (st) => ({ chips: st.chips.slice(), winner: st.winner, champions: st.winner === null ? [] : [st.winner], hands: st.hand }),
  timing: {
    turnMs: (st) => (isPlaying(st) && timerOn(st) ? RULES.turnMs : null),
    autoAction: (st) => autoAction(st),
  },
  bots,
  ui: () => import("./ui/index.js"),
};
