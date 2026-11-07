// La compu de Cucharas. Solo recibe la vista: su mano, la mesa (boca arriba), cuántas cucharas quedan y si ella ya
// tiene. Nunca sabe quién tomó cuchara.
//
// - Con póker: toma cuchara (qué tan rápido lo dice thinkMs).
// - Si ya faltan cucharas: se da cuenta con una probabilidad por vistazo (`notice`); los distraídos tardan más.
// - Si no: junta el número del que tiene más (en empate, el que más se ve en la mesa). Suelta su carta más sola y
//   toma una del número que junta; si no hay ninguna que le sirva, a veces cambia de todos modos para mover la mano.
// - Nunca toma cuchara sin póker si nadie ha tomado (no blufea).
import { rankOf } from "../../../modules/cards/index.js";
import { isPoker, countRanks } from "../engine/index.js";

export const STYLES = {
  distraido: { name: "Distraído", speed: 1500, notice: 0.25, shuffle: 0.3 },
  normal: { name: "Normal", speed: 1100, notice: 0.45, shuffle: 0.4 },
  atento: { name: "Atento", speed: 800, notice: 0.7, shuffle: 0.5 },
};
const style = (profile) => STYLES[profile] || STYLES.normal;
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
const TICK = { type: "tick" };

// El número que conviene juntar: el que más tiene; en empate, el que más se ve en la mesa
export function target(hand, slots) {
  const counts = countRanks(hand);
  const onTable = countRanks(slots.filter(Boolean));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || (onTable[b] || 0) - (onTable[a] || 0) || (a < b ? -1 : 1))[0];
}

export function decide(v, seat, profile, rnd) {
  if (v.phase === "between") return { type: "next" };
  if (v.phase !== "play" || v.mySpoon || !v.hand.length) return null;
  const s = style(profile);
  if (isPoker(v.hand)) return { type: "spoon" };
  if (v.spoonsLeft < v.spoons && rnd() < s.notice) return { type: "spoon" };

  const goal = target(v.hand, v.slots);
  const counts = countRanks(v.hand);
  if (v.pend >= 0) {
    // Le falta tomar: una del número que junta, si no una de otro que ya tiene dos, si no cualquiera
    const opts = v.slots.map((c, i) => (c && i !== v.pend ? i : -1)).filter((i) => i >= 0);
    const best = opts.find((i) => rankOf(v.slots[i]) === goal)
      ?? opts.find((i) => (counts[rankOf(v.slots[i])] || 0) >= 2);
    return { type: "take", slot: best ?? pick(opts, rnd) };
  }
  const holes = v.slots.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!holes.length) return TICK;
  const useful = v.slots.some((c) => c && (rankOf(c) === goal || (counts[rankOf(c)] || 0) >= 2));
  if (!useful && rnd() >= s.shuffle) return TICK;
  const spare = v.hand.filter((c) => rankOf(c) !== goal);
  const fewest = Math.min(...spare.map((c) => counts[rankOf(c)]));
  return { type: "discard", c: pick(spare.filter((c) => counts[rankOf(c)] === fewest), rnd), slot: pick(holes, rnd) };
}

// Cuánto tarda: su velocidad con un poco de azar por asiento y acción; tomar después de soltar es más rápido
export function thinkMs(v, seat, now, profile) {
  const s = style(profile);
  const jitter = 0.75 + (((v.seq * 7 + seat * 13) % 10) / 20); // 0.75 … 1.2
  let ms = s.speed * jitter;
  if (v.pend >= 0) ms *= 0.5;
  return Math.round(ms);
}
