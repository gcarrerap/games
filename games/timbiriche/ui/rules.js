// Las reglas del timbiriche para la ventana "Reglas" (botón en la mesa y menú de la partida). Dice las opciones de
// esta mesa (tamaño, reloj y castigo) cuando recibe su config.
export function rulesHelp(config) {
  const c = config || {};
  const clock = c.timer === false ? "Esta mesa va sin límite de tiempo." : c.secs ? `En esta mesa tienes ${c.secs} segundos por raya.` : "";
  const pen = c.penalty === false
    ? "<p><b>Castigo:</b> en esta mesa no hay: se vale dejar cajas a propósito.</p>"
    : `<p><b>Castigo por dejar pasar una caja:</b> si en tu turno podías cerrar una caja y trazas una raya que no cierra
      ninguna, <b>pierdes tu siguiente turno</b>: el otro tira dos veces seguidas (o más, si cierra cajas).</p>`;
  return `<div class="rules">
    <p><b>Objetivo:</b> quedarte con más cajas que el otro.</p>
    <p><b>Tu turno:</b> trazas una raya entre dos puntos vecinos, horizontal o vertical, que nadie haya trazado.</p>
    <ul>
      <li>Si tu raya <b>cierra una caja</b> (completa sus cuatro lados), la caja es tuya y <b>vuelves a tirar</b>. Una
        raya puede cerrar dos cajas a la vez.</li>
      <li>Si no cierra ninguna, le toca al otro.</li>
    </ul>
    ${pen}
    <p><b>Fin:</b> cuando ya no quedan rayas. Gana quien tenga más cajas; con tableros de 4×4 y 6×6 se puede empatar.</p>
    <p><b>Reloj:</b> ${clock} Si se te acaba el tiempo, la compu traza por ti (cierra una caja si se puede, así que
      el reloj nunca te castiga).</p>
    <p class="hint">Truco: evita trazar el tercer lado de una caja, porque se la regalas al otro. Al final, cuando ya
      todas las rayas regalan algo, regala la cadena más corta.</p>
    <p class="hint">Cómo se juega aquí: toca una raya para escogerla y vuelve a tocarla (o el botón «Trazar») para
      trazarla.</p>
  </div>`;
}
