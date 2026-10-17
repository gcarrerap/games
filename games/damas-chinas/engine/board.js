// El tablero de damas chinas: una estrella de seis puntas con 121 hoyos.
//
// Coordenadas cúbicas de una rejilla hexagonal (x + y + z = 0). La estrella es la unión de dos triángulos grandes:
// el de los puntos con x, y, z ≥ -4 y el de los puntos con x, y, z ≤ 4. Donde se cruzan queda el hexágono del
// centro (61 hoyos); lo que sobra son las seis puntas de 10 hoyos cada una.
//
// Las puntas se numeran 0..5 dando la vuelta a la estrella; la de enfrente de la punta k es la (k + 3) % 6.
// Todo aquí es constante y puro: se calcula una vez al cargar el módulo.

export const SIZE = 4; // lado del hexágono del centro menos uno; cada punta tiene SIZE filas

// Las seis puntas, en orden alrededor de la estrella: qué condición cumple un hoyo de esa punta y su vértice
const CORNER_DEFS = [
  { test: (c) => c.x > SIZE, apex: { x: 8, y: -4, z: -4 } },
  { test: (c) => c.z < -SIZE, apex: { x: 4, y: 4, z: -8 } },
  { test: (c) => c.y > SIZE, apex: { x: -4, y: 8, z: -4 } },
  { test: (c) => c.x < -SIZE, apex: { x: -8, y: 4, z: 4 } },
  { test: (c) => c.z > SIZE, apex: { x: -4, y: -4, z: 8 } },
  { test: (c) => c.y < -SIZE, apex: { x: 4, y: -8, z: 4 } },
];

// Las seis direcciones de la rejilla
const DIRS = [
  [1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1],
];

const key = (x, z) => `${x},${z}`;
const inStar = (x, y, z) => (x >= -SIZE && y >= -SIZE && z >= -SIZE) || (x <= SIZE && y <= SIZE && z <= SIZE);

// Los hoyos, por filas (z) y de izquierda a derecha (x). Su número es su lugar en esta lista.
export const CELLS = [];
for (let z = -2 * SIZE; z <= 2 * SIZE; z++) {
  for (let x = -2 * SIZE; x <= 2 * SIZE; x++) {
    const y = -x - z;
    if (inStar(x, y, z)) CELLS.push({ x, y, z });
  }
}
const INDEX = new Map(CELLS.map((c, i) => [key(c.x, c.z), i]));
export const cellAt = (x, z) => (INDEX.has(key(x, z)) ? INDEX.get(key(x, z)) : -1);

// Vecinos y saltos por dirección: STEP[i][d] = el hoyo de al lado (o -1); JUMP[i][d] = el hoyo dos lugares más allá
export const STEP = CELLS.map((c) => DIRS.map(([dx, , dz]) => cellAt(c.x + dx, c.z + dz)));
export const JUMP = CELLS.map((c) => DIRS.map(([dx, , dz]) => cellAt(c.x + 2 * dx, c.z + 2 * dz)));

// Punta de cada hoyo (-1 si está en el hexágono del centro) y los hoyos de cada punta
export const CORNER_OF = CELLS.map((c) => CORNER_DEFS.findIndex((d) => d.test(c)));
export const CORNERS = CORNER_DEFS.map((_, k) => CELLS.map((_, i) => i).filter((i) => CORNER_OF[i] === k));
export const APEX = CORNER_DEFS.map((d) => cellAt(d.apex.x, d.apex.z));
export const opposite = (k) => (k + 3) % 6;

export function distance(a, b) {
  const p = CELLS[a], q = CELLS[b];
  return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z));
}

// Distancia de cada hoyo al vértice de cada punta: DIST[k][i]
export const DIST = APEX.map((a) => CELLS.map((_, i) => distance(i, a)));

// Qué punta le toca a cada asiento según cuántos juegan. Con 3 se juega en puntas alternas, así cada quien va
// hacia una punta vacía; con 4, dos parejas de puntas de frente.
export const SEAT_CORNERS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 6: [0, 1, 2, 3, 4, 5] };

// Posición en pantalla de cada hoyo (unidades de la rejilla; el centro es 0, 0). Las filas quedan horizontales.
export const PIXEL = CELLS.map((c) => ({ px: Math.sqrt(3) * (c.x + c.z / 2), py: 1.5 * c.z }));
// Ángulo (grados) en el que queda cada punta vista desde el centro
export const CORNER_ANGLE = APEX.map((i) => (Math.atan2(PIXEL[i].py, PIXEL[i].px) * 180) / Math.PI);
