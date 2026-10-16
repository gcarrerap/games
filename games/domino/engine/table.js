// Motor de dominó: funciones puras sobre el estado de la mesa.

import { fullSet, shuffle, tileRank } from "./tiles.js";
import { nScores } from "./config.js";
import { hash32 } from "../../../modules/random/index.js";

// El tiempo entra como parámetro (`now`); el valor por defecto existe para quien todavía no lo pasa.
export function newTable(code, config, host, now = Date.now()) {
  return {
    code, config, host, created: now,
    seats: Array(config.n).fill(null),
    status: "lobby", scores: Array(nScores(config)).fill(0),
    handNo: 0, lastWinner: null, hand: null, result: null, log: [], v: 0,
  };
}

export function deal(st, rnd = Math.random, now = Date.now()) {
  const c = st.config, deck = shuffle(fullSet(), rnd);
  const hands = []; let k = 0;
  for (let i = 0; i < c.n; i++) { hands.push(deck.slice(k, k + c.per)); k += c.per; }
  const rest = deck.slice(k);
  let muestra = null, pozo = [];
  if (c.n === 3 && c.per === 9) muestra = rest[0];
  else pozo = rest;
  const h = { hands, pozo, muestra, board: [], turn: null, mano: null, passes: 0, openers: null, firstReq: null, drew: 0, lacks: hands.map(() => []), played: hands.map(() => []), history: [], since: now };
  if (st.handNo === 0 || st.lastWinner === null) {
    // Primera mano: sale la mula más alta (o la ficha más alta si no hay mulas)
    let best = null, seat = 0;
    hands.forEach((hh, i) => hh.forEach((t) => { if (best === null || tileRank(t) > tileRank(best)) { best = t; seat = i; } }));
    h.turn = seat; h.openers = [seat]; h.firstReq = best;
  } else if (c.teams) {
    const tm = st.lastWinner; h.openers = [tm, tm + 2]; h.turn = null; // cualquiera del equipo ganador
  } else {
    h.turn = st.lastWinner; h.openers = [st.lastWinner];
  }
  // Cómo empezó la mano, para poder grabarla y reproducirla después (#25)
  h.start = { t: h.since, hands: hands.map((x) => x.slice()), pozo: pozo.slice(), muestra, turn: h.turn, openers: h.openers.slice(), firstReq: h.firstReq };
  // Cada partida nueva (primera mano) recibe su propio identificador
  const game = st.handNo === 0 || !st.gameId ? { gameId: newGameId(st.code, h.start, now), gameStart: h.since } : {};
  return { ...st, ...game, status: "playing", handNo: st.handNo + 1, hand: h, result: null,
    log: pushLog(st.log, `Mano ${st.handNo + 1}: repartidas ${c.per} fichas por jugador` + (muestra ? `, muestra ${muestra}` : "")), v: st.v + 1 };
}

// Identificador de la partida: mesa + hora + un hash del reparto (no consume azar, así no cambia la sucesión de rnd)
function newGameId(code, start, now) {
  const safe = String(code || "mesa").normalize("NFD").replace(/[^A-Za-z0-9]/g, "") || "mesa";
  return safe + "-" + now.toString(36) + hash32(JSON.stringify(start)).toString(36).padStart(7, "0").slice(0, 5);
}

export function pushLog(log, msg) { return [...(log || []), msg].slice(-12); }

export const nextSeat = (st, s) => (s + 1) % st.config.n;
export const nameOf = (st, s) => (st.seats[s] && st.seats[s].name) || `Jugador ${s + 1}`;

// Mesa en línea abandonada antes de repartir: ninguna persona sentada (la compu sola no cuenta)
export const isEmptyTable = (st) => st.status === "lobby" && st.seats.every((s) => !s || s.bot);

export function newGame(st) {
  return { ...st, status: "lobby", scores: Array(nScores(st.config)).fill(0), handNo: 0, lastWinner: null, hand: null, result: null, log: pushLog(st.log, "Nueva partida"), v: st.v + 1 };
}
