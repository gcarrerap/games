// Reglas de Geografía. Funciones puras: estado entra, estado sale; el azar llega como `rnd`. Nada de DOM ni Date.now().
//
// Una partida es una lista de preguntas que se arma al empezar (con la semilla de la mesa, así se puede repetir). Cada
// jugador responde la suya por turnos (la pregunta i le toca al asiento i % n). Hay cuatro clases de pregunta:
//   cont   ¿En qué continente está este país?            { type: "answer", pick: "europa" }
//   shape  ¿De qué país es esta silueta?                  { type: "answer", pick: "MX" }
//   pin    Clava un pin donde está el país en el mapa     { type: "answer", lon, lat }
//   flag   ¿De qué país es esta bandera?                  { type: "answer", pick: "MX" }
// Después de responder se ve la respuesta (fase "reveal") y quien respondió toca «Siguiente» ({ type: "next" }).
// Una respuesta puede traer `hint: true` (usó la pista: vale la mitad), `ms` (lo que tardó, para el bono de
// rapidez con reloj), `skip: true` («no sé») o `timeout: true` (se acabó el tiempo).
//
// Puntos por pregunta: hasta 100 por acertar (en el pin, según qué tan cerca cayó), más la racha (+10 por cada
// acierto seguido desde el segundo, hasta +50) y, con reloj, hasta +25 por responder rápido.
import { BY_CODE, CONTINENTS, CONTINENT_BY_ID, LEVEL_BY_ID, GAMES, GAME_KINDS, ROUNDS, RANK, poolFor, sameFlag, FLAG_LOOKALIKE, subregionName } from "./catalog.js";
import { distanceKm } from "./geo.js";

export const LIMITS_MS = { cont: 15000, shape: 20000, flag: 15000, pin: 45000 };
export const POINTS = { base: 100, streakStep: 10, streakMax: 50, speedMax: 25, hintFactor: 0.5, pinOkAt: 60 };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const KINDS = ["cont", "shape", "pin", "flag"];

/** La configuración con sus valores por omisión (lo que no venga o no valga se reemplaza). */
export function normalizeConfig(config = {}) {
  const pick = (v, ok, dflt) => (ok(v) ? v : dflt);
  return {
    n: clamp(Math.round(Number(config.n) || 1), 1, 4),
    game: pick(config.game, (v) => GAMES.some((g) => g.id === v), "mezcla"),
    level: pick(config.level, (v) => !!LEVEL_BY_ID[v], "medio"),
    region: pick(config.region, (v) => ["mundo", "africa", "america", "asia", "europa", "oceania"].includes(v), "mundo"),
    rounds: pick(Number(config.rounds), (v) => ROUNDS.includes(v), 10),
    borders: pick(config.borders, (v) => ["con", "sin", "alterna"].includes(v), "alterna"),
    timer: config.timer !== false,
  };
}

// ───────── Armar las preguntas
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Las opciones de una pregunta de opción múltiple: la correcta y `n - 1` distractores, en orden al azar. En los niveles
// altos los distractores se parecen (misma región; en banderas, las que se confunden).
function optionsFor(code, kind, lv, region, rnd) {
  const n = lv.choices;
  const me = BY_CODE[code];
  let cands = poolFor({ level: lv.id, region, kind: null, need: 24 }).filter((c) => c !== code);
  if (cands.length < n + 2) cands = poolFor({ level: lv.id, region: "mundo", kind: null, need: 40 }).filter((c) => c !== code);
  if (kind === "flag") cands = cands.filter((c) => !sameFlag(c, code));
  const look = new Set(kind === "flag" && lv.id !== "facil" ? FLAG_LOOKALIKE.filter((g) => g.includes(code)).flat().filter((c) => c !== code) : []);
  const scored = cands.map((c) => {
    const x = BY_CODE[c];
    let s = rnd() * (lv.id === "facil" ? 10 : 2);
    if (lv.id !== "facil") s += (x.sub === me.sub ? 3 : 0) + (x.cont === me.cont ? 1.5 : 0);
    if (lv.id === "dificil") s -= Math.abs(Math.log((x.area + 1) / (me.area + 1))) * 0.15;
    if (look.has(c)) s += 5;
    return { c, s };
  }).sort((a, b) => b.s - a.s);
  const out = [];
  for (const { c } of scored) {
    if (out.length >= n - 1) break;
    if (kind === "flag" && out.some((o) => sameFlag(o, c))) continue;
    out.push(c);
  }
  out.splice(Math.floor(rnd() * (out.length + 1)), 0, code);
  return out;
}

function buildQuestions(cfg, rnd) {
  const lv = LEVEL_BY_ID[cfg.level];
  const total = cfg.rounds * cfg.n;
  const game = GAMES.find((g) => g.id === cfg.game);
  const kinds = game.kind ? [game.kind] : KINDS;
  // Qué clase toca en cada pregunta: la mezcla reparte las cuatro en bloques al azar
  const seq = [];
  while (seq.length < total) seq.push(...(game.kind ? [game.kind] : shuffle(kinds, rnd)));
  seq.length = total;
  const pools = {}, used = new Set();
  let pins = 0, borderFirst = rnd() < 0.5;
  const out = [];
  for (const kind of seq) {
    // En «continentes» la región no cuenta (todos estarían en el mismo continente)
    const region = kind === "cont" ? "mundo" : cfg.region;
    const key = kind + region;
    pools[key] = pools[key] || poolFor({ level: cfg.level, region, kind, need: Math.min(total, 40) });
    let avail = pools[key].filter((c) => !used.has(kind + c));
    if (!avail.length) { for (const c of pools[key]) used.delete(kind + c); avail = pools[key].slice(); }
    // La mezcla evita repetir el mismo país en dos clases distintas mientras haya de dónde escoger
    const fresh = avail.filter((c) => ![...used].some((u) => u.slice(-2) === c));
    const code = (fresh.length ? fresh : avail)[Math.floor(rnd() * (fresh.length ? fresh : avail).length)];
    used.add(kind + code);
    if (kind === "cont") out.push({ t: "cont", code });
    else if (kind === "pin") {
      const borders = cfg.borders === "con" ? true : cfg.borders === "sin" ? false : (pins++ % 2 === 0) === borderFirst;
      out.push({ t: "pin", code, borders });
    } else out.push({ t: kind, code, opts: lv.typed ? null : optionsFor(code, kind, lv, region, rnd) });
  }
  return out;
}

export function setup(config, { rnd }) {
  const cfg = normalizeConfig(config);
  const names = Array.from({ length: cfg.n }, (_, i) => (config.names && config.names[i]) || `Jugador ${i + 1}`);
  const zeros = () => Array(cfg.n).fill(0);
  return {
    v: 1, config: cfg, n: cfg.n, names,
    questions: buildQuestions(cfg, rnd),
    i: 0, turn: 0, phase: "play",
    scores: zeros(), streaks: zeros(), best: zeros(), hits: zeros(),
    log: [], last: null, seq: 0,
  };
}

export const question = (st) => st.questions[st.i] || null;
export const limitMs = (st) => { const q = question(st); return q ? LIMITS_MS[q.t] : 0; };

// ───────── Responder
/** Puntos de un pin según a cuántos km del país cayó. Dentro (o a un paso en un país chiquito) vale 100. */
export function pinPoints(distKm, tolKm, scale) {
  if (distKm <= tolKm) return 100;
  return Math.round(100 * Math.exp(-(distKm - tolKm) / scale));
}
export const toleranceKm = (code) => { const a = (BY_CODE[code] || {}).area || 0; return a < 200 ? 60 : a < 3000 ? 35 : a < 20000 ? 15 : 0; };

function judge(st, q, a) {
  const c = BY_CODE[q.code];
  const none = { ok: false, base: 0, pick: null };
  if (a.skip || a.timeout) return { ...none, skipped: !!a.skip, timeout: !!a.timeout };
  if (q.t === "cont") {
    if (!CONTINENT_BY_ID[a.pick]) throw new Error("Escoge uno de los continentes.");
    const ok = a.pick === c.cont || a.pick === c.alt;
    return { ok, base: ok ? POINTS.base : 0, pick: a.pick };
  }
  if (q.t === "shape" || q.t === "flag") {
    if (q.opts ? !q.opts.includes(a.pick) : !BY_CODE[a.pick]) throw new Error("Esa no es una de las respuestas.");
    const ok = a.pick === q.code || (q.t === "flag" && sameFlag(a.pick, q.code));
    return { ok, base: ok ? POINTS.base : 0, pick: a.pick };
  }
  // pin
  if (!Number.isFinite(a.lon) || !Number.isFinite(a.lat) || Math.abs(a.lat) > 90 || Math.abs(a.lon) > 540) throw new Error("Coloca el pin en el mapa.");
  const lon = ((((a.lon + 180) % 360) + 360) % 360) - 180, lat = a.lat;
  const dist = distanceKm(q.code, lon, lat, c.ll);
  const tol = toleranceKm(q.code), base = pinPoints(dist, tol, LEVEL_BY_ID[st.config.level].scale);
  return { ok: base >= POINTS.pinOkAt, base, pick: null, lon: Math.round(lon * 1000) / 1000, lat: Math.round(lat * 1000) / 1000, dist: Math.round(dist), inside: dist === 0, near: dist <= tol };
}

export function legalActions(st, seat) {
  if (st.phase === "over" || seat !== st.turn) return [];
  if (st.phase === "reveal") return [{ type: "next" }];
  const q = question(st);
  const skip = { type: "answer", skip: true };
  if (q.t === "cont") return [...CONTINENTS.map((c) => ({ type: "answer", pick: c.id })), skip];
  if (q.t === "pin") return [skip];
  return [...(q.opts || Object.keys(BY_CODE)).map((pick) => ({ type: "answer", pick })), skip];
}

export function apply(st, seat, action) {
  if (st.phase === "over") throw new Error("La partida ya terminó.");
  if (seat !== st.turn) throw new Error("No es tu turno.");
  if (!action || typeof action !== "object") throw new Error("Jugada no válida.");
  if (action.type === "next") {
    if (st.phase !== "reveal") throw new Error("Primero responde la pregunta.");
    const i = st.i + 1;
    if (i >= st.questions.length) return { ...st, phase: "over", seq: st.seq + 1 };
    return { ...st, i, turn: i % st.n, phase: "play", seq: st.seq + 1 };
  }
  if (action.type !== "answer") throw new Error("Jugada no válida.");
  if (st.phase !== "play") throw new Error("Toca «Siguiente» para seguir.");
  const q = question(st), j = judge(st, q, action);
  const hint = !!action.hint && !j.skipped && !j.timeout;
  const base = hint ? Math.round(j.base * POINTS.hintFactor) : j.base;
  const streak = j.ok ? st.streaks[seat] + 1 : 0;
  const streakBonus = j.ok && streak >= 2 ? Math.min(POINTS.streakMax, (streak - 1) * POINTS.streakStep) : 0;
  const lim = LIMITS_MS[q.t];
  const speedBonus = j.ok && st.config.timer && Number.isFinite(action.ms) ? Math.round(POINTS.speedMax * clamp(1 - action.ms / lim, 0, 1)) : 0;
  const gain = base + streakBonus + speedBonus;
  const set = (arr, v) => arr.map((x, k) => (k === seat ? v : x));
  const last = { i: st.i, seat, t: q.t, code: q.code, ok: j.ok, base, streak, streakBonus, speedBonus, gain, hint, pick: j.pick, skipped: !!j.skipped, timeout: !!j.timeout };
  if (q.t === "pin") Object.assign(last, { lon: j.lon ?? null, lat: j.lat ?? null, dist: j.dist ?? null, inside: !!j.inside, near: !!j.near });
  return {
    ...st, phase: "reveal", seq: st.seq + 1,
    scores: set(st.scores, st.scores[seat] + gain), streaks: set(st.streaks, streak),
    best: set(st.best, Math.max(st.best[seat], streak)), hits: set(st.hits, st.hits[seat] + (j.ok ? 1 : 0)),
    log: [...st.log, { i: st.i, seat, t: q.t, code: q.code, ok: j.ok, gain, pick: j.pick, dist: j.dist ?? null }],
    last,
  };
}

export const view = (st) => st; // no hay nada oculto
export const isOver = (st) => st.phase === "over";
export const currentSeats = (st) => (st.phase === "over" ? [] : [st.turn]);

export function result(st) {
  const top = Math.max(...st.scores), champions = st.scores.map((s, i) => (s === top ? i : -1)).filter((i) => i >= 0);
  const per = st.config.rounds;
  return {
    scores: st.scores.slice(), hits: st.hits.slice(), asked: Array(st.n).fill(per), best: st.best.slice(),
    winner: champions.length === 1 ? champions[0] : null, draw: champions.length > 1, champions,
    accuracy: st.hits.map((h) => (per ? h / per : 0)),
  };
}

export const timing = {
  turnMs: (st) => (st.phase === "play" && st.config.timer !== false ? limitMs(st) : null),
  autoAction: (st) => (st.phase === "play" ? { type: "answer", timeout: true } : { type: "next" }),
};

// ───────── Pista (con la vista pública: no revela la respuesta, solo la región). Usarla reduce los puntos a la mitad.
export function advise(v) {
  const q = question(v);
  if (!q || v.phase !== "play") return { action: null, why: "" };
  const c = BY_CODE[q.code], cont = CONTINENT_BY_ID[c.cont], reg = subregionName(q.code);
  if (q.t === "cont") return { action: null, why: "Esta pregunta no tiene pista: ¡tú puedes!" };
  const letters = c.name.length;
  const why = q.t === "pin" ? `Pista: está en ${reg || cont.name}. (Vale la mitad)`
    : `Pista: está en ${cont.name}${reg ? `, en ${reg}` : ""}; su nombre empieza con «${c.name[0]}» y tiene ${letters} letras. (Vale la mitad)`;
  return { action: null, why, hint: true, region: c.sub, continent: c.cont };
}

export { RANK };
