// La compu de Geografía. Solo usa la vista (que no esconde nada: todo lo del mapa es público); lo que la hace
// «tonta» o «sabia» es cuánto sabe de cada país, que depende de su estilo y de qué tan conocido es el país.
import { BY_CODE, CONTINENTS, RANK, LEVEL_BY_ID } from "../engine/catalog.js";
import { question } from "../engine/index.js";
import { contains, mainlandBox, geometry, mainland } from "../engine/geo.js";

export const STYLES = {
  aprendiz: { name: "Aprendiz", skill: 0.45 },
  viajero: { name: "Viajero", skill: 0.7 },
  geografo: { name: "Geógrafo", skill: 0.92 },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Probabilidad de que ese estilo sepa ese país: los famosos los sabe más; con respuesta escrita, un poco menos. */
export function knows(profile, code, typed = false) {
  const skill = (STYLES[profile] || STYLES.viajero).skill;
  const fame = 1 - Math.min(RANK[code] ?? 150, 150) / 150;
  const p = 1 - (1 - skill) * (0.6 + 0.8 * (1 - fame));
  return clamp(typed ? p * 0.88 : p, 0.05, 0.99);
}

// Un punto al azar dentro del país (en su parte principal); si no cae uno en 200 intentos, su centro
function pointIn(code, rnd) {
  const g = geometry(code), parts = mainland(code), box = mainlandBox(code).box;
  for (let k = 0; k < 200; k++) {
    const lon = box[0] + rnd() * (box[2] - box[0]), lat = box[1] + rnd() * (box[3] - box[1]);
    if (parts.some((i) => contains(code, lon, lat) && g.polys[i])) return [lon, lat];
  }
  const c = BY_CODE[code].ll;
  return [c[1], c[0]];
}

export function decide(view, seat, profile, { rnd }) {
  if (view.phase === "reveal") return seat === view.turn ? { type: "next" } : null;
  if (view.phase !== "play" || seat !== view.turn) return null;
  const q = question(view);
  const typed = !!LEVEL_BY_ID[view.config.level].typed;
  const know = rnd() < knows(profile, q.code, typed);
  if (q.t === "cont") {
    const right = BY_CODE[q.code].cont;
    const wrong = CONTINENTS.filter((c) => c.id !== right);
    return { type: "answer", pick: know ? right : wrong[Math.floor(rnd() * wrong.length)].id };
  }
  if (q.t === "pin") {
    if (know) { const [lon, lat] = pointIn(q.code, rnd); return { type: "answer", lon, lat }; }
    // No sabe: cae en otro país (de todos modos conocido) o cerca del suyo, pero afuera
    const other = Object.keys(BY_CODE)[Math.floor(rnd() * Object.keys(BY_CODE).length)];
    const [lon, lat] = pointIn(other, rnd);
    return { type: "answer", lon, lat };
  }
  if (know) return { type: "answer", pick: q.code };
  const pool = q.opts ? q.opts.filter((c) => c !== q.code) : Object.keys(BY_CODE).filter((c) => c !== q.code && BY_CODE[c].cont === BY_CODE[q.code].cont);
  return { type: "answer", pick: pool[Math.floor(rnd() * pool.length)] };
}

// Mientras se ve la respuesta la compu espera un poco para que se alcance a ver
export const thinkMs = (view) => (view.phase === "reveal" ? 3200 : view.questions[view.i]?.t === "pin" ? 4200 : 2600);
