// El mar de Vikingos: 9 piezas redondas en una rejilla de 3 × 3 que giran sobre su centro. Funciones puras.
//
// Geometría. Las piezas son discos que se enciman con sus vecinas; donde dos discos se enciman queda una "lente".
// Cada pieza tiene dos muescas (huecos con forma de lente) y en cada lente cabe a lo más una de las dos piezas:
//   - "C" (remolino): muescas en dos lados vecinos. Con giro 0, arriba (N) y a la derecha (E).
//   - "X" (corriente): muescas en lados opuestos. Con giro 0, arriba (N) y abajo (S).
// Girar una pieza k cuartos de vuelta (en el sentido del reloj) mueve sus muescas: el lado d pasa a (d + k) % 4.
//
// Lentes. Hay 24: 12 entre dos piezas y 12 en la orilla del tablero. Se nombran así:
//   "h<r><c>"  entre la pieza (r, c) y la de su derecha (r, c+1)     (lente vertical)
//   "v<r><c>"  entre la pieza (r, c) y la de abajo (r+1, c)          (lente horizontal)
//   "N<c>", "S<c>", "W<r>", "E<r>"  en la orilla: arriba, abajo, izquierda y derecha
// Una lente está "abierta" (es mar) cuando las piezas que la tocan tienen ahí su muesca. Los barcos navegan en
// lentes abiertas y las flechas de colores están en lentes de la orilla.
//
// Mover. Solo se gira una pieza con un barco: hace falta un barco en una de sus muescas (no se vale tocar el mar
// sin barco). Además, al girar, la parte llena de la pieza pasa por sus cuatro lados, así que la pieza se traba si
// alguna vecina tiene su parte llena metida en la lente que comparten: cada vecina debe tener su muesca hacia ella.
// Al girar, todos los barcos que están en sus muescas giran con ella (también los que comparten lente con una
// vecina). Se vale girar 90°, 180° o 270°; cada giro cuenta como un movimiento.

export const SIDES = ["N", "E", "S", "W"]; // 0..3, en el sentido del reloj
const DR = [[-1, 0], [0, 1], [1, 0], [0, -1]];
export const COLORS = ["R", "G", "Y", "B"]; // rojo, verde, amarillo, azul (el color de la vela)

export function notches(kind, rot) {
  const r = ((rot % 4) + 4) % 4;
  return kind === "C" ? [r, (r + 1) % 4] : [r, (r + 2) % 4];
}

// La lente del lado d de la pieza i (0..8, renglón por renglón)
export function lensOf(i, d) {
  const r = Math.floor(i / 3), c = i % 3;
  const rr = r + DR[d][0], cc = c + DR[d][1];
  if (rr < 0) return "N" + c;
  if (rr > 2) return "S" + c;
  if (cc < 0) return "W" + r;
  if (cc > 2) return "E" + r;
  if (d === 0) return "v" + rr + c;
  if (d === 2) return "v" + r + c;
  if (d === 3) return "h" + r + cc;
  return "h" + r + c;
}

// Las piezas que tocan una lente: [[pieza, lado de esa pieza], …] (una en la orilla, dos adentro)
export function sidesOf(lens) {
  const t = lens[0], a = Number(lens[1]), b = Number(lens[2]);
  switch (t) {
    case "N": return [[a, 0]];
    case "S": return [[6 + a, 2]];
    case "W": return [[a * 3, 3]];
    case "E": return [[a * 3 + 2, 1]];
    case "h": return [[a * 3 + b, 1], [a * 3 + b + 1, 3]];
    case "v": return [[a * 3 + b, 2], [(a + 1) * 3 + b, 0]];
    default: throw new Error("Lente desconocida: " + lens);
  }
}

export const ALL_LENSES = (() => {
  const out = [];
  for (let c = 0; c < 3; c++) out.push("N" + c);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (c < 2) out.push(`h${r}${c}`);
    if (r < 2) out.push(`v${r}${c}`);
  }
  for (let r = 0; r < 3; r++) out.push("W" + r, "E" + r);
  for (let c = 0; c < 3; c++) out.push("S" + c);
  return out;
})();

export const isEdge = (lens) => "NSWE".includes(lens[0]);

// ¿La pieza i tiene muesca en el lado d? (b = { kinds, rots })
const hasNotch = (b, i, d) => notches(b.kinds[i], b.rots[i]).includes(d);

// La lente está abierta (es mar): todas las piezas que la tocan tienen ahí su muesca
export const isOpen = (b, lens) => sidesOf(lens).every(([i, d]) => hasNotch(b, i, d));

// Las vecinas de i que no la dejan girar (tienen su parte llena en la lente que comparten)
export function blockers(b, i) {
  const r = Math.floor(i / 3), c = i % 3, out = [];
  for (let d = 0; d < 4; d++) {
    const rr = r + DR[d][0], cc = c + DR[d][1];
    if (rr < 0 || rr > 2 || cc < 0 || cc > 2) continue;
    const j = rr * 3 + cc;
    if (!hasNotch(b, j, (d + 2) % 4)) out.push(j);
  }
  return out;
}

// Los barcos en las muescas de la pieza i: [[color, lado], …]
export function boatsOn(b, i) {
  const out = [];
  for (const d of notches(b.kinds[i], b.rots[i])) {
    const L = lensOf(i, d);
    for (const col of COLORS) if (b.boats[col] === L) out.push([col, d]);
  }
  return out;
}

// Por qué no se puede girar la pieza i, o null si sí se puede
export function whyNot(b, i) {
  if (!Number.isInteger(i) || i < 0 || i > 8) return "Esa pieza no existe";
  if (!boatsOn(b, i).length) return "Solo se gira una pieza con un barco en su muesca";
  if (blockers(b, i).length) return "Esa pieza está trabada: una vecina tiene su parte llena metida en ella";
  return null;
}

export const canRotate = (b, i) => whyNot(b, i) === null;

// Gira la pieza i k cuartos de vuelta en el sentido del reloj (k = 1, 2, 3). Devuelve { rots, boats } nuevos.
// No revisa si se vale: para eso está whyNot().
export function rotate(b, i, k) {
  const rots = b.rots.slice();
  rots[i] = (rots[i] + k) % 4;
  const boats = { ...b.boats };
  for (const [col, d] of boatsOn(b, i)) boats[col] = lensOf(i, (d + k) % 4);
  return { rots, boats };
}

// Ya llegaron: cada barco junto a la flecha de su color
export const solved = (b) => Object.keys(b.arrows).every((col) => b.boats[col] === b.arrows[col]);

// Revisa que un reto esté bien armado. Devuelve la lista de problemas (vacía si está bien).
export function checkBoard(b) {
  const errs = [];
  for (const L of ALL_LENSES) {
    const s = sidesOf(L);
    if (s.length === 2 && !s.some(([i, d]) => hasNotch(b, i, d))) errs.push(`${L}: dos piezas llenas en la misma lente`);
  }
  const seen = new Set();
  for (const [col, L] of Object.entries(b.boats)) {
    if (!COLORS.includes(col)) errs.push(`barco de color desconocido: ${col}`);
    if (!ALL_LENSES.includes(L)) errs.push(`barco ${col}: lente desconocida ${L}`);
    else if (!isOpen(b, L)) errs.push(`barco ${col}: la lente ${L} no está abierta`);
    if (seen.has(L)) errs.push(`dos barcos en ${L}`);
    seen.add(L);
  }
  for (const [col, L] of Object.entries(b.arrows)) {
    if (!isEdge(L)) errs.push(`flecha ${col}: ${L} no está en la orilla`);
    if (!(col in b.boats)) errs.push(`flecha ${col} sin barco`);
  }
  for (const col of Object.keys(b.boats)) if (!(col in b.arrows)) errs.push(`barco ${col} sin flecha`);
  return errs;
}
