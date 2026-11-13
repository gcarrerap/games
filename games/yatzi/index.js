// Yatzi conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/.
//
// Acciones: { type: "roll", keep: [5 × boolean] } tirar (los apartados se quedan) · { type: "score", cat } anotar.
// El reloj, al vencerse, tira si no has tirado o anota lo que más te da (engine autoAction).
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, autoAction, totals, RULES } from "./engine/index.js";
import { decide, advise, STYLES } from "./ai/index.js";

function setup(config, { now }) {
  const c = { n: config.n, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de Yatzi no válida");
  return newGame(c, config.names || [], now);
}

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  // Espera a que los dados dejen de rodar (ui/tray.js tarda ~1.3 s) y a que se vea lo que anotó
  thinkMs: (v) => (v.rolls === 0 ? (v.last ? 1700 : 1000) : 2000),
  heavy: false,
};

export default {
  ...manifest,
  setup,
  currentSeats: (st) => (st.phase === "over" ? [] : [st.turn]),
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view: (st) => st, // no hay nada oculto
  isOver: (st) => st.phase === "over",
  result: (st) => ({ scores: totals(st), winner: st.winner, draw: st.winner === null, champions: st.winners.slice() }),
  timing: {
    turnMs: (st) => (st.phase !== "over" && st.config.timer !== false ? RULES.turnMs : null),
    autoAction: (st) => autoAction(st),
  },
  bots,
  advise: (v, seat) => advise(v, seat),
  ui: () => import("./ui/index.js"),
};
