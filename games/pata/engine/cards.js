// Cartas de La Pata: lo que es de este juego (comodines, tapones, valor para el mínimo, orden). La notación, las
// barajas, revolver y los nombres vienen de modules/cards (una carta es "KH3": número + palo + baraja). Con 6
// barajas son 324 cartas (432 con 8 barajas y 6 jugadores), cada una única.
import { fullDeck as deck, isJoker, isRed } from "../../../modules/cards/index.js";

export { RANKS, SUITS, rankOf, suitOf, isJoker, isRed, RANK_NAME, rankName, SUIT_SYMBOL, cardName, shuffle, removeCards } from "../../../modules/cards/index.js";
// Números con los que se arma una pata normal (los 2 son comodines y los 3 son tapones)
export const NATURAL_RANKS = ["4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

export const isTwo = (c) => c[0] === "2";
export const isWild = (c) => isJoker(c) || isTwo(c);
export const isThree = (c) => c[0] === "3";
export const isRed3 = (c) => isThree(c) && isRed(c);
export const isBlack3 = (c) => isThree(c) && !isRed(c);
// Natural: se puede usar en una pata normal (ni comodín ni tapón)
export const isNatural = (c) => !isWild(c) && !isThree(c);

// Valor de una carta para el mínimo de la primera bajada
export function cardValue(c) {
  const r = c[0];
  if (r === "X") return 50;
  if (r === "A" || r === "2") return 20;
  if ("89TJQK".includes(r)) return 10;
  return 5; // 3 al 7
}
export const sumValues = (cards) => cards.reduce((s, c) => s + cardValue(c), 0);

// Orden para mostrar y ordenar: 3 negros, 3 rojos, 4…K, A, 2, jokers
const ORDER = ["3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A", "2", "X"];
export const rankOrder = (r) => ORDER.indexOf(r);
export function cardOrder(c) {
  const r = rankOrder(c[0]) * 2 + (isThree(c) && isRed(c) ? 1 : 0);
  return r * 100 + "SHDCRB".indexOf(c[1]) * 10 + Number(c.slice(2));
}
export const sortCards = (cards) => cards.slice().sort((a, b) => cardOrder(a) - cardOrder(b));

// Las 6 barajas con sus jokers: 324 cartas
export const fullDeck = (decks = 6) => deck(decks);
