// Dibujos de Geografía: la silueta de un país (SVG, proyección acimutal de áreas iguales centrada en el país, para que
// no se deforme como en el mapamundi) y la ruta de su bandera.
import { geometry, mainland, mainlandBox, lambertAzimuthal } from "../engine/geo.js";

export const flagUrl = (code) => new URL(`../assets/flags/${String(code).toLowerCase()}.svg`, import.meta.url).href;

const cache = new Map();
/** El «d» del path (en un cuadro de 100×100) con la parte principal del país, o "" si no tiene silueta. */
export function shapePath(code) {
  if (cache.has(code)) return cache.get(code);
  const g = geometry(code), mb = mainlandBox(code);
  let d = "";
  if (g && mb) {
    const proj = lambertAzimuthal(mb.center[0], mb.center[1]);
    const rings = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const i of mainland(code)) for (const r of g.polys[i].rings) {
      const pts = [];
      for (let j = 0; j < r.length; j += 2) {
        const [x, y] = proj(r[j], r[j + 1]);
        pts.push([x, -y]);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, -y); y1 = Math.max(y1, -y);
      }
      rings.push(pts);
    }
    const s = 84 / Math.max(x1 - x0, y1 - y0, 1e-6), ox = 50 - ((x0 + x1) / 2) * s, oy = 50 - ((y0 + y1) / 2) * s;
    for (const pts of rings) {
      let lx = Infinity, ly = Infinity, first = true;
      for (let j = 0; j < pts.length; j++) {
        const x = pts[j][0] * s + ox, y = pts[j][1] * s + oy;
        if (!first && j < pts.length - 1 && Math.hypot(x - lx, y - ly) < 0.12) continue;
        d += `${first ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        lx = x; ly = y; first = false;
      }
      d += "Z";
    }
  }
  cache.set(code, d);
  return d;
}

/** La silueta lista para poner en la página. `solved` la pinta de dorado. */
export function shapeSVG(code, { solved = false } = {}) {
  const id = `gs-${String(code).toLowerCase()}`;
  return `<svg class="geo-shape ${solved ? "solved" : ""}" viewBox="0 0 100 100" role="img" aria-label="${solved ? "Silueta del país" : "Silueta de un país"}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${solved ? "#ffe9a0" : "#7fe0c4"}"/><stop offset="1" stop-color="${solved ? "#f0a93c" : "#2b8fd6"}"/></linearGradient>
      <filter id="${id}-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path class="geo-shape-shadow" d="${shapePath(code)}" transform="translate(1.6 2.4)"/>
    <path class="geo-shape-body" d="${shapePath(code)}" fill="url(#${id})" fill-rule="evenodd" filter="url(#${id}-glow)"/>
  </svg>`;
}
