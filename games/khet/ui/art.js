// Dibujos del Láser en SVG: degradados compartidos y cada pieza vista desde arriba. Cada pieza se dibuja en un
// cuadro de 100 × 100 mirando a su orientación 0 y luego se gira (o · 90°) alrededor del centro.
//
//   · Pirámide (0): ángulo recto abajo a la izquierda; la cara del espejo es la hipotenusa, que mira al noreste.
//   · Escarabajo (0): el espejo de dos caras va de la esquina noroeste a la sureste (la costura de sus alas).
//   · Anubis (0): el escudo dorado mira al norte.
//   · Esfinge (0): el lente del láser mira al norte.
//   · Faraón: no gira; mira hacia el enemigo.
import { PYRAMID, SCARAB, ANUBIS, PHARAOH, SPHINX, typeOf, ownerOf, orientOf } from "../engine/index.js";

// Colores de cada bando (también los usa el canvas de efectos)
export const TEAM = [
  { name: "Plata", hi: "#ffffff", mid: "#c9d3dc", lo: "#6d7b88", deep: "#3a4550", laser: "#3ee8ff", glow: "rgba(62,232,255,", shard: ["#eef3f7", "#b8c4cf", "#7d8b98"] },
  { name: "Rojo", hi: "#ff9a8c", mid: "#e0352b", lo: "#8f1512", deep: "#4d0907", laser: "#ff2b3d", glow: "rgba(255,43,61,", shard: ["#ff6b5c", "#d1281f", "#7a100c"] },
];

// Lo que va una sola vez en el <svg> del tablero: degradados de cada bando, el espejo y el oro
export function defs() {
  const team = TEAM.map((t, i) => `
    <linearGradient id="kb${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.hi}"/><stop offset=".45" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.lo}"/></linearGradient>
    <linearGradient id="kd${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.deep}"/></linearGradient>
    <radialGradient id="kr${i}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${t.hi}"/><stop offset=".55" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.lo}"/></radialGradient>
    <radialGradient id="kl${i}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${t.laser}"/><stop offset="1" stop-color="${t.laser}" stop-opacity="0"/></radialGradient>`).join("");
  return `<defs>${team}
    <linearGradient id="kmirror" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4fbff"/><stop offset=".22" stop-color="#9fb4c6"/><stop offset=".5" stop-color="#ffffff"/>
      <stop offset=".62" stop-color="#7f97ab"/><stop offset=".85" stop-color="#e3eef6"/><stop offset="1" stop-color="#8aa0b2"/>
    </linearGradient>
    <linearGradient id="kgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".4" stop-color="#e2b041"/><stop offset="1" stop-color="#8a5d12"/></linearGradient>
    <linearGradient id="kobs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4f5c"/><stop offset="1" stop-color="#0e1016"/></linearGradient>
    <radialGradient id="kstone" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#3b352d"/><stop offset="1" stop-color="#211d18"/></radialGradient>
    <radialGradient id="kstone2" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#352f28"/><stop offset="1" stop-color="#1c1915"/></radialGradient>
    <linearGradient id="kframe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4320"/><stop offset=".5" stop-color="#2e2210"/><stop offset="1" stop-color="#4a3618"/></linearGradient>
    <clipPath id="kclip"><circle cx="50" cy="50" r="40"/></clipPath>
  </defs>`;
}

const shadow = (d) => `<path d="${d}" transform="translate(3.5 5)" fill="#000" opacity=".38"/>`;

function pyramid(i) {
  // Base: (10,10) (10,90) (90,90). Cúspide un poco hacia el ángulo recto.
  const A = "36 64";
  const base = "M10 10 L10 90 L90 90 Z";
  const steps = [0.25, 0.5, 0.75].map((k) => {
    const lerp = (x, y) => [x + (36 - x) * k, y + (64 - y) * k];
    const [a, b, c] = [lerp(10, 10), lerp(10, 90), lerp(90, 90)];
    return `<path d="M${a} L${b} L${c}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1.6"/>`;
  }).join("");
  return `${shadow(base)}
    <path d="M10 10 L10 90 L${A} Z" fill="url(#kb${i})"/>
    <path d="M10 90 L90 90 L${A} Z" fill="url(#kd${i})"/>
    ${steps}
    <path d="M10 10 L${A} L90 90 Z" fill="url(#kmirror)"/>
    <path d="M14 15 L84 85" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
    <path d="M10 10 L90 90" stroke="url(#kgold)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="${base}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="36" cy="64" r="3.2" fill="url(#kgold)"/>`;
}

function scarab(i) {
  const base = "M18 8 H82 Q92 8 92 18 V82 Q92 92 82 92 H18 Q8 92 8 82 V18 Q8 8 18 8 Z";
  return `${shadow(base)}
    <path d="${base}" fill="url(#kd${i})"/>
    <path d="M14 22 Q14 14 22 14 L50 14 L14 50 Z" fill="url(#kb${i})" opacity=".6"/>
    <!-- Alas a cada lado del espejo (la costura es el espejo) -->
    <path d="M24 30 Q22 60 40 74 Q62 86 74 78 L26 22 Z" fill="url(#kr${i})" stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>
    <path d="M30 24 Q60 22 74 40 Q86 62 78 74 L26 22 Z" fill="url(#kr${i})" stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>
    <!-- Espejo de dos caras -->
    <path d="M11 17 L17 11 L89 83 L83 89 Z" fill="url(#kmirror)" stroke="url(#kgold)" stroke-width="1.6"/>
    <path d="M15 14 L86 85" stroke="#fff" stroke-width="1.3" opacity=".9"/>
    <!-- Cabeza y antenas en la punta noroeste -->
    <circle cx="20" cy="20" r="9" fill="url(#kgold)" stroke="#5a3a08" stroke-width="1"/>
    <path d="M16 13 Q10 4 4 6 M13 16 Q4 10 6 4" stroke="url(#kgold)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="82" cy="82" r="5" fill="url(#kgold)" opacity=".9"/>`;
}

function anubis(i) {
  const base = "M18 16 H82 Q90 16 90 24 V84 Q90 92 82 92 H18 Q10 92 10 84 V24 Q10 16 18 16 Z";
  return `${shadow(base)}
    <path d="${base}" fill="url(#kb${i})"/>
    <path d="M18 30 H82 V84 Q82 86 80 86 H20 Q18 86 18 84 Z" fill="url(#kd${i})" opacity=".55"/>
    <!-- Cabeza de chacal: orejas y hocico hacia el frente -->
    <path d="M34 66 L30 34 L42 46 L50 30 L58 46 L70 34 L66 66 Q50 80 34 66 Z" fill="url(#kobs)" stroke="#000" stroke-width="1"/>
    <path d="M44 52 L50 36 L56 52 Z" fill="#0b0c10"/>
    <circle cx="43" cy="58" r="2.6" fill="url(#kgold)"/><circle cx="57" cy="58" r="2.6" fill="url(#kgold)"/>
    <path d="M34 70 Q50 80 66 70" stroke="url(#kgold)" stroke-width="3" fill="none"/>
    <!-- Escudo al frente -->
    <path d="M6 18 Q50 -2 94 18 L94 26 Q50 8 6 26 Z" fill="url(#kgold)" stroke="#5a3a08" stroke-width="1.2"/>
    <path d="M14 18 Q50 4 86 18" stroke="#fff7d0" stroke-width="1.6" fill="none" opacity=".9"/>`;
}

function pharaoh(i) {
  const stripes = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2;
    const x = 50 + Math.cos(a) * 40, y = 50 + Math.sin(a) * 40;
    return `<path d="M50 50 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="${k % 2 ? "url(#kgold)" : `url(#kd${i})`}" stroke-width="9"/>`;
  }).join("");
  return `${shadow("M50 8 A42 42 0 1 1 49.9 8 Z")}
    <circle cx="50" cy="50" r="42" fill="url(#kr${i})"/>
    <g clip-path="url(#kclip)">${stripes}</g>
    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#kgold)" stroke-width="4"/>
    <circle cx="50" cy="50" r="20" fill="url(#kgold)" stroke="#5a3a08" stroke-width="1.4"/>
    <path d="M50 32 Q56 40 50 46 Q44 40 50 32 Z" fill="url(#kr${i})" stroke="#5a3a08" stroke-width="1"/>
    <path d="M42 54 Q50 60 58 54" stroke="#5a3a08" stroke-width="2" fill="none"/>
    <circle cx="44" cy="48" r="2" fill="#2a1a04"/><circle cx="56" cy="48" r="2" fill="#2a1a04"/>
    <path d="M50 4 L55 13 L45 13 Z" fill="url(#kgold)"/>`;
}

function sphinx(i) {
  const base = "M22 18 Q50 4 78 18 L86 84 Q86 92 78 92 H22 Q14 92 14 84 Z";
  return `${shadow(base)}
    <path d="${base}" fill="url(#kb${i})"/>
    <path d="M30 40 Q50 30 70 40 L72 84 H28 Z" fill="url(#kd${i})" opacity=".6"/>
    <!-- Melena y cabeza -->
    <path d="M28 46 Q22 26 50 20 Q78 26 72 46 Q60 56 50 56 Q40 56 28 46 Z" fill="url(#kgold)" stroke="#5a3a08" stroke-width="1.2"/>
    <circle cx="50" cy="38" r="9" fill="url(#kr${i})" stroke="#5a3a08" stroke-width="1"/>
    <path d="M30 64 H70 M30 74 H70" stroke="url(#kgold)" stroke-width="2.4" opacity=".7"/>
    <!-- Lente del láser -->
    <circle cx="50" cy="10" r="12" fill="url(#kl${i})" class="lens"/>
    <circle cx="50" cy="12" r="5.5" fill="#fff" stroke="url(#kgold)" stroke-width="2.4"/>`;
}

const DRAW = { [PYRAMID]: pyramid, [SCARAB]: scarab, [ANUBIS]: anubis, [PHARAOH]: pharaoh, [SPHINX]: sphinx };

// Ángulo en grados con el que se dibuja la pieza (el faraón mira al enemigo)
export const angleOf = (p) => (typeOf(p) === PHARAOH ? (ownerOf(p) === 0 ? 0 : 180) : orientOf(p) * 90);

// El dibujo de una pieza en el cuadro 0..1 (sin acomodar en el tablero); `extraDeg` gira la vista (tablero volteado)
export function pieceSVG(p, extraDeg = 0) {
  const t = typeOf(p), i = ownerOf(p);
  return `<g transform="rotate(${angleOf(p) + extraDeg} .5 .5) scale(.01)">${DRAW[t](i)}</g>`;
}

// Ankh (casillas de Plata) y ojo de Horus (casillas de Rojo), en el cuadro 0..1
export const ANKH = `<path d="M.5 .2 C.38 .2 .36 .36 .47 .44 H.3 V.5 H.47 V.82 H.53 V.5 H.7 V.44 H.53 C.64 .36 .62 .2 .5 .2 Z M.5 .26 C.58 .26 .58 .38 .5 .42 C.42 .38 .42 .26 .5 .26 Z" fill-rule="evenodd"/>`;
export const EYE = `<path d="M.18 .46 Q.5 .2 .82 .46 Q.5 .66 .18 .46 Z M.5 .36 A.09 .09 0 1 0 .5001 .36 Z" fill-rule="evenodd"/>
  <path d="M.48 .58 L.42 .78 Q.4 .84 .34 .8 M.6 .56 Q.7 .7 .78 .62" fill="none" stroke-width=".035" stroke="currentColor" stroke-linecap="round"/>
  <path d="M.2 .36 Q.5 .16 .8 .34" fill="none" stroke-width=".035" stroke="currentColor"/>`;

// Un ícono chico de la pieza para los paneles (piezas perdidas, nombre del bando)
export function iconSVG(p, size = 28) {
  return `<svg class="kicon" viewBox="0 0 1 1" width="${size}" height="${size}" aria-hidden="true">${pieceSVG(p)}</svg>`;
}
