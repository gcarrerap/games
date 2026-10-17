// Lo que el portal necesita para listar el Continental sin cargar su código.
export default {
  id: "continental",
  name: "Continental",
  players: { min: 2, max: 6 },
  modes: [2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} jugadores`, n })),
  // Se escoge al crear la mesa (platform/core/contract.js → GameOption). Llega a setup() como config.buy.
  options: [{
    id: "buy", label: "Comprar del pozo", default: "limit",
    choices: [
      { id: "limit", label: "Con castigo, hasta 3", hint: "Te llevas el descarte y una del mazo de castigo. Hasta 3 compras por ronda. Se ofrece por turnos, en el orden de la mesa." },
      { id: "free", label: "Con castigo, sin límite", hint: "Te llevas el descarte y una del mazo de castigo, todas las veces que quieras." },
      { id: "none", label: "No se compra", hint: "Solo quien tiene el turno puede tomar el descarte." },
    ],
  }],
};
