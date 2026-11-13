// Lo que el portal necesita para listar el Láser sin cargar su código.
export default {
  id: "khet",
  name: "Láser de los Faraones",
  players: { min: 2, max: 2 },
  modes: [{ id: "2", label: "2 jugadores", n: 2 }],
  // Sin nada oculto: se puede jugar por turnos en un solo aparato (la práctica deja escoger "Persona" en el asiento).
  hotseat: true,
  // Se escogen al crear la mesa (platform/core/contract.js → GameOption). Llegan a setup() como config.setup y
  // config.secs. "Con reloj / Sin límite" lo pone la plataforma aparte (config.timer).
  options: [
    {
      id: "setup", label: "Acomodo", default: "clasico",
      choices: [
        { id: "clasico", label: "Clásico", hint: "El acomodo del juego original. El mejor para empezar." },
        { id: "muralla", label: "Muralla", hint: "Variante de la casa: los escarabajos y dos pirámides rodean al faraón. Partidas más largas." },
        { id: "asalto", label: "Asalto", hint: "Variante de la casa: el faraón un paso al frente y las pirámides listas para atacar. Partidas rápidas." },
      ],
    },
    {
      id: "secs", label: "Segundos por turno", default: "60",
      choices: [20, 40, 60, 120].map((s) => ({ id: String(s), label: s < 60 ? `${s} s` : `${s / 60} min`, hint: `Cada turno tiene ${s} segundos. Solo cuenta si la mesa va "Con reloj". Al acabarse, la compu mueve por ti algo que no te haga perder.` })),
    },
  ],
};
