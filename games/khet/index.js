// El Láser de los Faraones conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven
// en engine/ y la compu en ai/.
//
// Acciones: { type: "move", from, to } mover (o intercambiar el escarabajo) · { type: "rotate", at, dir: 1 | -1 }
// girar 90°. Después de cada acción dispara el láser de quien tiró (engine/index.js).
import manifest from "./manifest.js";
import { newGame, legalActions, apply as applyMove, RULES } from "./engine/index.js";
import { decide, advise, quickMove, STYLES } from "./ai/index.js";

const num = (x, d) => (x === undefined || x === null || x === "" ? d : Number(x));

function setup(config, { now }) {
  return newGame({
    n: config.n ?? 2,
    setup: config.setup || "clasico",
    secs: num(config.secs, RULES.defaultSecs),
    timer: config.timer !== false,
  }, config.names || [], now);
}

const bots = {
  profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
  decide: (v, seat, profile, { rnd }) => decide(v, seat, profile, rnd),
  // Espera a que se vea la animación de la jugada anterior: lo que tarda el láser en recorrer su camino (16 casillas
  // por segundo, ui/fx.js) más el movimiento, la explosión y una pausa.
  thinkMs: (v) => {
    const path = (v.last && v.last.beam && v.last.beam.path) || [];
    let len = 0;
    for (let k = 1; k < path.length; k++) len += Math.abs(path[k][0] - path[k - 1][0]) + Math.abs(path[k][1] - path[k - 1][1]);
    return v.last ? Math.round(2400 + (len / 16) * 1000) : 1500;
  },
  heavy: true,
};

export default {
  ...manifest,
  setup,
  currentSeats: (st) => (st.phase === "over" ? [] : [st.turn]),
  legalActions,
  apply: (st, seat, action) => applyMove(st, seat, action),
  view: (st) => st, // no hay nada oculto
  isOver: (st) => st.phase === "over",
  result: (st) => ({ winner: st.winner, draw: st.draw, champions: st.winner === null ? [] : [st.winner], reason: st.reason }),
  timing: {
    turnMs: (st) => (st.phase !== "over" && st.config.timer !== false ? st.config.secs * 1000 : null),
    autoAction: (st) => quickMove(st, st.turn),
  },
  bots,
  advise: (v, seat) => advise(v, seat),
  tvCover: new URL("./ui/cover.svg", import.meta.url).href,
  ui: () => import("./ui/index.js"),
};
