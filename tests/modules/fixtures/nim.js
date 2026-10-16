// Juego de juguete para probar los módulos sin depender del dominó: Nim de una pila.
// Cada quien quita 1 a 3; quien quita la última gana. Usa el azar en setup y en apply (cada jugada agrega
// 0 o 1 piedra al azar), para comprobar que grabar y repetir reproduce el azar de en medio de la partida.
const take = (n) => ({ type: "take", n });

export default {
  id: "nim", name: "Nim", players: { min: 2, max: 2 }, modes: [{ id: "normal", n: 2 }],
  setup: (config, { rnd, now }) => ({ pile: 10 + Math.floor(rnd() * 5), turn: 0, winner: null, log: [], started: now }),
  currentSeats: (s) => (s.winner === null ? [s.turn] : []),
  legalActions: (s, seat) => (s.winner !== null || seat !== s.turn ? [] : [1, 2, 3].filter((n) => n <= s.pile).map(take)),
  apply(s, seat, a, { rnd, now }) {
    if (seat !== s.turn || a.type !== "take" || !(a.n >= 1 && a.n <= 3 && a.n <= s.pile)) throw new Error("No se vale");
    const pile = s.pile - a.n, winner = pile === 0 ? seat : null;
    return { pile: winner === null ? pile + Math.floor(rnd() * 2) : 0, turn: 1 - seat, winner, log: [...s.log, { seat, n: a.n, t: now }], started: s.started };
  },
  view: (s) => s,
  isOver: (s) => s.winner !== null,
  result: (s) => ({ winner: s.winner }),
  bots: {
    profiles: [{ id: "azar", name: "Al azar" }, { id: "listo", name: "Listo" }],
    decide(v, seat, profile, { rnd }) {
      const la = this.legal(v, seat);
      if (profile === "listo") return la.find((a) => (v.pile - a.n) % 4 === 0) || la[0];
      return la[Math.floor(rnd() * la.length)];
    },
    legal: (v, seat) => (v.winner !== null || seat !== v.turn ? [] : [1, 2, 3].filter((n) => n <= v.pile).map(take)),
  },
  ui: async () => ({ mount() {}, unmount() {} }),
};
