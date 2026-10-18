// Las imágenes de la carrera: perros, caras, tapetes, tazón, croqueta y texturas de la pista.
//
// Banco de imágenes: si `assets/bank.js` trae la llave, se usa esa imagen (ilustraciones de Petra). Si no, un
// respaldo provisional hecho con CSS y emoji, solo para que se pueda jugar mientras llegan las imágenes. Las llaves
// y su formato están en assets/README.md.
import { BANK } from "../assets/bank.js";
import { DOGS } from "../engine/index.js";
import { esc } from "../../../platform/ui/dom.js";

// Todas las llaves que la mesa sabe usar (la prueba del banco no deja meter otras)
export const KEYS = [
  ...DOGS.map((d) => `dog-${d.id}`), // el perro corriendo, de lado, mirando a la derecha
  ...DOGS.map((d) => `dog-${d.id}-up`), // corriendo hacia arriba, de espaldas (#49)
  ...DOGS.map((d) => `dog-${d.id}-down`), // corriendo hacia abajo, de frente (#49)
  ...DOGS.map((d) => `face-${d.id}`), // la cara del perro en un círculo (boletos, dados, cartas)
  "hueso", "aspiradora", // los dos lados del tapete
  "tazon", "croqueta",
  "cell", "cell-meta", "infield", // texturas de la pista: casilla, casilla con la meta, el pasto del centro
  "fondo", // fondo de la página en el teléfono
  "portada", // portada del juego
  // La tele (issue #35): los mismos dibujos en alta. Solo los pide la mesa de la tele (`useTv`), así que el teléfono
  // no baja nada de más.
  ...DOGS.map((d) => `dog-${d.id}@tv`),
  ...DOGS.map((d) => `dog-${d.id}-up@tv`),
  ...DOGS.map((d) => `dog-${d.id}-down@tv`),
  ...DOGS.map((d) => `face-${d.id}@tv`),
  "fondo-tele", // fondo de la tele, 16:9
  "portada@tv", // pantalla de espera de la tele (manifest.tvCover)
];

// ¿Esta mesa es la tele? Entonces cada dibujo busca primero su versión "@tv"
let tv = false;
export function useTv(on) { tv = !!on; }
const pick = (key) => (tv && BANK[key + "@tv"] ? BANK[key + "@tv"] : BANK[key]);

export const has = (key) => !!BANK[key];
export const href = (key) => (BANK[key] ? BANK[key].href : null);

const initial = (d) => DOGS[d].name[0];

// El perro corriendo (en la pista), mirando hacia `facing` (ver facing.js): derecha y arriba/abajo con su imagen,
// izquierda la de lado en espejo. Si falta la vista de frente o de espaldas, cae a la de lado.
export function dogArt(d, facing = "right", cls = "") {
  const id = DOGS[d].id;
  const view = (facing === "up" || facing === "down") && pick(`dog-${id}-${facing}`);
  const img = view || pick(`dog-${id}`);
  const flip = !view && facing === "left" ? "flip" : "";
  if (img) return `<img class="dogimg ${flip} ${cls}" src="${esc(img.href)}" alt="${esc(DOGS[d].name)}" draggable="false">`;
  return `<span class="dogtok ${flip} ${cls}" data-dog="${id}" role="img" aria-label="${esc(DOGS[d].name)}"><i>🐕</i><b>${initial(d)}</b></span>`;
}

// Las tres vistas encimadas, para la animación: muestra una a la vez cambiando su opacidad (fx.js). La de lado va en
// el flujo; las de espaldas y de frente, encima, del mismo tamaño (mismo lienzo).
export function dogViews(d) {
  const id = DOGS[d].id;
  const alt = ["up", "down"].map((f) => {
    const img = pick(`dog-${id}-${f}`);
    return img ? `<img class="dogimg view view-${f}" src="${esc(img.href)}" alt="" draggable="false">` : "";
  }).join("");
  return dogArt(d, "right", "view view-side") + alt;
}

// La cara del perro en un círculo de su color
export function faceArt(d, cls = "") {
  const img = pick(`face-${DOGS[d].id}`);
  if (img) return `<span class="face ${cls}" data-dog="${DOGS[d].id}"><img src="${esc(img.href)}" alt="${esc(DOGS[d].name)}" draggable="false"></span>`;
  return `<span class="face ${cls}" data-dog="${DOGS[d].id}" role="img" aria-label="${esc(DOGS[d].name)}"><i>🐶</i></span>`;
}

const EMOJI = { hueso: "🦴", aspiradora: "🌪️", tazon: "🥣", croqueta: "🍪" };

// Imagen de una cosa (tapete, tazón, croqueta) o su emoji
export function thingArt(key, cls = "") {
  if (BANK[key]) return `<img class="thing ${cls}" src="${esc(BANK[key].href)}" alt="" draggable="false">`;
  return `<span class="thing emoji ${cls}" aria-hidden="true">${EMOJI[key] || ""}</span>`;
}

// Las texturas como variables de CSS, para ponerlas en la mesa (las que no existen se quedan con el color de respaldo)
export function textureVars() {
  const vars = { cell: "--ch-cell-img", "cell-meta": "--ch-meta-img", infield: "--ch-infield-img", [tv ? "fondo-tele" : "fondo"]: "--ch-fondo-img" };
  return Object.entries(vars).filter(([k]) => BANK[k]).map(([k, v]) => `${v}:url("${BANK[k].href}")`).join(";");
}
