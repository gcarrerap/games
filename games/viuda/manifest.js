// Lo que el portal necesita para listar La Viuda sin cargar su código.
export default {
  id: "viuda",
  name: "La Viuda",
  players: { min: 2, max: 8 },
  modes: [2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
};
