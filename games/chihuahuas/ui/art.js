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
  ...DOGS.map((d) => `face-${d.id}`), // la cara del perro en un círculo (boletos, dados, cartas)
  "hueso", "aspiradora", // los dos lados del tapete
  "tazon", "croqueta",
  "cell", "cell-meta", "infield", // texturas de la pista: casilla, casilla con la meta, el pasto del centro
  "fondo", // fondo de la página en el teléfono
  "portada", // portada del juego
];

export const has = (key) => !!BANK[key];
export const href = (key) => (BANK[key] ? BANK[key].href : null);

const initial = (d) => DOGS[d].name[0];

// El perro corriendo (en la pista)
export function dogArt(d, cls = "") {
  const k = `dog-${DOGS[d].id}`;
  if (BANK[k]) return `<img class="dogimg ${cls}" src="${esc(BANK[k].href)}" alt="${esc(DOGS[d].name)}" draggable="false">`;
  return `<span class="dogtok ${cls}" data-dog="${DOGS[d].id}" role="img" aria-label="${esc(DOGS[d].name)}"><i>🐕</i><b>${initial(d)}</b></span>`;
}

// La cara del perro en un círculo de su color
export function faceArt(d, cls = "") {
  const k = `face-${DOGS[d].id}`;
  if (BANK[k]) return `<span class="face ${cls}" data-dog="${DOGS[d].id}"><img src="${esc(BANK[k].href)}" alt="${esc(DOGS[d].name)}" draggable="false"></span>`;
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
  const vars = { cell: "--ch-cell-img", "cell-meta": "--ch-meta-img", infield: "--ch-infield-img", fondo: "--ch-fondo-img" };
  return Object.entries(vars).filter(([k]) => BANK[k]).map(([k, v]) => `${v}:url("${BANK[k].href}")`).join(";");
}
