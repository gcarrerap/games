// Lo que el portal necesita para listar el dominó sin cargar su código.
export default {
  id: "domino",
  name: "Dominó",
  players: { min: 2, max: 4 },
  // Configuraciones válidas (engine/config.js → validConfig). timer se escoge aparte (por omisión, encendido).
  modes: [
    { id: "2x7", label: "2 jugadores · 7 fichas + pozo", n: 2, per: 7, teams: false },
    { id: "2x14", label: "2 jugadores · 14 fichas, sin pozo", n: 2, per: 14, teams: false },
    { id: "3x7", label: "3 jugadores · 7 fichas + pozo", n: 3, per: 7, teams: false },
    { id: "3x9", label: "3 jugadores · 9 fichas + muestra", n: 3, per: 9, teams: false },
    { id: "4x7", label: "4 jugadores · individual", n: 4, per: 7, teams: false },
    { id: "4x7p", label: "4 jugadores · en parejas", n: 4, per: 7, teams: true },
  ],
};
