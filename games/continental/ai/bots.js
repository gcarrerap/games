// La compu del Continental. Decide con la vista de su asiento (nunca ve manos ajenas ni el mazo). Puro.
//
// Niveles:
//   1 Fácil:   se baja en cuanto puede y acomoda todo, pero roba casi siempre del mazo, no compra y descarta con dudas.
//   2 Normal:  toma o compra lo que le arma tercias o escaleras y descarta lo más suelto que más puntos cuesta.
//   3 Difícil: como el normal, pero compra con menos y no descarta lo que el siguiente acaba de tomar o comprar.
import { contractOf, topOf, canBuy, isWild, rankOf, suitOf, cardPoints, fitsOf, swappable, nextSeat } from "../engine/index.js";
import { chooseIndex } from "../../../modules/choice/index.js";
import { findDown, usefulness, placements, distance } from "./plan.js";

export const LEVELS = { 1: "Fácil", 2: "Normal", 3: "Difícil" };
const level = (l) => Math.max(1, Math.min(3, Number(l) || 2));

// Comodines que caben en la bajada (uno por tercia, dos por escalera): los demás estorban
const wildCap = (k) => k.sets + 2 * k.runs;
const wildsIn = (cards) => cards.filter(isWild).length;

const without = (list, c) => { const i = list.indexOf(c); return i < 0 ? list.slice() : [...list.slice(0, i), ...list.slice(i + 1)]; };

// ¿Le sirve la carta de arriba del pozo? (para tomarla en su turno o comprarla fuera de turno)
function wantsTop(v, seat, lv, buying) {
  const h = v.hand, top = topOf(h); if (!top) return { yes: false };
  const hand = h.hands[seat], k = contractOf(h.round);
  if (h.down[seat]) return { yes: !buying && h.melds.some((m) => fitsOf(m, top).length), why: "le cabe en un juego de la mesa" };
  const before = findDown(hand, k), after = findDown([...hand, top], k);
  if (!before && after) return { yes: true, why: "con ella ya se puede bajar" };
  const room = wildsIn(hand) < wildCap(k);
  if (lv === 1) return { yes: !buying && isWild(top) && room, why: "es comodín" };
  // Si después de tomarla la volvería a tirar, no le sirve
  const view2 = { ...v, hand: { ...h, hands: h.hands.map((x, s) => (s === seat ? [...hand, top] : x)) } };
  if (chooseDiscard(view2, seat, lv).card === top) return { yes: false };
  if (isWild(top)) return { yes: room, why: "es comodín" };
  if (lv === 3) {
    const now = distance(hand, k), then = distance([...hand, top], k);
    const yes = buying ? then < now && then <= hand.length / 3 : then < now;
    return { yes, why: then === 1 ? "te deja a una carta de bajarte" : "te acerca al contrato" };
  }
  const u = usefulness(top, hand, k);
  const bar = buying ? (lv === 3 ? 12 : 14) : (lv === 3 ? 6 : 8);
  return { yes: u >= bar, why: u >= 14 ? "completa una tercia o escalera" : "se junta con lo que tiene" };
}

// Lo que el siguiente jugador tomó o compró esta ronda (lo que se sabe que busca)
function wantedByNext(v, seat) {
  const h = v.hand, nx = nextSeat(v, seat), out = [];
  if (h.lastDraw && h.lastDraw.seat === nx && h.lastDraw.from === "discard") out.push(...h.lastDraw.cards);
  if (h.lastBuy && h.lastBuy.seat === nx && h.lastBuy.card) out.push(h.lastBuy.card);
  return out;
}

// La carta que conviene descartar y por qué
export function chooseDiscard(v, seat, lv, rnd = () => 0.5) {
  const h = v.hand, hand = h.hands[seat], k = contractOf(h.round);
  const wanted = lv >= 3 ? wantedByNext(v, seat) : [];
  const extraWilds = wildsIn(hand) > wildCap(k);
  const scores = hand.map((c) => {
    if (h.down[seat]) return isWild(c) ? -1000 : cardPoints(c); // ya bajado: tirar lo que más cuesta
    // Los comodines se guardan, salvo los que ya no caben en la bajada (se va primero el 2: regala menos)
    const wildKeep = extraWilds ? (c[0] === "2" ? 2 : 8) : 1000;
    const rest = without(hand, c);
    let keep = usefulness(c, rest, k) * 3 + (isWild(c) ? wildKeep : 0) - cardPoints(c) / 4;
    if (lv === 3 && !isWild(c)) keep += distance(rest, k) * 30; // si sin ella me faltan más, la guardo
    if (wanted.some((w) => !isWild(c) && (rankOf(w) === rankOf(c) || suitOf(w) === suitOf(c)))) keep += 6;
    return -keep;
  });
  const i = lv === 1 ? chooseIndex(scores, { ventana: 4, temperatura: 1.5, escala: 5 }, rnd) : chooseIndex(scores, null);
  return { card: hand[i], why: h.down[seat] ? "es la que más puntos cuesta" : "es la que menos te sirve" };
}

// Una acción de la compu (con su motivo en `why`, para el consejo). null si no le toca.
export function botMove(v, seat, lvl, rnd = () => 0.5) {
  const lv = level(lvl), h = v.hand;
  if (v.status !== "playing" || !h) return null;
  if (seat !== h.turn) {
    if (!canBuy(v, seat)) return null;
    const w = wantsTop(v, seat, lv, true);
    return lv >= 2 && w.yes ? { type: "buy", why: w.why } : { type: "pass" };
  }
  if (h.phase === "draw") {
    const w = wantsTop(v, seat, lv, false);
    return w.yes ? { type: "take", why: w.why } : { type: "draw", why: "el pozo no te sirve" };
  }
  const hand = h.hands[seat];
  if (!h.down[seat]) {
    const groups = findDown(hand, contractOf(h.round));
    if (groups) return { type: "down", groups, why: "ya tienes el contrato" };
  } else {
    // Acomodar: primero las naturales; luego cambiar comodines que sirvan; al final los comodines
    const places = placements(hand, h.melds);
    const nat = places.find((p) => !isWild(p.card));
    if (nat) return { type: "add", meld: nat.meld, cards: [nat.card], ...(nat.end === "set" ? {} : { end: nat.end }), why: "le cabe a ese juego" };
    for (const m of h.melds) for (const c of hand) {
      for (const w of swappable(m, c)) {
        const after = h.melds.map((x) => (x.id === m.id ? { ...x, cards: x.cards.map((y) => (y === w ? c : y)) } : x));
        if (after.some((x) => fitsOf(x, w).length)) return { type: "swap", meld: m.id, card: c, wild: w, why: "sacas el comodín y lo acomodas en otro lado" };
      }
    }
    const wild = places.find((p) => isWild(p.card));
    if (wild) return { type: "add", meld: wild.meld, cards: [wild.card], ...(wild.end === "set" ? {} : { end: wild.end }), why: "un comodín en la mano cuesta muchos puntos" };
  }
  const d = chooseDiscard(v, seat, lv, rnd);
  return d.card ? { type: "discard", card: d.card, why: d.why } : null;
}
