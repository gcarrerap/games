// Las reglas, para el botón "Reglas" y el menú
import { RULES } from "../engine/index.js";
import { miniDie } from "../../../modules/dice/ui.js";

export function rulesHelp() {
  return `<div class="rules yz-rules">
    <p><b>Material:</b> 5 dados y una tarjeta con 13 casillas para cada quien. Se juegan 13 rondas.</p>
    <p><b>Tu turno:</b> tira los 5 dados. Toca los que quieras guardar (se van a la repisa) y vuelve a tirar los demás.
      Tienes hasta <b>3 tiros</b>. Luego anotas el resultado en una casilla libre: tócala y confirma. Puedes anotar antes
      del tercer tiro.</p>
    <p><b>Para tirar:</b> el botón «Tirar»; o déjalo apretado para sacudir los dados y suéltalo; o activa 📳 y
      <b>agita el teléfono</b> como si los tuvieras en la mano.</p>
    <p><b>Arriba</b> (Unos a Seises): la suma de ese número. Si la sección suma <b>${RULES.upperBonusAt}</b> o más
      (tres de cada uno), ganas <b>${RULES.upperBonus}</b> de bono.</p>
    <p><b>Abajo:</b></p>
    <ul>
      <li><b>Tercia</b>: tres iguales; suma los 5 dados.</li>
      <li><b>Póker</b>: cuatro iguales; suma los 5 dados.</li>
      <li><b>Full</b>: tres de uno y dos de otro: <b>${RULES.fixed.full}</b>.</li>
      <li><b>Escalera chica</b>: cuatro seguidos (${[1, 2, 3, 4].map((v) => miniDie(v, 14)).join("")}): <b>${RULES.fixed.small}</b>.</li>
      <li><b>Escalera grande</b>: cinco seguidos: <b>${RULES.fixed.large}</b>.</li>
      <li><b>Yatzi</b>: cinco iguales (${[6, 6, 6, 6, 6].map((v) => miniDie(v, 14)).join("")}): <b>${RULES.fixed.yatzi}</b>.</li>
      <li><b>Suerte</b>: lo que sea; suma los 5 dados.</li>
    </ul>
    <p><b>Tachar:</b> si tu tiro no sirve en ninguna casilla libre, anotas 0 en una (✕).</p>
    <p><b>Yatzi extra:</b> si ya tienes 50 en Yatzi y sacas otro, ganas <b>${RULES.yatziBonus}</b> más. Ese tiro va en la
      casilla de arriba de su número si está libre; si no, en cualquiera de abajo, y ahí Full y escaleras valen completo.</p>
    <p><b>Gana</b> quien suma más al llenar su tarjeta. Solo, juegas contra tu récord.</p>
  </div>`;
}
