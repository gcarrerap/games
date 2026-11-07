// Lo que el portal necesita para listar Cucharas sin cargar su código.
export default {
  id: "cucharas",
  name: "Cucharas",
  players: { min: 3, max: 8 },
  realtime: true, // sin turnos: todos cambian cartas a la vez (docs/ARCHITECTURE.md §4, "Juegos en tiempo real")
  modes: [3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
  options: [{
    id: "table",
    label: "Cartas de la mesa",
    default: "open",
    choices: [
      { id: "open", label: "Abiertas", hint: "Boca arriba: escoges cuál tomar" },
      { id: "closed", label: "Tapadas", hint: "Boca abajo: tomas a ciegas" },
    ],
  }],
};
