// La portada al empezar una partida (#56): la ilustración de Petra a pantalla completa unos segundos y después el
// tablero con la salida de los perros. Un toque en cualquier parte la quita (y, de paso, arranca la música: ese toque
// lo escucha también modules/music en el documento).
//
// La mesa se redibuja completa en cada cambio, así que la portada es un solo elemento que se crea una vez y se vuelve
// a poner al final de la mesa en cada dibujo (`paintCover`): no se reinicia ni parpadea. Su estado vive en `ui.cover`:
// { phase: "loading" | "show" | "out", el, timers }. Mientras exista, la mesa no deja jugar ni abre ventanas.
//
// Si la imagen no está en el banco o tarda más de COVER_WAIT_MS en cargar, no hay portada: se va directo al tablero.
import { COVER_MS, COVER_WAIT_MS } from "../timing.js";
import { href } from "./art.js";

const FADE_MS = 350;
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ¿Hay que mostrar la portada con este dibujo? Solo al empezar una partida nueva: el primer dibujo de una partida que
// nadie ha movido (seq 0), o una revancha (otra ronda en la misma mesa). Al reabrir una mesa a medias, no.
//   first: es el primer dibujo de la mesa · seq: st.seq · round / seenRound: la ronda de la mesa ahora y la última vista
export function coverWanted({ first, seq, round, seenRound }) {
  if (seq !== 0) return false;
  return first || round !== seenRound;
}

// La imagen que toca: en la tele la de alta; en el teléfono y la mesa de siempre, la chica
export const coverKey = (display) => (display === "tv" ? "portada@tv" : "portada");

// Empieza la portada: precarga la imagen y solo la muestra si cargó a tiempo. done() se llama una vez, cuando se
// quita (o si nunca se mostró), para que la mesa siga con la salida de los perros.
export function startCover(ui, display, done) {
  stopCover(ui);
  const src = href(coverKey(display));
  if (!src || typeof Image !== "function") { done(); return; }
  const cover = { phase: "loading", el: null, timers: [], done };
  ui.cover = cover;
  const mine = () => ui.cover === cover;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => { if (mine() && cover.phase === "loading") show(ui, cover, src); };
  img.onerror = () => { if (mine()) endCover(ui); };
  img.src = src;
  cover.timers.push(setTimeout(() => { if (mine() && cover.phase === "loading") endCover(ui); }, COVER_WAIT_MS));
}

function show(ui, cover, src) {
  const el = document.createElement("div");
  el.className = `cover-screen ${reduced() ? "still" : ""}`;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Portada de la Carrera de Chihuahuas. Toca para empezar");
  el.tabIndex = 0;
  el.innerHTML = `<img src="${src.replace(/"/g, "&quot;")}" alt="" draggable="false"><span class="cover-hint">Toca para empezar</span>`;
  el.addEventListener("click", () => endCover(ui));
  el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); endCover(ui); } });
  cover.el = el;
  cover.phase = "show";
  if (ui.el) ui.el.appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  const fade = reduced() ? 0 : FADE_MS;
  cover.timers.push(setTimeout(() => { if (ui.cover === cover) endCover(ui); }, COVER_MS - fade));
}

// Quita la portada (con su salida suave) y avisa a la mesa
export function endCover(ui) {
  const cover = ui.cover;
  if (!cover || cover.phase === "out") return;
  cover.timers.forEach(clearTimeout);
  cover.phase = "out";
  ui.cover = null;
  const el = cover.el;
  if (el) {
    el.classList.remove("in");
    el.style.pointerEvents = "none";
    ui.coverOut = el; // mientras se desvanece, la mesa se redibuja debajo: paintCover la vuelve a poner
    setTimeout(() => { el.remove(); if (ui.coverOut === el) ui.coverOut = null; }, reduced() ? 0 : FADE_MS);
  }
  cover.done();
}

// Vuelve a poner la portada encima de la mesa recién dibujada (el mismo elemento, sin reiniciarla)
export function paintCover(app, ui) {
  for (const el of [ui.coverOut, ui.cover && ui.cover.el]) if (el && el.parentNode !== app) app.appendChild(el);
}

// Al desmontar la mesa: sin avisar a nadie
export function stopCover(ui) {
  if (ui.coverOut) { ui.coverOut.remove(); ui.coverOut = null; }
  const cover = ui.cover;
  if (!cover) return;
  cover.timers.forEach(clearTimeout);
  if (cover.el) cover.el.remove();
  ui.cover = null;
}
