// Lo que el portal necesita para listar Geografía sin cargar su código (ni el mapa). Las etiquetas de las opciones
// repiten las de engine/catalog.js; tests/games/geografia/engine.test.js revisa que coincidan.
export default {
  id: "geografia",
  name: "Geografía",
  players: { min: 1, max: 4 },
  // La plataforma empieza con el último modo: Solo
  modes: [4, 3, 2, 1].map((n) => ({ id: String(n), label: n === 1 ? "Solo" : `${n} jugadores`, n })),
  // Sin nada oculto: por turnos en un solo aparato (en la práctica se escoge «Persona» en cada asiento) o en línea
  hotseat: true,
  options: [
    { id: "game", label: "Juego", default: "mezcla", choices: [
      { id: "mezcla", label: "🎲 Mezcla de todo", hint: "Un poco de cada modo, en orden al azar." },
      { id: "continentes", label: "🌎 Continentes", hint: "¿En qué continente está este país?" },
      { id: "siluetas", label: "🗺️ Siluetas", hint: "¿De qué país es esta forma?" },
      { id: "mapa", label: "📍 Ubica en el mapa", hint: "Clava un pin donde crees que está el país. Mientras más cerca, más puntos." },
      { id: "banderas", label: "🚩 Banderas", hint: "¿De qué país es esta bandera?" },
    ] },
    { id: "level", label: "Nivel", default: "medio", choices: [
      { id: "facil", label: "Fácil", hint: "Los 60 países más conocidos · 4 opciones." },
      { id: "medio", label: "Medio", hint: "Unos 125 países · 4 opciones." },
      { id: "dificil", label: "Difícil", hint: "Los 197 países · 6 opciones parecidas." },
      { id: "experto", label: "Experto", hint: "Los 197 países · escribes el nombre." },
    ] },
    { id: "region", label: "Región", default: "mundo", choices: [
      { id: "mundo", label: "Todo el mundo" }, { id: "africa", label: "África" }, { id: "america", label: "América" },
      { id: "asia", label: "Asia" }, { id: "europa", label: "Europa" }, { id: "oceania", label: "Oceanía" },
    ] },
    { id: "rounds", label: "Preguntas por jugador", default: "10", choices: ["5", "10", "20", "30"].map((n) => ({ id: n, label: n })) },
    { id: "borders", label: "Mapa del pin", default: "alterna", choices: [
      { id: "alterna", label: "Una con y otra sin", hint: "El mapa alterna entre «con división política» (fronteras de colores) y «sin» (solo tierra y mar)." },
      { id: "con", label: "Con división política", hint: "Se ven las fronteras de los países." },
      { id: "sin", label: "Sin división política", hint: "Solo costas: sin fronteras que te ayuden." },
    ] },
    // Casillas (toggle: "1" = marcada). «A la vez» y «Hándicap» valen con 2 o más jugadores.
    { id: "sim", toggle: true, label: "Todos contestan a la vez", default: "0", hint: "Las mismas preguntas al mismo tiempo, cada quien en su aparato (o contra la compu). Las respuestas se ven cuando contesta el último. No se comparte un aparato.",
      choices: [{ id: "0", label: "No" }, { id: "1", label: "Sí" }] },
    { id: "handicap", toggle: true, label: "Hándicap automático", default: "0", hint: "Quien va ganando por mucho recibe preguntas más difíciles (hasta Difícil) mientras mantenga la ventaja.",
      choices: [{ id: "0", label: "No" }, { id: "1", label: "Sí" }] },
    { id: "auto", toggle: true, label: "Avanzar solo", default: "1", hint: "Después de contestar, la siguiente pregunta llega sola (con «Siguiente» para no esperar).",
      choices: [{ id: "0", label: "No" }, { id: "1", label: "Sí" }] },
  ],
};
