// Valor de una mano de 5 cartas de La Viuda, con comodines. Funciones puras.
//
// Jugadas, de menor a mayor: carta alta, par, dos pares, tercia, corrida, color, full, póker, flor corrida,
// quintilla y flor imperial. El As vale alto y bajo en corridas (A-2-3-4-5 y 10-J-Q-K-A).
//
// Desempate entre la misma jugada: 1) carta más alta, luego la siguiente, hasta agotarlas; 2) la mano limpia
// (menos comodines); 3) el palo de la carta más alta: ♠ > ♥ > ♦ > ♣.
//
// Los comodines (las 4 cartas del número comodín de la mano) toman el valor que más convenga. Para el palo de
// la carta más alta, un comodín cuenta con su propio palo, salvo en color o flor, donde toma el palo de la mano.

export const CATS = ["Carta alta", "Par", "Dos pares", "Tercia", "Corrida", "Color", "Full", "Póker", "Flor corrida", "Quintilla", "Flor imperial"];
export const CAT = { high: 0, pair: 1, twoPair: 2, trips: 3, straight: 4, flush: 5, full: 6, poker: 7, straightFlush: 8, quint: 9, imperial: 10 };

// Valor de cada número para comparar (As alto = 14) y fuerza de cada palo
export const VALUE = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
export const SUIT_POWER = { S: 4, H: 3, D: 2, C: 1 };
const VALUE_NAME = { 14: "As", 13: "K", 12: "Q", 11: "J", 10: "10" };
export const valueName = (v) => VALUE_NAME[v] || String(v);

export const isWildCard = (c, wild) => !!wild && c[0] === wild;

// Valor de 5 cartas ya fijas: [{ v, s }] (v = 2..14, s = palo)
function fixed(cs) {
  const vals = cs.map((c) => c.v).sort((a, b) => b - a);
  const count = {};
  for (const v of vals) count[v] = (count[v] || 0) + 1;
  const groups = Object.entries(count).map(([v, n]) => ({ v: Number(v), n })).sort((a, b) => b.n - a.n || b.v - a.v);
  const flush = cs.every((c) => c.s === cs[0].s);
  let top = 0;
  if (groups.length === 5) {
    if (vals[0] - vals[4] === 4) top = vals[0];
    else if (vals.join() === "14,5,4,3,2") top = 5;
  }
  let cat;
  if (groups[0].n === 5) cat = CAT.quint;
  else if (top && flush) cat = top === 14 ? CAT.imperial : CAT.straightFlush;
  else if (groups[0].n === 4) cat = CAT.poker;
  else if (groups[0].n === 3 && groups[1].n === 2) cat = CAT.full;
  else if (flush) cat = CAT.flush;
  else if (top) cat = CAT.straight;
  else if (groups[0].n === 3) cat = CAT.trips;
  else if (groups[0].n === 2 && groups[1].n === 2) cat = CAT.twoPair;
  else if (groups[0].n === 2) cat = CAT.pair;
  else cat = CAT.high;
  // Cartas para desempatar, de la más importante a la menos
  const ranks = top ? (top === 5 ? [5, 4, 3, 2, 1] : vals) : groups.flatMap((g) => Array(g.n).fill(g.v));
  const topV = top || groups[0].v;
  const topSuit = Math.max(...cs.filter((c) => c.v === topV).map((c) => SUIT_POWER[c.s]));
  const suits = cs.map((c) => SUIT_POWER[c.s]).sort((a, b) => b - a);
  return { cat, ranks, topSuit, suits };
}

// Multiconjuntos de k valores (2..14), sin orden
function* combos(k, from = 2) {
  if (k === 0) { yield []; return; }
  for (let v = from; v <= 14; v++) for (const rest of combos(k - 1, v)) yield [v, ...rest];
}

// La clave que ordena manos: mayor es mejor
const keyOf = (f, wilds) => [f.cat, ...f.ranks, -wilds, f.topSuit, ...f.suits];

export function compareKeys(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// Valor de una mano: { cat, name, ranks, wilds, key }
export function evaluate(cards, wild = null) {
  const nat = cards.filter((c) => !isWildCard(c, wild)).map((c) => ({ v: VALUE[c[0]], s: c[1] }));
  const wl = cards.filter((c) => isWildCard(c, wild)).map((c) => c[1]).sort((a, b) => SUIT_POWER[b] - SUIT_POWER[a]);
  let best = null;
  if (!wl.length) best = fixed(nat);
  else {
    // Si las naturales son de un solo palo, los comodines toman ese palo (puede salir color o flor)
    const oneSuit = nat.length && nat.every((c) => c.s === nat[0].s) ? nat[0].s : null;
    for (const vs of combos(wl.length)) {
      // El comodín de palo más fuerte toma el valor más alto
      const asg = vs.slice().sort((a, b) => b - a).map((v, i) => ({ v, s: oneSuit || wl[i] }));
      const f = fixed([...nat, ...asg]);
      if (!best || compareKeys(keyOf(f, 0), keyOf(best, 0)) > 0) best = f;
    }
  }
  return { cat: best.cat, name: CATS[best.cat], ranks: best.ranks, wilds: wl.length, key: keyOf(best, wl.length) };
}

// Descripción corta: "Par de 8", "Full de K con 3", "Corrida al 9"
export function describe(ev) {
  const r = ev.ranks, n = valueName;
  switch (ev.cat) {
    case CAT.high: return `Carta alta: ${n(r[0])}`;
    case CAT.pair: return `Par de ${n(r[0])}`;
    case CAT.twoPair: return `Dos pares: ${n(r[0])} y ${n(r[2])}`;
    case CAT.trips: return `Tercia de ${n(r[0])}`;
    case CAT.straight: return `Corrida al ${n(r[0])}`;
    case CAT.flush: return `Color al ${n(r[0])}`;
    case CAT.full: return `Full de ${n(r[0])} con ${n(r[3])}`;
    case CAT.poker: return `Póker de ${n(r[0])}`;
    case CAT.straightFlush: return `Flor corrida al ${n(r[0])}`;
    case CAT.quint: return `Quintilla de ${n(r[0])}`;
    default: return "Flor imperial";
  }
}
