// Carrera de Chihuahuas conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en
// engine/ y la compu en ai/.
//
// Acciones: { type: "roll" } sacudir el tazón · { type: "ticket", dog } boleto de etapa · { type: "tile", space,
// kind: "hueso"|"aspiradora" } poner tu tapete · { type: "final", which: "winner"|"loser", dog } apuesta final en
// secreto · { type: "next" } la siguiente etapa (cualquier asiento, en la pausa entre etapas).
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, autoAction, currentSeats, view, isPlaying, RULES, showMs } from "./engine/index.js";
import { decide, advise, STYLES } from "./ai/index.js";

function setup(config, { now, rnd }) {
  const c = { n: config.n, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de la carrera no válida");
  return newGame(c, config.names || [], now, rnd);
}

const timerOn = (st) => st.config.timer !== false;

export default {
  ...manifest,
  setup,
  currentSeats,
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view,
  isOver: (st) => st.phase === "over",
  result: (st) => ({ coins: st.coins.slice(), champions: st.final ? st.final.champions.slice() : [], rank: st.final ? st.final.rank.slice() : [], legs: st.leg }),
  timing: {
    turnMs: (st) => (isPlaying(st) && timerOn(st) ? RULES.turnMs : null),
    autoAction: (st) => autoAction(st),
  },
  bots: {
    profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
    decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
    // Espera a que la mesa termine de mostrar la última jugada (el perro corriendo) y deja un momento para leerla
    thinkMs: (v) => 1700 + showMs(v.last),
    heavy: true, // recorre todas las formas de terminar la etapa: mejor en el hilo aparte
  },
  advise: (v, seat, { rnd }) => advise(v, seat, rnd),
  ui: () => import("./ui/index.js"),
};
