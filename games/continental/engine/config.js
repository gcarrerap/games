// Reglas del Continental (versión mexicana de la familia): las 7 rondas, cuántas barajas, cómo se compra y el reloj.

// Contrato de cada ronda: cuántas tercias (sets) y escaleras (runs) hay que bajar, y cuántas cartas se reparten
// (justo las que ocupa el contrato: se roba una y se descarta una).
export const CONTRACTS = [
  { sets: 2, runs: 0, deal: 6 },
  { sets: 1, runs: 1, deal: 7 },
  { sets: 0, runs: 2, deal: 8 },
  { sets: 3, runs: 0, deal: 9 },
  { sets: 2, runs: 1, deal: 10 },
  { sets: 1, runs: 2, deal: 11 },
  { sets: 0, runs: 3, deal: 12 },
];

export const RULES = {
  rounds: CONTRACTS.length,
  setMin: 3, // cartas mínimas de una tercia (del mismo número, cualquier palo)
  runMin: 4, // cartas mínimas de una escalera (del mismo palo, seguidas; el As va abajo o arriba, sin dar la vuelta)
  maxBuys: 3, // compras por ronda con la regla "limit"
  turnMs: 90000, // tiempo por turno con reloj
};

// Cómo se compra el descarte fuera de turno (se escoge al crear la mesa: config.buy)
//   limit: con castigo (el descarte y una del mazo), hasta 3 por ronda
//   free:  con castigo, sin límite
//   none:  no se compra
export const BUY_MODES = ["limit", "free", "none"];
export const DEFAULT_BUY = "limit";
export const buyMode = (config) => (BUY_MODES.includes(config && config.buy) ? config.buy : DEFAULT_BUY);
export const buyLimit = (config) => (buyMode(config) === "limit" ? RULES.maxBuys : buyMode(config) === "free" ? Infinity : 0);

// Barajas (cada una con 2 jokers): 2 hasta con 4 jugadores, 3 con 5 o 6
export const decksFor = (n) => (n >= 5 ? 3 : 2);

export const validConfig = (c) => Number.isInteger(c.n) && c.n >= 2 && c.n <= 6;

export const contractOf = (round) => CONTRACTS[Math.max(1, Math.min(CONTRACTS.length, round)) - 1];

// "2 tercias", "1 tercia y 1 escalera", "3 escaleras"
export function contractLabel(round) {
  const k = contractOf(round), parts = [];
  if (k.sets) parts.push(`${k.sets} tercia${k.sets === 1 ? "" : "s"}`);
  if (k.runs) parts.push(`${k.runs} escalera${k.runs === 1 ? "" : "s"}`);
  return parts.join(" y ");
}
