// La función vote de myPata (src/ai/random.js, commit cc6166d), sin cambios, para comparar con la de ahora.
// Escoge entre opciones con puntaje (más bajo = mejor): solo las que están a no más de `slack` de la mejor, con
// peso exp(−diferencia / temp). Sin azar (rnd null) o sin margen, la mejor.
export function legacyVote(scored, slack, temp, rnd) {
  const best = scored.reduce((b, x) => (x.score < b.score ? x : b));
  if (!rnd || !slack) return best;
  const pool = scored.filter((x) => x.score - best.score <= slack);
  const w = pool.map((x) => Math.exp(-(x.score - best.score) / (temp || 1)));
  let u = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { u -= w[i]; if (u <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
