// Resolver un reto de Vikingos: búsqueda a lo ancho sobre (giro de cada pieza, lente de cada barco). Da la
// solución más corta, contando cada giro de 90°, 180° o 270° como un movimiento. Puro y sin azar.
//
// Cada posición se guarda como un solo número: 2 bits por pieza (su giro) y 5 bits por barco (su lente, 0..23).
// Los retos más difíciles del cuadernillo revisan unos cientos de miles de posiciones.
import { notches, lensOf, ALL_LENSES, solved, COLORS } from "../engine/board.js";

const LENS = new Map(ALL_LENSES.map((L, i) => [L, i]));
// Vecina de cada pieza por lado (-1 en la orilla)
const NEIGHBOR = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return [r > 0 ? i - 3 : -1, c < 2 ? i + 1 : -1, r < 2 ? i + 3 : -1, c > 0 ? i - 1 : -1];
});
// La lente (índice) del lado d de cada pieza
const SIDE_LENS = Array.from({ length: 9 }, (_, i) => [0, 1, 2, 3].map((d) => LENS.get(lensOf(i, d))));

// b = { kinds, rots, boats, arrows }. Devuelve la lista de movimientos [{ piece, turns }, …] (vacía si ya está
// resuelto) o null si no tiene solución. limit: cuántas posiciones revisar como máximo.
export function solve(b, limit = 3_000_000) {
  if (solved(b)) return [];
  const cols = COLORS.filter((c) => b.boats[c] !== undefined);
  const nb = cols.length;
  const goal = cols.map((c) => LENS.get(b.arrows[c]));
  // mask[i][r]: lados con muesca de la pieza i con giro r (4 bits)
  const mask = b.kinds.map((k) => [0, 1, 2, 3].map((r) => notches(k, r).reduce((m, d) => m | (1 << d), 0)));

  const RB = 2 ** 18; // los giros van en los 18 bits bajos; los barcos, arriba
  const encode = (rots, pos) => {
    let x = 0;
    for (let i = 8; i >= 0; i--) x = x * 4 + rots[i];
    let y = 0;
    for (let j = nb - 1; j >= 0; j--) y = y * 32 + pos[j];
    return y * RB + x;
  };
  const rots = new Array(9), pos = new Array(nb);
  const decode = (key) => {
    let x = key % RB, y = Math.floor(key / RB);
    for (let i = 0; i < 9; i++) { rots[i] = x & 3; x >>= 2; }
    for (let j = 0; j < nb; j++) { pos[j] = y % 32; y = Math.floor(y / 32); }
  };

  const start = encode(b.rots, cols.map((c) => LENS.get(b.boats[c])));
  const prev = new Map([[start, -1]]); // posición → posición anterior · 64 + movimiento (pieza · 4 + giro)
  let frontier = [start];
  const nr = new Array(9), np = new Array(nb);
  while (frontier.length) {
    const next = [];
    for (const key of frontier) {
      decode(key);
      for (let i = 0; i < 9; i++) {
        const m = mask[i][rots[i]];
        // ¿Hay un barco en una de sus muescas?
        let has = false;
        for (let j = 0; j < nb && !has; j++) for (let d = 0; d < 4; d++) if ((m >> d) & 1 && SIDE_LENS[i][d] === pos[j]) { has = true; break; }
        if (!has) continue;
        // ¿Alguna vecina la traba?
        let blocked = false;
        for (let d = 0; d < 4; d++) {
          const n = NEIGHBOR[i][d];
          if (n >= 0 && !((mask[n][rots[n]] >> ((d + 2) % 4)) & 1)) { blocked = true; break; }
        }
        if (blocked) continue;
        for (let k = 1; k <= 3; k++) {
          for (let t = 0; t < 9; t++) nr[t] = rots[t];
          nr[i] = (rots[i] + k) % 4;
          let done = true;
          for (let j = 0; j < nb; j++) {
            np[j] = pos[j];
            for (let d = 0; d < 4; d++) if ((m >> d) & 1 && SIDE_LENS[i][d] === pos[j]) { np[j] = SIDE_LENS[i][(d + k) % 4]; break; }
            if (np[j] !== goal[j]) done = false;
          }
          const nk = encode(nr, np);
          if (prev.has(nk)) continue;
          prev.set(nk, key * 64 + i * 4 + k);
          if (done) return pathTo(prev, nk);
          if (prev.size > limit) return null;
          next.push(nk);
        }
      }
    }
    frontier = next;
  }
  return null;
}

function pathTo(prev, key) {
  const out = [];
  for (let p = prev.get(key); p >= 0; p = prev.get(Math.floor(p / 64))) {
    const mv = p % 64;
    out.push({ piece: Math.floor(mv / 4), turns: mv % 4 });
  }
  return out.reverse();
}
