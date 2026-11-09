// El tablero del timbiriche en SVG: puntos, rayas, cajas cerradas y zonas para tocar. Cada raya libre tiene un rombo
// invisible alrededor; los rombos cubren todo el tablero, así que cualquier toque escoge la raya más cercana.
import { allLines, parseLine } from "../engine/index.js";

const M = 0.42; // margen alrededor de los puntos (en unidades de la rejilla)

function ends(id) {
  const { dir, r, c } = parseLine(id);
  return dir === "h" ? [c, r, c + 1, r] : [c, r, c, r + 1];
}

function diamond(id) {
  const [x1, y1, x2, y2] = ends(id);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const pts = x1 === x2 ? [[x1, y1], [mx + 0.5, my], [x2, y2], [mx - 0.5, my]] : [[x1, y1], [mx, my - 0.5], [x2, y2], [mx, my + 0.5]];
  return pts.map((p) => p.join(",")).join(" ");
}

// opts: { me, sel, advice, playable, initials: [letra de cada asiento], fresh }
export function boardSVG(st, opts = {}) {
  const { sel = null, advice = null, playable = false, initials = ["", ""], fresh = false, me = -1 } = opts;
  const W = st.w, H = st.h;
  const last = st.last;
  const out = [];
  out.push(`<svg class="tb-board" viewBox="${-M} ${-M} ${W + 2 * M} ${H + 2 * M}" role="img" aria-label="Tablero de ${W} por ${H} cajas" xmlns="http://www.w3.org/2000/svg">`);
  out.push(`<rect class="paper" x="${-M}" y="${-M}" width="${W + 2 * M}" height="${H + 2 * M}" rx=".22"/>`);
  // Cajas cerradas
  st.boxes.forEach((o, i) => {
    if (o < 0) return;
    const r = Math.floor(i / W), c = i % W;
    const isNew = fresh && last && last.closed.includes(i);
    out.push(`<g class="box c${o}${isNew ? " fresh" : ""}"><rect x="${c + 0.06}" y="${r + 0.06}" width=".88" height=".88" rx=".08"/>
      <text x="${c + 0.5}" y="${r + 0.5}" dy=".05">${initials[o] || ""}</text></g>`);
  });
  // Rayas libres (punteadas), la escogida y la del consejo
  for (const id of allLines(st)) {
    const [x1, y1, x2, y2] = ends(id);
    const owner = st.lines[id];
    if (owner === undefined) {
      const cls = id === sel ? `ln pick c${me}` : advice === id ? "ln adv" : "ln free";
      out.push(`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
    }
  }
  // Rayas trazadas; la última, marcada
  for (const id of allLines(st)) {
    const owner = st.lines[id];
    if (owner === undefined) continue;
    const [x1, y1, x2, y2] = ends(id);
    const isLast = last && last.line === id;
    if (isLast) out.push(`<line class="ln halo" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
    out.push(`<line class="ln drawn c${owner}${isLast ? " last" : ""}${isLast && fresh ? " fresh" : ""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  }
  // Puntos
  for (let r = 0; r <= H; r++) for (let c = 0; c <= W; c++) out.push(`<circle class="pt" cx="${c}" cy="${r}" r=".085"/>`);
  // Zonas para tocar (solo si te toca)
  if (playable) for (const id of allLines(st)) {
    if (st.lines[id] !== undefined) continue;
    out.push(`<polygon class="hit" data-line="${id}" points="${diamond(id)}"/>`);
  }
  out.push(`</svg>`);
  return out.join("");
}
