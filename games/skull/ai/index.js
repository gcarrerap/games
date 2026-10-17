// La compu de Skull. Solo recibe la vista: su tapete, sus discos y lo público (cuántos discos hay en cada tapete,
// quién apostó, lo que ya se volteó).
//
// Cuántas flores cree poder voltear:
//   - De su tapete: todas si no puso la calavera; si la puso, solo las que quedaron encima de ella (se voltea de
//     arriba hacia abajo, así que apostar eso o menos no la toca).
//   - De los demás: una parte de sus discos, según el estilo. Quien apostó en la ronda probablemente tiene flores
//     arriba, y eso le da un poco más de confianza.
// Pone la calavera de vez en cuando (más el atrevido), apuesta cuando su tapete ya tiene los discos que quiere, y
// sube mientras la apuesta no pase de lo que cree. Al voltear, empieza por los tapetes de quienes apostaron.
import { FLOWER, SKULL, alive, onMat, flipTargets } from "../engine/index.js";

export const STYLES = {
  prudente: { name: "Prudente", skull: 0.2, stack: 2, trust: 0.25, bluff: 0.1 },
  normal: { name: "Normal", skull: 0.35, stack: 2, trust: 0.4, bluff: 0.25 },
  atrevido: { name: "Atrevido", skull: 0.5, stack: 3, trust: 0.55, bluff: 0.45 },
};

// Discos de su tapete que puede voltear sin toparse con su calavera
export function safeOwn(stack) {
  const i = stack.lastIndexOf(SKULL);
  return i < 0 ? stack.length : stack.length - 1 - i;
}

// Hasta cuántas flores cree que llega como retador
export function estimate(v, seat, s, rnd) {
  const own = safeOwn(v.stacks[seat]);
  let others = 0;
  for (const o of alive(v)) {
    if (o === seat) continue;
    const n = v.stacks[o].length;
    // Quien apostó dice que tiene flores arriba; quien no, puede esconder la calavera
    others += n * (v.bidders[o] ? s.trust + 0.2 : s.trust);
  }
  const noise = (rnd() - 0.5) * 0.8;
  return Math.max(own, Math.min(onMat(v), Math.floor(own + others + noise)));
}

function hand(v, seat) {
  const own = v.discs[seat], stack = v.stacks[seat];
  return { F: own.F - stack.filter((d) => d === FLOWER).length, S: own.S - stack.filter((d) => d === SKULL).length };
}

function placeDisc(h, s, rnd, hasSkullDown) {
  if (h.S > 0 && !hasSkullDown && (h.F === 0 || rnd() < s.skull)) return { type: "place", disc: SKULL };
  return { type: "place", disc: h.F > 0 ? FLOWER : SKULL };
}

export function decide(v, seat, style = "normal", rnd = () => 0.5) {
  if (v.phase === "over") return null;
  if (v.phase === "pause") return { type: "next" };
  const s = STYLES[style] || STYLES.normal;
  const stack = v.stacks[seat];
  const skullDown = stack.includes(SKULL);

  if (v.phase === "place") {
    if (stack.length || v.out[seat]) return null;
    return placeDisc(hand(v, seat), s, rnd, false);
  }
  if (v.turn !== seat) return null;

  if (v.phase === "build") {
    const h = hand(v, seat);
    const canPlace = h.F + h.S > 0;
    if (canPlace && stack.length < s.stack && rnd() < 0.85) return placeDisc(h, s, rnd, skullDown);
    const target = estimate(v, seat, s, rnd);
    // Con la calavera puesta, a veces abre bajo para que otro se haga retador y se tope con ella
    if (skullDown) {
      const safe = safeOwn(stack);
      if (safe >= 1 && rnd() < 0.6) return { type: "bid", n: Math.min(safe, onMat(v)) };
      if (canPlace && rnd() < 0.5) return placeDisc(h, s, rnd, true);
      return { type: "bid", n: 1 };
    }
    if (canPlace && rnd() < 0.3) return placeDisc(h, s, rnd, skullDown);
    return { type: "bid", n: Math.max(1, Math.min(onMat(v), target)) };
  }

  if (v.phase === "bid") {
    const next = v.bid.n + 1;
    if (next > onMat(v)) return { type: "pass" };
    const target = estimate(v, seat, s, rnd);
    // Con la calavera puesta a veces sube de farol: si otro gana la apuesta puede toparse con ella
    const bluff = skullDown && rnd() < s.bluff && next <= safeOwn(stack) + 1;
    return next <= target || bluff ? { type: "bid", n: next } : { type: "pass" };
  }

  if (v.phase === "flip") {
    const targets = flipTargets(v);
    if (targets.includes(seat)) return { type: "flip", seat };
    // Primero quien apostó; entre ellos, el tapete con más discos sin voltear; empates al azar
    const score = (o) => (v.bidders[o] ? 100 : 0) + (v.stacks[o].length - v.flipped[o]) * 3 + rnd();
    const best = targets.slice().sort((a, b) => score(b) - score(a))[0];
    return { type: "flip", seat: best };
  }

  if (v.phase === "discard") {
    const own = v.discs[seat];
    // La calavera es su arma: la conserva mientras le quede más de una flor
    return { type: "discard", disc: own.S > 0 && own.F <= 1 ? SKULL : own.F > 0 ? FLOWER : SKULL };
  }
  return null;
}
