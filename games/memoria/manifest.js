// Lo que el portal necesita para listar Memoria Veloz sin cargar su código.
export default {
  id: "memoria",
  name: "Memoria Veloz",
  players: { min: 1, max: 4 },
  realtime: true, // sin turnos: todos actúan a la vez (docs/ARCHITECTURE.md §4, "Juegos en tiempo real")
  modes: [1, 2, 3, 4].map((n) => ({ id: String(n), label: n === 1 ? "Solo" : `${n} jugadores`, n })),
};
