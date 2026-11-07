// Las reglas de Memoria Veloz, para el menú de la partida
import { RULES } from "../engine/index.js";

const s = (ms) => `${ms / 1000} s`;

export function rulesHelp() {
  return `<div class="rules">
    <p><b>Sin turnos:</b> todos juegan al mismo tiempo. Gana quien junte más pares.</p>
    <p><b>Cartas abiertas:</b> puedes tener hasta ${RULES.maxOpen} a la vez. Solo tú ves su cara y solo tú la puedes tomar; los demás la ven marcada con tu color.</p>
    <p><b>Con una abierta:</b> tócala para regresarla, o abre otra.</p>
    <p><b>Con dos iguales:</b> reclámalas, o regresa una o las dos. Un par reclamado sale del juego.</p>
    <p><b>Si no son pareja:</b> se regresan solas y quedas congelado ${s(RULES.freezeMs)}.</p>
    <p><b>Timer:</b> ponle ⏱ a alguien que tenga cartas abiertas. En ${s(RULES.timerMs)} se le regresan, a menos que antes las regrese o las reclame. Puedes poner otro ${s(RULES.cooldownMs)} después de que el tuyo terminó.</p>
    <p><b>Empate:</b> gana quien llegó primero a ese número de pares.</p>
  </div>`;
}
