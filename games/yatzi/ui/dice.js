// Un dado de verdad en 3D con CSS: un cubo con sus seis caras (los opuestos suman 7) que se gira para mostrar una.
// El dado es un envoltorio que se mueve por la bandeja (.yz-die), una capa que lo "levanta" (.yz-lift, para los
// rebotes), el cubo que gira (.yz-cube) y su sombra en el paño.

// Dónde va cada cara: 1 al frente, 6 atrás, 2 arriba, 5 abajo, 3 a la derecha, 4 a la izquierda
const FACE_AT = { 1: "rotateY(0deg)", 6: "rotateY(180deg)", 2: "rotateX(90deg)", 5: "rotateX(-90deg)", 3: "rotateY(90deg)", 4: "rotateY(-90deg)" };
// El giro del cubo que deja esa cara al frente: [x, y] en grados
export const SHOW = { 1: [0, 0], 6: [0, 180], 2: [-90, 0], 5: [90, 0], 3: [0, -90], 4: [0, 90] };

// Pips en una rejilla de 3×3 (1 = arriba a la izquierda … 9 = abajo a la derecha)
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

const faceHTML = (v) => `<div class="yz-face f${v}" style="transform:${FACE_AT[v]} translateZ(calc(var(--d) / 2))">${PIPS[v].map((p) => `<i class="p${p}"></i>`).join("")}</div>`;

export function dieHTML(i) {
  return `<div class="yz-die" data-die="${i}" role="button" tabindex="-1">
    <div class="yz-shadow"></div>
    <div class="yz-lift"><div class="yz-cube">${[1, 2, 3, 4, 5, 6].map(faceHTML).join("")}</div></div>
    <div class="yz-lock" aria-hidden="true"></div>
  </div>`;
}

export const cubeTransform = (rx, ry) => `rotateX(${rx}deg) rotateY(${ry}deg)`;

// Un dado chiquito en SVG (para el registro, el consejo y la tarjeta)
export function miniDie(v, size = 18, cls = "") {
  const grid = (p) => { const r = Math.floor((p - 1) / 3), c = (p - 1) % 3; return [0.25 + c * 0.25, 0.25 + r * 0.25]; };
  return `<svg class="mini-die ${cls}" width="${size}" height="${size}" viewBox="0 0 1 1" aria-label="${v}" role="img">
    <rect x="0.04" y="0.04" width="0.92" height="0.92" rx="0.2" class="md-body"/>
    ${PIPS[v].map((p) => { const [x, y] = grid(p); return `<circle cx="${x}" cy="${y}" r="${v === 1 ? 0.13 : 0.09}" class="md-pip ${v === 1 ? "one" : ""}"/>`; }).join("")}
  </svg>`;
}
