// Memoria Veloz conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/
// y la compu en ai/.
//
// Acciones: { type: "open", i } abrir una carta · { type: "back", i } regresarla · { type: "backAll" } regresar las
// dos · { type: "claim" } reclamar el par · { type: "timer", seat } ponerle timer a otro · { type: "tick" } resolver
// los timers vencidos (lo aplica la plataforma al llegar la hora; cualquier asiento puede).
//
// Es un juego en tiempo real (`realtime` en el manifiesto): no hay turnos, todos los asientos pueden actuar siempre
// (currentSeats da todos) y la plataforma aplica cada acción sobre el estado más reciente, sin descartarla porque
// otro se adelantó.
import manifest from "./manifest.js";
import { validConfig, newGame, legalActions, apply as applyMove, view, ranking, nextDeadline } from "./engine/index.js";
import { decide, thinkMs, STYLES } from "./ai/index.js";

function setup(config, ctx) {
  const c = { n: config.n };
  if (!validConfig(c)) throw new Error("Configuración de Memoria Veloz no válida");
  return newGame(c, config.names || [], ctx);
}

const all = (st) => (st.phase === "play" ? Array.from({ length: st.config.n }, (_, i) => i) : []);

export default {
  ...manifest,
  setup,
  currentSeats: all,
  legalActions,
  apply: (st, seat, action, ctx) => applyMove(st, seat, action, ctx),
  view,
  isOver: (st) => st.phase === "over",
  result: (st) => ({ pairs: st.pairs.slice(), winner: st.winner, champions: st.winner === null ? [] : [st.winner], ranking: ranking(st) }),
  // El "reloj" son los timers: cuando vence el siguiente, la plataforma aplica `tick`. Se mide desde la última
  // acción, igual que el reloj de turno (cada teléfono cuenta desde que la vio). Si ya venció (las acciones de los
  // demás no dejaron que el reloj llegara a 0), da un número negativo para que se resuelva en el siguiente vistazo.
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
