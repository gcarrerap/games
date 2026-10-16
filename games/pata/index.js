// La Pata conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/ y la
// compu en ai/. El estado es el de engine/ (una partida completa: 4 rondas).
//
// Acciones: las del motor (engine/moves.js) —draw, peek, pickup, meld, add, discard— y además:
//   { type: "next" }      repartir la siguiente ronda (cualquier asiento, entre rondas)
//   { type: "timeout" }   se acabó el tiempo: el reloj juega por ese asiento (roba si no ha robado y descarta)
import manifest from "./manifest.js";
import { RULES, validConfig, newTable, deal, apply as applyMove, legalActions as moves, autoMove, teamOf, nTeams } from "./engine/index.js";
import { botMove, advise, LEVELS } from "./ai/index.js";

const timerOn = (st) => st.config.timer !== false;
const HIDDEN = "?";
const hide = (cards) => cards.map(() => HIDDEN);

// config: un modo de manifest.modes (+ timer, names)
function setup(config, { rnd, now }) {
  const c = { n: config.n, teams: config.teams === true ? 2 : config.teams || false, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de La Pata no válida");
  const st = newTable(config.code || "MESA", c, null, now);
  st.seats = st.seats.map((_, i) => ({ name: (config.names && config.names[i]) || `Jugador ${i + 1}` }));
  return deal(st, rnd, now);
}

const currentSeats = (st) => (st.status === "playing" ? [st.hand.turn] : []);

function legalActions(st, seat) {
  if (st.status === "roundover") return [{ type: "next" }];
  return moves(st, seat);
}

function apply(st, seat, action, { rnd, now }) {
  switch (action && action.type) {
    case "next":
      if (st.status !== "roundover") throw new Error("Todavía no termina la ronda");
      return deal(st, rnd, now);
    case "timeout":
      if (st.status !== "playing" || !timerOn(st)) throw new Error("Esta mesa no tiene reloj");
      if (st.hand.turn !== seat) throw new Error("No es el turno de ese asiento");
      return autoMove(st, { rnd, now });
    default:
      return applyMove(st, seat, action, { rnd, now });
  }
}

// Lo que un asiento puede ver. Mientras se juega se ocultan (como "?", conservando cuántas son): las manos ajenas,
// los montones sin abrir (también los propios), el mazo, las cartas que otros robaron del mazo y los mazos que salen
// de revolver el pozo. Lo que se levanta del pozo, los pares que se enseñan, las patas y el pozo se ven.
// Al terminar la ronda se destapan las manos. seat = -1: alguien mirando, sin mano propia.
function view(st, seat) {
  if (st.status !== "playing" || !st.hand) return st;
  const { start, ...h } = st.hand;
  return {
    ...st,
    hand: {
      ...h,
      hands: h.hands.map((x, s) => (s === seat ? x.slice() : hide(x))),
      piles: h.piles.map((ps) => ps.map(hide)),
      stock: hide(h.stock),
      lastDraw: h.lastDraw && h.lastDraw.seat !== seat ? { ...h.lastDraw, cards: hide(h.lastDraw.cards) } : h.lastDraw,
      history: h.history.map((e) => {
        if (!e.cards && !e.reshuffled) return e;
        const { reshuffled, ...rest } = e;
        return e.a === "draw" && e.s !== seat ? { ...rest, cards: hide(e.cards || []) } : rest;
      }),
    },
  };
}

const isOver = (st) => st.status === "gameover";

function result(st) {
  const best = Math.max(...st.scores);
  return {
    scores: st.scores.slice(), // puntos a favor por equipo: gana quien tenga más
    champions: st.status === "gameover" ? st.scores.map((v, t) => (v === best ? t : -1)).filter((t) => t >= 0) : [],
    teams: nTeams(st.config),
    rounds: st.roundNo,
  };
}

const timing = {
  turnMs: (st) => (st.status === "playing" && timerOn(st) ? RULES.turnMs : null),
  autoAction: () => ({ type: "timeout" }),
};

// Pausa antes de cada acción de la compu (como en myPata): robar, bajar o agregar, descartar
const BOT_DELAY = { draw: 700, lay: 550, discard: 650 };
const level = (profile) => Math.max(1, Math.min(3, Number(profile) || 2));
const bots = {
  profiles: [1, 2, 3].map((n) => ({ id: String(n), name: LEVELS[n] })),
  decide(v, seat, profile) {
    if (v.status !== "playing" || v.hand.turn !== seat) return null;
    const a = botMove(v, seat, level(profile));
    if (!a) return null;
    const { why, ...action } = a; // el motivo es para el consejo; no se guarda en la partida
    return action;
  },
  thinkMs(v) {
    if (v.status !== "playing") return 0;
    return v.hand.phase === "draw" ? BOT_DELAY.draw : BOT_DELAY.discard;
  },
  heavy: false,
};

// El equipo de cada asiento (para la pantalla de asientos): null si se juega individual
const teamOfSeat = (config, seat) => (config.teams ? teamOf({ config }, seat) : null);

export default {
  ...manifest,
  setup, currentSeats, legalActions, apply, view, isOver, result,
  timing,
  bots,
  advise: (v, seat) => advise(v, seat),
  teamOf: teamOfSeat,
  ui: () => import("./ui/index.js"),
};
