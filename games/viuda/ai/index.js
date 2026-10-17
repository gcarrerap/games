// La compu de La Viuda. Solo recibe la vista: su mano, la viuda si está abierta y lo público.
//
// Como solo pierde la peor mano, no hace falta tener la mejor: basta con no quedar abajo. La compu:
//   - Con la viuda tapada toca si su mano ya llega a su límite, y la toma a ciegas si su mano es mala (carta alta;
//     la arriesgada, también con un par bajo).
//   - Con la viuda abierta toca si su mano ya llega a su límite (prudente: par alto, normal: dos pares,
//     arriesgada: tercia), y si no, hace el cambio que más mejora su mano. Si ningún cambio la mejora, toca.
//     Conforme pasan las rondas baja su límite, para que la mano no se alargue.
//   - Después de que alguien toca, cambia solo si mejora; si no, pasa.
import { evaluate, compareKeys, CAT, alive } from "../engine/index.js";

export const STYLES = {
  prudente: { name: "Prudente", knock: [CAT.pair, 11], lowPair: 0 },
  normal: { name: "Normal", knock: [CAT.twoPair, 0], lowPair: 0 },
  arriesgado: { name: "Arriesgado", knock: [CAT.trips, 0], lowPair: 8 },
};

// ¿La mano llega al límite [categoría, carta]?
const reaches = (ev, [cat, v]) => ev.cat > cat || (ev.cat === cat && ev.ranks[0] >= v);

// Las opciones de cambio con su valor, de la mejor a la peor
export function options(hand, widow, wild) {
  const out = [{ action: { type: "all" }, ev: evaluate(widow, wild) }];
  for (const give of hand) for (const take of widow) {
    const cards = hand.map((c) => (c === give ? take : c));
    out.push({ action: { type: "swap", give, take }, ev: evaluate(cards, wild) });
  }
  return out.sort((a, b) => compareKeys(b.ev.key, a.ev.key));
}

export function decide(v, seat, style = "normal", rnd = () => 0.5) {
  if (v.phase === "over") return null;
  if (v.phase === "pause") return { type: "next" };
  if (v.turn !== seat) return null;
  const s = STYLES[style] || STYLES.normal;
  const hand = v.hands[seat], cur = evaluate(hand, v.wild);

  if (!v.widowOpen) {
    // Viuda tapada: toca si su mano ya llega a su límite (y nadie ha tocado); toma la viuda si su mano es mala
    if (v.phase === "blind" && reaches(cur, s.knock)) return { type: "knock" };
    // Un poco de duda: a veces se queda con una carta alta muy alta
    if (cur.cat === CAT.high && cur.ranks[0] === 14 && rnd() < 0.15) return { type: "pass" };
    const weak = cur.cat === CAT.high || (cur.cat === CAT.pair && cur.ranks[0] < s.lowPair);
    return weak ? { type: "all" } : { type: "pass" };
  }

  const best = options(hand, v.widow, v.wild)[0];
  const better = compareKeys(best.ev.key, cur.key) > 0;
  if (v.phase === "last") return better ? best.action : { type: "pass" };

  // Cuántas vueltas lleva la mano: cada vuelta baja el límite una categoría
  const rounds = Math.floor(v.turns / Math.max(1, alive(v).length));
  const limit = [Math.max(CAT.high, s.knock[0] - Math.max(0, rounds - 1)), rounds > 1 ? 0 : s.knock[1]];
  if (reaches(cur, limit) || !better || rounds >= 6) return { type: "knock" };
  return best.action;
}
