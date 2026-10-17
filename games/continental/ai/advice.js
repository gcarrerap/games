// El consejo: lo que haría la compu difícil con tu vista, paso por paso hasta descartar. Puro.
import { apply } from "../engine/index.js";
import { botMove } from "./bots.js";

// → { steps: [{ action, why }] } (vacío si no te toca)
export function advise(v, seat) {
  const steps = [];
  if (v.status !== "playing" || !v.hand || v.hand.turn !== seat) return { steps };
  let st = v;
  for (let i = 0; i < 20; i++) {
    const a = botMove(st, seat, 3);
    if (!a) break;
    const { why, ...action } = a;
    steps.push({ action, why });
    if (["draw", "take", "discard"].includes(action.type)) break; // robar cambia lo que sigue; descartar termina
    try { st = apply(st, seat, action, {}); } catch { break; }
    if (st.status !== "playing") break;
  }
  return { steps };
}
