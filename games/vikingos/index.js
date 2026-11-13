// Vikingos conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu (el solucionador) en ai/.
//
// Es un rompecabezas para uno: { type: "pick", n } escoge el reto, { type: "rotate", piece, turns } gira una pieza
// con su barco, y además "undo", "reset" y "choose" (engine/index.js). No hay reloj ni nada oculto.
import manifest from "./manifest.js";
import { newGame, legalActions, apply as applyMove, result } from "./engine/index.js";
import { decide, advise, STYLES } from "./ai/index.js";

export default {
  ...manifest,
  setup: (config) => newGame(config, config.names || []),
  currentSeats: (st) => (st.phase === "over" ? [] : [0]),
  legalActions: (st, seat) => (seat === 0 ? legalActions(st) : []),
  apply: (st, seat, action) => applyMove(st, seat, action),
  view: (st) => st, // no hay nada oculto
  isOver: (st) => st.phase === "over",
  result,
  bots: {
    profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
    decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
    thinkMs: () => 900, // para que se alcance a ver cada giro
    heavy: true, // en los retos difíciles, resolver puede tardar alrededor de un segundo
  },
  advise: (v, seat) => advise(v, seat),
  ui: () => import("./ui/index.js"),
};
