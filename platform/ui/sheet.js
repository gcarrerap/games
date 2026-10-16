// Ventanas que suben desde abajo y menús (heredado de myDomino #20), para cualquier pantalla y cualquier juego.
// Lo que está abierto vive aquí: { id, data } o null. Abrir agrega una entrada al historial del navegador, así el
// botón "atrás" del teléfono cierra la ventana en lugar de salir del sitio. Abrir una cierra la anterior.
import { esc } from "./dom.js";

let current = null;
let onChange = () => {};
// Quién redibuja cuando se abre o se cierra algo (platform/main.js)
export function setOverlayListener(fn) { onChange = fn; }
export const overlay = () => current;
export const isOpen = (id) => !!current && current.id === id;

// history.back() no es inmediato: mientras llega "popstate" no se vuelve a llamar (dos seguidos sacaban del sitio)
let backing = false;
const inOverlayEntry = () => !!(history.state && history.state.overlay);

export function openOverlay(id, data = {}) {
  if (!backing) { if (inOverlayEntry()) history.replaceState({ overlay: true }, ""); else history.pushState({ overlay: true }, ""); }
  current = { id, data };
  onChange();
}
// Cambia los datos de lo abierto sin tocar el historial (por ejemplo, la ficha seleccionada en un registro)
export function updateOverlay(patch) { if (current) { current = { ...current, data: { ...current.data, ...patch } }; onChange(); } }
export function closeOverlay() { if (!current) return; current = null; onChange(); }

// Después de cada dibujo: el historial sigue a lo abierto
export function syncOverlayHistory() {
  if (backing) return;
  const entry = inOverlayEntry();
  if (current && !entry) history.pushState({ overlay: true }, "");
  else if (!current && entry) { backing = true; history.back(); }
}
export function installOverlayKeys() {
  window.addEventListener("popstate", () => {
    if (backing) { backing = false; syncOverlayHistory(); return; } // fue nuestro history.back(): solo reconciliar
    if (current) { current = null; onChange(); } // el usuario tocó "atrás": cerrar
  });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) closeOverlay(); });
}

export const closeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>`;

// Dibuja una ventana que sube desde abajo dentro de `host` (normalmente #modal). Anima solo al abrirse; al volver a
// dibujar la misma ventana conserva el scroll y las secciones abiertas.
export function renderSheet(host, id, title, body, { closable = true } = {}) {
  const prev = host.querySelector(".sheet");
  const anim = !(prev && prev.dataset.sheet === id);
  const scroll = anim ? 0 : prev.scrollTop;
  const opened = anim ? [] : [...host.querySelectorAll(".sheet details")].map((d) => d.open);
  host.innerHTML = `<div class="sheet-bg ${anim ? "anim" : ""}" id="sheetbg">
    <section class="sheet ${anim ? "anim" : ""}" tabindex="-1" data-sheet="${esc(id)}" role="dialog" aria-modal="true" aria-labelledby="sheettitle">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-head"><h3 id="sheettitle">${esc(title)}</h3>${closable ? `<button class="iconbtn" id="sheetclose" aria-label="Cerrar">${closeIcon}</button>` : ""}</div>
      ${body}
    </section></div>`;
  const sheet = host.querySelector(".sheet");
  sheet.querySelectorAll("details").forEach((d, i) => { if (opened[i] !== undefined) d.open = opened[i]; });
  sheet.scrollTop = scroll;
  if (closable) {
    host.querySelector("#sheetclose").onclick = closeOverlay;
    host.querySelector("#sheetbg").onclick = (e) => { if (e.target.id === "sheetbg") closeOverlay(); };
  }
  if (anim) (host.querySelector("#sheetclose") || sheet).focus({ preventScroll: true });
  return sheet;
}
