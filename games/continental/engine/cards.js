// Cartas del Continental: lo que es de este juego (comodines, valores, puntos, orden). La notación, las barajas y
// revolver vienen de modules/cards (una carta es "KH3": número + palo + baraja).
import { isJoker } from "../../../modules/cards/index.js";

export { RANKS, SUITS, rankOf, suitOf, isJoker, isRed, rankName, cardName, cardWords, SUIT_SYMBOL, fullDeck, shuffle, removeCards }
  from "../../../modules/cards/index.js";

// Comodines: los jokers y los 2 (de cualquier palo)
export const isTwo = (c) => c[0] === "2";
export const isWild = (c) => isJoker(c) || isTwo(c);

// Lugar de un número en una escalera: A = 1 (o 14 arriba), 3…9, 10 = 10, J 11, Q 12, K 13. Los 2 son comodines.
const VALUE = { A: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13 };
export const valueOf = (c) => VALUE[c[0]] || 0;
// El número que va en el lugar v de una escalera (1 y 14 son el As)
export const rankAt = (v) => (v === 1 || v === 14 ? "A" : Object.keys(VALUE).find((r) => VALUE[r] === v) || "2");

// Puntos que cuesta una carta que se queda en la mano: joker 50, 2 y As 20, 10 y figuras 10, las demás su número
export function cardPoints(c) {
  const r = c[0];
  if (r === "X") return 50;
  if (r === "2" || r === "A") return 20;
  if ("TJQK".includes(r)) return 10;
  return Number(r);
}
export const handPoints = (cards) => cards.reduce((s, c) => s + cardPoints(c), 0);

// Orden para mostrar: por número (3…K, A, 2, jokers) o por palo
const ORDER = ["3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A", "2", "X"];
const SUIT_ORDER = "SHDCRB";
export const cardOrder = (c) => ORDER.indexOf(c[0]) * 100 + SUIT_ORDER.indexOf(c[1]) * 10 + Number(c.slice(2));
export const sortByRank = (cards) => cards.slice().sort((a, b) => cardOrder(a) - cardOrder(b));
export function sortBySuit(cards) {
  const key = (c) => (isWild(c) ? 1000 + cardOrder(c) : SUIT_ORDER.indexOf(c[1]) * 100 + valueOf(c));
  return cards.slice().sort((a, b) => key(a) - key(b));
}
