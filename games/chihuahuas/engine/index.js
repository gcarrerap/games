// Reglas de la Carrera de Chihuahuas (estilo Camel Up). Funciones puras: estado entra, estado sale. El azar llega
// como ctx.rnd.
//
// Cinco chihuahuas corren en una pista de 16 casillas. Se apilan: el que cae en una casilla ocupada se sube encima, y
// cuando un perro avanza se lleva a cuestas a todos los que tiene encima. En cada casilla gana el de hasta arriba.
//
// En tu turno haces UNA de estas cosas:
//   - Sacudir el tazón ("roll"): sale el dado de un perro al azar con 1, 2 o 3, ese perro avanza (con los que lleva
//     encima) y ganas 1 croqueta en ese momento. Cada perro corre una sola vez por etapa.
//   - Tomar un boleto de etapa ("ticket"): el de hasta arriba de ese perro (5, luego 3, luego 2). Al acabar la etapa:
//     si ese perro va primero cobras lo que dice el boleto; si va segundo, 1; si no, pierdes 1.
//   - Poner tu tapete ("tile") en una casilla vacía: hueso (+1, el perro corre a su casilla siguiente y queda encima)
//     o aspiradora (−1, el perro se asusta, se regresa y queda debajo de los que haya). Cada que alguien cae en tu
//     tapete ganas 1 croqueta. Ni en la casilla 1, ni junto a otro tapete. Se recogen al acabar la etapa.
//   - Apostar en secreto al ganador o al último de toda la carrera ("final"), con una de tus 5 cartas (una por perro;
//     cada carta se usa una sola vez). Al final, como en el juego original, las apuestas que atinan cobran 8, 5, 3, 2,
//     1, 1… en el orden en que se hicieron, contando solo las que atinan; las equivocadas pierden 1 y no ocupan lugar.
// La etapa acaba cuando los cinco perros ya corrieron (fase "leg", una pausa para ver cómo quedó). La carrera acaba
// cuando un perro cruza la meta: se cobra la etapa, luego las apuestas finales, y gana quien tenga más croquetas.
// Las croquetas nunca bajan de 0.

export const DOGS = [
  { id: "chia", name: "Chia", color: "rojo" },
  { id: "oreo", name: "Oreo", color: "azul" },
  { id: "chocolate", name: "Chocolate", color: "verde" },
  { id: "gustavo", name: "Gustavo", color: "amarillo" },
  { id: "catrina", name: "Catrina", color: "morado" },
];
export const ND = DOGS.length;

export const RULES = {
  track: 16, // casillas; quien pasa de la 16 cruza la meta
  startCoins: 3,
  tickets: [5, 3, 2], // boletos de etapa de cada perro, del de arriba al de abajo
  second: 1, // lo que paga un boleto si su perro llega segundo
  miss: 1, // lo que cuesta un boleto si su perro no llega ni primero ni segundo
  finals: [8, 5, 3, 2, 1], // apuestas finales correctas, por orden de llegada (después de la quinta, 1)
  finalMiss: 1,
  turnMs: 30000,
};

// Hasta dónde puede llegar un perro: meta (16) + 3 del dado + 1 del hueso
const SPACES = RULES.track + 5;

export const dogName = (d) => DOGS[d].name;
export const nameOf = (st, seat) => st.names[seat];
export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 2 && c.n <= 8;

const pushLog = (log, msg) => [...log, msg];

// Dónde está cada perro: [{ space, level }] (level 0 = hasta abajo)
export function positions(spaces) {
  const pos = Array(ND).fill(null);
  spaces.forEach((stack, s) => stack.forEach((d, i) => { pos[d] = { space: s, level: i }; }));
  return pos;
}

// Orden de la carrera, del primero al último: casilla más adelantada primero; en la misma casilla, el de arriba
export function ranking(spaces) {
  const out = [];
  for (let s = spaces.length - 1; s >= 0; s--) for (let i = spaces[s].length - 1; i >= 0; i--) out.push(spaces[s][i]);
  return out;
}

export const finished = (spaces) => spaces.some((stack, s) => s > RULES.track && stack.length > 0);

// Mueve al perro `dog` n casillas con los que lleva encima. tiles: [{ seat, space, kind }]. Devuelve las casillas
// nuevas y lo que pasó (a dónde llegó, si cayó en un tapete). No toca el estado original.
export function moveDog(spaces, dog, n, tiles = []) {
  const sp = spaces.map((s) => s.slice());
  const from = sp.findIndex((s) => s.includes(dog));
  const i = sp[from].indexOf(dog);
  const unit = sp[from].slice(i);
  sp[from] = sp[from].slice(0, i);
  let to = from + n;
  const tile = to <= RULES.track ? tiles.find((t) => t.space === to) || null : null;
  if (tile && tile.kind === "hueso") { to += 1; sp[to] = [...sp[to], ...unit]; }
  else if (tile) { to -= 1; sp[to] = [...unit, ...sp[to]]; } // aspiradora: se regresa y queda hasta abajo
  else sp[to] = [...sp[to], ...unit];
  return { spaces: sp, from, fromLevel: i, to, landed: from + n, tile, carried: unit.slice(1) };
}

// Casillas donde un asiento puede poner su tapete (su propio tapete no cuenta: lo está cambiando de lugar)
export function tileSpaces(st, seat) {
  const others = st.tiles.filter((t) => t.seat !== seat).map((t) => t.space);
  const out = [];
  for (let s = 2; s <= RULES.track; s++) {
    if (st.spaces[s].length) continue;
    if (others.some((o) => Math.abs(o - s) <= 1)) continue;
    out.push(s);
  }
  return out;
}

// Historial de la carrera para la ventana "Jugadas": cada jugada (lo mismo que `last`) con su etapa, más el fin de
// cada etapa y el final. Las mesas que empezaron antes de que existiera no lo traen: se arranca vacío.
const addHist = (st, entry) => [...(st.hist || []), { ...entry, leg: st.leg }];

// Cuánto tarda la mesa en mostrar la última jugada (sale el dado del tazón y el perro avanza casilla por casilla), para
// que la compu espere a que se vea antes de jugar. La interfaz usa los mismos tiempos (ui/fx.js).
export const SHOW = { reveal: 1000, step: 380, settle: 450 };
export function rollSteps(last) {
  return Math.min(last.landed, RULES.track + 1) - last.from + (last.tile ? 1 : 0);
}
export function showMs(last) {
  if (!last || last.kind !== "roll") return 0;
  return SHOW.reveal + rollSteps(last) * SHOW.step + SHOW.settle;
}

export function newGame(config, names, now, rnd) {
  const n = config.n;
  // Salida: en orden al azar, cada perro tira su dado y se pone en la casilla 1, 2 o 3 (encima si ya hay alguien)
  const order = Array.from({ length: ND }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const spaces = Array.from({ length: SPACES }, () => []);
  const start = []; // la tirada de salida de cada perro, en orden
  for (const d of order) { const n = 1 + Math.floor(rnd() * 3); spaces[n].push(d); start.push({ dog: d, n }); }
  const st = {
    v: 1,
    config: { n, timer: config.timer !== false },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    coins: Array(n).fill(RULES.startCoins),
    spaces,
    cards: Array.from({ length: n }, () => DOGS.map((_, d) => d)), // cartas de apuesta final que le quedan a cada quien
    winnerBets: [], // [{ seat, dog }] en el orden en que se hicieron
    loserBets: [],
    turn: 0,
    leg: 0,
    phase: "play",
    seq: 0,
    started: now,
    last: null,
    summary: null,
    final: null,
    log: [`Salida: ${ranking(spaces).map(dogName).join(", ")}`],
    hist: [{ kind: "start", leg: 1, start, rank: ranking(spaces) }], // historial para la ventana de jugadas (ver addHist)
  };
  return newLeg(st);
}

// Empieza una etapa: todos los dados al tazón, boletos completos, sin tapetes
function newLeg(st) {
  return {
    ...st,
    leg: st.leg + 1,
    phase: "play",
    dice: DOGS.map((_, d) => d), // perros que todavía no corren en esta etapa
    rolled: [], // [{ dog, n }] lo que salió del tazón en esta etapa
    tickets: DOGS.map(() => RULES.tickets.slice()),
    bets: [], // [{ seat, dog, value }] boletos de etapa tomados
    shakes: Array(st.config.n).fill(0), // cuántas veces sacudió el tazón cada quien en esta etapa
    tiles: [],
    log: pushLog(st.log, `Etapa ${st.leg + 1}`),
  };
}

export const isPlaying = (st) => st.phase === "play";

export function currentSeats(st) {
  return isPlaying(st) ? [st.turn] : [];
}

export function legalActions(st, seat) {
  if (st.phase === "leg") return [{ type: "next" }];
  if (!isPlaying(st) || seat !== st.turn) return [];
  const out = [{ type: "roll" }];
  DOGS.forEach((_, d) => { if (st.tickets[d].length) out.push({ type: "ticket", dog: d }); });
  for (const space of tileSpaces(st, seat)) for (const kind of ["hueso", "aspiradora"]) out.push({ type: "tile", space, kind });
  for (const dog of st.cards[seat]) for (const which of ["winner", "loser"]) out.push({ type: "final", which, dog });
  return out;
}

function illegal(st, seat, a) {
  if (st.phase === "over") return "La carrera ya terminó.";
  if (st.phase === "leg") return a.type === "next" ? "" : "Espera la siguiente etapa.";
  if (seat !== st.turn) return "No es tu turno.";
  const dogOk = Number.isInteger(a.dog) && a.dog >= 0 && a.dog < ND;
  if (a.type === "roll") return "";
  if (a.type === "ticket") {
    if (!dogOk) return "Ese perro no existe.";
    return st.tickets[a.dog].length ? "" : `Ya no quedan boletos de ${dogName(a.dog)}.`;
  }
  if (a.type === "tile") {
    if (a.kind !== "hueso" && a.kind !== "aspiradora") return "El tapete es hueso o aspiradora.";
    return tileSpaces(st, seat).includes(a.space) ? "" : "Ahí no se puede poner el tapete.";
  }
  if (a.type === "final") {
    if (a.which !== "winner" && a.which !== "loser") return "La apuesta es al ganador o al último.";
    if (!dogOk) return "Ese perro no existe.";
    return st.cards[seat].includes(a.dog) ? "" : `Ya usaste tu carta de ${dogName(a.dog)}.`;
  }
  return "Jugada desconocida.";
}

const nextSeat = (st, seat) => (seat + 1) % st.config.n;

export function apply(st, seat, a, { rnd }) {
  const bad = illegal(st, seat, a);
  if (bad) throw new Error(bad);
  const seq = st.seq + 1;
  const who = nameOf(st, seat);

  if (a.type === "next") {
    const s = newLeg({ ...st, seq, summary: null, last: null });
    return s;
  }

  if (a.type === "roll") {
    const dog = st.dice[Math.floor(rnd() * st.dice.length)];
    const n = 1 + Math.floor(rnd() * 3);
    const mv = moveDog(st.spaces, dog, n, st.tiles);
    const coins = st.coins.slice();
    coins[seat] += 1;
    if (mv.tile) coins[mv.tile.seat] += 1;
    const shakes = st.shakes.slice(); shakes[seat] += 1;
    const dice = st.dice.filter((d) => d !== dog);
    const rolled = [...st.rolled, { dog, n }];
    const riders = mv.carried.length ? ` (con ${mv.carried.map(dogName).join(" y ")} encima)` : "";
    let log = pushLog(st.log, `${who} sacudió el tazón: ${dogName(dog)} corre ${n}${riders}`);
    if (mv.tile) log = pushLog(log, mv.tile.kind === "hueso"
      ? `¡${dogName(dog)} vio el hueso de ${nameOf(st, mv.tile.seat)} y corrió una más!`
      : `¡La aspiradora de ${nameOf(st, mv.tile.seat)} asustó a ${dogName(dog)}!`);
    const last = { kind: "roll", seat, dog, n, from: mv.from, fromLevel: mv.fromLevel, to: mv.to, landed: mv.landed, carried: mv.carried, tile: mv.tile };
    const s = { ...st, seq, coins, shakes, dice, rolled, spaces: mv.spaces, last, log, hist: addHist(st, last) };
    if (finished(mv.spaces)) return endLeg({ ...s, log: pushLog(s.log, `¡${dogName(ranking(mv.spaces)[0])} cruzó la meta!`) }, seat, true);
    if (!dice.length) return endLeg(s, seat, false);
    return { ...s, turn: nextSeat(st, seat) };
  }

  if (a.type === "ticket") {
    const tickets = st.tickets.map((t) => t.slice());
    const value = tickets[a.dog].shift();
    const last = { kind: "ticket", seat, dog: a.dog, value };
    return { ...st, seq, tickets, bets: [...st.bets, { seat, dog: a.dog, value }], turn: nextSeat(st, seat),
      last, hist: addHist(st, last), log: pushLog(st.log, `${who} tomó el boleto de ${value} de ${dogName(a.dog)}`) };
  }

  if (a.type === "tile") {
    const tiles = [...st.tiles.filter((t) => t.seat !== seat), { seat, space: a.space, kind: a.kind }];
    const last = { kind: "tile", seat, space: a.space, tileKind: a.kind };
    return { ...st, seq, tiles, turn: nextSeat(st, seat), last, hist: addHist(st, last),
      log: pushLog(st.log, `${who} puso ${a.kind === "hueso" ? "un hueso" : "la aspiradora"} en la casilla ${a.space}`) };
  }

  // final: la carta se gasta y la apuesta queda boca abajo (la vista esconde el perro)
  const cards = st.cards.map((c, i) => (i === seat ? c.filter((d) => d !== a.dog) : c));
  const key = a.which === "winner" ? "winnerBets" : "loserBets";
  const last = { kind: "final", seat, which: a.which, dog: a.dog };
  return { ...st, seq, cards, [key]: [...st[key], { seat, dog: a.dog }], turn: nextSeat(st, seat),
    last, hist: addHist(st, last),
    log: pushLog(st.log, `${who} apostó en secreto al ${a.which === "winner" ? "ganador" : "último"}`) };
}

// Cobra los boletos de la etapa. Al cruzar la meta, también las apuestas finales y la carrera termina.
function endLeg(st, seat, over) {
  const rank = ranking(st.spaces);
  const coins = st.coins.slice();
  const delta = Array(st.config.n).fill(0);
  const pay = (s, v) => { const before = coins[s]; coins[s] = Math.max(0, coins[s] + v); delta[s] += coins[s] - before; };
  const lines = st.bets.map((b) => {
    const place = rank.indexOf(b.dog);
    const v = place === 0 ? b.value : place === 1 ? RULES.second : -RULES.miss;
    pay(b.seat, v);
    return { seat: b.seat, dog: b.dog, value: b.value, place, got: v };
  });
  let log = pushLog(st.log, `Fin de la etapa ${st.leg}: ${rank.slice(0, 2).map(dogName).join(" y ")} van adelante`);
  const summary = { leg: st.leg, rank, bets: lines, shakes: st.shakes.slice(), delta };
  const legEnd = { kind: "legEnd", rank, bets: lines, delta: delta.slice() };
  const base = { ...st, coins, summary, turn: nextSeat(st, seat), hist: addHist(st, legEnd) };
  if (!over) return { ...base, phase: "leg", log };

  const finals = (bets, dog) => {
    let k = 0;
    return bets.map((b) => {
      const ok = b.dog === dog;
      const nth = ok ? k++ : null; // regla original: el orden cuenta solo entre los que atinan
      const v = ok ? (RULES.finals[nth] ?? 1) : -RULES.finalMiss;
      pay(b.seat, v);
      return { seat: b.seat, dog: b.dog, ok, nth, got: v };
    });
  };
  const winner = finals(st.winnerBets, rank[0]);
  const loser = finals(st.loserBets, rank[ND - 1]);
  const top = Math.max(...coins);
  const champions = coins.map((c, s) => (c === top ? s : -1)).filter((s) => s >= 0);
  log = pushLog(log, `Ganó la carrera ${dogName(rank[0])}; llegó al último ${dogName(rank[ND - 1])}`);
  log = pushLog(log, `${champions.map((s) => nameOf(st, s)).join(" y ")} ${champions.length > 1 ? "empatan" : "gana"} con ${top} croquetas`);
  const hist = addHist(base, { kind: "over", rank, winner, loser, champions, coins: coins.slice() });
  return { ...base, coins, phase: "over", turn: -1, final: { rank, winner, loser, champions }, summary: { ...summary, delta }, log, hist };
}

// Al vencerse el reloj se sacude el tazón (siempre se puede y siempre da una croqueta)
export function autoAction(st) {
  if (st.phase === "leg") return { type: "next" };
  if (isPlaying(st)) return { type: "roll" };
  return null;
}

// Lo que un asiento puede ver: todo, menos a qué perro apostaron los demás al ganador y al último (y qué cartas les
// quedan). Al terminar la carrera se ve todo.
export function view(st, seat) {
  if (st.phase === "over") return { ...st, cardCounts: st.cards.map((c) => c.length) };
  const hide = (bets) => bets.map((b) => (b.seat === seat ? { ...b } : { seat: b.seat, dog: null }));
  const hist = (st.hist || []).map((h) => (h.kind === "final" && h.seat !== seat ? { ...h, dog: null } : h));
  return {
    ...st,
    hist,
    winnerBets: hide(st.winnerBets),
    loserBets: hide(st.loserBets),
    cards: st.cards.map((c, s) => (s === seat ? c.slice() : null)),
    cardCounts: st.cards.map((c) => c.length),
  };
}
