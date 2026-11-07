// Lo que el portal necesita para listar Cucharas sin cargar su código.
export default {
  id: "cucharas",
  name: "Cucharas",
  players: { min: 3, max: 8 },
  realtime: true, // sin turnos: todos cambian cartas a la vez (docs/ARCHITECTURE.md §4, "Juegos en tiempo real")
  modes: [3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
  options: [{
    id: "pace",
    label: "Ritmo",
    default: "normal",
    choices: [
      { id: "calm", label: "Tranquilo", hint: "Sin prisa: nadie cambia por ti" },
      { id: "normal", label: "Normal", hint: "Si no cambias en 6 s, la mesa cambia por ti" },
      { id: "fast", label: "Rápido", hint: "Si no cambias en 4 s, la mesa cambia por ti" },
    ],
  }],
};
