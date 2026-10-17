// Lo que el portal necesita para listar Skull sin cargar su código.
export default {
  id: "skull",
  name: "Skull",
  players: { min: 3, max: 6 },
  modes: [3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
};
