// Las reglas de Cucharas, para el menú de la partida
import { RULES } from "../engine/index.js";

export function rulesHelp(table = "open") {
  return `<div class="rules">
    <p><b>Meta:</b> juntar un <b>póker</b>, las cuatro cartas de un mismo número. Sin turnos: todos cambian a la vez.</p>
    <p><b>Cartas:</b> se juega con un póker más que jugadores. En la mesa hay espacios, algunos vacíos. ${table === "closed" ? "Las cartas de la mesa están <b>tapadas</b>: tomas a ciegas." : "Las cartas de la mesa están <b>abiertas</b>: escoges cuál tomar."}</p>
    <p><b>Cambiar:</b> toca una carta tuya y luego la carta de la mesa que quieres. La tuya se suelta en un espacio vacío y tomas la otra. Nunca tienes más de ${RULES.hand}. No hay límite de tiempo.</p>
    <p><b>Cucharas:</b> hay una menos que jugadores, a un lado de la mesa. Con póker, toma una. Después de la primera, cualquiera puede tomar aunque no tenga póker. Nadie avisa: las cucharas solo desaparecen.</p>
    <p><b>Fichas:</b> cada quien empieza con ${RULES.chips}. El que se queda sin cuchara pierde una. El primero en tomar cuchara gana una si tenía póker (sin pasar de ${RULES.maxChips}) y pierde una si no. Con 0 quedas fuera; gana el último que queda.</p>
  </div>`;
}
