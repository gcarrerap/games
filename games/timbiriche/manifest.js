// Lo que el portal necesita para listar el Timbiriche sin cargar su código.
export default {
  id: "timbiriche",
  name: "Timbiriche",
  players: { min: 2, max: 2 },
  modes: [{ id: "2", label: "2 jugadores", n: 2 }],
  // Se escogen al crear la mesa (platform/core/contract.js → GameOption). Llegan a setup() como config.size,
  // config.secs y config.penalty. "Con reloj / Sin límite" lo pone la plataforma aparte (config.timer).
  options: [
    {
      id: "size", label: "Tablero", default: "4",
      choices: [3, 4, 5, 6].map((n) => ({ id: String(n), label: `${n} × ${n} cajas`, hint: `${(n + 1) ** 2} puntos, ${n * n} cajas.` })),
    },
    {
      id: "secs", label: "Segundos por raya", default: "20",
      choices: [10, 20, 30, 60].map((s) => ({ id: String(s), label: `${s} s`, hint: `Cada raya tiene ${s} segundos (el reloj vuelve a empezar después de cada raya, también si cierras caja). Solo cuenta si la mesa va "Con reloj". Al acabarse, la compu tira por ti.` })),
    },
    {
      id: "penalty", label: "Si dejas pasar una caja", default: "on",
      choices: [
        { id: "on", label: "Pierdes tu siguiente turno", hint: "Si podías cerrar una caja y trazaste una raya que no cierra ninguna, el otro tira dos veces seguidas." },
        { id: "off", label: "Sin castigo", hint: "Se vale dejar cajas a propósito (la doble jugada del final)." },
      ],
    },
  ],
};
