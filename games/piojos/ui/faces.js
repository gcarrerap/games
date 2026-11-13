// Las caras de los dados de póker (9, 10, J, Q, K, As) para los cubos 3D de modules/dice: el lugar 1 del cubo es el 9,
// el 2 el 10… y el 6 el As (opuestos: 9 y As, 10 y K, J y Q). Los piojos (9, 10 y As) llevan un aro dorado.
import { FACES, isLouse } from "../engine/index.js";

const SUIT = { 9: "♣", 10: "♥", J: "♠", Q: "♦", K: "♣", A: "♠" };
const RED = new Set(["10", "Q"]);
const WORD = { 9: "nueve", 10: "diez", J: "jota", Q: "reina", K: "rey", A: "as" };

export const slotOf = (face) => FACES.indexOf(face) + 1;
export const faceWord = (f) => WORD[f] || f;

// Lo de adentro de una cara del cubo (lugar 1–6)
export function pokerFace(slot) {
  const f = FACES[slot - 1];
  return `<span class="pk ${RED.has(f) ? "red" : ""} ${isLouse(f) ? "louse" : ""} pk-${f}"><b>${f}</b><em>${SUIT[f]}</em></span>`;
}

// Una cara chiquita en línea (registro, resultado)
export const miniFace = (f) => `<span class="pkmini ${RED.has(f) ? "red" : ""} ${isLouse(f) ? "louse" : ""}" aria-label="${faceWord(f)}">${f}</span>`;
