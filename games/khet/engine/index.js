// Reglas del Láser (estilo Khet 2.0) para 2. Funciones puras: estado entra, estado sale. No hay azar; la hora llega
// como `now`.
//
// Tablero de 10 columnas × 8 filas. Plata (asiento 0) abajo, Rojo (asiento 1) arriba; empieza Plata. En tu turno
// haces UNA cosa: mueves una pieza a una casilla vecina (también en diagonal) o la giras 90°. Después tu esfinge
// dispara su láser: rebota en los espejos y destruye la primera pieza que pega en un lado sin espejo, sea de quien
// sea. Si el láser le da a un faraón, su dueño pierde.
//
// Casillas: índice r·10 + c, con r = 0 la fila de arriba (la de Rojo) y c = 0 la columna de la izquierda.
// Direcciones: 0 = norte (arriba), 1 = este, 2 = sur, 3 = oeste.
//
// Una pieza es un entero (así el estado es JSON chico y la compu copia tableros rápido):
//   code = tipo·16 + dueño·4 + orientación     (0 = casilla vacía)
//   tipo: 1 pirámide, 2 escarabajo, 3 anubis, 4 faraón, 5 esfinge
//
// Orientación:
//   · Pirámide: su espejo mira entre la dirección o y la o+1 (0 = noreste, 1 = sureste, 2 = suroeste, 3 = noroeste).
//     Un rayo que llega por uno de esos dos lados rebota 90°; por los otros dos, la destruye.
//   · Escarabajo: espejo de dos caras, nunca se destruye; solo importa o % 2.
//   · Anubis: su escudo mira hacia o. Un rayo que llega de frente se detiene sin daño; por los otros lados lo destruye.
//   · Faraón: cualquier golpe lo destruye.
//   · Esfinge: no se mueve; gira entre las dos direcciones que apuntan al tablero. El láser la detiene sin daño.
//
// Casillas reservadas (como en el tablero original): la columna de la izquierda y I1, I8 son solo de Rojo; la columna
// de la derecha y B1, B8 solo de Plata. Ninguna pieza puede entrar (ni por intercambio) a una casilla del otro color.

export const W = 10, H = 8, N = W * H;
export const PYRAMID = 1, SCARAB = 2, ANUBIS = 3, PHARAOH = 4, SPHINX = 5;
export const SILVER = 0, RED = 1;
export const TYPE_NAMES = { [PYRAMID]: "pirámide", [SCARAB]: "escarabajo", [ANUBIS]: "anubis", [PHARAOH]: "faraón", [SPHINX]: "esfinge" };
export const COLOR_NAMES = ["Plata", "Rojo"];
const FEM = { [PYRAMID]: true, [SPHINX]: true };
// "la pirámide", "el anubis"… para la bitácora
export const theName = (t) => `${FEM[t] ? "la" : "el"} ${TYPE_NAMES[t]}`;
const ownName = (t) => `${FEM[t] ? "su propia" : "su propio"} ${TYPE_NAMES[t]}`;
const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export const RULES = {
  secs: [20, 40, 60, 120], // segundos por turno cuando la mesa va con reloj
  defaultSecs: 60,
  maxPly: 300, // a las 300 jugadas sin ganador es empate (en la práctica casi nunca se llega)
  repeat: 3, // la misma posición, con el mismo en turno, por tercera vez: empate
};

export const piece = (type, owner, o = 0) => type * 16 + owner * 4 + (o & 3);
export const typeOf = (p) => p >> 4;
export const ownerOf = (p) => (p >> 2) & 3;
export const orientOf = (p) => p & 3;
export const rc = (i) => [Math.floor(i / W), i % W];
export const idx = (r, c) => r * W + c;
export const sq = (i) => { const [r, c] = rc(i); return "ABCDEFGHIJ"[c] + (H - r); }; // nombre como en el tablero: A1…J8

// De quién es una casilla reservada: 0 Plata, 1 Rojo, -1 libre
export function reservedFor(i) {
  const [r, c] = rc(i);
  if (c === 0) return RED;
  if (c === W - 1) return SILVER;
  if (c === 1 && (r === 0 || r === H - 1)) return SILVER;
  if (c === W - 2 && (r === 0 || r === H - 1)) return RED;
  return -1;
}
export const canStand = (p, i) => { const f = reservedFor(i); return f < 0 || f === ownerOf(p); };

// Esfinges: dónde está cada una y hacia dónde puede apuntar
export const SPHINX_AT = [idx(H - 1, W - 1), idx(0, 0)];
export const SPHINX_DIRS = [[0, 3], [2, 1]]; // Plata: norte u oeste; Rojo: sur o este

// Acomodo Clásico de Plata (A1…J8, orientación n/e/s/w = 0..3). El de Rojo es el mismo girado 180°.
const CLASSIC_SILVER = [
  ["J1", SPHINX, 0], ["E1", PHARAOH, 0], ["D1", ANUBIS, 0], ["F1", ANUBIS, 0],
  ["E4", SCARAB, 3], ["F4", SCARAB, 2],
  ["C1", PYRAMID, 3], ["H2", PYRAMID, 0], ["C4", PYRAMID, 3], ["J4", PYRAMID, 2], ["C5", PYRAMID, 2], ["J5", PYRAMID, 3], ["D6", PYRAMID, 3],
];
// Muralla (variante propia, no del juego original): como el Clásico, pero los escarabajos y dos pirámides van a
// defender al faraón.
const WALL_SILVER = [
  ["J1", SPHINX, 0], ["E1", PHARAOH, 0], ["D1", ANUBIS, 0], ["F1", ANUBIS, 0],
  ["E3", SCARAB, 2], ["F3", SCARAB, 3],
  ["C1", PYRAMID, 3], ["H2", PYRAMID, 0], ["G4", PYRAMID, 0], ["J4", PYRAMID, 2], ["C5", PYRAMID, 2], ["J5", PYRAMID, 3], ["B4", PYRAMID, 1],
];
// Asalto (variante propia): el faraón un paso adelante, rodeado, y las pirámides al frente, para partidas rápidas.
const ASSAULT_SILVER = [
  ["J1", SPHINX, 0], ["F2", PHARAOH, 0], ["E1", ANUBIS, 0], ["G1", ANUBIS, 0],
  ["E3", SCARAB, 3], ["F3", SCARAB, 2],
  ["E2", PYRAMID, 3], ["G2", PYRAMID, 0], ["H3", PYRAMID, 0], ["D4", PYRAMID, 3], ["J4", PYRAMID, 2], ["C5", PYRAMID, 2], ["J5", PYRAMID, 3],
];
export const SETUPS = { clasico: CLASSIC_SILVER, muralla: WALL_SILVER, asalto: ASSAULT_SILVER };
export const SETUP_NAMES = { clasico: "Clásico", muralla: "Muralla", asalto: "Asalto" };

const fromName = (s) => idx(H - Number(s.slice(1)), "ABCDEFGHIJ".indexOf(s[0]));

export function boardFor(setup = "clasico") {
  const list = SETUPS[setup] || CLASSIC_SILVER;
  const b = Array(N).fill(0);
  for (const [name, t, o] of list) {
    const i = fromName(name);
    b[i] = piece(t, SILVER, o);
    b[N - 1 - i] = piece(t, RED, (o + 2) & 3); // girado 180°
  }
  return b;
}

export const validConfig = (c) => c.n === 2 && RULES.secs.includes(c.secs) && !!SETUPS[c.setup];

// config: { n: 2, setup, secs, timer }
export function newGame(config = {}, names = [], now = 0) {
  const c = { n: 2, setup: config.setup || "clasico", secs: config.secs ?? RULES.defaultSecs, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración del láser no válida");
  const board = boardFor(c.setup);
  return {
    v: 1,
    config: c,
    names: [0, 1].map((i) => names[i] || COLOR_NAMES[i]),
    board,
    turn: SILVER,
    phase: "play", // "play" | "over"
    ply: 0,
    seq: 0,
    last: null, // { seat, action, moved: [desde, hasta] | null, beam: { path, end, at, hit } }
    lost: [[], []], // piezas que perdió cada color (códigos), en orden
    seen: { [posKey(board, SILVER)]: 1 },
    winner: null,
    draw: false,
    reason: "",
    started: now,
    log: [],
  };
}

export const posKey = (board, turn) => turn + ":" + board.join(",");

// ---------- El láser ----------

// Qué le pasa a un rayo que viaja hacia `dir` al entrar a una casilla con la pieza p:
//   { out: nueva dirección } si rebota, { stop: "block" | "sphinx" } si se detiene sin daño, { stop: "kill" } si la destruye
export function interact(p, dir) {
  const t = typeOf(p), o = orientOf(p);
  const from = (dir + 2) & 3; // el lado por donde entra
  if (t === PYRAMID || t === SCARAB) {
    let m = o;
    if (t === SCARAB && from !== o && from !== ((o + 1) & 3)) m = (o + 2) & 3; // la otra cara del espejo
    if (from === m) return { out: (m + 1) & 3 };
    if (from === ((m + 1) & 3)) return { out: m };
    return { stop: "kill" };
  }
  if (t === ANUBIS) return from === o ? { stop: "block" } : { stop: "kill" };
  if (t === SPHINX) return { stop: "sphinx" };
  return { stop: "kill" }; // faraón
}

// El recorrido del láser de `seat` sobre ese tablero. Puntos en unidades de casilla (x = columna, y = fila; el centro
// de la casilla (r, c) es (c + .5, r + .5)), para que la mesa lo dibuje tal cual.
// → { path: [[x, y], …], end: "off" | "block" | "sphinx" | "kill", at: casilla donde paró (o -1), hit: código o 0 }
export function traceBeam(board, seat) {
  const start = SPHINX_AT[seat];
  const s = board[start];
  let dir = typeOf(s) === SPHINX ? orientOf(s) : SPHINX_DIRS[seat][0];
  let [r, c] = rc(start);
  const path = [[c + 0.5, r + 0.5]];
  for (let guard = 0; guard < 200; guard++) {
    const nr = r + DR[dir], nc = c + DC[dir];
    if (nr < 0 || nr >= H || nc < 0 || nc >= W) {
      path.push([c + 0.5 + DC[dir] * 0.5, r + 0.5 + DR[dir] * 0.5]);
      return { path, end: "off", at: -1, hit: 0 };
    }
    r = nr; c = nc;
    const i = idx(r, c), p = board[i];
    if (!p) continue;
    const res = interact(p, dir);
    if (res.out !== undefined) { path.push([c + 0.5, r + 0.5]); dir = res.out; continue; }
    // Se detiene: el punto final queda en la cara que pegó (un poco antes del centro)
    const back = res.stop === "kill" ? 0.12 : 0.36;
    path.push([c + 0.5 - DC[dir] * back, r + 0.5 - DR[dir] * back]);
    return { path, end: res.stop, at: i, hit: p };
  }
  return { path, end: "off", at: -1, hit: 0 }; // un ciclo (no debería pasar): se apaga
}

// ---------- Jugadas ----------

export const other = (seat) => 1 - seat;
export const nameOf = (st, seat) => st.names[seat];

// Las jugadas de `seat` en ese tablero, sin revisar el turno. Mover: { type: "move", from, to } (si `to` tiene una
// pirámide o un anubis y la que se mueve es un escarabajo, se intercambian). Girar: { type: "rotate", at, dir: 1 | -1 }.
export function movesFor(board, seat) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const p = board[i];
    if (!p || ownerOf(p) !== seat) continue;
    const t = typeOf(p);
    if (t === SPHINX) { out.push({ type: "rotate", at: i, dir: orientOf(p) === SPHINX_DIRS[seat][0] ? 1 : -1 }); continue; }
    const [r, c] = rc(i);
    for (const [dr, dc] of KING) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
      const j = idx(nr, nc), q = board[j];
      if (!q) { if (canStand(p, j)) out.push({ type: "move", from: i, to: j }); continue; }
      if (t === SCARAB && (typeOf(q) === PYRAMID || typeOf(q) === ANUBIS) && canStand(p, j) && canStand(q, i)) out.push({ type: "move", from: i, to: j });
    }
    if (t === PHARAOH) continue; // girarlo no cambia nada
    out.push({ type: "rotate", at: i, dir: 1 });
    if (t !== SCARAB) out.push({ type: "rotate", at: i, dir: -1 }); // el escarabajo queda igual girando a un lado o al otro
  }
  return out;
}

// Revisa la jugada y devuelve el tablero después de moverla (sin disparar), o lanza error
export function moveBoard(board, seat, a) {
  if (!a || (a.type !== "move" && a.type !== "rotate")) throw new Error("Jugada no válida");
  const b = board.slice();
  if (a.type === "rotate") {
    const i = a.at, p = b[i];
    if (!Number.isInteger(i) || i < 0 || i >= N || !p) throw new Error("Ahí no hay pieza");
    if (ownerOf(p) !== seat) throw new Error("Esa pieza no es tuya");
    if (a.dir !== 1 && a.dir !== -1) throw new Error("Giro no válido");
    const t = typeOf(p);
    if (t === PHARAOH) throw new Error("El faraón no se gira");
    let o = (orientOf(p) + a.dir) & 3;
    if (t === SPHINX) {
      const [d0, d1] = SPHINX_DIRS[seat];
      o = orientOf(p) === d0 ? d1 : d0;
    }
    b[i] = piece(t, seat, o);
    return b;
  }
  const { from, to } = a;
  if (![from, to].every((x) => Number.isInteger(x) && x >= 0 && x < N)) throw new Error("Casilla no válida");
  const p = b[from], q = b[to];
  if (!p) throw new Error("Ahí no hay pieza");
  if (ownerOf(p) !== seat) throw new Error("Esa pieza no es tuya");
  if (typeOf(p) === SPHINX) throw new Error("La esfinge no se mueve; solo gira");
  const [r1, c1] = rc(from), [r2, c2] = rc(to);
  if (Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) !== 1) throw new Error("Solo una casilla a la vez");
  if (!canStand(p, to)) throw new Error("Esa casilla es del otro color");
  if (q) {
    if (typeOf(p) !== SCARAB || (typeOf(q) !== PYRAMID && typeOf(q) !== ANUBIS)) throw new Error("Esa casilla está ocupada");
    if (!canStand(q, from)) throw new Error("Esa pieza no puede ir a una casilla del otro color");
  }
  b[to] = p; b[from] = q;
  return b;
}

// Mueve y dispara, sin historia: lo que usa la compu para pensar rápido.
// → { board, beam, killed: código destruido o 0, loser: asiento cuyo faraón cayó o -1 }
export function step(board, seat, a) {
  const b = moveBoard(board, seat, a);
  const beam = traceBeam(b, seat);
  let killed = 0, loser = -1;
  if (beam.end === "kill") {
    killed = b[beam.at];
    b[beam.at] = 0;
    if (typeOf(killed) === PHARAOH) loser = ownerOf(killed);
  }
  return { board: b, beam, killed, loser };
}

export function legalActions(st, seat) {
  if (st.phase !== "play" || seat !== st.turn) return [];
  return movesFor(st.board, seat);
}

const describe = (st, seat, a) => {
  const b = st.board;
  if (a.type === "rotate") {
    const p = b[a.at];
    return `${nameOf(st, seat)} gira ${typeOf(p) === SPHINX ? "su esfinge" : `${theName(typeOf(p))} de ${sq(a.at)}`}`;
  }
  const p = b[a.from], q = b[a.to];
  if (q) return `${nameOf(st, seat)} cambia su escarabajo de ${sq(a.from)} por ${theName(typeOf(q))} de ${sq(a.to)}`;
  return `${nameOf(st, seat)} mueve su ${TYPE_NAMES[typeOf(p)]} de ${sq(a.from)} a ${sq(a.to)}`;
};

export function apply(st, seat, action) {
  if (st.phase !== "play") throw new Error("La partida ya terminó");
  if (seat !== st.turn) throw new Error("No es tu turno");
  const res = step(st.board, seat, action);
  const log = [...st.log, describe(st, seat, action)];
  const lost = [st.lost[0].slice(), st.lost[1].slice()];
  if (res.killed) {
    const who = ownerOf(res.killed);
    lost[who].push(res.killed);
    log.push(`El láser de ${nameOf(st, seat)} destruye ${who === seat ? ownName(typeOf(res.killed)) : theName(typeOf(res.killed))} de ${sq(res.beam.at)}`);
  } else if (res.beam.end === "block") log.push(`Un anubis detiene el láser en ${sq(res.beam.at)}`);
  const moved = action.type === "move" ? [action.from, action.to] : null;
  const turn = other(seat);
  const base = {
    ...st, board: res.board, lost, ply: st.ply + 1, seq: st.seq + 1, turn,
    last: { seat, action, moved, beam: { path: res.beam.path, end: res.beam.end, at: res.beam.at, hit: res.beam.hit } },
    log,
  };
  if (res.loser >= 0) {
    const winner = other(res.loser);
    const reason = res.loser === seat ? "Su propio láser destruyó a su faraón" : `El láser de ${nameOf(st, seat)} destruyó al faraón de ${nameOf(st, res.loser)}`;
    return { ...base, phase: "over", winner, draw: false, reason, log: [...log, `¡${nameOf(st, winner)} gana!`] };
  }
  const key = posKey(res.board, turn);
  const seen = { ...st.seen, [key]: (st.seen[key] || 0) + 1 };
  if (seen[key] >= RULES.repeat) return { ...base, seen, phase: "over", winner: null, draw: true, reason: "La misma posición se repitió tres veces", log: [...log, "Empate por repetición"] };
  if (base.ply >= RULES.maxPly) return { ...base, seen, phase: "over", winner: null, draw: true, reason: `${RULES.maxPly} jugadas sin ganador`, log: [...log, "Empate por tiempo"] };
  return { ...base, seen };
}

// Al vencerse el reloj se juega una jugada que no pierde de inmediato (la escoge ai/; aquí solo una segura y fija):
// la primera que no destruye al propio faraón ni deja ese láser propio pegando en una pieza propia.
export function autoAction(st) {
  const seat = st.turn;
  const moves = movesFor(st.board, seat);
  let fallback = null;
  for (const a of moves) {
    const r = step(st.board, seat, a);
    if (r.loser === seat) continue;
    if (!fallback) fallback = a;
    if (!r.killed || ownerOf(r.killed) !== seat) return a;
  }
  return fallback || moves[0];
}
