// Las reglas del Láser para la ventana "Reglas" (botón en la mesa y menú de la partida).
import { iconSVG } from "./art.js";
import { piece, PYRAMID, SCARAB, ANUBIS, PHARAOH, SPHINX } from "../engine/index.js";
import { SETUP_NAMES } from "../engine/index.js";

export function rulesHelp(config) {
  const c = config || {};
  const ic = (t, o = 0) => iconSVG(piece(t, 0, o), 30);
  const clock = c.timer === false ? "Esta mesa va sin límite de tiempo." : c.secs ? `En esta mesa tienes ${c.secs} segundos por turno; si se acaban, la compu mueve por ti algo que no te haga perder.` : "";
  return `<div class="rules khrules">
    <p><b>Objetivo:</b> darle con <b>tu</b> láser al <b>faraón</b> del otro.</p>
    <p><b>Tu turno:</b> haces <b>una</b> de estas dos cosas, y después tu láser dispara solo:</p>
    <ul>
      <li><b>Mover</b> una pieza a una casilla vecina, también en diagonal, si está vacía.</li>
      <li><b>Girar</b> una pieza 90° a la izquierda o a la derecha (sin moverla).</li>
    </ul>
    <p>El láser sale de tu esfinge, rebota en los espejos y destruye la primera pieza a la que le pegue en un lado sin
      espejo, <b>sea tuya o del otro</b>. Si le pega a tu propio faraón, pierdes.</p>
    <div class="khpieces">
      <div>${ic(PYRAMID)}<span><b>Pirámide</b> · un espejo en la cara larga; por los otros dos lados se rompe.</span></div>
      <div>${ic(SCARAB)}<span><b>Escarabajo</b> · espejo de dos caras: nunca se rompe. Puede <b>cambiarse de lugar</b> con una pirámide o un anubis vecino, de cualquier color.</span></div>
      <div>${ic(ANUBIS)}<span><b>Anubis</b> · su escudo dorado detiene el láser de frente; por los lados o por atrás se rompe.</span></div>
      <div>${ic(PHARAOH)}<span><b>Faraón</b> · cualquier golpe lo destruye y se acaba la partida.</span></div>
      <div>${ic(SPHINX)}<span><b>Esfinge</b> · tu láser. No se mueve ni se rompe; solo gira para disparar a lo largo de la fila o de la columna.</span></div>
    </div>
    <p><b>Casillas marcadas:</b> las del ankh (columna derecha, B1 y B8) son solo de Plata; las del ojo de Horus
      (columna izquierda, I1 e I8) solo de Rojo. Ninguna pieza entra a las del otro color, ni con el escarabajo.</p>
    <p><b>Empate:</b> si la misma posición se repite tres veces, o a las 300 jugadas.</p>
    <p><b>Reloj:</b> ${clock}</p>
    ${c.setup ? `<p class="hint">Acomodo de esta mesa: <b>${SETUP_NAMES[c.setup] || c.setup}</b>.</p>` : ""}
    <p class="hint">Cómo se juega aquí: toca una pieza tuya; los puntos dorados son a dónde puede ir y los botones
      «Girar» de tu panel la giran. Con teclado o el control de la tele: flechas para moverte, <b>OK/Enter</b> para escoger o mover,
      <b>Q</b>/<b>E</b> para girar y <b>Esc</b> para soltar.</p>
  </div>`;
}
