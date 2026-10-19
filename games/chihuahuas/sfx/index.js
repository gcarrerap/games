// Los efectos de la carrera (el catálogo que toca modules/sfx). Cada llave es un .mp3 de esta carpeta.
// Para regenerar: node games/chihuahuas/sfx/generate.mjs (hace falta ELEVENLABS_API_KEY; ver el README del juego).
const file = (key) => new URL(`./${key}.mp3`, import.meta.url).href;

export const CLIP_KEYS = [
  "tazon-sacudir", "boleto-tomar", "tapete-hueso", "aspiradora-poner", "tapete-mover", "apuesta-secreta",
  "croqueta-ganar", "boton", "error",
  "ladrido-chia", "ladrido-oreo", "ladrido-gustavo", "ladrido-catrina", "ladrido-chocolate",
  "pasitos", "apilar", "caer-hueso", "caer-aspiradora",
  "fin-etapa", "pago-ganar", "pago-perder", "meta", "fin-carrera", "ganador",
  "te-toca", "turno-compu", "jugador-entra", "jugador-sale",
];

export const CLIPS = Object.fromEntries(CLIP_KEYS.map((k) => [k, file(k)]));

// Mínimo entre dos veces del mismo efecto. Los pasitos van a 380 ms (SHOW.step); el tope queda debajo para que
// cada casilla suene, y por encima de un redibujado accidental.
export function gapFor(key) {
  if (key === "pasitos") return 280;
  if (key === "pago-ganar" || key === "pago-perder" || key === "croqueta-ganar") return 200;
  if (key === "jugador-entra" || key === "jugador-sale") return 140;
  return 90;
}
