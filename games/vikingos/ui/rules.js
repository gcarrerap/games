// Las reglas de Vikingos para la ventana "Reglas" (botón en la mesa y menú de la partida).
export function rulesHelp() {
  return `<div class="rules">
    <p><b>Objetivo:</b> una tormenta dejó a los barcos vikingos en medio de los remolinos. Lleva cada barco a la
      <b>flecha de su color</b> en la orilla del mar.</p>
    <p><b>Cómo se mueven:</b> los barcos no navegan solos; viajan en las <b>muescas</b> de las piezas de mar. Al
      girar una pieza, los barcos que van en sus muescas giran con ella y quedan en otro lado de la pieza.</p>
    <ul>
      <li>Solo puedes girar una pieza que tenga <b>un barco</b> en una de sus muescas.</li>
      <li>Una pieza se <b>traba</b> si una vecina tiene su parte llena metida en ella. Para que gire, cada vecina
        debe tener su muesca hacia ella. Muchas veces hay que girar otra pieza primero (con otro barco, o con el
        mismo desde otro lado).</li>
      <li>Si dos barcos van en la misma pieza, <b>giran los dos</b>. Está bien: muchas veces un barco ayuda a otro.</li>
      <li>Se vale girar un cuarto, media o tres cuartos de vuelta, hacia cualquier lado. Cada giro cuenta como
        <b>un movimiento</b> (si giras la misma pieza dos veces seguidas, cuenta como uno).</li>
    </ul>
    <p><b>Retos:</b> 60 del cuadernillo, en cuatro niveles: Inicial (1–15), Junior (16–30), Experto (31–45) y Maestro
      (46–60). Ganas el reto cuando todos los barcos están junto a su flecha. La ⭐ es por resolverlo en el mínimo de
      movimientos.</p>
    <p class="hint">Cómo se juega aquí: toca una pieza con barco para escogerla (las que se pueden girar tienen la
      orilla clara) y gírala con ↺ o ↻; tocarla otra vez también la gira a la derecha. «Deshacer» regresa un
      movimiento y «Consejo» te dice el siguiente giro de la solución más corta.</p>
  </div>`;
}
