// Las animaciones de la pista: que se vea qué perro salió del tazón, cuánto corrió y por dónde, y la salida al empezar.
//
// La mesa se redibuja completa en cada cambio (incluso a media animación: el reloj, otro teléfono), así que una
// animación no vive en el DOM sino en `ui.fx`: { kind, seq, start, ms, … }. En cada dibujo, `paintFx` vuelve a crear
// las piezas animadas y las adelanta a donde iban (Web Animations con currentTime, o animation-delay negativo en CSS).
// Al terminar, un temporizador pide redibujar sin la animación.
//
// Tiempos: los de engine/ (SHOW), para que la compu espere lo mismo que dura la animación (bots.thinkMs).
import { SHOW, showMs, rollSteps, positions, RULES } from "../engine/index.js";
import { dogViews } from "./art.js";
import { facingAt, facingStep } from "./facing.js";

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const now = () => performance.now();

// Tiempos de la salida: cada perro entra a su casilla, uno tras otro
const INTRO = { gap: 420, run: 650 };
const introMs = (n) => n * INTRO.gap + INTRO.run + 300;

// Decide si hay que empezar una animación con este dibujo. first: es el primer dibujo de la mesa (al abrirla no se
// repite la última tirada, salvo la salida de una partida que apenas empieza).
export function startFx(ui, st, { first, refresh }) {
  if (reduced()) { ui.fx = null; return; }
  let fx = null;
  const start = (st.hist || [])[0];
  if (first && st.seq === 0 && start && start.kind === "start" && start.start) {
    fx = { kind: "intro", seq: st.seq, start: now(), ms: introMs(start.start.length), order: start.start };
  } else if (!first && st.last && st.last.kind === "roll") {
    fx = { kind: "roll", seq: st.seq, start: now(), ms: showMs(st.last), last: st.last };
  }
  if (!fx) return;
  ui.fx = fx;
  (ui.fxTimers || []).forEach(clearTimeout);
  const mine = () => ui.fx && ui.fx.seq === fx.seq && ui.fx.kind === fx.kind;
  // Redibujar cuando sale el dado (el estado cambia de "Sacudiendo…" a "¡Corre!") y al terminar
  const marks = fx.kind === "roll" ? [SHOW.reveal * 0.55, SHOW.reveal] : [];
  ui.fxTimers = [
    ...marks.map((ms) => setTimeout(() => { if (mine()) refresh(); }, ms)),
    setTimeout(() => { if (mine()) { ui.fx = null; refresh(); } }, fx.ms),
  ];
}

// Al desmontar la mesa
export function stopFx(ui) { (ui.fxTimers || []).forEach(clearTimeout); ui.fx = null; }

// ¿Sigue la animación? (si la mesa cambió de jugada, la anterior ya no importa)
export function activeFx(ui, st) {
  const fx = ui.fx;
  if (!fx) return null;
  if (fx.seq !== st.seq || now() - fx.start >= fx.ms) { ui.fx = null; return null; }
  return fx;
}

export const elapsed = (fx) => now() - fx.start;

// Perros que todavía no deben verse en su casilla final (van corriendo en la animación)
export function hiddenDogs(fx) {
  if (!fx) return new Set();
  if (fx.kind === "roll") return new Set([fx.last.dog, ...fx.last.carried]);
  const t = elapsed(fx);
  return new Set(fx.order.filter((_, i) => t < i * INTRO.gap + INTRO.run).map((o) => o.dog));
}

// Lo que dice el estado mientras corre la animación
export function fxStatus(fx, dogName) {
  if (fx.kind === "intro") return "¡Salida! Cada perro tira para su lugar de arranque";
  const t = elapsed(fx), l = fx.last;
  if (t < SHOW.reveal) return "Sacudiendo el tazón…";
  return `¡${dogName(l.dog)} corre ${l.n}!`;
}

// ¿Ya salió el dado? (antes de eso, el dado que salió sigue escondido en el tazón)
export const revealed = (fx) => fx.kind !== "roll" || elapsed(fx) >= SHOW.reveal * 0.55;

// Centro de abajo de una casilla, relativo a la pista; más allá de la meta, en la casilla 1 (la de la meta)
function spot(board, space) {
  const s = space > RULES.track ? 1 : Math.max(1, space);
  const el = board.querySelector(`.cell[data-space="${s}"]`);
  if (!el) return null;
  return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight, w: el.offsetWidth, h: el.offsetHeight };
}

// Dibuja las piezas de la animación dentro de la pista y las adelanta al momento en que van
export function paintFx(board, fx, st) {
  if (!fx || !board) return;
  const layer = document.createElement("div");
  layer.className = "fxlayer";
  board.appendChild(layer);
  if (fx.kind === "roll") paintRoll(layer, board, fx, st);
  else paintIntro(layer, board, fx, st);
}

// Una pila de perros que corre: dentro, los perros se acomodan como en una casilla del tamaño de las de la pista
function runner(dogs, cell) {
  const el = document.createElement("div");
  el.className = "runner";
  el.style.setProperty("--cw", `${cell.w}px`);
  el.style.setProperty("--chh", `${cell.h}px`);
  el.innerHTML = `<div class="rflip">${dogs.map((d, i) => `<span class="rider" style="--lvl:${i}">${dogViews(d)}</span>`).join("")}</div>`;
  return el;
}

// El perro (con los de encima) avanza casilla por casilla dando brinquitos; el hueso lo empuja una más y la aspiradora
// lo regresa una
function paintRoll(layer, board, fx, st) {
  const l = fx.last;
  const unit = [l.dog, ...l.carried];
  const moving = new Set(unit);
  const path = [];
  const end = Math.min(l.landed, RULES.track + 1);
  for (let s = l.from; s <= end; s++) path.push(s);
  if (l.tile) path.push(l.tile.kind === "hueso" ? l.landed + 1 : l.landed - 1);
  const pos = positions(st.spaces);
  const final = pos[l.dog];
  const pts = path.map((s, i) => {
    const p = spot(board, s);
    if (!p) return null;
    // A qué altura queda: al salir, donde estaba; de paso, encima de los que haya; al llegar, donde quedó
    let lvl;
    if (i === 0) lvl = l.fromLevel || 0;
    else if (i === path.length - 1) lvl = final && final.space <= RULES.track ? final.level : 0;
    else lvl = s > RULES.track ? 0 : st.spaces[s].filter((d) => !moving.has(d)).length;
    return { ...p, y: p.y - lvl * p.h * 0.23 };
  });
  if (pts.some((p) => !p)) return;
  const el = runner(unit, pts[0]);
  layer.appendChild(el);
  const steps = rollSteps(l);
  const frames = [], flips = [];
  const faces = path.map((s, i) => (i === 0 ? facingAt(s) : facingStep(path[i - 1], s)));
  const views = { side: [], up: [], down: [] };
  pts.forEach((p, i) => {
    const off = steps ? i / steps : 1;
    if (i > 0) {
      const a = pts[i - 1];
      frames.push({ offset: (i - 0.5) / steps, transform: `translate(${(a.x + p.x) / 2}px, ${Math.min(a.y, p.y) - p.h * 0.32}px)` });
    }
    frames.push({ offset: Math.min(1, off), transform: `translate(${p.x}px, ${p.y}px)` });
    // Mira hacia donde corre: a la izquierda en espejo; arriba y abajo con su vista de espaldas o de frente
    const f = faces[i], at = Math.min(1, off);
    flips.push({ offset: at, transform: `scaleX(${f === "left" ? -1 : 1})`, easing: "step-end" });
    for (const v in views) views[v].push({ offset: at, opacity: (v === "side" ? f === "left" || f === "right" : f === v) ? 1 : 0, easing: "step-end" });
  });
  const dur = steps * SHOW.step;
  const opts = { duration: Math.max(1, dur), delay: SHOW.reveal, fill: "both", easing: "linear" };
  const t = elapsed(fx);
  const anims = [el.animate(frames, opts), el.firstElementChild.animate(flips, opts)];
  // Si un perro no tiene vista de frente o de espaldas, se queda con la de lado
  el.querySelectorAll(".rider").forEach((r) => {
    const has = (v) => !!r.querySelector(`.view-${v}`);
    for (const v of ["up", "down"]) if (has(v)) anims.push(r.querySelector(`.view-${v}`).animate(views[v], opts));
    const side = r.querySelector(".view-side");
    if (side) anims.push(side.animate(views.side.map((k, i) => ({ ...k, opacity: k.opacity || (has(faces[i]) ? 0 : 1) })), opts));
  });
  for (const a of anims) a.currentTime = t;
}

// La salida: cada perro entra corriendo desde antes de la casilla 1 hasta su lugar, uno tras otro
function paintIntro(layer, board, fx, st) {
  const pos = positions(st.spaces);
  const t = elapsed(fx);
  fx.order.forEach((o, i) => {
    const begin = i * INTRO.gap;
    if (t >= begin + INTRO.run) return; // ya llegó: se ve en su casilla
    const p0 = spot(board, 1), p1 = spot(board, o.n);
    const fin = pos[o.dog];
    if (!p0 || !p1 || !fin) return;
    const y1 = p1.y - fin.level * p1.h * 0.23;
    const el = runner([o.dog], p1);
    layer.appendChild(el);
    const x0 = p0.x - p0.h * 0.9;
    const a = el.animate([
      { offset: 0, transform: `translate(${x0}px, ${p0.y}px)`, opacity: 0 },
      { offset: 0.2, opacity: 1 },
      { offset: 0.6, transform: `translate(${(x0 + p1.x) / 2 + p1.h * 0.4}px, ${Math.min(p0.y, y1) - p1.h * 0.35}px)` },
      { offset: 1, transform: `translate(${p1.x}px, ${y1}px)`, opacity: 1 },
    ], { duration: INTRO.run, delay: begin, fill: "both", easing: "ease-out" });
    a.currentTime = t;
  });
}

