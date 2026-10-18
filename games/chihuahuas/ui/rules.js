// Las reglas para la ventana "Reglas" (botón en la mesa y menú de la partida).
import { RULES } from "../engine/index.js";

export function rulesHelp() {
  return `<div class="rules">
    <p><b>Objetivo:</b> juntar más croquetas 🍪 que nadie apostándole a los chihuahuas. Tú no tienes perro: ¡apuestas!</p>
    <p><b>La pista:</b> ${RULES.track} casillas. Los perros se apilan: el que cae donde ya hay alguien se sube encima, y el que corre se lleva cargando a todos los que tiene encima. En una casilla va adelante el de hasta arriba.</p>
    <p><b>En tu turno haces una cosa:</b></p>
    <ul>
      <li><b>Sacudir el tazón:</b> sale el dado de un perro (1, 2 o 3) y ese perro corre. Ganas 1 🍪 al momento. Cada perro corre una vez por etapa.</li>
      <li><b>Tomar un boleto de etapa</b> de un perro: el de arriba vale ${RULES.tickets.join(", luego ")}. Al acabar la etapa, si ese perro va 1º cobras el boleto; si va 2º, ${RULES.second}; si no, pierdes ${RULES.miss}.</li>
      <li><b>Poner tu tapete</b> en una casilla vacía: <b>hueso</b> 🦴 (el perro corre una más y queda encima) o <b>aspiradora</b> 🌪️ (se espanta, se regresa una y queda hasta abajo). Ganas 1 🍪 cada que alguien cae ahí. No en la casilla 1 ni junto a otro tapete; puedes moverlo en otro turno.</li>
      <li><b>Apuesta secreta</b> al ganador o al último de toda la carrera, con una de tus 5 cartas (una por perro, cada una se usa una vez). Las correctas cobran ${RULES.finals.join(", ")} según quién apostó primero; las equivocadas pierden ${RULES.finalMiss}.</li>
    </ul>
    <p><b>Fin de etapa:</b> cuando los cinco perros ya corrieron se cobran los boletos, se recogen los tapetes y todo vuelve al tazón.</p>
    <p><b>Fin de la carrera:</b> en cuanto un perro cruza la meta. Se cobra la etapa, luego las apuestas secretas, y gana quien tenga más 🍪.</p>
    <p><b>Consejo:</b> un perro de hasta abajo de la pila puede salir disparado con todos encima… y el de hasta arriba nomás va de aventón.</p>
  </div>`;
}
