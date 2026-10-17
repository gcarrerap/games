// Reglas de las damas chinas. Funciones puras: estado entra, estado sale. La hora llega como ctx.now (no hay azar).
//
// Cada quien tiene 10 canicas en su punta de la estrella y las tiene que llevar todas a la punta de enfrente.
// En tu turno mueves una canica:
//   · un paso a un hoyo vecino vacío, o
//   · uno o varios saltos: sobre una canica vecina (de quien sea) a un hoyo vacío justo detrás, y desde ahí puedes
//     seguir saltando las veces que quieras. No se comen canicas. No se mezclan paso y saltos.
// No puedes terminar tu jugada en una punta que no sea la tuya ni la de tu meta (sí puedes pasar saltando por ella).
// Una canica que ya llegó a la meta ya no sale de ella (sí se puede acomodar adentro).
// Gana quien mete sus 10 canicas en la meta. Regla contra el bloqueo: si en tu meta hay canicas de otro que ya no
// se pueden mover y todos los demás hoyos de la meta son tuyos, también ganas.
import { CELLS, STEP, JUMP, CORNER_OF, CORNERS, DIST, SEAT_CORNERS, opposite } from "./board.js";

export * from "./board.js";

export const RULES = {
  pieces: 10,
  turnMs: 30000,
  // Tope de jugadas por persona: si se llega (alguien se queda atorado para siempre), gana quien lleve más canicas
  // en su meta y, si empatan, quien esté más cerca de terminar.
  maxMovesPerSeat: 200,
};

export const COLORS = ["rojo", "azul", "amarillo", "verde", "morado", "negro"];

export const validConfig = (c) => Object.prototype.hasOwnProperty.call(SEAT_CORNERS, c.n);

export function newGame(config, names = [], now = 0) {
  const n = config.n;
  const homes = SEAT_CORNERS[n];
  const board = Array(CELLS.length).fill(-1);
  homes.forEach((k, seat) => { for (const i of CORNERS[k]) board[i] = seat; });
  return {
    v: 1,
    config: { n, timer: config.timer !== false },
    names: Array.from({ length: n }, (_, i) => names[i] || `Jugador ${i + 1}`),
    homes, // punta de salida de cada asiento (su color es el de esa punta)
    targets: homes.map(opposite), // punta a la que va cada asiento
    board, // de quién es la canica en cada hoyo (-1 = vacío)
    turn: 0,
    phase: "play", // "play" | "over"
    moves: 0, // jugadas hechas en la partida
    last: null, // la última jugada: { seat, path } (path vacío si pasó)
    prev: Array(n).fill(null), // la última jugada de cada asiento: { from, to }
    seq: 0,
    winner: null,
    capped: false, // terminó por el tope de jugadas
    started: now,
    log: [],
  };
}

export const nameOf = (st, seat) => st.names[seat];
export const colorOf = (st, seat) => st.homes[seat];
export const piecesOf = (st, seat) => st.board.reduce((a, s, i) => (s === seat ? (a.push(i), a) : a), []);
export const inTarget = (st, seat, cell) => CORNER_OF[cell] === st.targets[seat];
export const arrived = (st, seat) => piecesOf(st, seat).filter((i) => inTarget(st, seat, i)).length;
// Cuánto le falta: la suma de lo que le falta a cada canica para llegar al vértice de su meta, menos lo mínimo
// posible (la meta llena). 0 = terminó.
const MIN_LEFT = CORNERS[0].map((i) => DIST[0][i]).reduce((a, b) => a + b, 0);
export const remaining = (st, seat) => piecesOf(st, seat).reduce((a, i) => a + DIST[st.targets[seat]][i], 0) - MIN_LEFT;

// ¿Puede la canica del asiento terminar su jugada en ese hoyo, saliendo de `from`?
export function canEnd(st, seat, from, to) {
  const k = CORNER_OF[to];
  if (inTarget(st, seat, from) && k !== st.targets[seat]) return false; // de la meta ya no se sale
  return k === -1 || k === st.homes[seat] || k === st.targets[seat];
}

// Todos los destinos de una canica: { to: camino }. El camino empieza en `from`; con saltos, pasa por cada hoyo
// donde cae (el más corto que llega a ese destino).
export function destinations(st, seat, from) {
  const board = st.board, out = {};
  const empty = (i) => i >= 0 && (board[i] === -1 || i === from);
  for (const to of STEP[from]) if (to >= 0 && board[to] === -1 && canEnd(st, seat, from, to)) out[to] = [from, to];
  // Saltos: búsqueda a lo ancho desde el origen (que queda vacío mientras la canica salta)
  const seen = new Set([from]);
  let frontier = [[from]];
  while (frontier.length) {
    const next = [];
    for (const path of frontier) {
      const at = path[path.length - 1];
      for (let d = 0; d < 6; d++) {
        const over = STEP[at][d], to = JUMP[at][d];
        if (over < 0 || to < 0 || over === from || board[over] === -1 || !empty(to) || seen.has(to)) continue;
        seen.add(to);
        const p = [...path, to];
        if (!(to in out) && canEnd(st, seat, from, to)) out[to] = p;
        next.push(p);
      }
    }
    frontier = next;
  }
  return out;
}

export function legalActions(st, seat) {
  if (st.phase === "over" || seat !== st.turn) return [];
  const acts = [];
  for (const from of piecesOf(st, seat)) {
    for (const path of Object.values(destinations(st, seat, from))) acts.push({ type: "move", path });
  }
  return acts.length ? acts : [{ type: "pass" }];
}

// ¿Es válido ese camino para ese asiento? Un paso a un vecino vacío, o saltos encadenados sin repetir hoyo.
export function validPath(st, seat, path) {
  if (!Array.isArray(path) || path.length < 2 || !path.every((i) => Number.isInteger(i) && i >= 0 && i < CELLS.length)) return false;
  const from = path[0], to = path[path.length - 1];
  if (st.board[from] !== seat || st.board[to] !== -1 || !canEnd(st, seat, from, to)) return false;
  if (path.length === 2 && STEP[from].includes(to)) return true;
  const seen = new Set([from]);
  for (let s = 1; s < path.length; s++) {
    const a = path[s - 1], b = path[s], d = JUMP[a].indexOf(b);
    if (d < 0 || seen.has(b)) return false;
    const over = STEP[a][d];
    if (over === from || st.board[over] === -1) return false;
    if (b !== from && st.board[b] !== -1) return false;
    seen.add(b);
  }
  return true;
}

// Revisa una acción; regresa el motivo si no se vale, o "" si se vale
export function check(st, seat, action) {
  if (st.phase === "over") return "La partida ya terminó.";
  if (seat !== st.turn) return "No es tu turno.";
  if (!action || (action.type !== "move" && action.type !== "pass")) return "Esa jugada no existe.";
  if (action.type === "pass") return legalActions(st, seat)[0].type === "pass" ? "" : "Solo puedes pasar si no tienes jugada.";
  if (!Array.isArray(action.path) || st.board[action.path[0]] !== seat) return "Esa canica no es tuya.";
  if (!validPath(st, seat, action.path)) return "Esa canica no puede llegar ahí.";
  return "";
}

// ¿Ya terminó ese asiento? Todas sus canicas en la meta, o la regla contra el bloqueo.
export function finished(st, seat) {
  const target = CORNERS[st.targets[seat]];
  const mine = target.filter((i) => st.board[i] === seat).length;
  if (mine === RULES.pieces) return true;
  if (!mine || target.some((i) => st.board[i] === -1)) return false;
  // La meta está llena y hay canicas de otros: solo cuenta si ninguna de ellas se puede mover
  return target.every((i) => st.board[i] === seat || Object.keys(destinations(st, st.board[i], i)).length === 0);
}

// Quién va ganando si se acaba por el tope: más canicas en la meta y, si empatan, menos camino por recorrer
export function standings(st) {
  return st.names.map((_, s) => ({ seat: s, arrived: arrived(st, s), left: remaining(st, s) }))
    .sort((a, b) => b.arrived - a.arrived || a.left - b.left || a.seat - b.seat);
}

export function apply(st, seat, action) {
  const err = check(st, seat, action);
  if (err) throw new Error(err);
  const who = nameOf(st, seat), seq = st.seq + 1, moves = st.moves + 1;
  const turn = (st.turn + 1) % st.config.n;
  if (action.type === "pass") {
    const next = { ...st, seq, moves, turn, last: { seat, path: [] }, log: [...st.log, `${who} no tiene jugada y pasa`] };
    return capCheck(next);
  }
  const path = action.path, from = path[0], to = path[path.length - 1];
  const board = st.board.slice();
  board[from] = -1;
  board[to] = seat;
  const prev = st.prev.slice();
  prev[seat] = { from, to };
  const jumps = path.length - 1;
  const how = path.length === 2 && STEP[from].includes(to) ? "avanzó un paso" : `saltó ${jumps === 1 ? "una vez" : `${jumps} veces`}`;
  let next = { ...st, board, prev, seq, moves, turn, last: { seat, path: path.slice() }, log: [...st.log, `${who} ${how}`] };
  if (finished(next, seat)) {
    return { ...next, phase: "over", winner: seat, turn: seat, log: [...next.log, `¡${who} llenó su meta y ganó!`] };
  }
  return capCheck(next);
}

function capCheck(st) {
  if (st.moves < RULES.maxMovesPerSeat * st.config.n) return st;
  const best = standings(st)[0].seat;
  return { ...st, phase: "over", winner: best, capped: true, log: [...st.log, `Se llegó al tope de jugadas: gana ${nameOf(st, best)}, el más avanzado`] };
}

// Al vencerse el reloj: la jugada que más acerca una canica a su meta (o pasar si no hay)
export function autoAction(st) {
  const seat = st.turn, k = st.targets[seat];
  let best = null, gain = -Infinity;
  for (const a of legalActions(st, seat)) {
    if (a.type !== "move") return a;
    const g = DIST[k][a.path[0]] - DIST[k][a.path[a.path.length - 1]];
    if (g > gain) { gain = g; best = a; }
  }
  return best;
}
