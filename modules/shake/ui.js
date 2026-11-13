// Escuchar el acelerómetro del aparato (DeviceMotion) y pasarlo por el detector de index.js.
//
// En iPhone hay que pedir permiso con un toque (DeviceMotionEvent.requestPermission) y solo funciona con https. En
// Android y las demás no se pide. En una computadora el evento puede existir pero nunca llegar: `listenShake` dice si
// ya llegó alguna lectura (`alive`).
import { createShakeDetector } from "./index.js";

const DME = () => globalThis.DeviceMotionEvent;

// Si el navegador conoce el acelerómetro (no garantiza que el aparato tenga uno)
export const shakeSupported = () => typeof DME() !== "undefined" && typeof globalThis.addEventListener === "function";
// Si hay que pedir permiso con un toque (iPhone/iPad)
export const needsPermission = () => shakeSupported() && typeof DME().requestPermission === "function";

// Pide permiso (llamar dentro del manejador de un toque). → Promise<boolean>
export function requestShake() {
  if (!shakeSupported()) return Promise.resolve(false);
  if (!needsPermission()) return Promise.resolve(true);
  // Safari dice "granted" o "denied"; Chrome puede decir "prompt" si todavía no decide: ahí se escucha igual y las
  // lecturas dirán si llegan (alive).
  try { return Promise.resolve(DME().requestPermission()).then((r) => r !== "denied", () => false); }
  catch { return Promise.resolve(false); }
}

// Empieza a escuchar. onEvent recibe los eventos del detector ({ type: "start" | "shake" | "end", … }).
// Devuelve { stop(), get alive(), reset() }.
export function listenShake(onEvent, opts = {}) {
  const det = createShakeDetector(opts);
  let alive = false;
  const now = () => (globalThis.performance ? globalThis.performance.now() : 0);
  function handler(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x === null) return;
    alive = true;
    const ev = det.feed({ x: a.x || 0, y: a.y || 0, z: a.z || 0, t: e.timeStamp || now() });
    if (ev) onEvent(ev);
  }
  if (shakeSupported()) globalThis.addEventListener("devicemotion", handler);
  return {
    get alive() { return alive; },
    reset: () => det.reset(),
    stop() { if (shakeSupported()) globalThis.removeEventListener("devicemotion", handler); },
  };
}
