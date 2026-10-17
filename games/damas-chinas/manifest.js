// Lo que el portal necesita para listar las damas chinas sin cargar su código.
export default {
  id: "damas-chinas",
  name: "Damas chinas",
  players: { min: 2, max: 6 },
  modes: [2, 3, 4, 6].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
};
