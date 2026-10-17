// Reglas de Piojos: dados de póker (9, 10, J, Q, K, As). Solo los "piojos" (9, 10 y As) dan puntos.
// Funciones puras: estado entra, estado sale. El azar llega como ctx.rnd y la hora como ctx.now.
//
// Un turno:
//   1. Tiras los dados que te quedan (al empezar, los 5).
//   2. Si no salió ningún piojo, pierdes lo que llevabas en el turno y pasa al siguiente.
//   3. Si salieron piojos, se apartan todos y su valor se suma a lo del turno. Entonces escoges:
//      plantarte (lo del turno pasa a tu marcador) o tirar los dados que quedan.
//   4. Si apartaste los 5 dados, vuelves a tirar los 5 conservando lo del turno.
// Gana quien se planta y llega a la meta.

export const FACES = ["9", "10", "J", "Q", "K", "A"];

export const RULES = {
  dice: 5,
  // Valor de cada piojo. Las demás caras no valen nada. Sin puntos extra por combinaciones.
  values: { 9: 5, 10: 10, A: 20 },
  goal: 500,
  turnMs: 30000,
};

export const isLouse = (face) => RULES.values[face] !== undefined;
export const valueOf = (face) => RULES.values[face] || 0;
export const rollValue = (faces) => faces.reduce((s, f) => s + valueOf(f), 0);
// Probabilidad de no sacar ningún piojo con k dados (3 de 6 caras son piojos)
export const bustChance = (k) => Math.pow(1 - Object.keys(RULES.values).length / FACES.length, k);

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 2 && c.n <= 6;

export function newGame(config, names = [], now = 0) {
  const n = config.n;
  return {
    v: 1,
    config: { n, timer: config.timer !== false, goal: config.goal || RULES.goal },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    scores: Array(n).fill(0),
    turn: 0,
    phase: "roll", // "roll": tiene que tirar · "choose": plantarse o seguir · "over"
    dice: RULES.dice, // cuántos dados tira en su siguiente tiro
    turnPts: 0, // lo que lleva en este turno (se pierde si no sale ningún piojo)
    apart: [], // piojos apartados en este turno (se vacía cuando aparta los 5 y vuelve a tirar todos)
    roll: null, // el último tiro de este turno
    hot: false, // apartó los 5 y vuelve a tirar los 5
    last: null, // lo último que pasó, para mostrarlo: { seat, roll, kind: "bust"|"bank", pts }
    seq: 0, // acciones aplicadas (para animar solo lo nuevo)
    winner: null,
    started: now,
    log: [],
  };
}

export const nameOf = (st, seat) => st.names[seat];
const nextSeat = (st) => (st.turn + 1) % st.config.n;

function endTurn(st, extra) {
  return { ...st, ...extra, turn: nextSeat(st), phase: "roll", dice: RULES.dice, turnPts: 0, apart: [], roll: null, hot: false };
}

export function legalActions(st, seat) {
  if (st.phase === "over" || seat !== st.turn) return [];
  if (st.phase === "roll") return [{ type: "roll" }];
  return [{ type: "roll" }, { type: "bank" }];
}

// Revisa una acción; regresa el motivo si no se vale, o "" si se vale
export function check(st, seat, action) {
  if (st.phase === "over") return "La partida ya terminó.";
  if (seat !== st.turn) return "No es tu turno.";
  if (!action || (action.type !== "roll" && action.type !== "bank")) return "Esa jugada no existe.";
  if (action.type === "bank" && st.phase !== "choose") return "Primero tienes que tirar.";
  return "";
}

export function apply(st, seat, action, { rnd }) {
  const err = check(st, seat, action);
  if (err) throw new Error(err);
  const seq = st.seq + 1, who = nameOf(st, seat);

  if (action.type === "bank") {
    const scores = st.scores.slice();
    scores[seat] += st.turnPts;
    const last = { seat, roll: st.roll, kind: "bank", pts: st.turnPts };
    const log = [...st.log, `${who} se plantó con ${st.turnPts} (lleva ${scores[seat]})`];
    if (scores[seat] >= st.config.goal) {
      return { ...st, scores, last, log: [...log, `¡${who} llegó a ${st.config.goal} y ganó!`], seq, phase: "over", winner: seat, turnPts: 0 };
    }
    return endTurn(st, { scores, last, log, seq });
  }

  // Tirar los dados que quedan
  const roll = Array.from({ length: st.dice }, () => FACES[Math.floor(rnd() * FACES.length)]);
  const lice = roll.filter(isLouse);
  if (!lice.length) {
    const lost = st.turnPts;
    const last = { seat, roll, kind: "bust", pts: lost };
    return endTurn(st, { last, seq, log: [...st.log, `${who} tiró ${roll.join(" ")}: sin piojos${lost ? `, perdió ${lost}` : ""}`] });
  }
  const turnPts = st.turnPts + rollValue(lice);
  const left = st.dice - lice.length, hot = left === 0;
  return {
    ...st,
    seq,
    phase: "choose",
    roll,
    turnPts,
    apart: hot ? [] : [...st.apart, ...lice],
    dice: hot ? RULES.dice : left,
    hot,
    last: null,
    log: [...st.log, `${who} tiró ${roll.join(" ")}: +${rollValue(lice)} (lleva ${turnPts} en el turno)${hot ? ", ¡los 5 son piojos!" : ""}`],
  };
}

// Al vencerse el reloj: tira si todavía no ha tirado, y si ya tiró se planta con lo que lleva
export const autoAction = (st) => (st.phase === "choose" ? { type: "bank" } : { type: "roll" });
