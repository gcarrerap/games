// Las reglas de Cucharas, para el menú de la partida
import { RULES } from "../engine/index.js";

export function rulesHelp(table = "open") {
  return `<div class="rules">
    <p><b>Meta:</b> juntar un <b>póker</b>, las cuatro cartas de un mismo número. Sin turnos: todos cambian a la vez.</p>
    <p><b>Cartas:</b> se juega con pókers de sobra: 1 con 2–4 jugadores, 2 con 5–8 y 3 con 9–10. Las de sobra están en la mesa, ${table === "closed" ? "<b>tapadas</b>: tomas a ciegas" : "<b>abiertas</b>: escoges cuál tomar"}.</p>
    <p><b>Cambiar:</b> toca una carta tuya y luego la carta de la mesa que quieres: se intercambian en su lugar, sin reordenar nada. Siempre tienes ${RULES.hand}. No hay límite de tiempo.</p>
    <p><b>Cucharas:</b> hay una menos que jugadores, cada una en su lugar alrededor de la mesa (cambian de lugar cada ronda). Con póker, toma una. Después de la primera, cualquiera puede tomar aunque no tenga póker. Nadie avisa: solo queda su lugar vacío.</p>
    <p><b>Fichas:</b> cada quien empieza con ${RULES.chips}. El que se queda sin cuchara pierde una. El primero en tomar cuchara gana una si tenía póker (sin pasar de ${RULES.maxChips}) y pierde una si no. Con 0 quedas fuera; gana el último que queda.</p>
  </div>`;
}
