// Las reglas de Cucharas, para el menú de la partida
import { RULES } from "../engine/index.js";

const s = (ms) => `${ms / 1000} s`;

export function rulesHelp(pace = "normal") {
  const p = RULES.pace[pace];
  return `<div class="rules">
    <p><b>Meta:</b> juntar un <b>póker</b>, las cuatro cartas de un mismo número. Sin turnos: todos cambian a la vez.</p>
    <p><b>Cartas:</b> se juega con un póker más que jugadores. En la mesa hay espacios boca arriba, algunos vacíos.</p>
    <p><b>Cambiar:</b> toca una carta tuya y luego un espacio vacío para soltarla; después toma una carta de otro espacio. Nunca tienes más de ${RULES.hand}, y no puedes tomar la que acabas de soltar.</p>
    ${p ? `<p><b>Ritmo:</b> si no cambias en ${s(p.idleMs)} (o no tomas en ${s(p.pendMs)} después de soltar), la mesa cambia por ti: suelta tu carta más sola y toma una al azar. Con póker no.</p>` : `<p><b>Ritmo:</b> tranquilo, sin límite de tiempo.</p>`}
    <p><b>Cucharas:</b> hay una menos que jugadores, a un lado de la mesa. Con póker, toma una. Después de la primera, cualquiera puede tomar aunque no tenga póker. Nadie avisa: las cucharas solo desaparecen.</p>
    <p><b>Fichas:</b> cada quien empieza con ${RULES.chips}. El que se queda sin cuchara pierde una. El primero en tomar cuchara gana una si tenía póker (sin pasar de ${RULES.maxChips}) y pierde una si no. Con 0 quedas fuera; gana el último que queda.</p>
  </div>`;
}
