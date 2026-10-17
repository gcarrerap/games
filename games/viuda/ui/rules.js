// Las reglas de La Viuda para la ventana "Reglas" (botón en la mesa y menú de la partida).
import { RULES } from "../engine/index.js";

export function rulesHelp() {
  return `<div class="rules">
    <p><b>Objetivo:</b> no quedarte con la peor mano. Cada quien empieza con ${RULES.chips} fichas y gana el último que conserve fichas. Baraja inglesa de 52 cartas.</p>
    <p><b>Reparto:</b> reparte uno distinto cada mano. Parte el de la izquierda de quien reparte y empieza el de su derecha. Cada quien recibe 5 cartas y otras 5 quedan boca abajo en la mesa: <b>la viuda</b>.</p>
    <p><b>Comodín al partir:</b> si la carta que queda a la vista al partir es comodín, se la queda quien partió y solo recibe 4 cartas más.</p>
    <p><b>Viuda tapada:</b> en tu turno tomas las 5 de la viuda a ciegas (tu mano queda boca arriba como la nueva viuda), pasas o <b>tocas</b>. Si todos pasan, la mano se acaba ahí y se comparan las manos repartidas. En cuanto alguien toma la viuda, se juega con las reglas normales.</p>
    <p><b>Con la viuda abierta:</b> en tu turno cambias una carta con la viuda, cambias las 5 o <b>tocas</b>. No se puede pasar.</p>
    <p><b>Después de tocar:</b> se da una última vuelta: cada uno de los que no tocaron tiene un último intento (cambiar una, cambiar las 5 o pasar; si la viuda sigue tapada, tomarla a ciegas o pasar). Luego se muestran las manos.</p>
    <p><b>Fichas:</b> solo la peor mano pierde una ficha. El primero que se queda sin fichas recibe una extra, la viuda, una sola vez por partida. Quien se queda sin fichas después sale del juego.</p>
    <p><b>Comodín:</b> la primera mano no tiene. Después sube un número cada mano: As en la segunda, 2 en la tercera… K en la 14 y vuelve a empezar con el As. Las 4 cartas de ese número valen lo que más te convenga.</p>
    <p><b>Jugadas, de mayor a menor:</b></p>
    <ol class="ranking">
      <li>Flor imperial: 10, J, Q, K y As del mismo palo (vale con comodín; la limpia gana)</li>
      <li>Quintilla: cinco del mismo número (con comodín)</li>
      <li>Flor corrida: escalera del mismo palo</li>
      <li>Póker: cuatro del mismo número</li>
      <li>Full: tercia y par</li>
      <li>Color: cinco del mismo palo</li>
      <li>Corrida: escalera de distintos palos</li>
      <li>Tercia</li>
      <li>Dos pares</li>
      <li>Par</li>
      <li>Carta alta</li>
    </ol>
    <p>El As vale alto y bajo en corridas (A-2-3-4-5 y 10-J-Q-K-A).</p>
    <p><b>Desempates:</b> 1) la carta más alta, luego la siguiente, hasta agotarlas; 2) la mano limpia (menos comodines); 3) el palo de la carta más alta: ♠ picas, ♥ corazones, ♦ diamantes, ♣ tréboles.</p>
  </div>`;
}
