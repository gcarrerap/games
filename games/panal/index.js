// Panal conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/.
//
// Acciones: { type: "place", kind, to: "q,r" } poner un bicho · { type: "move", from, to } mover uno ·
// { type: "pass" } solo si no hay nada más. Al vencerse el reloj se aplica lo que haría la compu normal.
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, RULES } from "./engine/index.js";
import { decide, advise, STYLES } from "./ai/index.js";

function setup(config, { now }) {
  const c = { n: 2, timer: config.timer !== false };
  if (!validConfig({ n: config.n ?? 2 })) throw new Error("Panal es para 2 jugadores");
  return newGame(c, config.names || [], now);
}

const timerOn = (st) => st.config.timer !== false;

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  thinkMs: () => 900,
  heavy: true,
};

export default {
  ...manifest,
  setup,
  currentSeats: (st) => (st.phase === "over" ? [] : [st.turn]),
  legalActions,
  apply: (st, seat, action) => applyMove(st, seat, action),
  view: (st) => st, // no hay nada oculto: la colmena y las reservas están a la vista
  isOver: (st) => st.phase === "over",
  result: (st) => ({ winner: st.winner, draw: st.draw, champions: st.winner === null ? [] : [st.winner] }),
  timing: {
    turnMs: (st) => (st.phase !== "over" && timerOn(st) ? RULES.turnMs : null),
    autoAction: (st) => decide(st, st.turn, "normal", () => 0),
  },
  bots,
  advise: (v, seat) => advise(v, seat),
  ui: () => import("./ui/index.js"),
};
