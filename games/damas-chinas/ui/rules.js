// Las reglas de las damas chinas para la ventana "Reglas" (botón en la mesa y menú de la partida).
import { RULES } from "../engine/index.js";

export function rulesHelp() {
  return `<div class="rules">
    <p><b>Objetivo:</b> llevar tus ${RULES.pieces} canicas de tu punta de la estrella a la punta de enfrente. Gana quien llena primero su meta.</p>
    <p><b>Jugadores:</b> con 2, cada quien en puntas de frente; con 3, en puntas alternas (cada quien va a una punta vacía); con 4, dos parejas de puntas de frente; con 6, todas.</p>
    <p><b>Tu turno:</b> mueves una canica, de una de estas dos formas:</p>
    <ul>
      <li><b>Un paso</b> a un hoyo vecino vacío.</li>
      <li><b>Saltos:</b> sobre una canica vecina (tuya o de otro) a un hoyo vacío justo detrás. Desde donde caes puedes seguir saltando, en cualquier dirección, las veces que quieras.</li>
    </ul>
    <p>No se mezclan pasos y saltos en la misma jugada, y no se comen canicas: las que saltas se quedan donde están.</p>
    <p><b>Puntas ajenas:</b> puedes pasar saltando por cualquier punta, pero tu jugada no puede terminar en una que no sea la tuya ni la de tu meta.</p>
    <p><b>En la meta:</b> una canica que ya entró a tu meta no puede volver a salir; sí la puedes acomodar adentro.</p>
    <p><b>Contra el bloqueo:</b> si en tu meta quedan canicas de otro que ya no se pueden mover y todos los demás hoyos de la meta son tuyos, también ganas.</p>
    <p><b>Si no tienes jugada</b>, pasas.</p>
    <p class="hint">Cómo se juega aquí: toca una de tus canicas y luego el hoyo marcado a donde la quieres llevar. La jugada anterior queda marcada con una línea.</p>
  </div>`;
}
