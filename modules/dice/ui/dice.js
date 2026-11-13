// Un dado de verdad en 3D con CSS: un cubo con sus seis caras que se gira para mostrar una. El dado es un envoltorio
// que se mueve por la bandeja (.dz-die), una capa que lo "levanta" (.dz-lift, para los rebotes), el cubo que gira
// (.dz-cube), su sombra en el paño y la marca de apartado.
import { FACE_AT } from "../index.js";

// Pips en una rejilla de 3×3 (1 = arriba a la izquierda … 9 = abajo a la derecha)
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
export const pipFace = (v) => PIPS[v].map((p) => `<i class="p${p}"></i>`).join("");

// faces(lugar 1–6) → el HTML de adentro de esa cara. Por omisión, pips.
export function dieHTML(i, faces = pipFace) {
  const face = (v) => `<div class="dz-face f${v}" style="transform:${FACE_AT[v]} translateZ(calc(var(--d) / 2))">${faces(v)}</div>`;
  return `<div class="dz-die" data-die="${i}" role="button" tabindex="-1">
    <div class="dz-shadow"></div>
    <div class="dz-lift"><div class="dz-cube">${[1, 2, 3, 4, 5, 6].map(face).join("")}</div></div>
    <div class="dz-lock" aria-hidden="true"></div>
  </div>`;
}

export const cubeTransform = (rx, ry) => `rotateX(${rx}deg) rotateY(${ry}deg)`;

// Un dado de pips chiquito en SVG (para reglas, registro y tarjetas)
export function miniDie(v, size = 18, cls = "") {
  const grid = (p) => { const r = Math.floor((p - 1) / 3), c = (p - 1) % 3; return [0.25 + c * 0.25, 0.25 + r * 0.25]; };
  return `<svg class="mini-die ${cls}" width="${size}" height="${size}" viewBox="0 0 1 1" aria-label="${v}" role="img">
    <rect x="0.04" y="0.04" width="0.92" height="0.92" rx="0.2" class="md-body"/>
    ${PIPS[v].map((p) => { const [x, y] = grid(p); return `<circle cx="${x}" cy="${y}" r="${v === 1 ? 0.13 : 0.09}" class="md-pip ${v === 1 ? "one" : ""}"/>`; }).join("")}
  </svg>`;
}
