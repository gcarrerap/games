// Reglas de Cucharas: cada quien arma un póker (las cuatro cartas de un número) cambiando cartas con la mesa, todos a
// la vez. Quien lo tiene toma una cuchara; desde ese momento cualquiera puede tomar una, con póker o sin él. Hay una
// cuchara menos que jugadores: el que se queda sin cuchara pierde ficha.
// Funciones puras: estado entra, estado sale. El azar llega como ctx.rnd y la hora como ctx.now.
//
// La ronda
// - Se juega con `vivos + 1` números (pókers): uno de sobra. Cada quien recibe 4 cartas; nadie empieza con póker.
// - La mesa tiene `max(6, vivos + 2)` espacios. Siempre hay 4 cartas en ella, así que quedan `espacios - 4` huecos.
// - Cartas de la mesa (opción de la mesa): abiertas (boca arriba, escoges cuál tomar) o tapadas (tomas a ciegas).
// - Cambiar es un solo paso: escoges una carta tuya y una de la mesa. La tuya se suelta en un hueco al azar y tomas
//   la otra. Nunca tienes más de 4, y nunca tomas la que acabas de soltar. No hay límite de tiempo.
// - Cuchara: con póker, la tomas. Después de la primera, cualquiera puede tomar. Al tomarla tu mano se congela.
//   Nadie anuncia nada: las cucharas solo desaparecen de la mesa.
//
// Al terminar (cuando ya no quedan cucharas)
// - Se revelan las manos. El primero en tomar cuchara gana una ficha si tenía póker (sin pasar de 3); si no, pierde
//   una.
// - El que se quedó sin cuchara pierde una ficha. Con 0 fichas quedas fuera.
// - Si nadie quedara con fichas (con dos jugadores: el primero sin póker y el otro sin cuchara), los dos siguen con 1.
// - Gana el último que queda con fichas.
import { RANKS, SUITS, rankOf, shuffle } from "../../../modules/cards/index.js";

export const RULES = {
  chips: 3,
  maxChips: 3, // ganar ficha no te pasa de aquí: si no, la partida casi nunca termina
  hand: 4,
  tables: ["open", "closed"],
  slots: (alive) => Math.max(6, alive + 2),
  ranks: (alive) => alive + 1,
};
// Cómo ve una carta tapada quien no es el motor
export const HIDDEN = "?";

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 3 && c.n <= 8 && RULES.tables.includes(c.table);

export const nameOf = (st, s) => st.names[s] || `Jugador ${s + 1}`;
export const aliveSeats = (st) => st.chips.map((c, s) => (c > 0 ? s : -1)).filter((s) => s >= 0);
export const isPoker = (hand) => hand.length === RULES.hand && hand.every((c) => rankOf(c) === rankOf(hand[0]));
export const spoonsTotal = (st) => aliveSeats(st).length - 1;
export const hasSpoon = (st, seat) => st.spoonBy.includes(seat);

// Cuántas cartas de cada número hay en una mano: { "7": 2, "K": 1, … }
export function countRanks(hand) {
  const out = {};
  for (const c of hand) out[rankOf(c)] = (out[rankOf(c)] || 0) + 1;
  return out;
}

export function newGame(config, names = [], ctx) {
  const n = config.n;
  const st = {
    v: 2,
    config: { n, table: config.table },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    chips: Array(n).fill(RULES.chips),
    round: 0,
    phase: "play", // "play" | "between" (entre rondas) | "over"
    ranks: [], slots: [], hands: [],
    spoonBy: [], // quién tomó cuchara, en orden
    firstPoker: null, // si el primero tenía póker al tomarla
    last: null, // lo que pasó en la ronda anterior, público
    seq: 0,
    t: ctx.now || 0,
    start: ctx.now || 0,
    winner: null,
  };
  return deal(st, ctx.rnd);
}

// Reparte una ronda nueva entre los que tienen fichas
function deal(st, rnd) {
  const alive = aliveSeats(st);
  const n = st.config.n;
  const ranks = shuffle(RANKS, rnd).slice(0, RULES.ranks(alive.length));
  const deck = [];
  for (const r of ranks) for (const s of SUITS) deck.push(r + s + "0");
  // Nadie empieza con póker: se revuelve otra vez si a alguien le tocó (con el mismo azar, así se repite igual)
  let cards, hands;
  for (let tries = 0; ; tries++) {
    cards = shuffle(deck, rnd);
    hands = Array.from({ length: n }, () => []);
    alive.forEach((s, k) => { hands[s] = cards.slice(k * 4, k * 4 + 4); });
    if (!hands.some(isPoker) || tries > 50) break;
  }
  const rest = cards.slice(alive.length * 4);
  const nSlots = RULES.slots(alive.length);
  const where = shuffle(Array.from({ length: nSlots }, (_, i) => i), rnd).slice(0, rest.length);
  const slots = Array(nSlots).fill(null);
  where.forEach((i, k) => { slots[i] = rest[k]; });
  st.round++;
  st.phase = "play";
  st.ranks = ranks;
  st.slots = slots;
  st.hands = hands;
  st.spoonBy = [];
  st.firstPoker = null;
  st.start = st.t;
  return st;
}

function clone(st) {
  return { ...st, chips: st.chips.slice(), ranks: st.ranks.slice(), slots: st.slots.slice(), hands: st.hands.map((h) => h.slice()), spoonBy: st.spoonBy.slice() };
}

const playing = (st, seat) => st.phase === "play" && st.chips[seat] > 0 && !hasSpoon(st, seat);
const emptySlots = (st) => st.slots.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
const fullSlots = (st) => st.slots.map((c, i) => (c !== null ? i : -1)).filter((i) => i >= 0);

export function legalActions(st, seat) {
  if (seat < 0 || seat >= st.config.n) return [];
  if (st.phase === "between") return st.chips[seat] > 0 ? [{ type: "next" }] : [];
  if (!playing(st, seat)) return [];
  const out = [];
  for (const c of st.hands[seat]) for (const slot of fullSlots(st)) out.push({ type: "swap", c, slot });
  out.push({ type: "spoon" }); // sin póker también se puede (si eres el primero, al final pierdes ficha)
  out.push({ type: "wait" });
  return out;
}

export function apply(st0, seat, action, { now = 0, rnd = Math.random } = {}) {
  if (st0.phase === "over") throw new Error("La partida ya terminó.");
  if (!Number.isInteger(seat) || seat < 0 || seat >= st0.config.n) throw new Error("Ese asiento no existe.");
  const st = clone(st0);
  st.t = Math.max(st0.t, Number.isFinite(now) ? now : st0.t);
  st.seq = st0.seq + 1;
  const a = action || {};

  if (a.type === "next") {
    if (st.phase !== "between") throw new Error("La ronda no ha terminado.");
    if (st.chips[seat] <= 0) throw new Error("Ya no tienes fichas.");
    return deal(st, rnd);
  }
  if (st.phase !== "play") throw new Error("La ronda ya terminó.");

  switch (a.type) {
    case "swap": {
      if (!playing(st, seat)) throw new Error(hasSpoon(st, seat) ? "Ya tomaste cuchara." : "No estás jugando.");
      const hand = st.hands[seat];
      const k = hand.indexOf(a.c);
      if (k < 0) throw new Error("Esa carta no la tienes.");
      if (!Number.isInteger(a.slot) || st.slots[a.slot] == null) throw new Error("En ese espacio ya no hay carta.");
      const holes = emptySlots(st);
      if (!holes.length) throw new Error("No hay espacio vacío en la mesa.");
      // Primero sueltas (en un hueco al azar) y después tomas: nunca más de 4
      const got = st.slots[a.slot];
      hand.splice(k, 1);
      st.slots[holes[Math.floor(rnd() * holes.length)]] = a.c;
      st.slots[a.slot] = null;
      hand.push(got);
      break;
    }
    case "spoon": {
      if (st.chips[seat] <= 0) throw new Error("Ya no tienes fichas.");
      if (hasSpoon(st, seat)) throw new Error("Ya tienes cuchara.");
      if (!st.spoonBy.length) st.firstPoker = isPoker(st.hands[seat]);
      st.spoonBy.push(seat);
      if (st.spoonBy.length >= spoonsTotal(st)) endRound(st);
      break;
    }
    case "wait": break; // la compu no tiene nada que hacer todavía
    default:
      throw new Error("Esa acción no existe.");
  }
  return st;
}

function endRound(st) {
  const alive = aliveSeats(st);
  const first = st.spoonBy[0];
  const loser = alive.find((s) => !st.spoonBy.includes(s));
  const before = st.chips.slice();
  st.chips[first] = st.firstPoker ? Math.min(RULES.maxChips, st.chips[first] + 1) : st.chips[first] - 1;
  st.chips[loser] -= 1;
  // Si nadie quedara con fichas, los que acaban de quedarse en 0 siguen con 1
  if (aliveSeats(st).length === 0) for (const s of alive) if (st.chips[s] <= 0) st.chips[s] = 1;
  const delta = st.chips.map((c, s) => c - before[s]);
  st.last = {
    round: st.round,
    hands: st.hands.map((h) => h.slice()),
    spoonBy: st.spoonBy.slice(),
    first, firstPoker: st.firstPoker, loser, delta,
    out: alive.filter((s) => st.chips[s] <= 0),
  };
  const left = aliveSeats(st);
  if (left.length <= 1) { st.phase = "over"; st.winner = left[0] ?? first; }
  else st.phase = "between";
}

// Asientos de mejor a peor: el ganador, luego más fichas; en empate, el de menor asiento
export function ranking(st) {
  return st.chips.map((c, s) => s).sort((a, b) => (b === st.winner) - (a === st.winner) || st.chips[b] - st.chips[a] || a - b);
}

// Lo que ve un asiento (-1: quien solo mira). La mesa es pública si se juega con cartas abiertas; tapadas, solo se
// ve dónde hay carta (HIDDEN). De las manos ajenas solo cuántas cartas tienen. De las cucharas solo cuántas quedan y
// si tú tienes: quién las tomó y en qué orden se sabe al terminar la ronda.
export function view(st, seat) {
  const mine = seat >= 0 && seat < st.config.n;
  const open = st.config.table !== "closed";
  return {
    v: st.v, config: st.config, names: st.names, seat, round: st.round, phase: st.phase,
    chips: st.chips, ranks: st.ranks,
    slots: open ? st.slots : st.slots.map((c) => (c === null ? null : HIDDEN)),
    counts: st.hands.map((h) => h.length),
    hand: mine ? st.hands[seat].slice() : [],
    spoons: st.phase === "play" ? spoonsTotal(st) : 0,
    spoonsLeft: st.phase === "play" ? spoonsTotal(st) - st.spoonBy.length : 0,
    mySpoon: mine && hasSpoon(st, seat),
    last: st.last, seq: st.seq, t: st.t, start: st.start, winner: st.winner,
  };
}
