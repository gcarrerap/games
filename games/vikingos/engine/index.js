// Reglas de Vikingos: un rompecabezas para uno. Se escoge un reto del cuadernillo (60, en cuatro niveles) y se
// llevan los barcos a la flecha de su color girando las piezas del mar con ellos (board.js explica cómo se gira).
// Funciones puras: estado entra, estado sale; no hay azar.
//
// Fases: "pick" (escoger reto) → "play" → "over" (todos los barcos llegaron).
//
// Acciones:
//   { type: "pick", n }                 empezar el reto n (1..60); se vale también a media partida
//   { type: "rotate", piece, turns }    girar la pieza 0..8 un cuarto (1), media (2) o tres cuartos (3) de vuelta en
//                                       el sentido del reloj. Si es la misma pieza del movimiento anterior, se junta
//                                       con él (girar 90° y otros 90° cuenta como un solo giro de 180°).
//   { type: "undo" }                    deshacer el último movimiento
//   { type: "reset" }                   volver a la posición del reto
//   { type: "choose" }                  dejar el reto y regresar a escoger otro
import { CHALLENGES, LEVELS } from "./challenges.js";
import { whyNot, rotate, solved, boatsOn, checkBoard } from "./board.js";

export { CHALLENGES, LEVELS };

export const challenge = (n) => CHALLENGES.find((c) => c.n === n) || null;
export const levelOf = (n) => LEVELS.find((l) => n >= l.from && n <= l.to) || null;

// El tablero de un reto como { kinds, rots, boats, arrows }. pieces: "X1 C0 …" (tipo y giro de cada pieza).
export function boardOf(ch) {
  const ps = ch.pieces.split(" ");
  return { kinds: ps.map((p) => p[0]), rots: ps.map((p) => Number(p[1])), boats: { ...ch.boats }, arrows: { ...ch.arrows } };
}

export function newGame(config = {}, names = []) {
  const st = {
    v: 1,
    config: { n: 1 },
    names: [names[0] || "Tú"],
    phase: "pick",
    reto: null,
    kinds: null, start: null, rots: null, boats: null, arrows: null,
    history: [], // movimientos hechos: [{ piece, turns }]
    min: null, // los movimientos de la solución más corta
    last: null, // lo último que pasó, para animarlo: { type, piece, turns, boats: [colores que se movieron] }
    seq: 0,
    log: [],
  };
  const n = Number(config.reto);
  return challenge(n) ? startChallenge(st, n) : st;
}

function startChallenge(st, n) {
  const ch = challenge(n);
  const b = boardOf(ch);
  return {
    ...st, phase: "play", reto: n, kinds: b.kinds, rots: b.rots, boats: b.boats, arrows: b.arrows,
    start: { rots: b.rots.slice(), boats: { ...b.boats } }, history: [], min: ch.min, last: null,
    log: [...st.log, `Reto ${n}`],
  };
}

export const moves = (st) => st.history.length;

// El tablero que ven board.js y la compu
export const boardOfState = (st) => ({ kinds: st.kinds, rots: st.rots, boats: st.boats, arrows: st.arrows });

export function legalActions(st) {
  if (st.phase === "over") return [];
  const out = CHALLENGES.map((c) => ({ type: "pick", n: c.n }));
  if (st.phase !== "play") return out;
  const b = boardOfState(st);
  for (let i = 0; i < 9; i++) if (!whyNot(b, i)) for (let k = 1; k <= 3; k++) out.push({ type: "rotate", piece: i, turns: k });
  if (st.history.length) out.push({ type: "undo" }, { type: "reset" });
  out.push({ type: "choose" });
  return out;
}

function turn(st, piece, k) {
  const moved = boatsOn(boardOfState(st), piece).map(([col]) => col);
  return { ...st, ...rotate(boardOfState(st), piece, k), last: { type: "rotate", piece, turns: k, boats: moved } };
}

export function apply(st, seat, a) {
  if (seat !== 0) throw new Error("Este reto es para un solo jugador");
  if (!a || typeof a !== "object") throw new Error("Acción no válida");
  if (st.phase === "over") throw new Error("El reto ya está resuelto");
  const bump = (s) => ({ ...s, seq: st.seq + 1 });

  if (a.type === "pick") {
    if (!challenge(a.n)) throw new Error("Ese reto no existe");
    return bump(startChallenge(st, a.n));
  }
  if (st.phase !== "play") throw new Error("Primero escoge un reto");

  if (a.type === "choose") return bump({ ...st, phase: "pick", reto: null, kinds: null, start: null, rots: null, boats: null, arrows: null, history: [], min: null, last: null });

  if (a.type === "reset") {
    if (!st.history.length) throw new Error("No hay nada que deshacer");
    return bump({ ...st, rots: st.start.rots.slice(), boats: { ...st.start.boats }, history: [], last: { type: "reset" } });
  }

  if (a.type === "undo") {
    if (!st.history.length) throw new Error("No hay nada que deshacer");
    const h = st.history[st.history.length - 1];
    const s = turn(st, h.piece, 4 - h.turns);
    return bump({ ...s, history: st.history.slice(0, -1), last: { ...s.last, type: "undo" } });
  }

  if (a.type === "rotate") {
    const k = a.turns;
    if (![1, 2, 3].includes(k)) throw new Error("Se gira un cuarto, media o tres cuartos de vuelta");
    const why = whyNot(boardOfState(st), a.piece);
    if (why) throw new Error(why);
    let s = turn(st, a.piece, k);
    const prev = st.history[st.history.length - 1];
    let history;
    if (prev && prev.piece === a.piece) {
      const t = (prev.turns + k) % 4;
      history = t ? [...st.history.slice(0, -1), { piece: a.piece, turns: t }] : st.history.slice(0, -1);
    } else history = [...st.history, { piece: a.piece, turns: k }];
    s = { ...s, history };
    if (solved(boardOfState(s))) {
      s = { ...s, phase: "over", log: [...s.log, `Reto ${s.reto} resuelto en ${history.length} ${history.length === 1 ? "movimiento" : "movimientos"}`] };
    }
    return bump(s);
  }
  throw new Error("Acción desconocida");
}

export function result(st) {
  return { winner: st.phase === "over" ? 0 : null, champions: st.phase === "over" ? [0] : [], reto: st.reto, moves: moves(st), min: st.min };
}

// Para las pruebas: cada reto está bien armado
export const checkChallenge = (ch) => checkBoard(boardOf(ch));
