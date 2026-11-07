// Cucharas conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/.
//
// Acciones: { type: "discard", c, slot } soltar una carta en un espacio vacío · { type: "take", slot } tomar una de
// la mesa · { type: "spoon" } tomar cuchara · { type: "tick" } resolver los límites del ritmo vencidos (lo aplica
// la plataforma al llegar la hora) · { type: "next" } repartir la siguiente ronda.
//
// Es un juego en tiempo real (`realtime` en el manifiesto): durante la ronda todos los que siguen sin cuchara
// actúan a la vez. Entre rondas hay una pausa (currentSeats vacío) y cualquiera que siga en el juego reparte.
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, view, ranking, nextDeadline, aliveSeats, hasSpoon } from "./engine/index.js";
import { decide, thinkMs, STYLES } from "./ai/index.js";

function setup(config, ctx) {
  const c = { n: config.n, pace: config.pace || "normal" };
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
  // El "reloj" son los límites del ritmo: cuando vence el siguiente, la plataforma aplica `tick`. Si ya venció, da
  // un número negativo para que se resuelva en el siguiente vistazo.
  timing: {
    turnMs: (st) => { const d = nextDeadline(st); return d === null ? null : d - st.t || -1; },
    autoAction: () => ({ type: "tick" }),
  },
  bots: {
    profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
    decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
    thinkMs: (v, seat, now, profile) => thinkMs(v, seat, now, profile),
    heavy: false,
  },
  ui: () => import("./ui/index.js"),
};
