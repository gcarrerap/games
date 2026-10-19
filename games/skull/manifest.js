// Lo que el portal necesita para listar Skull sin cargar su código.
export default {
  id: "skull",
  name: "Skull",
  players: { min: 3, max: 6 },
  remote: true, // dibuja el modo Control (ctx.display "phone"): ver platform/ui/modes.js
  modes: [3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
};
