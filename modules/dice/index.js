// Dados en 3D: lo puro (corre en Node). La parte que dibuja está en ui.js.
//
// Un dado tiene seis lugares (1 a 6, los opuestos suman 7: 1 al frente, 6 atrás, 2 arriba, 5 abajo, 3 a la derecha,
// 4 a la izquierda). Cada juego decide qué se pinta en cada lugar: pips de 1 a 6 en Yatzi, 9-10-J-Q-K-A en Piojos.

// Giro del cubo [x, y] en grados que deja ese lugar al frente
export const SHOW = { 1: [0, 0], 6: [0, 180], 2: [-90, 0], 5: [90, 0], 3: [0, -90], 4: [0, 90] };
// Dónde va cada cara dentro del cubo (transformación CSS)
export const FACE_AT = { 1: "rotateY(0deg)", 6: "rotateY(180deg)", 2: "rotateX(90deg)", 5: "rotateX(-90deg)", 3: "rotateY(90deg)", 4: "rotateY(-90deg)" };

// Lugares para n dados de tamaño d dentro de una caja { x, y, w, h }, sin encimarse si cabe (centros a más de
// 1.32 dados). rnd: azar en [0, 1). Si no caben, se queda con el más alejado de los demás.
export function pickSpots(n, box, d, rnd = Math.random) {
  const out = [], m = d * 0.35, min = d * 1.32;
  const r = (a, b) => a + rnd() * Math.max(0, b - a);
  for (let k = 0; k < n; k++) {
    let best = null;
    for (let t = 0; t < 60; t++) {
      const p = { x: box.x + r(m, box.w - d - m), y: box.y + r(m, box.h - d - m) };
      const dist = Math.min(Infinity, ...out.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
      if (dist >= min) { best = { x: p.x, y: p.y }; break; }
      if (!best || dist > best.dist) best = { ...p, dist };
    }
    out.push({ x: best.x, y: best.y });
  }
  return out;
}

// Los índices de una lista de caras con el mismo valor, o en escalera, etc. lo decide cada juego.
