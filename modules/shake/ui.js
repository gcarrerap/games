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

const coarse = () => !!(globalThis.matchMedia && globalThis.matchMedia("(pointer: coarse)").matches);

// El control completo para un juego: si se puede (teléfono o tableta con acelerómetro), si está encendido (se recuerda
// en prefs bajo `key`), pedir el permiso con el primer toque en `root` cuando hace falta (iPhone, y Chrome nuevo), y
// convertir los eventos del detector en un gesto: onStart() cuando empieza a agitar y canStart() lo deja, onPower(p)
// mientras sigue, y al parar onThrow(fuerza) si duró lo suficiente u onCancel() si no. onChange() avisa que cambió algo
// que se dibuja (encendido, primera lectura, permiso negado).
export function createShakeControl({ root, prefs, key = "shake", enabled = true, canStart, onStart, onPower = () => {}, onThrow, onCancel = () => {}, onChange = () => {} }) {
  const available = enabled && shakeSupported() && coarse();
  let on = false, listener = null, denied = false, active = false, ask = null;

  function handle(ev) {
    if (!on) return;
    if (ev.type === "start") { if (canStart()) { active = true; onStart(); } }
    else if (ev.type === "shake") { if (active) onPower(ev.power); }
    else if (ev.type === "end" && active) { active = false; if (ev.throw) onThrow(Math.max(0.4, ev.power)); else onCancel(); }
  }
  function listen() {
    if (listener) return;
    listener = listenShake(handle);
    // Cuando llega la primera lectura, el juego puede mostrar "o agita el teléfono"
    setTimeout(() => listener && listener.alive && onChange(), 1200);
  }
  function stop() { if (listener) { listener.stop(); listener = null; } active = false; }
  function enable(remember) {
    return requestShake().then((ok) => {
      if (!ok) { denied = true; if (remember) prefs.set(key, "0"); onChange(); return false; }
      on = true; prefs.set(key, "1"); listen(); onChange(); return true;
    });
  }
  const dropAsk = () => { if (ask && root) root.removeEventListener("click", ask, true); ask = null; };

  if (available && prefs.get(key) !== "0") {
    if (!needsPermission()) { on = true; listen(); }
    else if (root) {
      // El permiso solo se puede pedir dentro de un toque: el primero en la mesa. Si lo niegan, no se vuelve a preguntar.
      ask = () => { dropAsk(); if (!on) enable(true); };
      root.addEventListener("click", ask, true);
    }
  }
  return {
    get available() { return available; },
    get on() { return on; },
    get alive() { return !!(listener && listener.alive); },
    get denied() { return denied; },
    get active() { return active; },
    toggle() {
      if (on) { on = false; prefs.set(key, "0"); stop(); onChange(); return Promise.resolve(false); }
      dropAsk();
      return enable(false);
    },
    destroy() { dropAsk(); stop(); },
  };
}
