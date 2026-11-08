// La compu de Cucharas. Solo recibe la vista: su mano, la mesa, cuántas cucharas quedan y si ella ya tiene. Nunca
// sabe quién tomó cuchara.
//
// - Con póker: toma cuchara (qué tan rápido lo dice thinkMs).
// - Si ya faltan cucharas: se da cuenta con una probabilidad por vistazo (`notice`); los distraídos tardan más.
// - Si no: junta el número del que tiene más (en empate, el que más se ve en la mesa) y cambia su carta más sola.
//   Con la mesa abierta toma una del número que junta (o de otro del que ya tiene dos); si no hay ninguna que le
//   sirva, a veces cambia de todos modos para mover la mano. Con la mesa tapada toma a ciegas.
// - Para tomar cuchara escoge una de las que siguen en la mesa, al azar.
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
const WAIT = { type: "wait" };

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
  const grab = () => ({ type: "spoon", i: pick(v.spots.map((x, i) => (x.free ? i : -1)).filter((i) => i >= 0), rnd) });
  if (isPoker(v.hand)) return grab();
  if (v.spoonsLeft < v.spoons && rnd() < s.notice) return grab();

  const goal = target(v.hand, v.slots);
  const counts = countRanks(v.hand);
  const full = v.slots.map((_, i) => i);
  const spare = v.hand.filter((c) => rankOf(c) !== goal);
  const fewest = Math.min(...spare.map((c) => counts[rankOf(c)]));
  const give = pick(spare.filter((c) => counts[rankOf(c)] === fewest), rnd);
  if (v.config.table === "closed") return { type: "swap", c: give, slot: pick(full, rnd) };
  const best = full.find((i) => rankOf(v.slots[i]) === goal)
    ?? full.find((i) => rankOf(v.slots[i]) !== rankOf(give) && (counts[rankOf(v.slots[i])] || 0) >= 2);
  if (best !== undefined) return { type: "swap", c: give, slot: best };
  if (rnd() >= s.shuffle) return WAIT;
  return { type: "swap", c: give, slot: pick(full, rnd) };
}

// Cuánto tarda: su velocidad con un poco de azar por asiento y acción
export function thinkMs(v, seat, now, profile) {
  const s = style(profile);
  const jitter = 0.75 + (((v.seq * 7 + seat * 13) % 10) / 20); // 0.75 … 1.2
  return Math.round(s.speed * jitter);
}
