// Lo que el portal necesita para listar Piojos sin cargar su código.
export default {
  id: "piojos",
  name: "Piojos",
  players: { min: 2, max: 6 },
  modes: [2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
  // Sin nada oculto: se puede jugar por turnos en un solo aparato (la práctica deja escoger "Persona" en el asiento).
  hotseat: true,
};
