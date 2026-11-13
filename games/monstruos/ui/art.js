import { CHARACTERS } from "../engine/index.js";
// Atlas 3 × 2: arte aprobado por Guillermo. El movimiento se aplica al recorte completo.
export function monster(id, extra = "") {
  const c = CHARACTERS[id];
  if (!c) return '<span class="mm-question" aria-hidden="true">?</span>';
  return `<span class="mm-monster ${extra}" aria-hidden="true" style="--col:${id % 3};--row:${Math.floor(id / 3)};--delay:${id * -.47}s"></span>`;
}
