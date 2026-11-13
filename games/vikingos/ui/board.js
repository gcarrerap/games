// El mar de Vikingos en SVG: las 9 piezas, los barcos y las flechas de la orilla. Coordenadas: el centro de la
// pieza (r, c) está en (c, r); cada pieza es un disco de radio R que se encima con sus vecinas.
//
// Cada pieza se dibuja con giro 0 en su propio marco y luego se gira con rotate(); así una animación SMIL de la
// pieza gira también los barcos que van en ella. Los demás barcos se dibujan encima, en coordenadas del tablero.
//
// Lo que se mueve: el oleaje del mar (un patrón que avanza), los remolinos que giran despacio, los barcos que se
// mecen y las flechas que esperan su barco. Cuando pasa algo: ondas al girar una pieza, destellos cuando un barco
// llega a su flecha, la pieza trabada que tiembla y confeti al ganar. Con `still` (prefers-reduced-motion) no hay
// nada de eso: solo el dibujo quieto.
import { notches, sidesOf, COLORS } from "../engine/board.js";

export const R = 0.62;
const TH = Math.acos(0.5 / R); // medio ángulo de una muesca, visto desde el centro de la pieza
const PHI = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // N, E, S, O en el SVG (y hacia abajo)
const U = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const f = (x) => Math.round(x * 1000) / 1000;
const pt = (a, r = R) => `${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}`;

export const COLOR_NAME = { R: "rojo", G: "verde", Y: "amarillo", B: "azul" };

// Cuánto dura el giro animado de una pieza (en segundos); la mesa lo usa para sincronizar el sonido
export const spinSecs = (turns) => 0.32 + 0.16 * (turns === 2 ? 2 : 1);

// El contorno de una pieza con sus muescas en los lados `ns` (marco propio, centro en 0,0)
export function piecePath(ns) {
  let d = `M ${pt(PHI[0] + TH)}`;
  for (let k = 1; k <= 4; k++) {
    const s = k % 4, a = PHI[0] + k * Math.PI / 2;
    d += ` A ${R} ${R} 0 0 1 ${pt(a - TH)}`; // la orilla llena hasta el siguiente lado
    d += ns.includes(s) ? ` A ${R} ${R} 0 0 0 ${pt(a + TH)}` : ` A ${R} ${R} 0 0 1 ${pt(a + TH)}`; // muesca o lleno
  }
  return d + " Z";
}

// Una espiral de tres brazos para el remolino
function spiral() {
  const arms = [];
  for (let k = 0; k < 3; k++) {
    let d = "";
    for (let s = 0; s <= 26; s++) {
      const th = k * (2 * Math.PI / 3) + s * 0.26, r = 0.06 + s * 0.0185;
      d += `${s ? " L" : "M"} ${f(Math.cos(th) * r)} ${f(Math.sin(th) * r)}`;
    }
    arms.push(`<path class="arm" d="${d}"/>`);
  }
  return arms.join("");
}
const SPIRAL = spiral();

// Las rayas de adentro: espiral y anillos en el remolino, arcos de corriente en la corriente
function decor(kind, still) {
  if (kind === "C") {
    const spin = still ? "" : `<animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="26s" repeatCount="indefinite"/>`;
    return `<circle class="ring" r=".5"/><circle class="ring" r=".36"/><g class="swirl">${spin}${SPIRAL}</g><circle class="eye" r=".07"/>`;
  }
  // Corriente con muescas arriba y abajo: arcos paralelos a cada muesca
  const arc = (side, rr, cls) => {
    const cy = side === 0 ? -1 : 1;
    const half = Math.acos((1 + rr * rr - R * R) / (2 * rr)); // dónde corta el disco de la pieza
    const a0 = (side === 0 ? Math.PI / 2 : -Math.PI / 2) - half, a1 = a0 + 2 * half;
    const p = (a) => `${f(Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
    return `<path class="${cls}" d="M ${p(a0)} A ${rr} ${rr} 0 0 1 ${p(a1)}"/>`;
  };
  return [0, 2].map((sd) => arc(sd, R + 0.12, "flowl") + arc(sd, R + 0.27, "flowl b") + arc(sd, R + 0.42, "flowl")).join("") +
    `<path class="mid" d="M -.5 0 Q -.25 -.05 0 0 T .5 0"/>`;
}

// Un drakkar visto desde arriba, a lo largo del eje x, centrado en 0,0 (se gira para cada lente)
function boatShape(col, { extra = "", mini = false, still = false } = {}) {
  if (mini) return `<g class="boat b${col}${extra}"><path class="hull" d="M -.36 0 C -.22 -.17 .22 -.17 .36 0 C .22 .17 -.22 .17 -.36 0 Z"/>
    <rect class="sail" x="-.1" y="-.16" width=".2" height=".32" rx=".05"/></g>`;
  const shields = [-0.17, -0.06, 0.05, 0.16].map((x, k) => [-1, 1].map((s) =>
    `<circle class="shield${(k + (s > 0 ? 1 : 0)) % 2 ? " alt" : ""}" cx="${x}" cy="${f(s * 0.088)}" r=".028"/>`).join("")).join("");
  const oars = [-0.12, 0, 0.12].map((x) => `M ${x} -.1 L ${f(x - 0.03)} -.19 M ${x} .1 L ${f(x - 0.03)} .19`).join(" ");
  return `<g class="boat b${col}${extra}"><g class="bob${still ? "" : " moving"}">
    <path class="oars" d="${oars}"/>
    <path class="hull" d="M -.36 0 C -.24 -.16 .24 -.16 .36 0 C .24 .16 -.24 .16 -.36 0 Z"/>
    <path class="deck" d="M -.28 0 C -.18 -.1 .18 -.1 .28 0 C .18 .1 -.18 .1 -.28 0 Z"/>
    <path class="prow" d="M .33 0 q .09 -.02 .07 -.08 q -.02 -.04 -.05 -.01 M -.33 0 q -.08 .03 -.06 .08 q .02 .03 .045 0"/>
    ${shields}
    <rect class="sail" x="-.075" y="-.17" width=".15" height=".34" rx=".04"/>
    <path class="stripes" d="M -.065 -.105 H .065 M -.07 -.035 H .07 M -.07 .035 H .07 M -.065 .105 H .065"/>
    <circle class="mast" r=".022"/>
  </g></g>`;
}

// Dónde va una lente: centro y si es vertical
export function lensSpot(lens) {
  const [[i, d]] = sidesOf(lens);
  const r = Math.floor(i / 3), c = i % 3;
  return { x: c + U[d][0] * 0.5, y: r + U[d][1] * 0.5, vertical: d === 1 || d === 3 };
}

const boatAt = (col, x, y, vertical, o) => `<g transform="translate(${f(x)} ${f(y)})${vertical ? " rotate(90)" : ""}">${boatShape(col, o)}</g>`;

// Flecha de la orilla (un banderín que apunta al tablero), con un aro dorado cuando su barco ya llegó
function arrowAt(col, lens, home, mini) {
  const t = lens[0], k = Number(lens[1]);
  const [x, y, rot] = t === "N" ? [k, -0.86, 90] : t === "S" ? [k, 2.86, -90] : t === "W" ? [-0.86, k, 0] : [2.86, k, 180];
  return `<g class="arrow a${col}${home ? " home" : ""}" transform="translate(${x} ${y}) rotate(${rot})">
    ${mini ? "" : `<circle class="port" r=".2"/>`}<g class="flag"><path d="M -.14 -.17 L .17 0 L -.14 .17 Q -.07 0 -.14 -.17 Z"/></g></g>`;
}

// Ondas al girar una pieza
const ripple = (x, y, delay = 0) => [0, 0.16].map((d) => `<circle class="ripple" cx="${x}" cy="${y}" r="${R}" opacity="0">
  <animate attributeName="r" from="${f(R - 0.05)}" to="${f(R + 0.28)}" begin="${f(delay + d)}s" dur=".8s" fill="freeze"/>
  <animate attributeName="opacity" values=".7;0" begin="${f(delay + d)}s" dur=".8s" fill="freeze"/></circle>`).join("");

// Destellos donde llegó un barco
function sparkle(x, y, delay) {
  const rays = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
    return `<line x1="${f(x + c * 0.12)}" y1="${f(y + s * 0.12)}" x2="${f(x + c * 0.13)}" y2="${f(y + s * 0.13)}" opacity="0">
      <animate attributeName="x2" to="${f(x + c * 0.42)}" begin="${f(delay)}s" dur=".6s" fill="freeze"/>
      <animate attributeName="y2" to="${f(y + s * 0.42)}" begin="${f(delay)}s" dur=".6s" fill="freeze"/>
      <animate attributeName="opacity" values="1;0" begin="${f(delay)}s" dur=".7s" fill="freeze"/></line>`;
  }).join("");
  return `<g class="sparkle">${rays}<circle cx="${x}" cy="${y}" r=".1" opacity="0">
    <animate attributeName="r" from=".1" to=".5" begin="${f(delay)}s" dur=".7s" fill="freeze"/>
    <animate attributeName="opacity" values=".9;0" begin="${f(delay)}s" dur=".7s" fill="freeze"/></circle></g>`;
}

// Confeti de escudos y velas al ganar (los números salen de una sucesión fija, sin azar)
function confetti(delay) {
  const cols = ["R", "G", "Y", "B", "gold"];
  return `<g class="confetti">${Array.from({ length: 36 }, (_, k) => {
    const x = -0.8 + ((k * 37) % 36) / 36 * 3.6, x2 = x + (((k * 13) % 7) - 3) * 0.12;
    const d = delay + ((k * 11) % 9) * 0.08, dur = 1.6 + ((k * 7) % 5) * 0.2, spin = ((k % 2) ? 1 : -1) * (360 + (k % 4) * 180);
    const shape = k % 3 === 0 ? `<circle r=".06"/>` : `<rect x="-.06" y="-.035" width=".12" height=".07" rx=".015"/>`;
    return `<g class="c${cols[k % 5]}" opacity="0"><animate attributeName="opacity" values="1;1;0" keyTimes="0;.8;1" begin="${f(d)}s" dur="${f(dur)}s" fill="freeze"/>
      <animateTransform attributeName="transform" type="translate" from="${f(x)} -1" to="${f(x2)} 3.1" begin="${f(d)}s" dur="${f(dur)}s" fill="freeze"/>
      <g>${shape}<animateTransform attributeName="transform" type="rotate" from="0" to="${spin}" begin="${f(d)}s" dur="${f(dur)}s" fill="freeze"/></g></g>`;
  }).join("")}</g>`;
}

function defs(still) {
  const waves = `<pattern id="vk-waves" width=".6" height=".34" patternUnits="userSpaceOnUse">
      ${still ? "" : `<animateTransform attributeName="patternTransform" type="translate" from="0 0" to=".6 0" dur="9s" repeatCount="indefinite"/>`}
      <path d="M 0 .1 Q .15 .04 .3 .1 T .6 .1" /><path d="M -.15 .27 Q 0 .21 .15 .27 T .45 .27 T .75 .27"/></pattern>`;
  return `<defs>
    <radialGradient id="vk-g-piece" cx=".42" cy=".38" r=".7"><stop offset="0" style="stop-color:var(--vk-p1)"/><stop offset=".75" style="stop-color:var(--vk-p2)"/><stop offset="1" style="stop-color:var(--vk-p3)"/></radialGradient>
    <linearGradient id="vk-g-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--vk-w1)"/><stop offset=".5" style="stop-color:var(--vk-w2)"/><stop offset="1" style="stop-color:var(--vk-w3)"/></linearGradient>
    <radialGradient id="vk-g-sea" cx=".5" cy=".45" r=".75"><stop offset="0" style="stop-color:var(--vk-sea1)"/><stop offset="1" style="stop-color:var(--vk-sea2)"/></radialGradient>
    <filter id="vk-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx=".015" dy=".035" stdDeviation=".03" flood-color="#00142a" flood-opacity=".45"/></filter>
    ${waves}
    ${["C", "X"].map((k) => `<clipPath id="vk-clip-${k}"><path d="${piecePath(notches(k, 0))}"/></clipPath>`).join("")}
  </defs>`;
}

// Las vetas y el cordel del marco de madera, y un escudo en cada esquina
function frame(mini) {
  if (mini) return `<rect class="frame" x="-1" y="-1" width="4" height="4" rx=".3"/>`;
  const grain = [-0.93, -0.84, 2.84, 2.93].map((v) => `<path class="grain" d="M -.9 ${v} Q .5 ${f(v + 0.02)} 1 ${v} T 2.9 ${v}"/><path class="grain" d="M ${v} -.9 Q ${f(v + 0.02)} .5 ${v} 1 T ${v} 2.9"/>`).join("");
  const corner = (x, y) => `<g class="cshield" transform="translate(${x} ${y})"><circle r=".14"/><path d="M -.14 0 H .14 M 0 -.14 V .14"/><circle class="boss" r=".04"/></g>`;
  return `<rect class="frame" x="-1" y="-1" width="4" height="4" rx=".3" fill="url(#vk-g-wood)"/>${grain}
    <rect class="rope" x="-.8" y="-.8" width="3.6" height="3.6" rx=".24"/>
    ${corner(-0.82, -0.82)}${corner(2.82, -0.82)}${corner(-0.82, 2.82)}${corner(2.82, 2.82)}`;
}

// opts: { sel, can: [piezas que se pueden girar], advice: pieza, fresh: last para animar, arrived: [colores que
//         acaban de llegar], shake: pieza que tiembla, celebrate: confeti, still: sin animación,
//         mini: dibujo chico sin rayas, efectos ni zonas para tocar }
export function boardSVG(st, opts = {}) {
  const { sel = -1, can = [], advice = -1, fresh = null, arrived = [], shake = -1, celebrate = false, still = false, mini = false } = opts;
  const anim = !mini && !still && fresh && (fresh.type === "rotate" || fresh.type === "undo") ? fresh : null;
  const moving = anim ? new Set(anim.boats) : new Set();
  const spin = anim ? spinSecs(anim.turns) : 0;
  const out = [];
  out.push(`<svg class="vk-board${mini ? " mini" : ""}${still ? " still" : ""}" viewBox="-1.05 -1.05 4.1 4.1" ${mini ? `aria-hidden="true"` : `role="img" aria-label="${esc(describe(st))}"`} xmlns="http://www.w3.org/2000/svg">`);
  if (!mini) out.push(defs(still));
  out.push(frame(mini));
  out.push(`<rect class="sea" x="-.74" y="-.74" width="3.48" height="3.48" rx=".22"${mini ? "" : ` fill="url(#vk-g-sea)"`}/>`);
  if (!mini) out.push(`<rect class="waves" x="-.74" y="-.74" width="3.48" height="3.48" rx=".22" fill="url(#vk-waves)"/>`);

  const pieceSVG = (i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const kind = st.kinds[i], rot = st.rots[i];
    const ns = notches(kind, 0);
    const cls = ["piece", kind === "C" ? "whirl" : "flow", can.includes(i) ? "can" : "", sel === i ? "sel" : "", advice === i ? "adv" : ""].join(" ").trim();
    const inner = mini ? `<path class="body" d="${piecePath(ns)}"/>`
      : `<path class="body" d="${piecePath(ns)}" fill="url(#vk-g-piece)" filter="url(#vk-shadow)"/><g class="lines" clip-path="url(#vk-clip-${kind})">${decor(kind, still)}</g><path class="edge" d="${piecePath(ns)}"/>`;
    let boats = "";
    if (anim && anim.piece === i) {
      // Los barcos que giran con ella van en su marco: su lado actual, deshecho el giro de la pieza
      for (const col of anim.boats) {
        const [[, d]] = sidesOf(st.boats[col]).filter(([p]) => p === i);
        const ld = (d - rot + 4) % 4;
        boats += boatAt(col, U[ld][0] * 0.5, U[ld][1] * 0.5, ld === 1 || ld === 3, { extra: home(st, col) ? " home" : "", still });
      }
    }
    const deg = rot * 90;
    let turn = "";
    if (anim && anim.piece === i) {
      const delta = anim.turns === 3 ? -90 : anim.turns * 90;
      turn = `<animateTransform attributeName="transform" type="rotate" from="${deg - delta}" to="${deg}" dur="${f(spin)}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .2 1"/>`;
    }
    return `<g class="slot" data-piece="${i}" transform="translate(${c} ${r})"><g class="${shake === i ? "shk" : ""}">
      <g transform="rotate(${deg})">${turn}<g class="${cls}">${inner}</g>${boats}</g>
      ${!mini ? `<circle class="hit" r="${f(R * 0.92)}"/>` : ""}</g></g>`;
  };

  const order = [...Array(9).keys()].filter((i) => !(anim && anim.piece === i));
  for (const i of order) out.push(pieceSVG(i));
  // Las orillas de las piezas que se pueden girar, la escogida y la del consejo (encima de las piezas)
  if (!mini) for (let i = 0; i < 9; i++) {
    const cls = sel === i ? "sel" : advice === i ? "adv" : can.includes(i) ? "can" : "";
    if (cls) out.push(`<circle class="halo ${cls}" cx="${i % 3}" cy="${Math.floor(i / 3)}" r="${f(R + 0.04)}"/>`);
  }
  // Flechas
  for (const col of COLORS) if (st.arrows[col]) out.push(arrowAt(col, st.arrows[col], home(st, col), mini));
  // Barcos quietos
  for (const col of COLORS) {
    if (!st.boats[col] || moving.has(col)) continue;
    const s = lensSpot(st.boats[col]);
    out.push(boatAt(col, s.x, s.y, s.vertical, { extra: home(st, col) ? " home" : "", mini, still }));
  }
  // La pieza que gira, encima de todo, con sus ondas
  if (anim) {
    out.push(pieceSVG(anim.piece));
    out.push(`<g class="fx">${ripple(anim.piece % 3, Math.floor(anim.piece / 3))}</g>`);
  }
  if (!mini && !still) {
    const fx = [];
    for (const col of arrived) if (st.boats[col]) { const s = lensSpot(st.boats[col]); fx.push(sparkle(f(s.x), f(s.y), spin)); }
    if (celebrate) fx.push(confetti(spin + 0.2));
    if (fx.length) out.push(`<g class="fx">${fx.join("")}</g>`);
  }
  out.push(`</svg>`);
  return out.join("");
}

const home = (st, col) => st.boats[col] === st.arrows[col];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Para lectores de pantalla: dónde va cada barco y su flecha
export function describe(st) {
  const where = (L) => {
    const t = L[0];
    if ("NSWE".includes(t)) return { N: "arriba", S: "abajo", W: "a la izquierda", E: "a la derecha" }[t] + ` (${Number(L[1]) + 1})`;
    return "entre dos piezas";
  };
  return "Tablero de 3 por 3. " + COLORS.filter((c) => st.boats[c]).map((c) => `Barco ${COLOR_NAME[c]} ${home(st, c) ? "ya llegó a su flecha" : `${where(st.boats[c])}, su flecha está ${where(st.arrows[c])}`}`).join(". ");
}

// El drakkar de lado, para el encabezado del selector de retos
export function bannerSVG(still = false) {
  const bob = still ? "" : `<animateTransform attributeName="transform" type="rotate" values="-2 60 40;2 60 40;-2 60 40" dur="4s" repeatCount="indefinite"/>`;
  const wave = (y, cls) => `<path class="${cls}" d="M -40 ${y} ${Array.from({ length: 24 }, (_, k) => `Q ${-30 + k * 20} ${y - 6} ${-20 + k * 20} ${y} T ${k * 20} ${y}`).join(" ")} V 70 H -40 Z"/>`;
  const drift = (dur, rev) => still ? "" : `<animateTransform attributeName="transform" type="translate" values="${rev ? "-40 0;0 0" : "0 0;-40 0"}" dur="${dur}s" repeatCount="indefinite"/>`;
  return `<svg class="vk-banner" viewBox="0 0 400 70" preserveAspectRatio="xMidYMax slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <g>${drift(5, false)}${wave(50, "w2")}</g>
    <g transform="translate(140 0)"><g>${bob}
      <path class="mast" d="M 60 6 V 44"/>
      <path class="sail" d="M 40 10 H 80 Q 84 26 80 38 H 40 Q 36 26 40 10 Z"/>
      <path class="stripe" d="M 48 10 Q 47 24 48 38 M 60 10 V 38 M 72 10 Q 73 24 72 38"/>
      <path class="hull" d="M 18 40 Q 20 36 26 42 H 94 Q 100 36 102 40 Q 96 54 60 55 Q 24 54 18 40 Z"/>
      <path class="head" d="M 100 41 Q 108 30 104 22 Q 101 18 97 21 Q 100 24 98 27"/>
      <path class="tail" d="M 20 41 Q 13 33 17 26 Q 19 24 21 27"/>
      ${[32, 44, 56, 68, 80, 92].map((x, k) => `<circle class="shield${k % 2 ? " alt" : ""}" cx="${x - 3}" cy="44" r="4.5"/>`).join("")}
    </g></g>
    <g>${drift(3.5, true)}${wave(57, "w1")}</g>
  </svg>`;
}
