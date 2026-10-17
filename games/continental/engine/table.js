// La partida: jugadores, marcador, reparto de cada ronda y registro de jugadas. Puro: el azar entra como rnd.
import { RULES, contractOf, decksFor, contractLabel } from "./config.js";
import { fullDeck, shuffle, cardName } from "./cards.js";

export const nextSeat = (st, s) => (s + 1) % st.config.n;
export const nameOf = (st, s) => (st.seats[s] && st.seats[s].name) || `Jugador ${s + 1}`;
const LOG_MAX = 120;
export const pushLog = (log, line) => [...log, line].slice(-LOG_MAX);

// config: { n, buy, timer }
export function newGame(config, names = []) {
  return {
    v: 1,
    config,
    seats: Array.from({ length: config.n }, (_, i) => ({ name: names[i] || `Jugador ${i + 1}` })),
    status: "dealing", // "playing" | "roundover" | "gameover"
    roundNo: 0,
    firstDealer: 0,
    scores: Array(config.n).fill(0), // puntos acumulados: gana quien tenga menos
    rounds: [], // { round, pts, winner }
    result: null, // la última ronda: { round, winner, pts, hands }
    log: [],
    hand: null,
  };
}

// Reparte la siguiente ronda. En la primera, el azar escoge quién reparte; después, reparte el de la derecha.
export function deal(st, rnd) {
  if (st.status === "gameover") throw new Error("La partida ya terminó.");
  if (st.status === "playing") throw new Error("Todavía no termina la ronda.");
  const n = st.config.n, roundNo = st.roundNo + 1;
  const firstDealer = roundNo === 1 ? Math.floor(rnd() * n) : st.firstDealer;
  const dealer = (firstDealer + roundNo - 1) % n;
  const k = contractOf(roundNo);
  let stock = shuffle(fullDeck(decksFor(n)), rnd);
  const hands = Array.from({ length: n }, () => []);
  for (let i = 0; i < k.deal; i++) for (let j = 1; j <= n; j++) hands[(dealer + j) % n].push(stock.pop());
  const up = stock.pop();
  const first = (dealer + 1) % n;
  const hand = {
    round: roundNo, dealer, turn: first, phase: "draw", turns: 0,
    stock, discard: [up], discardFrom: null,
    hands, down: Array(n).fill(false), melds: [], nextId: 1,
    buys: Array(n).fill(0),
    offer: null, // la compra del descarte de arriba: { requests: [asientos], answered: [asientos] }
    lastDraw: null, // { seat, from: "stock" | "discard", cards }
    lastBuy: null, // { seat, card, penalty }
  };
  hand.offer = { requests: [], answered: [] };
  const s = { ...st, status: "playing", roundNo, firstDealer, hand, result: null };
  s.log = pushLog(st.log, `Ronda ${roundNo} de ${RULES.rounds}: ${contractLabel(roundNo)}. Reparte ${nameOf(st, dealer)}; voltea ${cardName(up)}.`);
  return s;
}
