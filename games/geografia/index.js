// Geografía conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/. Ver README.md de esta carpeta.
import manifest from "./manifest.js";
import { setup, legalActions, apply, view, isOver, currentSeats, result, timing, advise } from "./engine/index.js";
import { STYLES, decide, thinkMs } from "./ai/index.js";

export default {
  ...manifest,
  setup, legalActions, apply, view, isOver, currentSeats, result, timing, advise,
  bots: {
    profiles: Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name })),
    decide: (v, seat, profile, ctx) => decide(v, seat, profile, ctx),
    thinkMs: (v, seat) => thinkMs(v, seat),
    heavy: false,
  },
  ui: () => import("./ui/index.js"),
};
