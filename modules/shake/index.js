// Detectar que alguien agita el aparato, a partir de lecturas del acelerómetro. Puro: recibe las lecturas con su hora
// y dice qué pasa; no toca el DOM ni los sensores (eso es ui.js).
//
// Cómo decide: de cada lectura con gravedad ({ x, y, z } en m/s²) se quita la gravedad con un filtro paso alto
// sencillo (lo que cambia rápido es la mano; lo lento, la gravedad). Si lo que queda pasa de `threshold`, el aparato se
// está sacudiendo. Empieza a contar como agitado tras `startHits` sacudidas dentro de `windowMs`; termina cuando pasan
// `quietMs` sin sacudidas. Al terminar avisa si duró lo suficiente (`minMs`) para valer como un tiro, con la
// "fuerza" (energía promedio, de 0 a 1) para que el juego lo dibuje más o menos violento.
export const DEFAULTS = {
  threshold: 11, // m/s² sin gravedad para contar una sacudida
  startHits: 3, // sacudidas seguidas para decir que empezó
  windowMs: 450, // en cuánto tiempo deben llegar esas sacudidas
  quietMs: 320, // sin sacudidas este tiempo: terminó
  minMs: 350, // lo mínimo agitando para que cuente como tiro
  alpha: 0.8, // filtro de gravedad (0–1; más alto, más lento)
  maxEnergy: 30, // m/s² que se toman como fuerza 1
};

// Crea un detector. feed(lectura) → null o un evento:
//   { type: "start" }                      empezó a agitar
//   { type: "shake", power }               sigue agitando (power de esta lectura, 0–1)
//   { type: "end", throw: bool, ms, power } dejó de agitar (throw: duró lo suficiente para tirar)
export function createShakeDetector(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  let g = null, hits = [], shaking = false, since = 0, lastHit = 0, energy = 0, samples = 0;
  const reset = () => { hits = []; shaking = false; energy = 0; samples = 0; };
  return {
    get shaking() { return shaking; },
    reset,
    feed({ x = 0, y = 0, z = 0, t }) {
      if (!g) { g = { x, y, z }; return null; }
      g = { x: o.alpha * g.x + (1 - o.alpha) * x, y: o.alpha * g.y + (1 - o.alpha) * y, z: o.alpha * g.z + (1 - o.alpha) * z };
      const mag = Math.hypot(x - g.x, y - g.y, z - g.z);
      const hit = mag >= o.threshold;
      if (hit) { lastHit = t; hits.push(t); hits = hits.filter((h) => t - h <= o.windowMs); }
      if (!shaking) {
        if (hit && hits.length >= o.startHits) { shaking = true; since = hits[0]; energy = mag; samples = 1; return { type: "start" }; }
        return null;
      }
      if (t - lastHit >= o.quietMs) {
        const ms = lastHit - since, power = Math.min(1, energy / samples / o.maxEnergy);
        reset();
        return { type: "end", throw: ms >= o.minMs, ms, power };
      }
      energy += mag; samples++;
      return { type: "shake", power: Math.min(1, mag / o.maxEnergy) };
    },
  };
}
