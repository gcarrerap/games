// Lo que el portal necesita para listar Piojos sin cargar su código.
export default {
  id: "piojos",
  name: "Piojos",
  players: { min: 2, max: 6 },
  modes: [2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
};
