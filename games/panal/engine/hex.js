// Geometría de la colmena: casillas hexagonales en coordenadas axiales (q, r). Puro.
//
// Cada casilla se guarda como el texto "q,r" para que el estado sea JSON simple. Los seis vecinos, en orden
// alrededor de la casilla (cada uno toca al siguiente), son:
//
//        (0,-1)  (1,-1)
//    (-1,0)   ·    (1,0)
//        (-1,1)  (0,1)
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export const key = (q, r) => `${q},${r}`;
export function parse(k) { const i = k.indexOf(","); return [Number(k.slice(0, i)), Number(k.slice(i + 1))]; }
export const step = (k, d) => { const [q, r] = parse(k); return key(q + DIRS[d][0], r + DIRS[d][1]); };
export const neighbors = (k) => DIRS.map((_, d) => step(k, d));
// Las dos casillas que tocan a la vez a a y a su vecina en la dirección d (las "puertas" por donde se pasa)
export const sides = (a, d) => [step(a, (d + 5) % 6), step(a, (d + 1) % 6)];
export function dirTo(a, b) { for (let d = 0; d < 6; d++) if (step(a, d) === b) return d; return -1; }

// ¿Siguen unidas todas las casillas de `occ` (un Set)? Una colmena vacía o de una casilla está unida.
export function connected(occ) {
  if (occ.size <= 1) return true;
  const start = occ.values().next().value, seen = new Set([start]), stack = [start];
  while (stack.length) for (const n of neighbors(stack.pop())) if (occ.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
  return seen.size === occ.size;
}

// Casillas que, si se quitan, parten la colmena en dos (puntos de articulación, algoritmo de Tarjan sin recursión)
export function cutCells(occ) {
  const out = new Set();
  if (occ.size < 3) return out;
  const disc = new Map(), low = new Map(), parent = new Map();
  let time = 0;
  const root = occ.values().next().value;
  disc.set(root, time); low.set(root, time++); parent.set(root, null);
  const stack = [[root, neighbors(root).filter((n) => occ.has(n)), 0]];
  let rootKids = 0;
  while (stack.length) {
    const top = stack[stack.length - 1];
    const [u, ns] = top;
    if (top[2] < ns.length) {
      const v = ns[top[2]++];
      if (!disc.has(v)) {
        parent.set(v, u); disc.set(v, time); low.set(v, time++);
        if (u === root) rootKids++;
        stack.push([v, neighbors(v).filter((n) => occ.has(n)), 0]);
      } else if (v !== parent.get(u)) low.set(u, Math.min(low.get(u), disc.get(v)));
    } else {
      stack.pop();
      const p = parent.get(u);
      if (p !== null && p !== undefined) {
        low.set(p, Math.min(low.get(p), low.get(u)));
        if (p !== root && low.get(u) >= disc.get(p)) out.add(p);
      }
    }
  }
  if (rootKids > 1) out.add(root);
  return out;
}
