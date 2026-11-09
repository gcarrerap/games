// Reglas del timbiriche (puntos y cajas) para 2. Funciones puras: estado entra, estado sale. No hay azar; la hora
// llega como `now`.
//
// El tablero es una rejilla de puntos. En tu turno trazas una raya entre dos puntos vecinos (horizontal o
// vertical) que nadie haya trazado. Si con tu raya cierras una caja (sus cuatro lados trazados), la caja es tuya y
// vuelves a tirar; si no cierras ninguna, le toca al otro. Cuando ya no quedan rayas, gana quien tenga más cajas.
//
// Castigo (opción de la mesa, prendido por omisión): si podías cerrar una caja y trazaste una raya que no cierra
// ninguna, pierdes tu siguiente turno: el otro tira dos veces seguidas (o más, si cierra cajas).
//
// Rayas: "h:r:c" va del punto (r, c) al (r, c+1); "v:r:c" del (r, c) al (r+1, c). Con W×H cajas hay (H+1)·W
// horizontales y H·(W+1) verticales. La caja (r, c) tiene arriba "h:r:c", abajo "h:r+1:c", a la izquierda "v:r:c" y
// a la derecha "v:r:c+1".

export const RULES = {
  sizes: [3, 4, 5, 6], // cajas por lado
  defaultSize: 4,
  secs: [10, 20, 30, 60], // segundos por raya cuando la mesa va con reloj
  defaultSecs: 20,
};

export const validConfig = (c) => c.n === 2 && RULES.sizes.includes(c.size) && RULES.secs.includes(c.secs);

// config: { n: 2, size, secs, penalty: true|false, timer: true|false }
export function newGame(config, names = [], now = 0) {
  const size = config.size ?? RULES.defaultSize;
  const c = { n: 2, size, secs: config.secs ?? RULES.defaultSecs, penalty: config.penalty !== false, timer: config.timer !== false };
  if (!validConfig(c)) throw new Error("Configuración de timbiriche no válida");
  const W = size, H = size;
  return {
    v: 1,
    config: c,
    names: [0, 1].map((i) => names[i] || `Jugador ${i + 1}`),
    w: W,
    h: H,
    lines: {}, // raya trazada → asiento que la trazó
    boxes: Array(W * H).fill(-1), // de quién es cada caja (-1 = abierta), en orden r·W + c
    scores: [0, 0],
    turn: 0,
    skip: [false, false], // castigo pendiente: ese asiento pierde su siguiente turno
    penalties: [0, 0], // cuántas veces se castigó a cada quien
    phase: "play", // "play" | "over"
    last: null, // la última raya: { seat, line, closed: [cajas], penalized, skipped: asiento que perdió turno o -1 }
    moves: 0,
    seq: 0,
    winner: null,
    draw: false,
    started: now,
    log: [],
  };
}

export const nameOf = (st, seat) => st.names[seat];
export const other = (seat) => 1 - seat;

// Todas las rayas del tablero, en orden fijo: primero las horizontales, luego las verticales
export function allLines(st) {
  const out = [];
  for (let r = 0; r <= st.h; r++) for (let c = 0; c < st.w; c++) out.push(`h:${r}:${c}`);
  for (let r = 0; r < st.h; r++) for (let c = 0; c <= st.w; c++) out.push(`v:${r}:${c}`);
  return out;
}

export function parseLine(id) {
  const m = /^([hv]):(\d+):(\d+)$/.exec(String(id));
  return m ? { dir: m[1], r: +m[2], c: +m[3] } : null;
}

export function isLine(st, id) {
  const p = parseLine(id);
  if (!p) return false;
  return p.dir === "h" ? p.r <= st.h && p.c < st.w : p.r < st.h && p.c <= st.w;
}

export const sidesOf = (r, c) => [`h:${r}:${c}`, `h:${r + 1}:${c}`, `v:${r}:${c}`, `v:${r}:${c + 1}`];

// Las cajas (una o dos) que tienen esa raya como lado: [[r, c], …]
export function boxesOf(st, id) {
  const { dir, r, c } = parseLine(id);
  const out = [];
  if (dir === "h") { if (r > 0) out.push([r - 1, c]); if (r < st.h) out.push([r, c]); }
  else { if (c > 0) out.push([r, c - 1]); if (c < st.w) out.push([r, c]); }
  return out;
}

// Cuántos lados trazados tiene la caja (r, c) con ese juego de rayas
export const sidesDrawn = (lines, r, c) => sidesOf(r, c).filter((l) => l in lines).length;

export const freeLines = (st) => allLines(st).filter((l) => !(l in st.lines));

// Cuántas cajas cierra esa raya si se traza ahora (0, 1 o 2)
export const closesCount = (st, id, lines = st.lines) => boxesOf(st, id).filter(([r, c]) => sidesDrawn(lines, r, c) === 3).length;

// Las rayas libres que cierran al menos una caja
export const closingLines = (st) => freeLines(st).filter((l) => closesCount(st, l) > 0);

// Las rayas libres que no le dejan a nadie una caja de tres lados (no "regalan" nada)
export const safeLines = (st) => freeLines(st).filter((l) => boxesOf(st, l).every(([r, c]) => sidesDrawn(st.lines, r, c) < 2));

export function legalActions(st, seat) {
  if (st.phase !== "play" || seat !== st.turn) return [];
  return freeLines(st).map((line) => ({ type: "line", line }));
}

// El siguiente en tirar después de que `seat` termina su turno sin cerrar: el otro, salvo que tenga castigo
// pendiente; en ese caso lo pierde (se consume) y sigue el mismo. Devuelve { turn, skip, skipped }.
function passTurn(skip, seat) {
  const s = skip.slice();
  const nxt = other(seat);
  if (s[nxt]) {
    s[nxt] = false;
    // Si el que tiró también tiene castigo pendiente (los dos dejaron pasar una caja, uno tras otro), los castigos
    // se cancelan: le toca al otro como siempre.
    if (s[seat]) { s[seat] = false; return { turn: nxt, skip: s, skipped: -1 }; }
    return { turn: seat, skip: s, skipped: nxt };
  }
  return { turn: nxt, skip: s, skipped: -1 };
}

export function apply(st, seat, action) {
  if (st.phase !== "play") throw new Error("La partida ya terminó");
  if (seat !== st.turn) throw new Error("No es tu turno");
  if (!action || action.type !== "line") throw new Error("Jugada no válida");
  const id = action.line;
  if (!isLine(st, id)) throw new Error("Esa raya no existe");
  if (id in st.lines) throw new Error("Esa raya ya está trazada");

  const who = nameOf(st, seat);
  const couldClose = st.config.penalty && closingLines(st).length > 0;
  const lines = { ...st.lines, [id]: seat };
  const boxes = st.boxes.slice();
  const closed = [];
  for (const [r, c] of boxesOf(st, id)) if (sidesDrawn(lines, r, c) === 4) { boxes[r * st.w + c] = seat; closed.push(r * st.w + c); }
  const scores = st.scores.slice();
  scores[seat] += closed.length;
  const base = { ...st, lines, boxes, scores, moves: st.moves + 1, seq: st.seq + 1 };
  const log = [...st.log];

  if (closed.length) {
    log.push(`${who} cierra ${closed.length === 1 ? "una caja" : "dos cajas"} y vuelve a tirar`);
    const next = { ...base, last: { seat, line: id, closed, penalized: false, skipped: -1 }, log };
    if (boxes.every((b) => b >= 0)) return finish(next);
    return next;
  }

  let skip = st.skip, penalties = st.penalties, penalized = false;
  if (couldClose) {
    penalized = true;
    skip = st.skip.slice(); skip[seat] = true;
    penalties = st.penalties.slice(); penalties[seat] += 1;
    log.push(`${who} dejó pasar una caja: pierde su siguiente turno`);
  } else log.push(`${who} traza una raya`);
  const p = passTurn(skip, seat);
  if (p.skipped >= 0) log.push(`${nameOf(st, p.skipped)} pierde este turno por el castigo; ${nameOf(st, p.turn)} vuelve a tirar`);
  return { ...base, turn: p.turn, skip: p.skip, penalties, last: { seat, line: id, closed, penalized, skipped: p.skipped }, log };
}

function finish(st) {
  const [a, b] = st.scores;
  const draw = a === b;
  const winner = draw ? null : a > b ? 0 : 1;
  const msg = draw ? `Empate ${a} a ${b}` : `¡${nameOf(st, winner)} gana ${Math.max(a, b)} a ${Math.min(a, b)}!`;
  return { ...st, phase: "over", winner, draw, log: [...st.log, msg] };
}

// Cuántas cajas puede llevarse quien tira con esas rayas, cerrando todo lo que se pueda (con la cadena que se
// abra al cerrar). Sirve para medir cuánto se regala con una raya.
export function greedyCapture(st, lines = st.lines) {
  const ln = { ...lines };
  let taken = 0;
  for (;;) {
    let found = null;
    for (let r = 0; r < st.h && !found; r++) for (let c = 0; c < st.w && !found; c++) {
      const sides = sidesOf(r, c);
      const missing = sides.filter((l) => !(l in ln));
      if (missing.length === 1) found = missing[0];
    }
    if (!found) return { taken, lines: ln };
    ln[found] = 1;
    // Cuenta las cajas que esa raya cierra (pueden ser dos)
    for (const [r, c] of boxesOf(st, found)) if (sidesDrawn(ln, r, c) === 4) taken++;
  }
}

// La acción al vencerse el reloj: cerrar una caja si se puede (así el reloj nunca provoca castigo); si no, una raya
// que no regale nada; si no, la que regale menos.
export function autoAction(st) {
  const close = closingLines(st);
  if (close.length) return { type: "line", line: close[0] };
  const safe = safeLines(st);
  if (safe.length) return { type: "line", line: safe[0] };
  let best = null, bestGive = Infinity;
  for (const l of freeLines(st)) {
    const g = greedyCapture(st, { ...st.lines, [l]: st.turn }).taken;
    if (g < bestGive) { bestGive = g; best = l; }
  }
  return { type: "line", line: best };
}
