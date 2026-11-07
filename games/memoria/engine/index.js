// Reglas de Memoria Veloz: el juego de pares, pero sin turnos. Todos juegan a la vez y gana el más rápido.
// Funciones puras: estado entra, estado sale. El azar llega como ctx.rnd y la hora como ctx.now.
//
// - Cada quien puede tener hasta 2 cartas abiertas. Mientras la tiene abierta, solo él ve su cara y solo él la toma.
// - Con una abierta: la regresa o abre otra. Con dos iguales: regresa una, las dos, o las reclama.
// - Si la segunda no es pareja, las dos se regresan solas y queda congelado RULES.freezeMs.
// - Timer: le pones a otro que tiene cartas abiertas RULES.timerMs; al acabarse se le regresan. Si las regresa o
//   reclama antes, vence sin acción. Puedes poner otro RULES.cooldownMs después de que el tuyo terminó.
// - Un par reclamado sale del juego. Gana quien tenga más pares; en empate, quien llegó primero a ese número.
//
// Tiempo: `t` es la hora de la última acción (nunca retrocede, aunque los relojes de los teléfonos no coincidan).
// Congelado y la espera del timer se revisan contra la hora de cada acción. Un timer vencido regresa las cartas
// solo con la acción `tick`, que la plataforma aplica al llegar su hora (timing en index.js): así lo que ve cada
// asiento siempre corresponde al estado, y la compu nunca decide con algo que ya cambió sin que lo sepa.

export const RULES = {
  maxOpen: 2,
  freezeMs: 2000,
  timerMs: 5000,
  cooldownMs: 10000,
  pairs: (n) => (n <= 2 ? 18 : 24),
  faces: 24, // caras distintas que hay (ui/faces.js las dibuja)
};

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 1 && c.n <= 4;

const shuffle = (arr, rnd) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export function newGame(config, names = [], { rnd, now = 0 }) {
  const n = config.n;
  const pairs = RULES.pairs(n);
  const faces = shuffle(Array.from({ length: RULES.faces }, (_, i) => i), rnd).slice(0, pairs);
  const deck = shuffle([...faces, ...faces], rnd);
  return {
    v: 1,
    config: { n, pairs },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    // f: cara · hold: quién la tiene abierta (-1 nadie) · at: desde cuándo · won: quién la reclamó (-1 nadie)
    cards: deck.map((f) => ({ f, hold: -1, at: 0, won: -1 })),
    held: Array.from({ length: n }, () => []), // cartas abiertas de cada quien, en el orden en que las abrió
    frozen: Array(n).fill(0), // congelado hasta esta hora
    miss: Array(n).fill(null), // el último par fallado de cada quien: { cards, until } (solo él ve las caras)
    timers: Array(n).fill(null), // timer sobre cada asiento: { by, end }
    cool: Array(n).fill(0), // cuándo puede poner otro timer
    seen: Array.from({ length: n }, () => Array(deck.length).fill(-1)), // en qué acción vio cada quien cada carta
    pairs: Array(n).fill(0),
    reached: Array(n).fill(now), // cuándo llegó cada quien a sus pares actuales (desempate)
    log: [], // lo último que pasó, público
    seq: 0,
    t: now,
    start: now,
    phase: "play", // "play" | "over"
    winner: null,
  };
}

const LOG_KEEP = 12;
const isFree = (c) => c.hold < 0 && c.won < 0;
export const remaining = (st) => st.cards.filter((c) => c.won < 0).length / 2;
export const nameOf = (st, s) => st.names[s] || `Jugador ${s + 1}`;
export const isFrozen = (st, seat, now) => st.frozen[seat] > now;
export const activeTimerBy = (st, seat) => st.timers.findIndex((x) => x && x.by === seat);
export const canTimer = (st, seat, now) => !isFrozen(st, seat, now) && activeTimerBy(st, seat) < 0 && now >= st.cool[seat];

function clone(st) {
  return {
    ...st,
    cards: st.cards.map((c) => ({ ...c })),
    held: st.held.map((h) => h.slice()),
    frozen: st.frozen.slice(),
    miss: st.miss.slice(),
    timers: st.timers.slice(),
    cool: st.cool.slice(),
    seen: st.seen.map((s) => s.slice()),
    pairs: st.pairs.slice(),
    reached: st.reached.slice(),
    log: st.log.slice(),
  };
}
const note = (st, e) => { st.log.push({ ...e, t: st.t }); if (st.log.length > LOG_KEEP) st.log.shift(); };

// El timer sobre `seat` termina (al vencerse, a la hora en que debía; si no, ahora) y su dueño espera para otro
function endTimer(st, seat, at) {
  const tm = st.timers[seat];
  if (!tm) return;
  st.timers[seat] = null;
  st.cool[tm.by] = at + RULES.cooldownMs;
}
function returnCard(st, seat, i) {
  st.cards[i].hold = -1; st.cards[i].at = 0;
  st.held[seat] = st.held[seat].filter((x) => x !== i);
}
// Sin cartas abiertas, el timer que tenga encima vence sin acción
const afterReturn = (st, seat) => { if (!st.held[seat].length) endTimer(st, seat, st.t); };

export function legalActions(st, seat) {
  if (st.phase !== "play" || seat < 0 || seat >= st.config.n) return [];
  const out = [];
  const held = st.held[seat];
  if (!isFrozen(st, seat, st.t)) {
    if (held.length < RULES.maxOpen) st.cards.forEach((c, i) => { if (isFree(c)) out.push({ type: "open", i }); });
    if (canTimer(st, seat, st.t)) st.held.forEach((h, s) => { if (s !== seat && h.length && !st.timers[s]) out.push({ type: "timer", seat: s }); });
  }
  for (const i of held) out.push({ type: "back", i });
  if (held.length === 2) {
    out.push({ type: "backAll" });
    if (st.cards[held[0]].f === st.cards[held[1]].f) out.push({ type: "claim" });
  }
  out.push({ type: "tick" });
  return out;
}

export function apply(st0, seat, action, { now = 0 } = {}) {
  if (st0.phase !== "play") throw new Error("La partida ya terminó.");
  if (!Number.isInteger(seat) || seat < 0 || seat >= st0.config.n) throw new Error("Ese asiento no existe.");
  const st = clone(st0);
  st.t = Math.max(st0.t, Number.isFinite(now) ? now : st0.t);
  st.seq = st0.seq + 1;
  const a = action || {};
  const held = st.held[seat];

  switch (a.type) {
    case "open": {
      if (isFrozen(st, seat, st.t)) throw new Error("Estás congelado.");
      const c = st.cards[a.i];
      if (!c) throw new Error("Esa carta no existe.");
      if (c.won >= 0) throw new Error("Esa carta ya se reclamó.");
      if (c.hold === seat) throw new Error("Esa carta ya la tienes abierta.");
      if (c.hold >= 0) throw new Error("Esa carta la tiene abierta otro.");
      if (held.length >= RULES.maxOpen) throw new Error(`Solo puedes tener ${RULES.maxOpen} cartas abiertas.`);
      c.hold = seat; c.at = st.t;
      held.push(a.i);
      st.seen[seat][a.i] = st.seq;
      st.miss[seat] = null;
      if (held.length === 2 && st.cards[held[0]].f !== c.f) {
        // No es pareja: las dos se regresan solas y queda congelado
        const pair = held.slice();
        for (const i of pair) returnCard(st, seat, i);
        st.frozen[seat] = st.t + RULES.freezeMs;
        st.miss[seat] = { cards: pair, until: st.frozen[seat] };
        afterReturn(st, seat);
        note(st, { type: "miss", seat });
      }
      break;
    }
    case "back": {
      if (!held.includes(a.i)) throw new Error("Esa carta no la tienes abierta.");
      returnCard(st, seat, a.i);
      afterReturn(st, seat);
      break;
    }
    case "backAll": {
      if (!held.length) throw new Error("No tienes cartas abiertas.");
      for (const i of held.slice()) returnCard(st, seat, i);
      afterReturn(st, seat);
      break;
    }
    case "claim": {
      if (held.length !== 2) throw new Error("Necesitas dos cartas abiertas.");
      const [x, y] = held;
      if (st.cards[x].f !== st.cards[y].f) throw new Error("No son iguales.");
      for (const i of [x, y]) { st.cards[i].won = seat; st.cards[i].hold = -1; st.cards[i].at = 0; }
      st.held[seat] = [];
      st.pairs[seat]++;
      st.reached[seat] = st.t;
      endTimer(st, seat, st.t);
      note(st, { type: "claim", seat, f: st.cards[x].f });
      if (remaining(st) === 0) finish(st);
      break;
    }
    case "timer": {
      const target = a.seat;
      if (!Number.isInteger(target) || target < 0 || target >= st.config.n || target === seat) throw new Error("A ese jugador no le puedes poner timer.");
      if (isFrozen(st, seat, st.t)) throw new Error("Estás congelado.");
      if (activeTimerBy(st, seat) >= 0) throw new Error("Ya tienes un timer corriendo.");
      if (st.t < st.cool[seat]) throw new Error("Tu timer todavía no se recarga.");
      if (!st.held[target].length) throw new Error("Ese jugador no tiene cartas abiertas.");
      if (st.timers[target]) throw new Error("Ese jugador ya tiene un timer.");
      st.timers[target] = { by: seat, end: st.t + RULES.timerMs };
      note(st, { type: "timer", seat, target });
      break;
    }
    case "tick": {
      // Timers vencidos: se regresan las cartas de su objetivo. Cualquier asiento puede aplicarlo.
      st.timers.forEach((tm, s) => {
        if (!tm || tm.end > st.t) return;
        for (const i of st.held[s].slice()) returnCard(st, s, i);
        endTimer(st, s, tm.end);
        note(st, { type: "timeout", seat: s, by: tm.by });
      });
      break;
    }
    default:
      throw new Error("Esa acción no existe.");
  }
  return st;
}

function finish(st) {
  st.phase = "over";
  st.winner = ranking(st)[0];
  for (let s = 0; s < st.config.n; s++) st.timers[s] = null;
}

// Asientos de mejor a peor: más pares; en empate, quien llegó antes a ese número
export function ranking(st) {
  return st.pairs.map((p, s) => s).sort((a, b) => st.pairs[b] - st.pairs[a] || st.reached[a] - st.reached[b] || a - b);
}

// La hora del siguiente timer que vence (o null): la plataforma aplica `tick` entonces
export function nextDeadline(st) {
  if (st.phase !== "play") return null;
  const ends = st.timers.filter(Boolean).map((x) => x.end);
  return ends.length ? Math.min(...ends) : null;
}

// Lo que ve un asiento (-1: quien solo mira). Las caras solo de sus cartas abiertas, de su último par fallado y de
// las reclamadas. `memory` es lo que ese asiento ya vio (dónde está cada cara): lo usa la compu, que no tiene otra
// forma de recordar; la mesa no la muestra.
export function view(st, seat) {
  const mine = seat >= 0 && seat < st.config.n;
  const cards = st.cards.map((c) => ({ f: c.won >= 0 || (mine && c.hold === seat) ? c.f : null, hold: c.hold, at: c.at, won: c.won }));
  const miss = mine && st.miss[seat] ? { cards: st.miss[seat].cards, faces: st.miss[seat].cards.map((i) => st.cards[i].f), until: st.miss[seat].until } : null;
  const memory = [];
  if (mine) st.seen[seat].forEach((q, i) => { if (q >= 0 && st.cards[i].won < 0) memory.push({ i, f: st.cards[i].f, q }); });
  return {
    v: st.v, config: st.config, names: st.names, seat,
    cards, mine: mine ? st.held[seat].slice() : [], counts: st.held.map((h) => h.length),
    frozen: st.frozen, timers: st.timers, cool: st.cool, pairs: st.pairs, reached: st.reached,
    miss, memory, log: st.log, seq: st.seq, t: st.t, start: st.start, phase: st.phase, winner: st.winner,
  };
}
