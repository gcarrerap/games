// El Continental conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/
// y la compu en ai/. Una partida son las 7 rondas; gana quien junte menos puntos.
//
// Acciones: las del motor (engine/moves.js) —draw, take, down, add, swap, discard, buy, pass— y además:
//   { type: "next" }      repartir la siguiente ronda (cualquier asiento, entre rondas)
//   { type: "timeout" }   se acabó el tiempo: el reloj roba si hace falta y descarta
//
// Comprar fuera de turno: mientras quien sigue no ha robado, currentSeats incluye (después de él) a quienes pueden
// comprar el descarte. Así la plataforma le pregunta a la compu de esos asientos (buy o pass) y la persona ve el botón
// de comprar. El reloj siempre es de quien tiene el turno (el primero de la lista).
import manifest from "./manifest.js";
import { RULES, buyMode, validConfig, newGame, deal, apply as applyMove, legalActions as moves, autoMove, buyers } from "./engine/index.js";
import { botMove, advise, LEVELS } from "./ai/index.js";

const timerOn = (st) => st.config.timer !== false;
const HIDDEN = "?";
const hide = (cards) => cards.map(() => HIDDEN);

// config: un modo de manifest.modes (+ buy, timer, names)
function setup(config, { rnd }) {
  const c = { n: config.n, buy: buyMode(config), timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración del Continental no válida");
  return deal(newGame(c, config.names || []), rnd);
}

function currentSeats(st) {
  if (st.status !== "playing") return [];
  const h = st.hand;
  return h.phase === "draw" ? [h.turn, ...buyers(st)] : [h.turn];
}

function legalActions(st, seat) {
  if (st.status === "roundover") return [{ type: "next" }];
  return moves(st, seat);
}

function apply(st, seat, action, ctx) {
  switch (action && action.type) {
    case "next":
      if (st.status !== "roundover") throw new Error("Todavía no termina la ronda");
      return deal(st, ctx.rnd);
    case "timeout":
      if (st.status !== "playing" || !timerOn(st)) throw new Error("Esta mesa no tiene reloj");
      if (st.hand.turn !== seat) throw new Error("No es el turno de ese asiento");
      return autoMove(st, ctx);
    default:
      return applyMove(st, seat, action, ctx);
  }
}

// Lo que un asiento puede ver. Mientras se juega se ocultan (como "?", conservando cuántas son) las manos ajenas, el
// mazo, lo que otros robaron del mazo y la carta de castigo de una compra. El pozo, los juegos bajados y lo que se toma
// o se compra del pozo se ven. Al terminar la ronda se destapan las manos. seat = -1: alguien mirando.
function view(st, seat) {
  if (st.status !== "playing" || !st.hand) return st;
  const h = st.hand;
  return {
    ...st,
    hand: {
      ...h,
      hands: h.hands.map((x, s) => (s === seat ? x.slice() : hide(x))),
      stock: hide(h.stock),
      lastDraw: h.lastDraw && h.lastDraw.seat !== seat && h.lastDraw.from === "stock" ? { ...h.lastDraw, cards: hide(h.lastDraw.cards) } : h.lastDraw,
      lastBuy: h.lastBuy && h.lastBuy.seat !== seat && h.lastBuy.penalty ? { ...h.lastBuy, penalty: HIDDEN } : h.lastBuy,
    },
  };
}

const isOver = (st) => st.status === "gameover";

function result(st) {
  const best = Math.min(...st.scores);
  return {
    scores: st.scores.slice(), // puntos en contra: gana quien tenga menos
    champions: st.status === "gameover" ? st.scores.map((v, s) => (v === best ? s : -1)).filter((s) => s >= 0) : [],
    rounds: st.roundNo,
    lowWins: true,
  };
}

const timing = {
  turnMs: (st) => (st.status === "playing" && timerOn(st) ? RULES.turnMs : null),
  autoAction: () => ({ type: "timeout" }),
};

// Pausas de la compu. Cuando alguien más podría comprar el descarte, quien tiene el turno espera un poco más antes de
// robar, para que las personas alcancen a pedirlo.
const BOT_DELAY = { answer: 350, draw: 800, drawWithBuyers: 1800, play: 650 };
const bots = {
  profiles: [1, 2, 3].map((n) => ({ id: String(n), name: LEVELS[n] })),
  decide(v, seat, profile, { rnd }) {
    const a = botMove(v, seat, profile, rnd);
    if (!a) return null;
    const { why, ...action } = a; // el motivo es para el consejo; no se guarda en la partida
    return action;
  },
  thinkMs(v, seat) {
    if (v.status !== "playing") return 0;
    const h = v.hand;
    if (seat !== h.turn) return BOT_DELAY.answer;
    if (h.phase === "draw") return buyers(v).length ? BOT_DELAY.drawWithBuyers : BOT_DELAY.draw;
    return BOT_DELAY.play;
  },
  heavy: false,
};

export default {
  ...manifest,
  setup, currentSeats, legalActions, apply, view, isOver, result,
  timing,
  bots,
  advise: (v, seat) => advise(v, seat),
  ui: () => import("./ui/index.js"),
};
