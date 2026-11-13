import { allCodes, score } from "../engine/index.js";
// Deducción exclusivamente con el historial público; no lee ni recibe el secreto.
export function candidates(v) {
  return allCodes(v).filter((code) => v.history.every((h) => {
    const s = score(code, h.code); return s.exact === h.exact && s.misplaced === h.misplaced;
  }));
}
export function decide(v, seat) {
  if (seat !== 0 || v.phase !== "play") return null;
  const possible = candidates(v);
  if (!possible.length) return { type: "giveup" };
  // Minimiza el grupo de respuestas más grande; muestreo determinista acota el trabajo en teléfono.
  const stride = Math.max(1, Math.ceil(possible.length / 64));
  let best = possible[0], bestWorst = Infinity;
  for (let i = 0; i < possible.length; i += stride) {
    const buckets = new Map(); let worst = 0;
    for (const code of possible) {
      const f = score(code, possible[i]), key = f.exact * 5 + f.misplaced;
      const count = (buckets.get(key) || 0) + 1;
      buckets.set(key, count); worst = Math.max(worst, count);
      if (worst >= bestWorst) break;
    }
    if (worst < bestWorst) { bestWorst = worst; best = possible[i]; }
  }
  return { type: "guess", code: [...best] };
}
export function advise(v, seat) {
  const action = decide(v, seat), count = candidates(v).length;
  return { action, count, why: count === 1 ? "¡Solo queda una fila compatible con tus pistas!"
    : `Quedan ${count} filas compatibles. Esta prueba ayuda a separar las posibilidades; no es necesariamente la solución.` };
}
