// Las reglas de Skull para la ventana "Reglas" (botón en la mesa y menú de la partida).
import { RULES } from "../engine/index.js";

export function rulesHelp() {
  return `<div class="rules">
    <p><b>Objetivo:</b> ganar ${RULES.winsToWin} retos, o ser el último que conserva discos. Juego de faroleo: nadie sabe dónde está tu calavera.</p>
    <p><b>Discos:</b> cada quien empieza con ${RULES.flowers + RULES.skulls}: ${RULES.flowers} flores y ${RULES.skulls} calavera.</p>
    <p><b>Al empezar la ronda:</b> todos ponen a la vez un disco boca abajo en su tapete.</p>
    <p><b>En tu turno:</b> pones otro disco encima de tu tapete o <b>abres la apuesta</b>: dices cuántas flores crees poder voltear sin toparte con una calavera. Si ya no tienes discos en la mano, tienes que apostar.</p>
    <p><b>Apuesta:</b> por turnos, cada quien sube la apuesta o pasa. Quien pasa ya no vuelve a apostar en esa ronda. Cuando todos los demás pasaron, o alguien apuesta todos los discos de la mesa, el que apostó más alto es el <b>retador</b>.</p>
    <p><b>El reto:</b> el retador voltea primero <b>todos los suyos</b>, de arriba hacia abajo (o solo los que necesita, si apostó menos). Luego escoge tapetes de los demás y voltea el disco de arriba, uno a la vez.</p>
    <ul>
      <li><b>Solo flores</b> hasta completar la apuesta: gana el reto. Con ${RULES.winsToWin} retos ganados, gana la partida.</li>
      <li><b>Sale una calavera ajena:</b> su dueño le quita al retador uno de sus discos al azar, sin verlo. Nadie más sabe si fue flor o calavera.</li>
      <li><b>Sale su propia calavera:</b> el retador escoge cuál de sus discos pierde.</li>
    </ul>
    <p><b>Discos perdidos</b> no regresan. Quien se queda sin discos sale del juego.</p>
    <p><b>Siguiente ronda:</b> la abre el retador; si salió del juego, el siguiente jugador.</p>
    <p><b>Consejo:</b> poner tu calavera y apostar bajo invita a otro a retar… y a toparse con ella.</p>
  </div>`;
}
