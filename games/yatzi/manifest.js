// Lo que el portal necesita para listar Yatzi sin cargar su código.
export default {
  id: "yatzi",
  name: "Yatzi",
  players: { min: 1, max: 6 },
  modes: [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: n === 1 ? "Solo (récord)" : `${n} jugadores`, n })),
  // Sin nada oculto: se puede jugar por turnos en un solo aparato (la práctica deja escoger "Persona" en el asiento).
  hotseat: true,
};
