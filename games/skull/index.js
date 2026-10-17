// Skull conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/.
//
// Acciones: { type: "place", disc: "F"|"S" } poner una flor o la calavera · { type: "bid", n } apostar o subir ·
// { type: "pass" } pasar · { type: "flip", seat } voltear (los tuyos primero) · { type: "discard", disc } escoger qué
// disco pierdes (si te topaste con tu propia calavera) · { type: "next" } la siguiente ronda (cualquier asiento).
// Al empezar cada ronda todos ponen su primer disco a la vez: currentSeats da varios asientos.
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, autoAction, currentSeats, view, isPlaying, RULES } from "./engine/index.js";
import { decide, STYLES } from "./ai/index.js";

function setup(config, { now }) {
  const c = { n: config.n, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de Skull no válida");
  return newGame(c, config.names || [], now);
}

const timerOn = (st) => st.config.timer !== false;

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  // Al poner el primer disco cada quien tarda distinto, para que no aparezcan todos de golpe
  thinkMs: (v, seat) => (v.phase === "place" ? 700 + seat * 250 : v.phase === "flip" ? 1300 : 1100),
  heavy: false,
};

export default {
  ...manifest,
  setup,
  currentSeats,
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view,
  isOver: (st) => st.phase === "over",
  result: (st) => ({ wins: st.wins.slice(), winner: st.winner, champions: st.winner === null ? [] : [st.winner], rounds: st.round }),
  timing: {
    turnMs: (st) => (isPlaying(st) && timerOn(st) ? RULES.turnMs : null),
    autoAction: (st, seat) => autoAction(st, seat),
  },
  bots,
  ui: () => import("./ui/index.js"),
};
