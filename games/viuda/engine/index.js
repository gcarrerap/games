// Reglas de La Viuda (versión póker de 5 cartas). Funciones puras: estado entra, estado sale. El azar llega como
// ctx.rnd y la hora como ctx.now.
//
// Una mano:
//   1. Reparte el siguiente jugador (rota cada mano); parte el de su izquierda y empieza el de su derecha. El turno
//      pasa a la derecha (al siguiente asiento). Si al partir queda a la vista un comodín, se lo queda quien partió
//      y solo recibe 4 cartas más. Cada quien recibe 5 cartas y otras 5 quedan boca abajo: la viuda.
//   2. Primera ronda, viuda oculta: tomas las 5 a ciegas (tu mano queda boca arriba como la nueva viuda) o pasas.
//      Si todos pasan, la mano se acaba ahí y se comparan las manos repartidas.
//   3. Con la viuda abierta: cambias una carta, cambias las 5 o tocas. No se puede pasar.
//   4. Cuando alguien toca, cada uno de los demás tiene un último turno: cambiar una, cambiar las 5 o pasar.
//      Luego se muestran las manos.
//   5. Solo la peor mano pierde una ficha (si empatan del todo, pierden todas las empatadas).
// Fichas: 3 cada quien. El primero que se queda sin fichas recibe una extra, la viuda (una sola vez por partida).
// Quien se queda sin fichas después sale. Gana el último con fichas.
// Comodín: la mano 1 no tiene; la 2 es el As, la 3 el 2, … la 14 el K, la 15 otra vez el As.
import { RANKS, fullDeck, shuffle } from "../../../modules/cards/index.js";
import { evaluate, compareKeys, describe } from "./hands.js";

export { evaluate, compareKeys, describe, CATS, CAT, SUIT_POWER, VALUE, valueName } from "./hands.js";

export const RULES = {
  chips: 3,
  handSize: 5,
  turnMs: 30000,
};

// Número comodín de la mano h (1, 2, …): null en la primera
export const wildFor = (h) => (h <= 1 ? null : RANKS[(h - 2) % RANKS.length]);

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 2 && c.n <= 8;

export const nameOf = (st, seat) => st.names[seat];
export const alive = (st) => st.chips.map((_, s) => s).filter((s) => !st.out[s]);
export function nextAlive(st, seat) {
  const n = st.config.n;
  for (let i = 1; i <= n; i++) { const s = (seat + i) % n; if (!st.out[s]) return s; }
  return seat;
}
export function prevAlive(st, seat) {
  const n = st.config.n;
  for (let i = 1; i <= n; i++) { const s = (seat - i + n) % n; if (!st.out[s]) return s; }
  return seat;
}

const pushLog = (log, msg) => [...log, msg];

export function newGame(config, names, now, rnd) {
  const n = config.n;
  const st = {
    v: 1,
    config: { n, timer: config.timer !== false },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    chips: Array(n).fill(RULES.chips),
    out: Array(n).fill(false),
    viuda: null, // asiento que recibió la ficha extra (la viuda), o null
    hand: 0,
    dealer: 0, // la primera mano reparte el asiento 0; después rota
    phase: "blind",
    wild: null,
    hands: [],
    widow: [],
    cut: null, // { seat, card, took }: lo que quedó a la vista al partir
    turn: 0,
    knocker: null,
    left: 0, // turnos que faltan en la ronda a ciegas o en la última ronda
    turns: 0, // acciones de esta mano
    showdown: null,
    last: null,
    seq: 0,
    winner: null,
    started: now,
    log: [],
  };
  return deal(st, rnd);
}

// Reparte la siguiente mano
export function deal(st, rnd) {
  const hand = st.hand + 1, wild = wildFor(hand);
  const dealer = st.hand === 0 ? 0 : nextAlive(st, st.dealer);
  const cutter = prevAlive(st, dealer), starter = nextAlive(st, dealer);
  let deck = shuffle(fullDeck(1, { jokers: 0 }), rnd);
  // Partir: se ve la carta de abajo de la parte de arriba
  const at = Math.floor(deck.length * (0.25 + 0.5 * rnd()));
  const card = deck[at];
  const took = !!wild && card[0] === wild;
  if (took) deck = [...deck.slice(0, at), ...deck.slice(at + 1)];
  const hands = st.chips.map(() => []);
  if (took) hands[cutter].push(card);
  // Se reparte de una en una empezando por la derecha de quien reparte
  let i = 0;
  for (let round = 0; round < RULES.handSize; round++) {
    let s = starter;
    do {
      if (hands[s].length < RULES.handSize) hands[s].push(deck[i++]);
      s = nextAlive(st, s);
    } while (s !== starter);
  }
  const widow = deck.slice(i, i + RULES.handSize);
  const who = (s) => nameOf(st, s);
  let log = pushLog(st.log, `Mano ${hand}: reparte ${who(dealer)}, parte ${who(cutter)}. Comodín: ${wild ? rankLabel(wild) : "ninguno"}`);
  if (took) log = pushLog(log, `${who(cutter)} partió y se quedó con un comodín`);
  return {
    ...st,
    hand, wild, dealer,
    phase: "blind",
    hands, widow,
    cut: { seat: cutter, card, took },
    turn: starter,
    knocker: null,
    left: alive(st).length,
    turns: 0,
    showdown: null,
    last: null,
    log,
  };
}

const RANK_LABEL = { A: "As", T: "10", J: "J", Q: "Q", K: "K" };
export const rankLabel = (r) => RANK_LABEL[r] || r;

const PLAYING = new Set(["blind", "open", "last"]);
export const isPlaying = (st) => PLAYING.has(st.phase);

export function legalActions(st, seat) {
  if (st.phase === "over") return [];
  if (st.phase === "pause") return [{ type: "next" }];
  if (seat !== st.turn) return [];
  if (st.phase === "blind") return [{ type: "all" }, { type: "pass" }];
  const swaps = [];
  for (const give of st.hands[seat]) for (const take of st.widow) swaps.push({ type: "swap", give, take });
  if (st.phase === "open") return [{ type: "knock" }, { type: "all" }, ...swaps];
  return [{ type: "pass" }, { type: "all" }, ...swaps];
}

// Revisa una acción; regresa el motivo si no se vale, o "" si se vale
export function check(st, seat, a) {
  if (st.phase === "over") return "La partida ya terminó.";
  if (!a || typeof a.type !== "string") return "Esa jugada no existe.";
  if (st.phase === "pause") return a.type === "next" ? "" : "Espera la siguiente mano.";
  if (a.type === "next") return "La mano no ha terminado.";
  if (seat !== st.turn) return "No es tu turno.";
  if (st.phase === "blind" && a.type !== "all" && a.type !== "pass") return "Con la viuda tapada solo puedes tomarla completa o pasar.";
  if (a.type === "knock" && st.phase !== "open") return st.phase === "last" ? "Ya tocaron." : "Todavía no se puede tocar.";
  if (a.type === "pass" && st.phase === "open") return "No se puede pasar hasta que alguien toque.";
  if (a.type === "swap") {
    if (!st.hands[seat].includes(a.give)) return "No tienes esa carta.";
    if (!st.widow.includes(a.take)) return "Esa carta no está en la viuda.";
  }
  if (!["all", "pass", "knock", "swap"].includes(a.type)) return "Esa jugada no existe.";
  return "";
}

export function apply(st, seat, action, { rnd }) {
  const err = check(st, seat, action);
  if (err) throw new Error(err);
  const seq = st.seq + 1, who = nameOf(st, seat);
  if (action.type === "next") return { ...deal(st, rnd), seq };

  let s = { ...st, seq, turns: st.turns + 1 };
  const hands = st.hands.slice();
  if (action.type === "all") {
    hands[seat] = st.widow.slice();
    const blind = st.phase === "blind";
    s = { ...s, hands, widow: st.hands[seat].slice(), phase: blind ? "open" : st.phase, last: { seat, kind: "all", blind } };
    s.log = pushLog(st.log, blind ? `${who} tomó la viuda a ciegas` : `${who} cambió las 5`);
  } else if (action.type === "swap") {
    hands[seat] = st.hands[seat].map((c) => (c === action.give ? action.take : c));
    const widow = st.widow.map((c) => (c === action.take ? action.give : c));
    s = { ...s, hands, widow, last: { seat, kind: "swap", give: action.give, take: action.take } };
    s.log = pushLog(st.log, `${who} cambió una`);
  } else if (action.type === "knock") {
    s = { ...s, phase: "last", knocker: seat, left: alive(st).length - 1, last: { seat, kind: "knock" } };
    s.log = pushLog(st.log, `${who} tocó`);
  } else {
    s = { ...s, last: { seat, kind: "pass" } };
    s.log = pushLog(st.log, `${who} pasó`);
  }

  // Cuenta de las rondas que tienen fin: la primera a ciegas (si nadie toma) y la última después de tocar
  if (st.phase === "blind" && action.type === "pass") {
    s.left = st.left - 1;
    if (s.left === 0) return showdown(s, "pass");
  } else if (st.phase === "last") {
    s.left = st.left - 1;
    if (s.left === 0) return showdown(s, "knock");
  }
  return { ...s, turn: nextAlive(st, seat) };
}

// Se muestran las manos y la peor pierde una ficha
export function showdown(st, reason) {
  const seats = alive(st);
  const rows = seats.map((seat) => {
    const ev = evaluate(st.hands[seat], st.wild);
    return { seat, cards: st.hands[seat].slice(), cat: ev.cat, label: describe(ev), wilds: ev.wilds, key: ev.key };
  });
  const worst = rows.reduce((w, r) => (compareKeys(r.key, w.key) < 0 ? r : w), rows[0]);
  const losers = rows.filter((r) => compareKeys(r.key, worst.key) === 0).map((r) => r.seat);
  const chips = st.chips.slice(), out = st.out.slice();
  let viuda = st.viuda, gotViuda = null;
  const eliminated = [];
  let log = pushLog(st.log, reason === "pass" ? "Todos pasaron: se muestran las manos repartidas" : "Se muestran las manos");
  for (const r of rows) log = pushLog(log, `${nameOf(st, r.seat)}: ${r.label}${r.wilds ? ` (${r.wilds} comodín${r.wilds > 1 ? "es" : ""})` : ""}`);
  for (const seat of losers) {
    chips[seat] -= 1;
    log = pushLog(log, `${nameOf(st, seat)} tuvo la peor mano y pierde una ficha`);
    if (chips[seat] > 0) continue;
    if (viuda === null) {
      viuda = seat; gotViuda = seat; chips[seat] = 1;
      log = pushLog(log, `${nameOf(st, seat)} se quedó sin fichas y recibe la viuda`);
    } else {
      out[seat] = true; eliminated.push(seat);
      log = pushLog(log, `${nameOf(st, seat)} sale del juego`);
    }
  }
  let left = chips.map((_, s) => s).filter((s) => !out[s]);
  // Si todos los que quedaban empataron y salieron, nadie sale en esta mano
  if (!left.length) {
    for (const seat of eliminated) { out[seat] = false; chips[seat] = 0; }
    left = eliminated.slice();
    eliminated.length = 0;
  }
  const sd = { reason, rows: rows.map(({ key, ...r }) => r), losers, viuda: gotViuda, eliminated, knocker: st.knocker, wild: st.wild };
  const base = { ...st, chips, out, viuda, showdown: sd, turn: -1, left: 0 };
  if (left.length === 1) {
    return { ...base, phase: "over", winner: left[0], log: pushLog(log, `¡${nameOf(st, left[0])} ganó la partida!`) };
  }
  if (left.length < 1 || left.every((s) => chips[s] === 0)) {
    return { ...base, phase: "over", winner: null, log: pushLog(log, "Empate: nadie conservó fichas") };
  }
  return { ...base, phase: "pause", log };
}

// Al vencerse el reloj: a ciegas pasa, con la viuda abierta toca, después de que tocaron pasa
export function autoAction(st) {
  if (st.phase === "pause") return { type: "next" };
  if (st.phase === "open") return { type: "knock" };
  return { type: "pass" };
}
