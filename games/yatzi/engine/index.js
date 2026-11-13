// Reglas de Yatzi (el juego de los cinco dados y la tarjeta de 13 casillas). Funciones puras: estado entra, estado
// sale. El azar llega como ctx.rnd.
//
// Un turno:
//   1. Tiras los 5 dados. Puedes volver a tirar los que quieras dos veces más (3 tiros en total); los que apartas
//      viajan en la acción ({ type: "roll", keep: [true, false, …] }) para que todos vean qué guardaste.
//   2. Anotas el tiro en una casilla libre de tu tarjeta ({ type: "score", cat }). Si no vale nada ahí, se tacha (0).
// Gana quien suma más al llenar las 13 casillas.
//
// Bonos: 35 si la sección de arriba suma 63 o más. Cada Yatzi extra (con la casilla de Yatzi ya en 50) da 100.
// Comodín (reglas oficiales): con un Yatzi extra, si la casilla de arriba de ese número está libre hay que anotarlo
// ahí; si no, en cualquier casilla de abajo, y Full y escaleras valen completo; si abajo no queda nada, se tacha una de
// arriba.

export const FACES = [1, 2, 3, 4, 5, 6];
export const DICE = 5;
export const MAX_ROLLS = 3;

export const UPPER = ["ones", "twos", "threes", "fours", "fives", "sixes"];
export const LOWER = ["three", "four", "full", "small", "large", "yatzi", "chance"];
export const CATS = [...UPPER, ...LOWER];

export const LABELS = {
  ones: "Unos", twos: "Doses", threes: "Treses", fours: "Cuatros", fives: "Cincos", sixes: "Seises",
  three: "Tercia", four: "Póker", full: "Full", small: "Escalera chica", large: "Escalera grande", yatzi: "Yatzi", chance: "Suerte",
};
export const HINTS = {
  ones: "Suma de los unos", twos: "Suma de los doses", threes: "Suma de los treses", fours: "Suma de los cuatros",
  fives: "Suma de los cincos", sixes: "Suma de los seises",
  three: "3 iguales: suma todo", four: "4 iguales: suma todo", full: "3 + 2 iguales: 25", small: "4 seguidos: 30",
  large: "5 seguidos: 40", yatzi: "5 iguales: 50", chance: "Lo que sea: suma todo",
};

export const RULES = {
  upperBonusAt: 63,
  upperBonus: 35,
  yatziBonus: 100,
  fixed: { full: 25, small: 30, large: 40, yatzi: 50 },
  turnMs: 45000,
};

export const faceOf = (cat) => UPPER.indexOf(cat) + 1; // 0 si no es de arriba
export const counts = (dice) => { const c = [0, 0, 0, 0, 0, 0, 0]; for (const d of dice) c[d]++; return c; };
export const sum = (dice) => dice.reduce((a, b) => a + b, 0);
export const isYatzi = (dice) => !!dice && dice.length === DICE && dice.every((d) => d === dice[0]);

function hasRun(c, len) {
  let run = 0;
  for (let f = 1; f <= 6; f++) { run = c[f] ? run + 1 : 0; if (run >= len) return true; }
  return false;
}

// Puntos de un tiro en una casilla, sin bonos. Con `joker` (Yatzi extra), Full y escaleras valen completo.
export function scoreFor(dice, cat, joker = false) {
  const c = counts(dice), max = Math.max(...c);
  const f = faceOf(cat);
  if (f) return c[f] * f;
  switch (cat) {
    case "three": return max >= 3 ? sum(dice) : 0;
    case "four": return max >= 4 ? sum(dice) : 0;
    case "full": return joker || (c.includes(3) && c.includes(2)) ? RULES.fixed.full : 0;
    case "small": return joker || hasRun(c, 4) ? RULES.fixed.small : 0;
    case "large": return joker || hasRun(c, 5) ? RULES.fixed.large : 0;
    case "yatzi": return max === 5 ? RULES.fixed.yatzi : 0;
    case "chance": return sum(dice);
    default: throw new Error(`Casilla desconocida: ${cat}`);
  }
}

export const emptyCard = () => ({ ...Object.fromEntries(CATS.map((k) => [k, null])), bonus: 0 });
export const upperSum = (card) => UPPER.reduce((s, k) => s + (card[k] || 0), 0);
export const upperBonusOf = (card) => (upperSum(card) >= RULES.upperBonusAt ? RULES.upperBonus : 0);
export const lowerSum = (card) => LOWER.reduce((s, k) => s + (card[k] || 0), 0);
export const total = (card) => upperSum(card) + upperBonusOf(card) + lowerSum(card) + (card.bonus || 0) * RULES.yatziBonus;
export const filled = (card) => CATS.filter((k) => card[k] !== null).length;
export const openCats = (card) => CATS.filter((k) => card[k] === null);

// Un Yatzi extra: el tiro es Yatzi y la casilla de Yatzi ya está anotada (con 50 o tachada)
export const isExtraYatzi = (card, dice) => isYatzi(dice) && card.yatzi !== null;

// Dónde se puede anotar este tiro, con lo que vale cada casilla: [{ cat, pts, bonus }] (bonus: 100 si es Yatzi extra
// con la casilla de Yatzi en 50). Con comodín, el orden de prioridad de las reglas.
export function options(card, dice) {
  const open = openCats(card);
  if (!isExtraYatzi(card, dice)) return open.map((cat) => ({ cat, pts: scoreFor(dice, cat), bonus: 0 }));
  const bonus = card.yatzi === RULES.fixed.yatzi ? RULES.yatziBonus : 0;
  const up = UPPER[dice[0] - 1];
  if (card[up] === null) return [{ cat: up, pts: scoreFor(dice, up), bonus }];
  const low = open.filter((k) => LOWER.includes(k));
  if (low.length) return low.map((cat) => ({ cat, pts: scoreFor(dice, cat, true), bonus }));
  return open.map((cat) => ({ cat, pts: scoreFor(dice, cat), bonus }));
}

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 1 && c.n <= 6;

export function newGame(config, names = [], now = 0) {
  const n = config.n;
  return {
    v: 1,
    config: { n, timer: config.timer !== false },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    cards: Array.from({ length: n }, emptyCard),
    turn: 0,
    round: 1, // 1 a 13
    phase: "roll", // "roll": tiene que tirar · "pick": puede tirar otra vez o anotar · "over"
    dice: null, // los 5 dados del último tiro de este turno
    keep: [false, false, false, false, false], // los que se apartaron antes del último tiro
    rolls: 0, // tiros hechos en este turno
    seq: 0, // acciones aplicadas (para animar solo lo nuevo)
    last: null, // lo último que se anotó: { seat, cat, pts, bonus, upper, dice, round }
    winner: null,
    winners: [],
    started: now,
    log: [],
  };
}

export const nameOf = (st, seat) => st.names[seat];
export const totals = (st) => st.cards.map(total);

export function legalActions(st, seat) {
  if (st.phase === "over" || seat !== st.turn) return [];
  const acts = [];
  if (st.rolls < MAX_ROLLS) acts.push({ type: "roll", keep: [false, false, false, false, false] });
  if (st.rolls > 0) for (const o of options(st.cards[seat], st.dice)) acts.push({ type: "score", cat: o.cat });
  return acts;
}

const okKeep = (k) => Array.isArray(k) && k.length === DICE && k.every((x) => typeof x === "boolean");

// Revisa una acción; regresa el motivo si no se vale, o "" si se vale
export function check(st, seat, action) {
  if (st.phase === "over") return "La partida ya terminó.";
  if (seat !== st.turn) return "No es tu turno.";
  if (!action) return "Esa jugada no existe.";
  if (action.type === "roll") {
    if (st.rolls >= MAX_ROLLS) return "Ya tiraste tres veces: anota tu tiro.";
    if (action.keep !== undefined && !okKeep(action.keep)) return "Esos dados apartados no se valen.";
    if (st.rolls === 0 && action.keep && action.keep.some(Boolean)) return "En el primer tiro van los cinco dados.";
    if (action.keep && action.keep.every(Boolean)) return "Aparta menos dados para poder tirar.";
    return "";
  }
  if (action.type === "score") {
    if (st.rolls === 0) return "Primero tienes que tirar.";
    if (!CATS.includes(action.cat)) return "Esa casilla no existe.";
    if (st.cards[seat][action.cat] !== null) return "Esa casilla ya está anotada.";
    if (!options(st.cards[seat], st.dice).some((o) => o.cat === action.cat)) return "Con un Yatzi extra va primero en su casilla de arriba.";
    return "";
  }
  return "Esa jugada no existe.";
}

export function apply(st, seat, action, { rnd }) {
  const err = check(st, seat, action);
  if (err) throw new Error(err);
  const seq = st.seq + 1, who = nameOf(st, seat);

  if (action.type === "roll") {
    const keep = st.rolls === 0 || !action.keep ? [false, false, false, false, false] : action.keep.slice();
    const dice = Array.from({ length: DICE }, (_, i) => (keep[i] ? st.dice[i] : 1 + Math.floor(rnd() * 6)));
    const rolls = st.rolls + 1;
    return {
      ...st, seq, dice, keep, rolls, phase: "pick",
      log: [...st.log, `${who} tiró ${dice.join(" ")}${rolls > 1 ? ` (tiro ${rolls})` : ""}`],
    };
  }

  // Anotar
  const card = st.cards[seat];
  const opt = options(card, st.dice).find((o) => o.cat === action.cat);
  const before = upperBonusOf(card);
  const next = { ...card, [action.cat]: opt.pts, bonus: (card.bonus || 0) + (opt.bonus ? 1 : 0) };
  const upper = !before && upperBonusOf(next) ? RULES.upperBonus : 0;
  const cards = st.cards.slice(); cards[seat] = next;
  const last = { seat, cat: action.cat, pts: opt.pts, bonus: opt.bonus, upper, dice: st.dice.slice(), round: st.round };
  const log = [...st.log, `${who} anotó ${opt.pts} en ${LABELS[action.cat]}${opt.bonus ? " ¡y 100 por Yatzi extra!" : ""}${upper ? " · ¡bono de 35 arriba!" : ""}`];

  const n = st.config.n, nextTurn = (seat + 1) % n;
  const round = nextTurn === 0 ? st.round + 1 : st.round;
  const base = { ...st, cards, seq, last, log, dice: null, keep: [false, false, false, false, false], rolls: 0 };
  if (cards.every((c) => filled(c) === CATS.length)) {
    const t = cards.map(total), best = Math.max(...t);
    const winners = t.map((v, s) => (v === best ? s : -1)).filter((s) => s >= 0);
    const winner = winners.length === 1 ? winners[0] : null;
    return { ...base, phase: "over", winner, winners, log: [...log, winner === null ? `Empate con ${best}` : `¡${nameOf(st, winner)} ganó con ${best}!`] };
  }
  return { ...base, turn: nextTurn, round, phase: "roll" };
}

// La mejor casilla para este tiro sin pensar en el futuro (para el reloj): la que da más puntos, y si nada da, la que
// menos duele tachar.
const SACRIFICE = ["ones", "yatzi", "twos", "four", "large", "threes", "small", "full", "three", "fours", "fives", "chance", "sixes"];
export function greedyCat(card, dice) {
  const opts = options(card, dice);
  const best = opts.reduce((a, o) => (o.pts + o.bonus > a.pts + a.bonus ? o : a), opts[0]);
  if (best.pts + best.bonus > 0) return best.cat;
  return SACRIFICE.find((k) => opts.some((o) => o.cat === k)) || opts[0].cat;
}

// Al vencerse el reloj: tira si no ha tirado; si ya tiró, anota lo que más le da
export const autoAction = (st) => (st.rolls === 0 ? { type: "roll", keep: [false, false, false, false, false] } : { type: "score", cat: greedyCat(st.cards[st.turn], st.dice) });
