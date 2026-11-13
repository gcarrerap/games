import manifest from "./manifest.js";
import { setup, legalActions, apply, view, result } from "./engine/index.js";
import { decide, advise } from "./ai/index.js";
export default {
  ...manifest, setup, legalActions, apply, view, result,
  currentSeats: (st) => st.phase === "play" ? [0] : [], isOver: (st) => st.phase === "over",
  bots: { profiles: [{ id: "detective", name: "Detective lógico" }], decide,
    thinkMs: () => 1000, heavy: true },
  advise, ui: () => import("./ui/index.js"),
};
