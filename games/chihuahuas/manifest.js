// Lo que el portal necesita para listar la Carrera de Chihuahuas sin cargar su código.
export default {
  id: "chihuahuas",
  name: "Carrera de Chihuahuas",
  players: { min: 2, max: 8 },
  modes: [2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
};
