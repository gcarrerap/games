// La tele como tablero (docs/ARCHITECTURE.md §5, "La tele"). Un aparato sin asiento abre la mesa en línea con
// #/<juego>/<CÓDIGO>/tele y muestra la mesa para que todos la vean; cada quien juega desde su teléfono.
//
// Aquí está lo que la plataforma pone para cualquier juego que la admite (game.tv): la pantalla de espera mientras
// la gente se sienta, mantener la pantalla encendida, pantalla completa y el aviso de cómo abrir la tele. La mesa
// durante la partida la dibuja cada juego con ctx.display === "tv".
import { $, esc } from "./dom.js";

export const tvLink = (gameId, code) => `${location.origin}${location.pathname}#/${gameId}/${code}/tele`;
export const siteLink = () => `${location.origin}${location.pathname}`;

// Cómo se abre la tele, para los teléfonos de una mesa con tele
export const tvHowTo = (game, code) =>
  `En la tele abre <b>${esc(siteLink().replace(/^https?:\/\//, ""))}</b>, entra a ${esc(game.name)} y toca <b>Tele</b> en la mesa <b>${esc(code)}</b>.`;

// Mientras se sientan: el código grande, quién ya está y cómo entrar desde el teléfono. Nadie toca la tele.
export function renderTvSeats(app, { state }) {
  const t = state.table, game = state.game;
  const seats = t.seats.map((x, i) => `<li class="${x ? "taken" : ""}"><span class="tvseatn">${i + 1}</span>${x ? `<b>${esc(x.name)}</b>${x.bot ? ` <small>compu</small>` : ""}` : `<i>libre</i>`}</li>`).join("");
  const missing = t.seats.filter((x) => !x).length;
  app.className = "tvwait";
  app.innerHTML = `
    <div class="tvhead"><h1>${esc(game.name)}</h1>${fullscreenButton()}</div>
    <div class="tvcode"><small>Mesa</small><b>${esc(t.code)}</b></div>
    <p class="tvjoin">En tu teléfono abre <b>${esc(siteLink().replace(/^https?:\/\//, ""))}</b>, entra a ${esc(game.name)} y siéntate en la mesa <b>${esc(t.code)}</b>.</p>
    <ul class="tvseats">${seats}</ul>
    <p class="tvhint">${missing ? `Falta${missing === 1 ? "" : "n"} ${missing}. Los asientos libres se pueden llenar con la compu desde un teléfono.` : "Todos sentados. Empiecen desde cualquier teléfono."}</p>
    <p class="err" role="alert">${esc(state.err)}</p>`;
  wireFullscreen(app);
}

// Botón de pantalla completa (el navegador solo deja entrar con un toque)
export function fullscreenButton() {
  if (!document.fullscreenEnabled || document.fullscreenElement) return "";
  return `<button class="ghost tvfull" data-tvfull="1">Pantalla completa</button>`;
}
export function wireFullscreen(root) {
  root.querySelectorAll("[data-tvfull]").forEach((b) => b.onclick = () => document.documentElement.requestFullscreen?.().catch(() => {}));
}

// Que la tele no se apague ni ponga el protector de pantalla mientras está abierta la mesa
let lock = null, wanted = false;
async function acquire() {
  if (!wanted || lock || !navigator.wakeLock || document.visibilityState !== "visible") return;
  try { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); } catch { lock = null; }
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (wanted) acquire(); });
export function keepAwake(on) {
  if (on === wanted) return;
  wanted = on;
  if (on) acquire();
  else if (lock) { lock.release().catch(() => {}); lock = null; }
}

// En la tele todo crece (se ve desde el sillón). Los juegos ajustan lo suyo bajo html.tv.
export function markTv(on) {
  document.documentElement.classList.toggle("tv", !!on);
  const fs = $("[data-tvfull]");
  if (fs && document.fullscreenElement) fs.remove();
}
