// Reglas de Skull. Funciones puras: estado entra, estado sale. El azar llega como ctx.rnd.
//
// Cada quien tiene 4 discos: 3 flores y 1 calavera. Una ronda:
//   1. Todos ponen a la vez un disco boca abajo en su tapete (fase "place").
//   2. Por turnos, empezando por quien abre la ronda, cada quien pone otro disco o abre la apuesta (fase "build").
//      Quien ya no tiene discos en la mano tiene que apostar.
//   3. Apuesta (fase "bid"): cada quien sube o pasa; quien pasa ya no vuelve a apostar en la ronda. Cuando todos los
//      demás pasaron, o alguien apuesta todos los discos de la mesa, el que apostó más alto es el retador.
//   4. El retador voltea (fase "flip"): primero los suyos, de arriba hacia abajo, todos (o hasta completar la
//      apuesta); luego, de uno en uno, el de arriba de los tapetes que escoja.
//      - Completa la apuesta solo con flores: gana el reto. Dos retos ganados = gana la partida.
//      - Sale una calavera: pierde un disco para siempre. Si la calavera es de otro, ese jugador le quita uno al
//        azar sin verlo (nadie más sabe cuál fue). Si es la suya, el retador escoge cuál pierde (fase "discard").
//        Quien se queda sin discos sale. El último que queda también gana.
// La siguiente ronda la abre el retador; si salió, el siguiente jugador que sigue en juego.

export const RULES = {
  flowers: 3,
  skulls: 1,
  winsToWin: 2,
  turnMs: 30000,
};

export const FLOWER = "F";
export const SKULL = "S";

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 3 && c.n <= 6;

export const nameOf = (st, seat) => st.names[seat];
export const alive = (st) => st.out.map((o, s) => (o ? -1 : s)).filter((s) => s >= 0);
export function nextAlive(st, seat, skip = () => false) {
  const n = st.config.n;
  for (let i = 1; i <= n; i++) { const s = (seat + i) % n; if (!st.out[s] && !skip(s)) return s; }
  return -1;
}

const pushLog = (log, msg) => [...log, msg];
const count = (arr, d) => arr.filter((x) => x === d).length;

// Discos que el asiento todavía tiene en la mano (los suyos menos los que están en su tapete)
export function inHand(st, seat) {
  const own = st.discs[seat], stack = st.stacks[seat];
  return { F: own.F - count(stack, FLOWER), S: own.S - count(stack, SKULL) };
}
export const discCount = (st, seat) => st.discs[seat].F + st.discs[seat].S;
export const onMat = (st) => st.stacks.reduce((t, s) => t + s.length, 0);

export function newGame(config, names, now) {
  const n = config.n;
  const st = {
    v: 1,
    config: { n, timer: config.timer !== false },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    discs: Array.from({ length: n }, () => ({ F: RULES.flowers, S: RULES.skulls })),
    wins: Array(n).fill(0),
    out: Array(n).fill(false),
    round: 0,
    starter: 0,
    winner: null,
    seq: 0,
    started: now,
    log: [],
  };
  return newRound(st, 0);
}

// Empieza una ronda: tapetes vacíos y todos ponen su primer disco
export function newRound(st, starter) {
  const n = st.config.n;
  return {
    ...st,
    round: st.round + 1,
    starter,
    phase: "place",
    stacks: Array.from({ length: n }, () => []),
    flipped: Array(n).fill(0), // cuántos discos se voltearon, de arriba hacia abajo, en cada tapete
    turn: -1,
    bid: null, // { n, seat }: la apuesta más alta
    passed: Array(n).fill(false),
    bidders: Array(n).fill(false), // quién apostó en esta ronda (lo ve todo el mundo)
    challenger: null,
    reveals: [], // [{ seat, disc }] en el orden en que se voltearon
    outcome: null,
    last: null,
    log: pushLog(st.log, `Ronda ${st.round + 1}: abre ${nameOf(st, starter)}`),
  };
}

const PLAYING = new Set(["place", "build", "bid", "flip", "discard"]);
export const isPlaying = (st) => PLAYING.has(st.phase);

// Asientos que deben actuar: todos los que no han puesto su primer disco, o el del turno
export function currentSeats(st) {
  if (st.phase === "place") return alive(st).filter((s) => st.stacks[s].length === 0);
  if (isPlaying(st)) return [st.turn];
  return [];
}

// Tapetes que el retador todavía puede voltear
export function flipTargets(st) {
  const ch = st.challenger;
  if (st.flipped[ch] < st.stacks[ch].length) return [ch];
  return st.stacks.map((s, i) => (i !== ch && st.flipped[i] < s.length ? i : -1)).filter((i) => i >= 0);
}

const placeActions = (h) => [...(h.F > 0 ? [{ type: "place", disc: FLOWER }] : []), ...(h.S > 0 ? [{ type: "place", disc: SKULL }] : [])];
const bidActions = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => ({ type: "bid", n: from + i }));

export function legalActions(st, seat) {
  if (st.phase === "over") return [];
  if (st.phase === "pause") return [{ type: "next" }];
  if (st.phase === "place") return st.out[seat] || st.stacks[seat].length ? [] : placeActions(inHand(st, seat));
  if (seat !== st.turn) return [];
  if (st.phase === "build") return [...placeActions(inHand(st, seat)), ...bidActions(1, onMat(st))];
  if (st.phase === "bid") return [{ type: "pass" }, ...bidActions(st.bid.n + 1, onMat(st))];
  if (st.phase === "flip") return flipTargets(st).map((s) => ({ type: "flip", seat: s }));
  if (st.phase === "discard") {
    const own = st.discs[seat];
    return [...(own.F > 0 ? [{ type: "discard", disc: FLOWER }] : []), ...(own.S > 0 ? [{ type: "discard", disc: SKULL }] : [])];
  }
  return [];
}

// Revisa una acción; regresa el motivo si no se vale, o "" si se vale
export function check(st, seat, a) {
  if (st.phase === "over") return "La partida ya terminó.";
  if (!a || typeof a.type !== "string") return "Esa jugada no existe.";
  if (st.phase === "pause") return a.type === "next" ? "" : "Espera la siguiente ronda.";
  if (a.type === "next") return "La ronda no ha terminado.";
  if (st.out[seat]) return "Ya saliste del juego.";
  if (st.phase === "place") {
    if (st.stacks[seat].length) return "Ya pusiste tu disco; espera a los demás.";
    if (a.type !== "place") return "Primero pon un disco.";
  } else if (seat !== st.turn) return "No es tu turno.";
  const h = inHand(st, seat);
  switch (a.type) {
    case "place":
      if (st.phase !== "place" && st.phase !== "build") return "Ya no se pueden poner discos.";
      if (a.disc !== FLOWER && a.disc !== SKULL) return "Ese disco no existe.";
      if (h[a.disc] <= 0) return a.disc === SKULL ? "No tienes la calavera en la mano." : "No tienes flores en la mano.";
      return "";
    case "bid": {
      if (st.phase !== "build" && st.phase !== "bid") return "Ahora no se apuesta.";
      const min = st.bid ? st.bid.n + 1 : 1;
      if (!Number.isInteger(a.n) || a.n < min) return `La apuesta tiene que ser de ${min} o más.`;
      if (a.n > onMat(st)) return `Solo hay ${onMat(st)} discos en la mesa.`;
      return "";
    }
    case "pass":
      return st.phase === "bid" ? "" : "Ahora no se puede pasar.";
    case "flip":
      if (st.phase !== "flip") return "Ahora no se voltea.";
      if (!flipTargets(st).includes(a.seat)) return st.flipped[seat] < st.stacks[seat].length ? "Primero volteas los tuyos." : "Ese tapete ya no tiene discos por voltear.";
      return "";
    case "discard":
      if (st.phase !== "discard") return "Ahora no se pierde un disco.";
      if (a.disc !== FLOWER && a.disc !== SKULL) return "Ese disco no existe.";
      if (st.discs[seat][a.disc] <= 0) return "No tienes ese disco.";
      return "";
    default:
      return "Esa jugada no existe.";
  }
}

export function apply(st, seat, action, { rnd }) {
  const err = check(st, seat, action);
  if (err) throw new Error(err);
  const seq = st.seq + 1, who = nameOf(st, seat);
  if (action.type === "next") return { ...newRound(st, st.outcome.nextStarter), seq };

  if (action.type === "place") {
    const stacks = st.stacks.slice();
    stacks[seat] = [...stacks[seat], action.disc];
    // El disco puesto no se anota en last ni en el registro: los demás solo ven que alguien puso uno
    let s = { ...st, seq, stacks, last: { seat, kind: "place" }, log: pushLog(st.log, `${who} puso un disco`) };
    if (st.phase === "place") {
      if (alive(st).every((x) => stacks[x].length > 0)) s = { ...s, phase: "build", turn: st.starter };
      return s;
    }
    return { ...s, turn: nextAlive(st, seat) };
  }

  if (action.type === "bid") {
    const bidders = st.bidders.slice(); bidders[seat] = true;
    const s = { ...st, seq, phase: "bid", bid: { n: action.n, seat }, bidders, last: { seat, kind: "bid", n: action.n },
      log: pushLog(st.log, st.bid ? `${who} sube a ${action.n}` : `${who} apuesta ${action.n}`) };
    if (action.n === onMat(st)) return startFlip(s, seat, "todo");
    const next = nextAlive(st, seat, (x) => st.passed[x]);
    return next === seat || next < 0 ? startFlip(s, seat, "pasaron") : { ...s, turn: next };
  }

  if (action.type === "pass") {
    const passed = st.passed.slice(); passed[seat] = true;
    const s = { ...st, seq, passed, last: { seat, kind: "pass" }, log: pushLog(st.log, `${who} pasó`) };
    const still = alive(st).filter((x) => !passed[x]);
    if (still.length === 1) return startFlip(s, st.bid.seat, "pasaron");
    return { ...s, turn: nextAlive(st, seat, (x) => passed[x]) };
  }

  if (action.type === "flip") return flip({ ...st, seq }, action.seat, rnd);

  // discard: el retador encontró su propia calavera y escoge qué disco pierde
  return loseDisc({ ...st, seq }, seat, action.disc, seat);
}

function startFlip(st, ch, why) {
  const msg = why === "todo" ? `${nameOf(st, ch)} apostó todos los discos: a voltear ${st.bid.n}` : `${nameOf(st, ch)} tiene que voltear ${st.bid.n}`;
  return { ...st, phase: "flip", challenger: ch, turn: ch, log: pushLog(st.log, msg) };
}

const flippedTotal = (st) => st.flipped.reduce((a, b) => a + b, 0);

// Voltea: en su propio tapete, todos los que falten de arriba hacia abajo hasta completar la apuesta o encontrar la
// calavera; en otro tapete, solo el de arriba
function flip(st, target, rnd) {
  const ch = st.challenger;
  const flipped = st.flipped.slice(), reveals = st.reveals.slice();
  const stack = st.stacks[target];
  let skull = false;
  const take = target === ch ? Math.min(stack.length - flipped[target], st.bid.n - flippedTotal(st)) : 1;
  for (let i = 0; i < take && !skull; i++) {
    const disc = stack[stack.length - 1 - flipped[target]];
    flipped[target] += 1;
    reveals.push({ seat: target, disc });
    if (disc === SKULL) skull = true;
  }
  const flips = reveals.length - st.reveals.length;
  const whose = target === ch ? "los suyos" : `el de ${nameOf(st, target)}`;
  let s = { ...st, flipped, reveals, last: { seat: ch, kind: "flip", target, count: flips, skull },
    log: pushLog(st.log, `${nameOf(st, ch)} volteó ${target === ch ? `${flips} de ${whose}` : whose}: ${skull ? "¡calavera!" : flips > 1 ? "flores" : "flor"}`) };
  if (skull) {
    if (target === ch) return { ...s, phase: "discard", turn: ch, log: pushLog(s.log, `${nameOf(st, ch)} encontró su propia calavera y escoge qué disco pierde`) };
    // El dueño de la calavera le quita un disco al azar, sin verlo
    const own = st.discs[ch], total = own.F + own.S;
    const disc = rnd() * total < own.S ? SKULL : FLOWER;
    return loseDisc(s, ch, disc, target);
  }
  if (flippedTotal(s) >= st.bid.n) return winChallenge(s, ch);
  return s;
}

function winChallenge(st, ch) {
  const wins = st.wins.slice(); wins[ch] += 1;
  const outcome = { challenger: ch, bid: st.bid.n, success: true, skullOf: null, lost: null, eliminated: false, nextStarter: ch };
  let log = pushLog(st.log, `¡${nameOf(st, ch)} completó ${st.bid.n} flores y gana el reto!`);
  const base = { ...st, wins, outcome, turn: -1 };
  if (wins[ch] >= RULES.winsToWin) {
    return { ...base, phase: "over", winner: ch, log: pushLog(log, `¡${nameOf(st, ch)} ganó dos retos y gana la partida!`) };
  }
  return { ...base, phase: "pause", log };
}

// El retador pierde un disco (lost) por la calavera de skullOf. Quien no es el retador no sabe cuál fue: la vista lo
// oculta.
function loseDisc(st, ch, lost, skullOf) {
  const discs = st.discs.slice(); discs[ch] = { ...discs[ch], [lost]: discs[ch][lost] - 1 };
  const out = st.out.slice();
  const own = skullOf === ch;
  let log = pushLog(st.log, own ? `${nameOf(st, ch)} pierde un disco` : `${nameOf(st, skullOf)} le quita un disco a ${nameOf(st, ch)}`);
  const eliminated = discs[ch].F + discs[ch].S === 0;
  if (eliminated) { out[ch] = true; log = pushLog(log, `${nameOf(st, ch)} se quedó sin discos y sale del juego`); }
  const s = { ...st, discs, out };
  const nextStarter = eliminated ? nextAlive(s, ch) : ch;
  const outcome = { challenger: ch, bid: st.bid.n, success: false, skullOf, lost, eliminated, nextStarter };
  const base = { ...s, outcome, turn: -1 };
  const left = alive(s);
  if (left.length === 1) {
    return { ...base, phase: "over", winner: left[0], log: pushLog(log, `¡${nameOf(st, left[0])} es el último en pie y gana la partida!`) };
  }
  return { ...base, phase: "pause", log };
}

// Al vencerse el reloj: pone una flor si puede (si no, la calavera); al apostar, pasa (o apuesta lo mínimo si es el
// primero); al voltear, el primer tapete que se pueda; al perder un disco, una flor si tiene
export function autoAction(st, seat = st.turn) {
  if (st.phase === "pause") return { type: "next" };
  if (st.phase === "place" || st.phase === "build") {
    const h = inHand(st, seat);
    if (h.F > 0) return { type: "place", disc: FLOWER };
    if (st.phase === "place") return { type: "place", disc: SKULL };
    return { type: "bid", n: 1 };
  }
  if (st.phase === "bid") return { type: "pass" };
  if (st.phase === "flip") return { type: "flip", seat: flipTargets(st)[0] };
  if (st.phase === "discard") return { type: "discard", disc: st.discs[seat].F > 0 ? FLOWER : SKULL };
  return null;
}

// Lo que un asiento puede ver: su tapete y sus discos completos; de los demás, cuántos tienen y solo los discos
// volteados. Qué disco perdió el retador solo lo sabe él.
export function view(st, seat) {
  const stacks = st.stacks.map((stack, s) => (s === seat ? stack.slice() : stack.map((d, i) => (i >= stack.length - st.flipped[s] ? d : null))));
  const discs = st.discs.map((d, s) => (s === seat ? { ...d } : null));
  const discTotals = st.discs.map((d) => d.F + d.S);
  const outcome = st.outcome && st.outcome.challenger !== seat ? { ...st.outcome, lost: null } : st.outcome;
  return { ...st, stacks, discs, discTotals, outcome };
}
