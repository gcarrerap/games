// La compu del timbiriche. Recibe la vista (que en este juego es todo: no hay nada oculto).
//
//   · Fácil: casi siempre cierra la caja que puede, y casi siempre evita regalar, pero se le escapan cosas.
//   · Normal: cierra todo lo que puede; si no, traza una raya que no regale nada; cuando ya no hay, regala la cadena
//     más corta.
//   · Difícil: como la normal, y sin castigo en la mesa hace la "doble jugada" del final: de la última cadena que se
//     lleva deja las dos últimas cajas para el otro, que así queda obligado a abrir la siguiente. Con castigo no lo
//     hace (perdería su turno), ni con más de 2 jugadores (la doble jugada solo se piensa para dos).
import { closingLines, safeLines, freeLines, greedyCapture, sidesOf, sidesDrawn, boxesOf } from "../engine/index.js";

export const STYLES = {
  facil: { name: "Fácil", miss: 0.25, careless: 0.35, doubleDeal: false },
  normal: { name: "Normal", miss: 0, careless: 0, doubleDeal: false },
  dificil: { name: "Difícil", miss: 0, careless: 0, doubleDeal: true },
};

const pick = (list, rnd) => list[Math.floor(rnd() * list.length) % list.length];

// La raya que menos cajas le regala al otro (cuántas se llevaría cerrando todo lo que pueda)
export function leastGift(v, seat, rnd = () => 0) {
  let best = [], bestGive = Infinity;
  for (const l of freeLines(v)) {
    const give = greedyCapture(v, { ...v.lines, [l]: seat }).taken;
    if (give < bestGive) { bestGive = give; best = [l]; } else if (give === bestGive) best.push(l);
  }
  return best.length ? pick(best, rnd) : null;
}

const openBoxes = (v, lines) => {
  let n = 0;
  for (let r = 0; r < v.h; r++) for (let c = 0; c < v.w; c++) if (sidesDrawn(lines, r, c) < 4) n++;
  return n;
};

// La doble jugada: si lo único que se puede llevar es una cadena de exactamente dos cajas (una de tres lados y su
// vecina de dos), traza el lado lejano de la vecina: no cierra nada y le deja al otro las dos cajas juntas, que se
// lleva con una sola raya y luego tiene que abrir. Solo vale la pena si después no queda ninguna raya segura y lo
// que falta por repartir es bastante más que lo que se regala. Devuelve la raya o null.
export function doubleDeal(v) {
  const close = closingLines(v);
  if (close.length !== 1) return null;
  const cap = greedyCapture(v);
  if (cap.taken !== 2) return null;
  const mid = close[0];
  // La caja de tres lados y su vecina por esa raya
  const pair = boxesOf(v, mid);
  if (pair.length !== 2) return null;
  const three = pair.find(([r, c]) => sidesDrawn(v.lines, r, c) === 3);
  const two = pair.find(([r, c]) => sidesDrawn(v.lines, r, c) === 2);
  if (!three || !two) return null;
  const far = sidesOf(two[0], two[1]).find((l) => l !== mid && !(l in v.lines));
  if (!far) return null;
  const after = { ...v.lines, [far]: -1 };
  // La raya lejana no debe dejar otra caja con tres lados (eso regalaría más)
  if (boxesOf(v, far).some(([r, c]) => !(r === two[0] && c === two[1]) && sidesDrawn(after, r, c) === 3)) return null;
  // Después de que el otro se lleve las dos, no debe tener una raya segura para escapar
  const taken = { ...after, [mid]: -1 };
  if (safeLines({ ...v, lines: taken }).length) return null;
  if (openBoxes(v, taken) < 5) return null;
  return far;
}

export function decide(v, seat, profile = "normal", rnd = () => 0) {
  if (v.phase !== "play" || v.turn !== seat) return null;
  const style = STYLES[profile] || STYLES.normal;
  const close = closingLines(v);
  if (close.length) {
    if (style.doubleDeal && !v.config.penalty && v.config.n === 2) {
      const dd = doubleDeal(v);
      if (dd) return { type: "line", line: dd };
    }
    if (!(style.miss && rnd() < style.miss)) return { type: "line", line: pick(close, rnd) };
  }
  const safe = safeLines(v);
  if (safe.length && !(style.careless && rnd() < style.careless)) return { type: "line", line: pick(safe, rnd) };
  if (style.careless) return { type: "line", line: pick(freeLines(v), rnd) };
  return { type: "line", line: leastGift(v, seat, rnd) };
}

// Consejo: la raya que tomaría la compu difícil, con una explicación corta
export function advise(v, seat) {
  if (v.phase !== "play" || v.turn !== seat) return null;
  const close = closingLines(v);
  if (close.length) {
    if (!v.config.penalty && v.config.n === 2) {
      const dd = doubleDeal(v);
      if (dd) return { action: { type: "line", line: dd }, why: "Deja las dos últimas cajas: el otro se las lleva y tiene que abrir la siguiente cadena." };
    }
    return { action: { type: "line", line: close[0] }, why: "Cierra la caja: es tuya y vuelves a tirar." };
  }
  const safe = safeLines(v);
  if (safe.length) return { action: { type: "line", line: safe[0] }, why: "No le deja a nadie una caja con tres lados." };
  const l = leastGift(v, seat);
  return { action: { type: "line", line: l }, why: `Ya no hay rayas seguras: esta regala lo menos posible (${greedyCapture(v, { ...v.lines, [l]: seat }).taken}).` };
}

