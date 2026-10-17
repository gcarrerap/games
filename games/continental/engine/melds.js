// Tercias y escaleras: armarlas, acomodarles cartas y cambiarles un comodín. Funciones puras; los errores se
// regresan como texto (para mostrarlos tal cual).
//
// Una tercia:   { id, owner, type: "set", rank, cards }            3 o más del mismo número, cualquier palo
// Una escalera: { id, owner, type: "run", suit, lo, cards }        4 o más seguidas del mismo palo; cards[i] ocupa
//               el lugar lo + i (1 = As abajo, 14 = As arriba). Sin dar la vuelta: nunca pasa de K a A a 2.
// Comodines (jokers y 2): en cada juego no puede haber más comodines que cartas naturales.
import { RULES } from "./config.js";
import { isWild, suitOf, rankOf, valueOf, rankAt } from "./cards.js";

export const wildCount = (cards) => cards.filter(isWild).length;
const wildsOk = (cards) => wildCount(cards) <= cards.length - wildCount(cards);
const WILD_MSG = "No puede haber más comodines que cartas naturales en un juego.";

function arrangeSet(cards) {
  const nat = cards.filter((c) => !isWild(c));
  if (!nat.length) return { error: "Una tercia necesita cartas naturales." };
  const rank = rankOf(nat[0]);
  if (nat.some((c) => rankOf(c) !== rank)) return { error: "Una tercia es del mismo número." };
  if (cards.length < RULES.setMin) return { error: `Una tercia lleva al menos ${RULES.setMin} cartas.` };
  if (!wildsOk(cards)) return { error: WILD_MSG };
  return { type: "set", rank, cards: cards.slice() };
}

// Acomoda una escalera con el As abajo (aceHigh = false) o arriba. Los comodines llenan los huecos; los que sobran
// van arriba y, si ya no caben, abajo.
function arrangeRunWith(cards, aceHigh) {
  const nat = cards.filter((c) => !isWild(c)), wild = cards.filter(isWild);
  if (nat.length < 2) return { error: "Una escalera necesita al menos 2 cartas naturales." };
  const suit = suitOf(nat[0]);
  if (nat.some((c) => suitOf(c) !== suit)) return { error: "Una escalera es del mismo palo." };
  const val = (c) => (rankOf(c) === "A" && aceHigh ? 14 : valueOf(c));
  const vals = nat.map(val);
  if (new Set(vals).size !== vals.length) return { error: "Una escalera no repite números." };
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const gaps = hi - lo + 1 - nat.length;
  if (gaps > wild.length) return { error: "Le faltan cartas a la escalera (o comodines para los huecos)." };
  let extra = wild.length - gaps;
  const up = Math.min(extra, 14 - hi); hi += up; extra -= up;
  lo -= extra;
  if (lo < 1) return { error: "La escalera no cabe entre el As y el As." };
  if (hi - lo + 1 < RULES.runMin) return { error: `Una escalera lleva al menos ${RULES.runMin} cartas.` };
  if (!wildsOk(cards)) return { error: WILD_MSG };
  const out = [], spare = wild.slice();
  for (let v = lo; v <= hi; v++) {
    const c = nat.find((x) => val(x) === v);
    out.push(c || spare.shift());
  }
  return { type: "run", suit, lo, cards: out };
}

function arrangeRun(cards) {
  const low = arrangeRunWith(cards, false);
  if (!low.error || !cards.some((c) => rankOf(c) === "A")) return low;
  const high = arrangeRunWith(cards, true);
  return high.error ? low : high;
}

// Un grupo de cartas como tercia o escalera. kind: "set" | "run" | undefined (la que salga)
export function arrange(cards, kind) {
  if (!Array.isArray(cards) || !cards.length) return { error: "Escoge las cartas del juego." };
  if (new Set(cards).size !== cards.length) return { error: "Una carta repetida." };
  if (kind === "set") return arrangeSet(cards);
  if (kind === "run") return arrangeRun(cards);
  const nat = cards.filter((c) => !isWild(c));
  return nat.length && nat.every((c) => rankOf(c) === rankOf(nat[0])) ? arrangeSet(cards) : arrangeRun(cards);
}

export const hiOf = (m) => m.lo + m.cards.length - 1;

// Lugares donde cabe una carta en un juego: ["set"] para una tercia; "lo" / "hi" para una escalera. Vacío si no cabe.
export function fitsOf(m, card) {
  const cards = [...m.cards, card];
  if (isWild(card) && !wildsOk(cards)) return [];
  if (m.type === "set") return isWild(card) || rankOf(card) === m.rank ? ["set"] : [];
  const hi = hiOf(m), out = [];
  if (isWild(card)) {
    if (hi < 14) out.push("hi");
    if (m.lo > 1) out.push("lo");
    return out;
  }
  if (suitOf(card) !== m.suit) return [];
  if (hi < 14 && rankOf(card) === rankAt(hi + 1) && !(hi + 1 === 14 && m.lo === 1)) out.push("hi");
  if (m.lo > 1 && rankOf(card) === rankAt(m.lo - 1) && !(m.lo - 1 === 1 && hi === 14)) out.push("lo");
  return out;
}

// Acomoda una carta. end: "lo" o "hi" para escoger la punta de la escalera (si no, la primera que quepa)
export function addTo(m, card, end) {
  const fits = fitsOf(m, card);
  if (!fits.length) return { error: m.type === "set" ? "Esa carta no va en esa tercia." : "Esa carta no va en esa escalera." };
  const at = end && fits.includes(end) ? end : fits[0];
  if (at === "set") return { meld: { ...m, cards: [...m.cards, card] } };
  if (at === "hi") return { meld: { ...m, cards: [...m.cards, card] } };
  return { meld: { ...m, lo: m.lo - 1, cards: [card, ...m.cards] } };
}

// El número que hace falta para sacar un comodín de un juego (para mostrar y para la compu)
export const neededAt = (m, i) => (m.type === "set" ? m.rank : rankAt(m.lo + i));

// Cambia un comodín del juego por la carta natural que ocupa su lugar. Regresa el juego nuevo y el comodín.
export function swapIn(m, natural, wild) {
  if (isWild(natural)) return { error: "Para sacar un comodín se pone una carta natural." };
  const i = m.cards.indexOf(wild);
  if (i < 0 || !isWild(wild)) return { error: "Ese comodín no está en ese juego." };
  if (m.type === "set") {
    if (rankOf(natural) !== m.rank) return { error: `En esa tercia va un ${m.rank === "T" ? "10" : m.rank}.` };
  } else if (suitOf(natural) !== m.suit || rankOf(natural) !== neededAt(m, i)) {
    return { error: "Esa carta no ocupa el lugar del comodín." };
  }
  const cards = m.cards.slice(); cards[i] = natural;
  return { meld: { ...m, cards }, wild };
}

// Los comodines de un juego que se pueden cambiar por esa carta natural
export function swappable(m, natural) {
  if (isWild(natural)) return [];
  return m.cards.filter((c, i) => isWild(c) && (m.type === "set" ? rankOf(natural) === m.rank
    : suitOf(natural) === m.suit && rankOf(natural) === neededAt(m, i)));
}
