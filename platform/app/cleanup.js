// Limpieza de mesas abandonadas (heredado de myDomino #13, #17): las mesas en línea se borran después de un rato
// sin ningún cambio. El límite depende del estado de la mesa. No hay servidor: lo hace cualquier teléfono que
// tenga un lobby abierto, y solo para las mesas de ese juego.
import { SKIP, updateTable } from "../services/index.js";
import { isEmptyTable } from "./table.js";

const MIN = 60 * 1000;
// Sin personas y sin empezar: margen corto para que no desaparezca mientras alguien se cambia de asiento
export const EMPTY_TABLE_GRACE_MS = 5 * MIN;
// Con personas sentadas pero sin empezar: quien se sentó y cerró la app sin levantarse
export const WAITING_TABLE_IDLE_MS = 60 * MIN;
// Partida empezada o terminada sin jugadas: largo para no borrar una partida que se pausó un rato
export const STARTED_TABLE_IDLE_MS = 6 * 60 * MIN;
export const CLEANUP_EVERY_MS = 60 * 1000;

export function idleLimitMs(t) {
  if (isEmptyTable(t)) return EMPTY_TABLE_GRACE_MS;
  if (t.status === "lobby") return WAITING_TABLE_IDLE_MS;
  return STARTED_TABLE_IDLE_MS;
}

// Mesas de la lista que ya pasaron su límite. updated: por código, cuándo se guardó cada una (ms).
export const staleTables = (list, updated, now) =>
  list.filter((t) => typeof updated[t.code] === "number" && now - updated[t.code] >= idleLimitMs(t));

const inFlight = new Set(); // mesas que ya se están borrando (para no pedirlo dos veces)

// Borra las mesas vencidas. Antes de borrar vuelve a leer la mesa en una transacción: si cambió desde entonces
// (alguien se sentó, alguien jugó), no se borra. Devuelve los códigos borrados.
export function cleanupInactiveTables(db, list, updated, now) {
  if (!db) return Promise.resolve([]);
  const jobs = [];
  for (const t of staleTables(list, updated, now)) {
    if (inFlight.has(t.code)) continue;
    inFlight.add(t.code);
    const limit = idleLimitMs(t);
    jobs.push(updateTable(db, t.code, (cur) => (cur.turn === t.turn && cur.round === t.round && cur.status === t.status
      && JSON.stringify(cur.seats) === JSON.stringify(t.seats) && idleLimitMs(cur) === limit ? null : SKIP))
      .then((skipped) => (skipped ? null : t.code))
      .catch(() => null) // ya no existe, o las reglas no lo permiten: no pasa nada
      .finally(() => inFlight.delete(t.code)));
  }
  return Promise.all(jobs).then((codes) => codes.filter(Boolean));
}
