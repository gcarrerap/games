// Modos del aparato en la mesa (docs/ARCHITECTURE.md §5, "Modos del aparato"): Teléfono, Control y Monitor.
//
// - modeMenu(ctx) / wireModeMenu(root, ctx): el bloque que cada juego pone en su menú de la partida, para cambiar
//   de modo sin salir a la mesa. En práctica (un solo modo) no dibuja nada.
// - renderModeBar(app$): el aviso de la plataforma cuando alguien sentado está en Monitor y le toca tirar.
import { esc } from "./dom.js";
import { overlay, closeOverlay } from "./sheet.js";

export const MODE_INFO = {
  mobile: { icon: "📱", label: "Teléfono", hint: "Ves el tablero y juegas lo tuyo." },
  remote: { icon: "🎮", label: "Control", hint: "Solo lo tuyo para jugar; el tablero se ve en el monitor." },
  monitor: { icon: "📺", label: "Monitor", hint: "Ves el tablero y las jugadas de todos. No puedes tirar." },
};

// Control en un juego sin dibujo de control (game.remote): se juega igual que en Teléfono
const hintOf = (ctx, m) => (m === "remote" && !(ctx.game && ctx.game.remote) ? "Juegas lo tuyo; en este juego también ves el tablero." : MODE_INFO[m].hint);

export function modeMenu(ctx) {
  if (!ctx || !ctx.setMode || ctx.practice || !(ctx.modes || []).length) return "";
  const modes = ctx.modes;
  const only = modes.length === 1;
  return `<section class="modepick" aria-label="Modo de este aparato">
    <h4 class="fh">Este aparato</h4>
    <div class="seg col" role="group" aria-label="Modo">${["mobile", "remote", "monitor"].map((m) => {
      const can = modes.includes(m), on = ctx.mode === m;
      return `<button data-devmode="${m}" aria-pressed="${on}" ${can ? "" : "disabled"}>${MODE_INFO[m].icon} ${MODE_INFO[m].label}<small>${esc(can ? hintOf(ctx, m) : "Siéntate en la mesa para usarlo.")}</small></button>`;
    }).join("")}</div>
    ${only ? `<p class="hint">Sin asiento solo puedes mirar.</p>` : ""}
  </section>`;
}

export function wireModeMenu(root, ctx) {
  if (!root || !ctx || !ctx.setMode) return;
  root.querySelectorAll("[data-devmode]").forEach((b) => b.onclick = () => {
    if (b.disabled) return;
    // Escoger cierra el menú: lo siguiente es ver la mesa en el modo nuevo
    closeOverlay();
    if (b.dataset.devmode !== ctx.mode) switchMode(ctx.setMode, b.dataset.devmode);
  });
}

// Cambiar de modo. Si la dirección dice .../tele (que abre en Monitor) y se escoge otro, se quita para que al
// recargar no regrese a Monitor.
export function switchMode(setMode, m) {
  if (typeof location !== "undefined" && m !== "monitor" && /\/tele$/.test(location.hash)) {
    history.replaceState(null, "", location.hash.replace(/\/tele$/, ""));
  }
  setMode(m);
}

// Aviso fuera de la mesa del juego: estás sentado, en Monitor, y te toca
let bar = null;
export function renderModeBar({ state, actions }) {
  const t = state.table, game = state.game;
  const seat = state.screen === "table" && t && !state.practice ? actions.seatedAt() : -1;
  // Con una ventana abierta (el menú, un resultado) no se encima
  const show = !overlay() && seat >= 0 && t.status === "playing" && actions.mode() === "monitor" && game && game.currentSeats(t.state).includes(seat);
  if (!show) { if (bar) { bar.remove(); bar = null; } return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "modebar"; bar.setAttribute("role", "alert");
    document.body.appendChild(bar);
  }
  const can = actions.modes().filter((m) => m !== "monitor");
  const html = `<span>Te toca. Estás en Monitor: cambia de modo para tirar.</span>
    ${can.map((m) => `<button data-barmode="${m}">${MODE_INFO[m].icon} ${MODE_INFO[m].label}</button>`).join("")}`;
  if (bar.dataset.html !== html) {
    bar.innerHTML = html; bar.dataset.html = html;
    bar.querySelectorAll("[data-barmode]").forEach((b) => b.onclick = () => switchMode((m) => actions.setMode(m), b.dataset.barmode));
  }
}
