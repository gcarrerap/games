// El dominó conforme al contrato de juego (platform/core/contract.js). Solo adapta: las reglas viven en engine/
// y la compu en ai/. El estado es el de engine/ (una partida completa, mano tras mano, hasta 100 en contra).
//
// Acciones:
//   { type: "play", tile: "6-4", side: "L" | "R" | "X" }   X = salida (mesa vacía)
//   { type: "draw" }                                       comer del pozo
//   { type: "pass" }
//   { type: "next" }                                       repartir la siguiente mano (cualquier asiento, entre manos)
//   { type: "timeout" }                                    se acabó el tiempo: el reloj juega por ese asiento
import manifest from "./manifest.js";
import {
  validConfig, newTable, deal, legalPlays, canDraw, canPass, play, draw, pass, limitMs, autoMove,
} from "./engine/index.js";
import { botMove, openingPlan, advise, PROFILE_IDS, profileLabel, getProfile } from "./ai/index.js";

const timerOn = (st) => st.config.timer !== false;
const isOpening = (h) => h.turn === null && !h.board.length;

// config: { n, per, teams, timer?, names?: [nombre por asiento], code? } — o un modo de manifest.modes
function setup(config, { rnd, now }) {
  const c = { n: config.n, per: config.per, teams: !!config.teams, timer: config.timer !== false };
  if (!validConfig(c) || (c.teams && c.n !== 4)) throw new Error("Configuración de dominó no válida");
  const st = newTable(config.code || "MESA", c, null, now);
  st.seats = st.seats.map((_, i) => ({ name: (config.names && config.names[i]) || `Jugador ${i + 1}` }));
  return deal(st, rnd, now);
}

function currentSeats(st) {
  if (st.status !== "playing") return [];
  const h = st.hand;
  if (h.turn !== null) return [h.turn];
  return h.board.length ? [] : h.openers.slice(); // al salir en parejas, cualquiera de los dos
}

function legalActions(st, seat) {
  if (st.status === "handover") return [{ type: "next" }];
  if (st.status !== "playing") return [];
  const out = legalPlays(st, seat).map((p) => ({ type: "play", tile: p.tile, side: p.side }));
  if (canDraw(st, seat)) out.push({ type: "draw" });
  if (canPass(st, seat)) out.push({ type: "pass" });
  return out;
}

function apply(st, seat, action, { rnd, now }) {
  switch (action && action.type) {
    case "play": return play(st, seat, action.tile, action.side, now);
    case "draw": return draw(st, seat, now);
    case "pass": return pass(st, seat, now);
    case "next":
      if (st.status !== "handover") throw new Error("Todavía no termina la mano");
      return deal(st, rnd, now);
    case "timeout":
      if (st.status !== "playing" || !timerOn(st)) throw new Error("Esta mesa no tiene reloj");
      if (!currentSeats(st).includes(seat)) throw new Error("No es el turno de ese asiento");
      return autoMove(st, rnd, now);
    default: throw new Error("Acción desconocida: " + JSON.stringify(action));
  }
}

// Lo que un asiento puede ver. Mientras se juega, las fichas ajenas y las del pozo se cambian por "?" (se conserva
// cuántas son, que sí es público). Al terminar la mano todas se destapan, como en la mesa de verdad.
// seat = -1: alguien mirando, sin mano propia.
function view(st, seat) {
  if (st.status !== "playing" || !st.hand) return st;
  const { start, ...h } = st.hand; // el reparto completo solo sirve para grabar
  return {
    ...st,
    hand: {
      ...h,
      hands: h.hands.map((hh, s) => (s === seat ? hh.slice() : hh.map(() => "?"))),
      pozo: h.pozo.map(() => "?"),
    },
  };
}

const isOver = (st) => st.status === "gameover";

function result(st) {
  return {
    scores: st.scores.slice(), // puntos en contra: gana quien tenga menos
    champion: st.status === "gameover" ? st.result.champion : null, // asiento, o equipo (0|1) en parejas
    teams: !!st.config.teams,
    hands: st.handNo,
  };
}

const timing = {
  turnMs: (st) => (st.status === "playing" && timerOn(st) ? limitMs(st.hand) : null),
  autoAction: () => ({ type: "timeout" }),
};

const bots = {
  profiles: PROFILE_IDS.map((id) => ({ id, name: profileLabel(id), level: getProfile(id).nivel ?? null })),
  // La compu solo recibe la vista de su asiento. Al salir en parejas, sale con su plan de salida.
  decide(v, seat, profile, { rnd }) {
    if (v.status !== "playing") return null;
    const h = v.hand;
    if (isOpening(h)) {
      if (!h.openers.includes(seat)) return null;
      return { type: "play", tile: openingPlan(h.hands[seat]).tile, side: "X" };
    }
    return botMove(v, seat, profile, { rnd });
  },
  // Cuánto "piensa" antes de jugar. Al salir en parejas sale primero quien tiene mejor juego: juego 10/10 a los 5 s,
  // 0/10 a los 15 s, siempre antes de que se acabe el tiempo.
  thinkMs(v, seat, now) {
    const h = v.hand;
    if (!h || v.status !== "playing") return 0;
    if (!isOpening(h)) return h.drew ? 450 : 850;
    let target = (15 - openingPlan(h.hands[seat]).rating) * 1000;
    if (timerOn(v)) target = Math.min(target, limitMs(h) - 1000);
    return Math.max(0, target - (now - h.since));
  },
  heavy: true, // decide() puede tardar ~0.5 s (perfiles con cálculo): va al hilo aparte
};

export default {
  ...manifest,
  setup, currentSeats, legalActions, apply, view, isOver, result,
  timing,
  bots,
  advise: (v, seat) => advise(v, seat),
  ui: () => import("./ui/index.js"),
};
