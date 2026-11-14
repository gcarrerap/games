// Geometría de Geografía, pura (corre en Node y en el navegador): lee los países de data/world.js (cadenas muy
// compactas, ver scripts/geografia-datos.mjs), dice si un punto cae dentro de un país, a cuántos kilómetros queda,
// qué partes dibujar en una silueta y las proyecciones del mapa.
//
// Los puntos son [longitud, latitud] en grados. Cada anillo es un Float64Array plano [lon0, lat0, lon1, lat1, …] sin
// repetir el primer punto al final. El primer anillo de un polígono es el exterior y los demás, huecos.
import { GEOMETRY, COUNTRIES, TERRITORIES } from "../data/world.js";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const TABLE = new Int8Array(128).fill(-1);
for (let i = 0; i < ALPHA.length; i++) TABLE[ALPHA.charCodeAt(i)] = i;
const Q = 200; // pasos por grado (el mismo de scripts/geografia-datos.mjs)
const RAD = Math.PI / 180;
export const EARTH_KM = 6371;

function decodeRing(str) {
  const out = [];
  let x = 0, y = 0, v = 0, shift = 0, k = 0;
  for (let i = 0; i < str.length; i++) {
    const c = TABLE[str.charCodeAt(i)];
    v |= (c & 31) << shift;
    if (c & 32) { shift += 5; continue; }
    const d = v & 1 ? -((v + 1) >> 1) : v >> 1;
    v = 0; shift = 0;
    if (k++ % 2 === 0) { x += d; out.push(x / Q - 180); } else { y += d; out.push(y / Q - 90); }
  }
  return Float64Array.from(out);
}

function ringBox(r) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < r.length; i += 2) {
    if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i];
    if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1];
  }
  return [x0, y0, x1, y1];
}
// Área plana del anillo en grados², corregida por la latitud (sirve para comparar polígonos, no para medir)
function ringArea(r) {
  let a = 0, lat = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { a += (r[j] + r[i]) * (r[j + 1] - r[i + 1]); lat += r[i + 1]; }
  return Math.abs(a / 2) * Math.cos((lat / (r.length / 2)) * RAD);
}

const cache = new Map();
/** { code, polys: [{ rings, box, area }], box } de un país o territorio (null si no existe). */
export function geometry(code) {
  if (cache.has(code)) return cache.get(code);
  const str = GEOMETRY[code];
  let g = null;
  if (str !== undefined) {
    const polys = str.split("|").filter(Boolean).map((p) => {
      const rings = p.split(",").map(decodeRing);
      return { rings, box: ringBox(rings[0]), area: ringArea(rings[0]) };
    });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of polys) { x0 = Math.min(x0, p.box[0]); y0 = Math.min(y0, p.box[1]); x1 = Math.max(x1, p.box[2]); y1 = Math.max(y1, p.box[3]); }
    g = { code, polys, box: [x0, y0, x1, y1] };
  }
  cache.set(code, g);
  return g;
}
/** Todos los códigos con geometría: países del juego y territorios (para dibujar el mapa completo). */
export const allCodes = () => [...COUNTRIES.map((c) => c.code), ...TERRITORIES.map((t) => t.code)];

// ───────── Punto dentro de un país
function inRing(r, x, y) {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const yi = r[i + 1], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((r[j] - r[i]) * (y - yi)) / (yj - yi) + r[i]) c = !c;
  }
  return c;
}
const inPoly = (p, x, y) => {
  if (x < p.box[0] || x > p.box[2] || y < p.box[1] || y > p.box[3]) return false;
  if (!inRing(p.rings[0], x, y)) return false;
  for (let h = 1; h < p.rings.length; h++) if (inRing(p.rings[h], x, y)) return false;
  return true;
};
export const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

/** ¿El punto cae dentro de ese país (en cualquiera de sus partes, también las islas lejanas)? */
export function contains(code, lon, lat) {
  const g = geometry(code);
  if (!g) return false;
  const x = wrapLon(lon);
  return g.polys.some((p) => inPoly(p, x, lat));
}
/** El código del país o territorio que contiene el punto, o null (mar). */
export function countryAt(lon, lat) {
  for (const code of allCodes()) if (contains(code, lon, lat)) return code;
  return null;
}

// ───────── Distancias
export function haversineKm(lon1, lat1, lon2, lat2) {
  const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
const wrapDx = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

/**
 * El punto más cercano de un país a (lon, lat) y la distancia en km: { km, point: [lon, lat] }. Si el punto cae dentro,
 * km es 0 y point es el mismo punto. Cerca mide contra los lados de los anillos (plano local); lejos, contra los
 * vértices con la fórmula del círculo máximo. Un país sin geometría usa su centro (`fallback`, [lat, lon]).
 */
export function nearest(code, lon, lat, fallback = null) {
  const g = geometry(code);
  if (!g) return fallback ? { km: haversineKm(lon, lat, fallback[1], fallback[0]), point: [fallback[1], fallback[0]] } : { km: Infinity, point: null };
  const x = wrapLon(lon);
  if (g.polys.some((p) => inPoly(p, x, lat))) return { km: 0, point: [x, lat] };
  const kx = 111.32 * Math.max(0.05, Math.cos(lat * RAD)), ky = 110.57;
  let best = Infinity, bx = x, by = lat;
  for (const p of g.polys) {
    // Descartar el polígono si su caja ya queda más lejos que lo mejor encontrado
    const dy = Math.max(p.box[1] - lat, 0, lat - p.box[3]) * ky;
    if (dy > best) continue;
    for (const r of p.rings) {
      for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
        const ax = wrapDx(r[j] - x) * kx, ay = (r[j + 1] - lat) * ky, bx2 = wrapDx(r[i] - x) * kx, by2 = (r[i + 1] - lat) * ky;
        const vx = bx2 - ax, vy = by2 - ay, len2 = vx * vx + vy * vy;
        const t = len2 ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / len2)) : 0;
        const d = Math.hypot(ax + t * vx, ay + t * vy);
        if (d < best) { best = d; bx = x + (ax + t * vx) / kx; by = lat + (ay + t * vy) / ky; }
      }
    }
  }
  if (best > 700) { // lejos: el plano local ya no es confiable
    best = Infinity;
    for (const p of g.polys) for (const r of p.rings) for (let i = 0; i < r.length; i += 2) { const d = haversineKm(x, lat, r[i], r[i + 1]); if (d < best) { best = d; bx = r[i]; by = r[i + 1]; } }
  }
  return { km: best, point: [wrapLon(bx), by] };
}
/** Kilómetros desde un punto hasta el país más cercano: 0 si cae dentro (ver `nearest`). */
export const distanceKm = (code, lon, lat, fallback = null) => nearest(code, lon, lat, fallback).km;

// ───────── Qué partes dibujar en la silueta
// Las islas lejanas (Alaska y Hawái, la Guayana Francesa, Pascua…) harían diminuto al resto del país. Se queda el
// polígono más grande y los que están cerca de él y no son una pizca: «cerca» crece con el tamaño del país.
const centerOfBox = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
export function mainland(code) {
  const g = geometry(code);
  if (!g) return [];
  const order = g.polys.map((p, i) => i).sort((a, b) => g.polys[b].area - g.polys[a].area);
  const main = g.polys[order[0]], mc = centerOfBox(main.box);
  const reach = 20 + 0.25 * Math.max(main.box[2] - main.box[0], main.box[3] - main.box[1]);
  return order.filter((i, k) => {
    if (k === 0) return true;
    const p = g.polys[i], c = centerOfBox(p.box);
    return p.area >= main.area * 0.004 && haversineKm(mc[0], mc[1], c[0], c[1]) / 111.2 <= reach;
  });
}
/**
 * Caja [lon0, lat0, lon1, lat1] de la parte principal y su centro. Las partes que cruzan el meridiano 180° (el
 * extremo de Rusia, Fiyi) se acomodan junto al polígono principal, así la caja no abarca medio mundo; por eso
 * lon0/lon1 pueden pasar de ±180.
 */
export function mainlandBox(code) {
  const g = geometry(code);
  if (!g) return null;
  const parts = mainland(code), mainLon = centerOfBox(g.polys[parts[0]].box)[0];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of parts) {
    const b = g.polys[i].box, shift = 360 * Math.round((mainLon - (b[0] + b[2]) / 2) / 360);
    x0 = Math.min(x0, b[0] + shift); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2] + shift); y1 = Math.max(y1, b[3]);
  }
  return { box: [x0, y0, x1, y1], center: centerOfBox([x0, y0, x1, y1]) };
}

// ───────── Proyecciones
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
/** Tierra Igual (Equal Earth, Šavrič et al. 2018): [lon, lat] en grados → [x, y] (x entre ≈ −2,7 y 2,7; y entre ≈ −1,3 y 1,3). */
export function equalEarth(lon, lat) {
  const l = Math.asin(M * Math.sin(lat * RAD)), l2 = l * l, l6 = l2 * l2 * l2;
  return [(lon * RAD * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))), l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2))];
}
/** Lo inverso: [x, y] → [lon, lat] en grados. */
export function equalEarthInvert(x, y) {
  let l = y, l2 = l * l, l6 = l2 * l2 * l2;
  for (let i = 0; i < 12; i++) {
    const fy = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)) - y, fpy = A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2);
    const d = fy / fpy;
    l -= d; l2 = l * l; l6 = l2 * l2 * l2;
    if (Math.abs(d) < 1e-12) break;
  }
  return [(x * M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))) / Math.cos(l) / RAD, Math.asin(Math.sin(l) / M) / RAD];
}
export const EQUAL_EARTH_BOUNDS = { x: equalEarth(180, 0)[0], y: equalEarth(0, 90)[1] };

/** Acimutal de áreas iguales de Lambert centrada en (lon0, lat0): buena para ver un solo país. → [x, y] con y hacia arriba. */
export function lambertAzimuthal(lon0, lat0) {
  const s0 = Math.sin(lat0 * RAD), c0 = Math.cos(lat0 * RAD);
  return (lon, lat) => {
    const dl = (lon - lon0) * RAD, s = Math.sin(lat * RAD), c = Math.cos(lat * RAD), cd = Math.cos(dl);
    const k = Math.sqrt(2 / Math.max(1e-9, 1 + s0 * s + c0 * c * cd));
    return [k * c * Math.sin(dl), k * (c0 * s - s0 * c * cd)];
  };
}
