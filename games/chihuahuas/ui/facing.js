// Hacia dónde mira un perro según la casilla (issue #49): siempre hacia donde corre.
//
// Avanzando: 1–4 a la derecha, 5–8 hacia arriba (lo vemos de espaldas), 9–12 a la izquierda y 13–16 hacia abajo (lo
// vemos de frente). Al cruzar la meta (más allá de la 16, se dibuja en la 1) también de frente. Las esquinas (5, 9 y
// 13) ya miran al tramo que sigue. Pura: sin DOM, para que la usen la pista, la animación y las pruebas.
import { RULES } from "../engine/index.js";

export const FACINGS = ["right", "up", "left", "down"];

export function facingAt(space) {
  if (space > RULES.track) return "down"; // la meta
  if (space <= 4) return "right";
  if (space <= 8) return "up";
  if (space <= 12) return "left";
  return "down";
}

// Corriendo en sentido contrario (la aspiradora) se usa la vista contraria
const OPPOSITE = { right: "left", left: "right", up: "down", down: "up" };
export const opposite = (f) => OPPOSITE[f];

// Hacia dónde mira al caer en `to` viniendo de `from`: hacia adelante, como la casilla; hacia atrás, la contraria
export const facingStep = (from, to) => (to >= from ? facingAt(to) : opposite(facingAt(to)));
