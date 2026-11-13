// Dados en 3D con CSS para cualquier juego: la bandeja (paño + repisa) con el tiro animado, agitar en la mano,
// apartar, destellos; el dibujo de un dado; y sus sonidos.
export { createTray } from "./ui/tray.js";
export { dieHTML, pipFace, miniDie, cubeTransform } from "./ui/dice.js";
export { createDiceSounds } from "./ui/sound.js";
export const DICE_STYLES = new URL("./ui/dice.css", import.meta.url).href;

// El botón de tirar: un toque tira; apretado, los dados se sacuden en la mano hasta soltarlo. press() cuando empieza a
// sacudir (si canRoll()), release(fuerza) al soltar (más fuerza cuanto más tiempo), cancel() si se pierde el toque, y
// tap() para el teclado (Enter o espacio sobre el botón).
export function wireRollButton(btn, { canRoll, press, release, cancel, tap }) {
  let p = null, used = false;
  btn.onpointerdown = (e) => {
    if (!canRoll() || e.button > 0) return;
    p = { t: performance.now() };
    try { btn.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    press();
  };
  const end = (go) => () => {
    if (!p) return;
    const ms = performance.now() - p.t;
    p = null; used = true;
    if (go) release(Math.min(1, 0.35 + ms / 1800)); else cancel();
  };
  btn.onpointerup = end(true);
  btn.onpointercancel = end(false);
  btn.onclick = () => { if (used) { used = false; return; } tap(); };
}
