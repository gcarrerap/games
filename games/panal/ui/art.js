// Los bichos de Panal dibujados a mano en SVG (arte propio del sitio), y el banco de imágenes.
//
// Cada dibujo es un <g> centrado en (0, 0) que cabe en un círculo de radio ~36, visto desde arriba con la cabeza
// hacia arriba. Funcionan sobre la ficha clara y la oscura porque traen sus propios colores y un contorno.
//
// Banco de imágenes: si `assets/bank.js` trae una imagen para un bicho, se usa esa (un <image>); si no, el dibujo
// de aquí. Así el banco se puede ir llenando sin tocar la mesa (ver assets/README.md).
import { BANK } from "../assets/bank.js";

const INK = "#2b2118";

function legs(pairs, color, w = 2.6) {
  return pairs.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
}
// Un camino y su reflejo de izquierda a derecha
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?)(\s|,)(-?\d+(?:\.\d+)?)/g, (_, x, s, y) => `${-Number(x)}${s}${y}`);
const both = (ds) => ds.flatMap((d) => [d, mirror(d)]);

const DRAW = {
  // Abeja reina: abdomen dorado con franjas, alas transparentes y una coronita
  reina: () => `
    <g class="bug bee">
      ${legs(both(["M6 -6 L17 -12 L21 -20", "M7 -2 L19 0 L25 -4", "M6 3 L16 11 L18 19"]), INK, 2.2)}
      <ellipse cx="-13" cy="-4" rx="16" ry="8.5" transform="rotate(-28 -13 -4)" fill="#e9f4ff" fill-opacity=".82" stroke="#7d93a8" stroke-width="1.6"/>
      <ellipse cx="13" cy="-4" rx="16" ry="8.5" transform="rotate(28 13 -4)" fill="#e9f4ff" fill-opacity=".82" stroke="#7d93a8" stroke-width="1.6"/>
      <ellipse cx="0" cy="13" rx="12.5" ry="18" fill="#f2b42c" stroke="${INK}" stroke-width="2.2"/>
      <path d="M-11.6 7 Q0 10 11.6 7 L12.3 12 Q0 15.5 -12.3 12 Z M-10.6 19 Q0 22 10.6 19 L8.8 24.5 Q0 27 -8.8 24.5 Z" fill="${INK}"/>
      <path d="M0 31 L0 35" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="0" cy="-8" r="9" fill="#4a3519" stroke="${INK}" stroke-width="2"/>
      <path d="M-5 -12 Q0 -15 5 -12" stroke="#d9a441" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="0" cy="-20.5" r="6.5" fill="#2e2212" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="-3" cy="-21.5" r="1.6" fill="#fff"/><circle cx="3" cy="-21.5" r="1.6" fill="#fff"/>
      ${legs(both(["M-2.5 -26 Q-6 -31 -9 -31"]), INK, 1.8)}
      <path d="M-7 -28 L-7 -34 L-3.5 -30.5 L0 -36 L3.5 -30.5 L7 -34 L7 -28 Z" fill="#ffd34d" stroke="#9a6a10" stroke-width="1.4" stroke-linejoin="round"/>
    </g>`,

  // Mayate: escarabajo verde metálico con élitros partidos y brillo
  mayate: () => `
    <g class="bug beetle">
      ${legs(both(["M8 -8 L18 -14 L22 -22", "M10 2 L22 4 L27 0", "M9 12 L19 21 L21 29"]), INK, 2.6)}
      ${legs(both(["M-3 -27 Q-7 -33 -11 -33"]), INK, 1.8)}
      <circle cx="-11.5" cy="-33" r="2" fill="${INK}"/><circle cx="11.5" cy="-33" r="2" fill="${INK}"/>
      <ellipse cx="0" cy="-25" rx="6" ry="4.6" fill="#1d5a2c" stroke="${INK}" stroke-width="1.8"/>
      <ellipse cx="0" cy="-15" rx="11.5" ry="7" fill="#2b7a3c" stroke="${INK}" stroke-width="2"/>
      <path d="M0 -8 C-16 -8 -17 8 -15 18 C-13 28 -5 33 0 33 Z" fill="#3c9a4b" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M0 -8 C16 -8 17 8 15 18 C13 28 5 33 0 33 Z" fill="#35904a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M-10 -2 C-13 6 -12 16 -9 22" stroke="#a6e38f" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M8 0 C10 6 10 12 9 16" stroke="#8fd27e" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M-5 -17 Q0 -19 5 -17" stroke="#9ad98a" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>
    </g>`,

  // Chapulín: cuerpo largo verde, patas traseras grandes dobladas y antenas largas
  chapulin: () => `
    <g class="bug hopper">
      ${legs(both(["M-3 -26 Q-9 -40 -16 -42"]), "#4b6b1d", 1.8)}
      ${legs(both(["M5 -12 L13 -16 L16 -22", "M5 -4 L14 -2 L17 -6"]), "#3f5c17", 2.2)}
      <path d="M6 2 C20 -2 26 6 22 14 L10 33" fill="none" stroke="#3f5c17" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-6 2 C-20 -2 -26 6 -22 14 L-10 33" fill="none" stroke="#3f5c17" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6 2 C20 -2 26 6 22 14 L10 33" fill="none" stroke="#8cc63f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-6 2 C-20 -2 -26 6 -22 14 L-10 33" fill="none" stroke="#8cc63f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M0 -14 C9 -14 9 4 7 18 C6 28 3 36 0 36 C-3 36 -6 28 -7 18 C-9 4 -9 -14 0 -14 Z" fill="#7fb93a" stroke="${INK}" stroke-width="2"/>
      <path d="M-4 0 L4 0 M-4.5 8 L4.5 8 M-4.5 16 L4.5 16 M-3.8 24 L3.8 24" stroke="#4f7e1f" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M0 -10 L0 30" stroke="#a8db5f" stroke-width="1.4" opacity=".7"/>
      <ellipse cx="0" cy="-21" rx="7.5" ry="9" fill="#6aa52d" stroke="${INK}" stroke-width="2"/>
      <ellipse cx="-5" cy="-23" rx="2.6" ry="3.4" fill="#2b2118"/><ellipse cx="5" cy="-23" rx="2.6" ry="3.4" fill="#2b2118"/>
      <circle cx="-5.6" cy="-24.2" r=".9" fill="#fff"/><circle cx="4.4" cy="-24.2" r=".9" fill="#fff"/>
    </g>`,

  // Hormiga: cabeza, tórax y gáster rojizos, seis patas finas y antenas de codo
  hormiga: () => `
    <g class="bug ant">
      ${legs(both(["M3 -6 L14 -14 L20 -24", "M4 -3 L16 -2 L24 -7", "M3 1 L14 10 L19 21"]), "#4a1a10", 2.2)}
      ${legs(both(["M-3 -24 L-9 -30 L-16 -28"]), "#4a1a10", 1.9)}
      <ellipse cx="0" cy="17" rx="10.5" ry="14" fill="#b3432a" stroke="${INK}" stroke-width="2"/>
      <path d="M-6 9 Q-4 18 -5 25" stroke="#e07a5a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>
      <ellipse cx="0" cy="1.5" rx="2.8" ry="3" fill="#8f3320" stroke="${INK}" stroke-width="1.4"/>
      <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#a13a24" stroke="${INK}" stroke-width="1.8"/>
      <ellipse cx="0" cy="-20" rx="7.5" ry="7" fill="#9c3520" stroke="${INK}" stroke-width="1.9"/>
      <circle cx="-4" cy="-21.5" r="1.9" fill="${INK}"/><circle cx="4" cy="-21.5" r="1.9" fill="${INK}"/>
      <path d="M-3 -14.5 L0 -12.5 L3 -14.5" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </g>`,

  // Araña: abdomen redondo con mancha clara y ocho patas con rodilla
  arana: () => `
    <g class="bug spider">
      ${legs(both(["M5 -12 L16 -24 L22 -36", "M6 -9 L21 -15 L31 -24", "M6 -6 L22 -2 L33 3", "M5 -3 L18 8 L24 22"]), "#3a2a20", 2.5)}
      <circle cx="0" cy="12" r="15" fill="#6b4f3a" stroke="${INK}" stroke-width="2.2"/>
      <path d="M0 2 C5 6 5 12 0 22 C-5 12 -5 6 0 2 Z" fill="#e8c88f" stroke="#7a5a2a" stroke-width="1.2"/>
      <circle cx="-6" cy="16" r="2.2" fill="#e8c88f" opacity=".85"/><circle cx="6" cy="16" r="2.2" fill="#e8c88f" opacity=".85"/>
      <ellipse cx="0" cy="-9" rx="9" ry="8" fill="#543d2c" stroke="${INK}" stroke-width="2"/>
      <circle cx="-2.6" cy="-13.5" r="1.8" fill="#fff"/><circle cx="2.6" cy="-13.5" r="1.8" fill="#fff"/>
      <circle cx="-2.6" cy="-13.5" r=".9" fill="${INK}"/><circle cx="2.6" cy="-13.5" r=".9" fill="${INK}"/>
      <circle cx="-6" cy="-11" r="1.1" fill="#fff"/><circle cx="6" cy="-11" r="1.1" fill="#fff"/>
      ${legs(both(["M-2.5 -16 Q-4 -20 -2 -22"]), "#3a2a20", 2.2)}
    </g>`,
};

// El bicho para poner dentro de una ficha (radio ~36 alrededor de (0, 0))
export function bugArt(kind) {
  const img = BANK[kind];
  if (img && img.href) return `<image class="bugimg" href="${img.href}" x="-38" y="-38" width="76" height="76" preserveAspectRatio="xMidYMid meet"/>`;
  return DRAW[kind] ? DRAW[kind]() : "";
}

// Un bicho suelto como <svg> (para la reserva y las reglas)
export function bugSVG(kind, size = 44, cls = "") {
  return `<svg class="bugsvg ${cls}" viewBox="-40 -40 80 80" width="${size}" height="${size}" aria-hidden="true">${bugArt(kind)}</svg>`;
}

// Esquinas de un hexágono de punta hacia arriba con ese radio
export function hexPoints(R, cx = 0, cy = 0) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    out.push(`${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
}

// Una ficha completa: el hexágono del color del jugador (0 claro, 1 oscuro) con el bicho encima
export function tileSVG(owner, kind, size = 48, cls = "") {
  return `<svg class="tilesvg ${cls}" viewBox="-50 -50 100 100" width="${size}" height="${size}" aria-hidden="true">
    <polygon class="tile p${owner}" points="${hexPoints(46)}"/><polygon class="tile-in p${owner}" points="${hexPoints(39)}"/>
    <g transform="scale(.95)">${bugArt(kind)}</g></svg>`;
}
