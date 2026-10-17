// Un dado de póker en SVG. Los piojos (9, 10, As) se pintan dorados; las demás caras quedan apagadas tras el tiro.
import { isLouse } from "../engine/index.js";

const LABEL = { 9: "9", 10: "10", J: "J", Q: "Q", K: "K", A: "A" };
const WORD = { 9: "nueve", 10: "diez", J: "jota", Q: "reina", K: "rey", A: "as" };

export const faceWord = (f) => WORD[f] || f;

export function dieSVG(face, size = 56, { dim = false } = {}) {
  const louse = isLouse(face), r = size * 0.18, fs = face === "10" ? size * 0.42 : size * 0.5;
  return `<svg class="die ${louse ? "louse" : ""} ${dim ? "dim" : ""}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${faceWord(face)}${louse ? ", piojo" : ""}">
    <rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="${r}" class="die-body"/>
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-size="${fs.toFixed(1)}" class="die-face">${LABEL[face] || face}</text>
  </svg>`;
}

// Un dado sin tirar (boca abajo): solo el cuerpo
export function blankDieSVG(size = 56) {
  return `<svg class="die blank" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="${size * 0.18}" class="die-body"/></svg>`;
}
