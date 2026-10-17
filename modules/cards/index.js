// Baraja francesa para cualquier juego de cartas: notación, color, nombres, varias barajas con jokers, revolver y
// sacar cartas de una lista. Puro, sin dependencias. Lo que vale cada carta o qué es comodín lo decide cada juego.
//
// Cada carta es un texto de 3 caracteres: número + palo + baraja.
//   número: A 2 3 4 5 6 7 8 9 T J Q K (T = 10) y X para el joker
//   palo:   S ♠, H ♥, D ♦, C ♣; los jokers usan R (rojo) o B (negro)
//   baraja: 0 a 9
// Ejemplos: "KH3" (rey de corazones de la baraja 3), "TS0" (10 de espadas), "XR2" (joker rojo de la baraja 2).
// Así cada carta es única aunque se juegue con varias barajas, y se puede seguir sin ambigüedad.

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
export const SUITS = ["S", "H", "D", "C"];

export const rankOf = (c) => c[0];
export const suitOf = (c) => c[1];
export const deckOf = (c) => Number(c.slice(2));
export const isJoker = (c) => c[0] === "X";
export const isRed = (c) => c[1] === "H" || c[1] === "D" || c[1] === "R";

// Nombre corto para mostrar: "K", "10", "Joker"
export const RANK_NAME = { A: "A", T: "10", J: "J", Q: "Q", K: "K", X: "Joker" };
export const rankName = (r) => RANK_NAME[r] || r;
export const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣", R: "★", B: "★" };
export const cardName = (c) => (isJoker(c) ? "Joker" : rankName(c[0]) + SUIT_SYMBOL[c[1]]);

// Nombre completo en palabras (para lectores de pantalla): "As de corazones", "10 de espadas", "Joker"
const RANK_WORD = { A: "As", T: "10", J: "J", Q: "Q", K: "K" };
const SUIT_WORD = { S: "espadas", H: "corazones", D: "diamantes", C: "tréboles" };
export const cardWords = (c) => (isJoker(c) ? "Joker" : `${RANK_WORD[c[0]] || c[0]} de ${SUIT_WORD[c[1]]}`);

// `decks` barajas de 52 con `jokers` jokers cada una (rojo y negro alternados)
export function fullDeck(decks = 1, { jokers = 2 } = {}) {
  const out = [];
  for (let d = 0; d < decks; d++) {
    for (const r of RANKS) for (const s of SUITS) out.push(r + s + d);
    for (let j = 0; j < jokers; j++) out.push("X" + (j % 2 ? "B" : "R") + d);
  }
  return out;
}

// Revuelve una copia (Fisher-Yates). rnd: el azar del juego (ctx.rnd)
export function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Quita cartas de una lista (por id); truena si alguna no está
export function removeCards(list, cards, msg = "No tienes esa carta.") {
  const out = list.slice();
  for (const c of cards) {
    const i = out.indexOf(c);
    if (i < 0) throw new Error(msg);
    out.splice(i, 1);
  }
  return out;
}
