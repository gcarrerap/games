// Cucharas conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/.
//
// Acciones: { type: "swap", c, slot } cambiar tu carta c por la del espacio slot · { type: "spoon" } tomar cuchara ·
// { type: "wait" } no hacer nada (la compu, mientras espera) · { type: "next" } repartir la siguiente ronda.
// No hay límite de tiempo: el juego no declara `timing`.
//
// Es un juego en tiempo real (`realtime` en el manifiesto): durante la ronda todos los que siguen sin cuchara
// actúan a la vez. Entre rondas hay una pausa (currentSeats vacío) y cualquiera que siga en el juego reparte.
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, view, ranking, aliveSeats, hasSpoon } from "./engine/index.js";
import { decide, thinkMs, STYLES } from "./ai/index.js";

function setup(config, ctx) {
  const c = { n: config.n, table: config.table || "open" };
  if (!validConfig(c)) throw new Error("Configuración de Cucharas no válida");
  return newGame(c, config.names || [], ctx);
}

const acting = (st) => (st.phase === "play" ? aliveSeats(st).filter((s) => !hasSpoon(st, s)) : []);

export default {
  ...manifest,
  setup,
  currentSeats: acting,
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view,
  isOver: (st) => st.phase === "over",
  result: (st) => ({ chips: st.chips.slice(), winner: st.winner, champions: st.winner === null ? [] : [st.winner], ranking: ranking(st) }),
  bots: {
    profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
    decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
    thinkMs: (v, seat, now, profile) => thinkMs(v, seat, now, profile),
    heavy: false,
  },
  ui: () => import("./ui/index.js"),
};
