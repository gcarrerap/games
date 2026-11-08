// Las reglas de Memoria Veloz, para el menú de la partida
import { RULES } from "../engine/index.js";

const s = (ms) => `${ms / 1000} s`;

export function rulesHelp() {
  return `<div class="rules">
    <p><b>Sin turnos:</b> todos juegan al mismo tiempo. Gana quien junte más pares.</p>
    <p><b>Abre una carta y luego otra.</b> Mientras la tienes abierta, solo tú ves su cara y solo tú la puedes tomar; los demás la ven marcada con tu color. Una carta abierta no se regresa.</p>
    <p><b>Si es pareja:</b> el par es tuyo en ese momento y sale del juego.</p>
    <p><b>Si no es pareja:</b> las dos se regresan solas y quedas congelado ${s(RULES.freezeMs)}.</p>
    <p><b>Atorón final:</b> si ya no queda ninguna carta libre (las que quedan las tienen abiertas jugadores distintos), esos pares se eliminan sin ser de nadie y termina la partida.</p>
    <p><b>Timer:</b> ponle ⏱ a alguien que tenga una carta abierta. En ${s(RULES.timerMs)} se le regresa, a menos que antes junte su par o falle. Puedes poner otro ${s(RULES.cooldownMs)} después de que el tuyo terminó.</p>
    <p><b>Empate:</b> gana quien llegó primero a ese número de pares.</p>
  </div>`;
}
