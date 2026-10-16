// Lo que el portal necesita para listar La Pata sin cargar su código.
export default {
  id: "pata",
  name: "La Pata",
  players: { min: 2, max: 6 },
  // Configuraciones válidas (engine/config.js → validConfig). teams: cuántos por equipo (false = individual).
  modes: [
    { id: "2", label: "2 jugadores", n: 2, teams: false },
    { id: "3", label: "3 jugadores", n: 3, teams: false },
    { id: "4", label: "4 jugadores · individual", n: 4, teams: false },
    { id: "4p", label: "4 jugadores · en parejas", n: 4, teams: 2 },
    { id: "6p", label: "6 jugadores · 3 parejas", n: 6, teams: 2 },
    { id: "6t", label: "6 jugadores · 2 equipos de 3", n: 6, teams: 3 },
  ],
};
