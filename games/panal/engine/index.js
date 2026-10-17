// Reglas de Panal: juego de colmena para 2. Sin tablero: las fichas hexagonales forman la colmena sobre la mesa.
// Funciones puras: estado entra, estado sale.
//
// Cada jugador tiene 11 bichos: 1 abeja reina, 2 mayates, 3 chapulines, 3 hormigas y 2 arañas.
// En tu turno pones un bicho de tu reserva o mueves uno tuyo que esté encima de la colmena.
//   - Poner: la primera ficha va en cualquier lugar y la segunda junto a ella. Después, una ficha nueva solo puede
//     tocar fichas de tu color (la de arriba de cada pila) y ninguna del rival.
//   - La reina tiene que estar puesta a más tardar en tu cuarta ficha, y no puedes mover nada hasta ponerla.
//   - Colmena única: la colmena nunca puede quedar partida, ni a medio movimiento.
//   - Para deslizarse, una ficha tiene que caber: no pasa entre dos fichas que le cierran el paso.
// Movimientos:
//   - Abeja reina: un paso.            - Mayate: un paso, y puede subirse a la colmena (tapa lo que pisa).
//   - Chapulín: salta en línea recta por encima de una o más fichas, hasta el primer hueco.
//   - Hormiga: cualquier número de pasos por la orilla.   - Araña: exactamente tres pasos por la orilla.
// Pierde quien tiene su reina rodeada por los seis lados (de cualquier color). Si las dos quedan rodeadas a la vez,
// o se llega al límite de jugadas, es empate. Si no tienes ninguna jugada, pasas.
import { DIRS, key, neighbors, step, sides, dirTo, connected } from "./hex.js";

export { key, neighbors } from "./hex.js";

export const KINDS = ["reina", "mayate", "chapulin", "hormiga", "arana"];
export const PIECES = { reina: 1, mayate: 2, chapulin: 3, hormiga: 3, arana: 2 };
export const NAMES = { reina: "Abeja reina", mayate: "Mayate", chapulin: "Chapulín", hormiga: "Hormiga", arana: "Araña" };
// Con artículo, para las frases: "movió la hormiga", "puso un chapulín"
export const THE = { reina: "la abeja reina", mayate: "el mayate", chapulin: "el chapulín", hormiga: "la hormiga", arana: "la araña" };
export const ONE = { reina: "su abeja reina", mayate: "un mayate", chapulin: "un chapulín", hormiga: "una hormiga", arana: "una araña" };

export const RULES = {
  queenBy: 4, // la reina se pone a más tardar en esta ficha
  maxPlies: 240, // jugadas totales (las dos partes) antes de declarar empate
  turnMs: 60000,
};

export const validConfig = (c) => c.n === 2;

export function newGame(config, names = [], now = 0) {
  return {
    v: 1,
    config: { n: 2, timer: config.timer !== false },
    names: [0, 1].map((i) => names[i] || `Jugador ${i + 1}`),
    cells: {}, // "q,r" → [{ p, k }] de abajo hacia arriba (p = asiento dueño, k = bicho)
    hand: [0, 1].map(() => ({ ...PIECES })),
    placed: [0, 0], // fichas que ha puesto cada quien
    turn: 0,
    plies: 0,
    phase: "play", // "play" · "over"
    winner: null, // asiento, o null (empate o sin terminar)
    draw: false,
    last: null, // { seat, type: "place"|"move"|"pass", kind, from, to }
    seq: 0,
    started: now,
    log: [],
  };
}

export const nameOf = (st, seat) => st.names[seat];
export const topOf = (cells, k) => { const s = cells[k]; return s && s.length ? s[s.length - 1] : null; };
export const heightOf = (cells, k) => (cells[k] ? cells[k].length : 0);

// Dónde está la reina de un asiento (puede estar tapada por un mayate), o null si no la ha puesto
export function queenAt(cells, seat) {
  for (const k in cells) if (cells[k].some((x) => x.p === seat && x.k === "reina")) return k;
  return null;
}

// Cuántos de los seis lados de la reina están ocupados
export function queenPressure(cells, seat) {
  const q = queenAt(cells, seat);
  return q ? neighbors(q).filter((n) => cells[n]).length : 0;
}

// ---------- Poner ----------

export function placeTargets(st, seat) {
  const cells = st.cells, occ = Object.keys(cells);
  if (occ.length === 0) return [key(0, 0)];
  if (st.placed[seat] === 0 && occ.length === 1) return neighbors(occ[0]);
  const out = new Set();
  for (const k of occ) {
    if (topOf(cells, k).p !== seat) continue;
    for (const n of neighbors(k)) {
      if (cells[n] || out.has(n)) continue;
      if (neighbors(n).every((m) => !cells[m] || topOf(cells, m).p === seat)) out.add(n);
    }
  }
  return [...out];
}

// Qué bichos puede poner ese asiento ahora (la reina es obligatoria en su cuarta ficha)
export function placeableKinds(st, seat) {
  const h = st.hand[seat];
  if (h.reina && st.placed[seat] >= RULES.queenBy - 1) return ["reina"];
  return KINDS.filter((k) => h[k] > 0);
}

// ---------- Mover ----------

// ¿Puede una ficha deslizarse por el suelo de a a su vecina b? Tiene que caber (no pasa si las dos casillas de los
// lados están ocupadas) y no puede despegarse de la colmena (al menos una de las dos está ocupada).
function canSlide(occ, a, d) {
  const [l, r] = sides(a, d);
  return occ.has(l) !== occ.has(r);
}

function crawlSteps(occ, a) {
  const out = [];
  for (let d = 0; d < 6; d++) { const b = step(a, d); if (!occ.has(b) && canSlide(occ, a, d)) out.push(b); }
  return out;
}

const groundWithout = (cells, from) => { const occ = new Set(Object.keys(cells)); if (cells[from].length === 1) occ.delete(from); return occ; };

// ¿Se puede levantar la ficha de arriba de esa casilla sin partir la colmena?
export function canLift(cells, from) {
  if (cells[from].length > 1) return true;
  const occ = new Set(Object.keys(cells));
  occ.delete(from);
  return connected(occ);
}

function queenMoves(cells, from) { return crawlSteps(groundWithout(cells, from), from); }

function antMoves(cells, from) {
  const occ = groundWithout(cells, from), seen = new Set([from]), queue = [from];
  while (queue.length) for (const n of crawlSteps(occ, queue.shift())) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  seen.delete(from);
  return [...seen];
}

function spiderMoves(cells, from) {
  const occ = groundWithout(cells, from), out = new Set();
  const walk = (at, path) => {
    if (path.length === 4) { out.add(at); return; }
    for (const n of crawlSteps(occ, at)) if (!path.includes(n)) walk(n, [...path, n]);
  };
  walk(from, [from]);
  out.delete(from);
  return [...out];
}

function hopperMoves(cells, from) {
  const out = [];
  for (let d = 0; d < 6; d++) {
    let at = step(from, d);
    if (!cells[at]) continue; // tiene que saltar al menos una ficha
    while (cells[at]) at = step(at, d);
    out.push(at);
  }
  return out;
}

// El mayate: un paso en cualquier dirección, por el suelo o arriba de la colmena. Para pasar entre dos pilas tiene
// que ir más alto que la más baja de ellas.
function beetleMoves(cells, from) {
  const h = (k) => (k === from ? cells[from].length - 1 : heightOf(cells, k));
  const occ = groundWithout(cells, from), hFrom = h(from), out = [];
  for (let d = 0; d < 6; d++) {
    const b = step(from, d), hTo = h(b), [l, r] = sides(from, d);
    if (hFrom === 0 && hTo === 0) { if (canSlide(occ, from, d)) out.push(b); continue; }
    if (Math.min(h(l), h(r)) > Math.max(hFrom, hTo)) continue; // las pilas de los lados le cierran el paso
    out.push(b);
  }
  return out;
}

const MOVERS = { reina: queenMoves, mayate: beetleMoves, chapulin: hopperMoves, hormiga: antMoves, arana: spiderMoves };

// A dónde puede ir la ficha de arriba de esa casilla (sin revisar de quién es ni de quién es el turno)
export function destinations(cells, from) {
  const t = topOf(cells, from);
  if (!t || !canLift(cells, from)) return [];
  return MOVERS[t.k](cells, from);
}

// ---------- Jugadas ----------

export function legalActions(st, seat) {
  if (st.phase === "over" || seat !== st.turn) return [];
  const out = [];
  const targets = placeTargets(st, seat);
  if (targets.length) for (const kind of placeableKinds(st, seat)) for (const to of targets) out.push({ type: "place", kind, to });
  if (!st.hand[seat].reina) {
    for (const from of Object.keys(st.cells)) {
      if (topOf(st.cells, from).p !== seat) continue;
      for (const to of destinations(st.cells, from)) out.push({ type: "move", from, to });
    }
  }
  return out.length ? out : [{ type: "pass" }];
}

const same = (a, b) => a.type === b.type && a.kind === b.kind && a.from === b.from && a.to === b.to;

// Revisa una acción; regresa el motivo si no se vale, o "" si se vale
export function check(st, seat, action) {
  if (st.phase === "over") return "La partida ya terminó.";
  if (seat !== st.turn) return "No es tu turno.";
  if (!action || !["place", "move", "pass"].includes(action.type)) return "Esa jugada no existe.";
  const legal = legalActions(st, seat);
  if (legal.some((a) => same(a, action))) return "";
  if (action.type === "pass") return "Todavía tienes jugadas: no puedes pasar.";
  if (action.type === "place") {
    if (!st.hand[seat][action.kind]) return "Ya no tienes ese bicho.";
    if (placeableKinds(st, seat).join() === "reina" && action.kind !== "reina") return "Ya te toca poner a tu abeja reina.";
    return "Ahí no se puede poner: una ficha nueva solo toca fichas de tu color.";
  }
  if (st.hand[seat].reina) return "Primero pon a tu abeja reina.";
  const t = st.cells[action.from] && topOf(st.cells, action.from);
  if (!t || t.p !== seat) return "Esa ficha no es tuya.";
  if (!canLift(st.cells, action.from)) return "Si la mueves, la colmena se parte.";
  return `${NAMES[t.k]} no puede ir ahí.`;
}

function endIfOver(st) {
  const lost = [0, 1].filter((s) => queenPressure(st.cells, s) === 6);
  if (lost.length === 2) return { ...st, phase: "over", draw: true, winner: null, log: [...st.log, "¡Las dos reinas quedaron rodeadas! Empate."] };
  if (lost.length === 1) {
    const w = 1 - lost[0];
    return { ...st, phase: "over", winner: w, log: [...st.log, `¡La reina de ${nameOf(st, lost[0])} quedó rodeada! Ganó ${nameOf(st, w)}.`] };
  }
  if (st.plies >= RULES.maxPlies) return { ...st, phase: "over", draw: true, winner: null, log: [...st.log, `Se llegó a ${RULES.maxPlies} jugadas: empate.`] };
  return st;
}

export function apply(st, seat, action) {
  const err = check(st, seat, action);
  if (err) throw new Error(err);
  const who = nameOf(st, seat), base = { seq: st.seq + 1, plies: st.plies + 1, turn: 1 - st.turn };
  if (action.type === "pass") {
    return endIfOver({ ...st, ...base, last: { seat, type: "pass" }, log: [...st.log, `${who} no tiene jugadas y pasó`] });
  }
  const cells = { ...st.cells };
  if (action.type === "place") {
    const hand = st.hand.slice(), placed = st.placed.slice();
    hand[seat] = { ...hand[seat], [action.kind]: hand[seat][action.kind] - 1 };
    placed[seat]++;
    cells[action.to] = [{ p: seat, k: action.kind }];
    return endIfOver({ ...st, ...base, cells, hand, placed, last: { seat, type: "place", kind: action.kind, to: action.to }, log: [...st.log, `${who} puso ${ONE[action.kind]}`] });
  }
  const from = cells[action.from].slice(), piece = from.pop();
  if (from.length) cells[action.from] = from; else delete cells[action.from];
  cells[action.to] = [...(cells[action.to] || []), piece];
  const up = cells[action.to].length > 1 ? " (arriba de la colmena)" : "";
  return endIfOver({ ...st, ...base, cells, last: { seat, type: "move", kind: piece.k, from: action.from, to: action.to }, log: [...st.log, `${who} movió ${THE[piece.k]}${up}`] });
}

export { DIRS, dirTo };
