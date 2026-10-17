// Dibujo de los discos: flor, calavera y boca abajo.
//
// Banco de imágenes: si `assets/bank.js` trae la imagen de una cara (flower, skull, back), se usa esa (un <image>);
// si no, el dibujo SVG de aquí, con los colores de styles/table.css. Ver assets/README.md.
import { BANK } from "../assets/bank.js";

const petals = [0, 72, 144, 216, 288].map((a) => {
  const r = (a - 90) * Math.PI / 180;
  return `<circle cx="${(20 + 6.5 * Math.cos(r)).toFixed(2)}" cy="${(20 + 6.5 * Math.sin(r)).toFixed(2)}" r="5" class="petal"/>`;
}).join("");

const FACES = {
  F: `<circle cx="20" cy="20" r="18" class="dface flower"/>${petals}<circle cx="20" cy="20" r="3.6" class="pistil"/>`,
  S: `<circle cx="20" cy="20" r="18" class="dface skull"/>
      <path class="bone" d="M20 8.5c-6.4 0-10.5 4.3-10.5 10 0 3.4 1.6 5.7 3.8 7v4.2c0 1 .8 1.8 1.8 1.8h9.8c1 0 1.8-.8 1.8-1.8v-4.2c2.2-1.3 3.8-3.6 3.8-7 0-5.7-4.1-10-10.5-10z"/>
      <circle cx="15.8" cy="19" r="3" class="hole"/><circle cx="24.2" cy="19" r="3" class="hole"/>
      <path class="hole" d="M20 22.6l-1.7 2.8h3.4z"/>
      <path class="crack" d="M17.6 27.2v4.4M20 27.2v4.4M22.4 27.2v4.4"/>`,
  back: `<circle cx="20" cy="20" r="18" class="dface back"/><circle cx="20" cy="20" r="11" class="ring"/><circle cx="20" cy="20" r="4" class="ring"/>`,
};

// La llave del banco de cada cara
export const BANK_KEY = { F: "flower", S: "skull", back: "back" };

function face(key) {
  const img = BANK[BANK_KEY[key]];
  return img ? `<image href="${img.href}" x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid meet"/>` : FACES[key];
}

// disc: "F", "S" o null (boca abajo)
export function discSVG(disc, size = 40) {
  return `<svg class="disc" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${face(disc || "back")}</svg>`;
}

export const discName = (d) => (d === "S" ? "calavera" : d === "F" ? "flor" : "disco boca abajo");
