// Las reglas de Panal para la ventana "Reglas" (botón en la mesa y menú de la partida).
import { PIECES, NAMES, RULES } from "../engine/index.js";
import { bugSVG } from "./art.js";

const MOVES = {
  reina: "Un paso alrededor de la colmena.",
  mayate: "Un paso, y puede subirse encima de la colmena. La ficha que pisa queda tapada: no se mueve, y para poner fichas cuenta el color del mayate.",
  chapulin: "Salta en línea recta por encima de una o más fichas, hasta el primer hueco. No necesita caber.",
  hormiga: "Cualquier número de pasos alrededor de la colmena.",
  arana: "Exactamente tres pasos alrededor de la colmena, sin regresar por donde vino.",
};

export function rulesHelp() {
  const total = Object.values(PIECES).reduce((a, b) => a + b, 0);
  return `<div class="rules">
    <p><b>Objetivo:</b> rodear por los seis lados a la abeja reina del rival (con fichas de cualquier color). Si las dos reinas quedan rodeadas con la misma jugada, es empate.</p>
    <p><b>No hay tablero:</b> las fichas forman la colmena. Cada quien tiene ${total} bichos. En tu turno pones uno de tu reserva o mueves uno tuyo.</p>
    <p><b>Poner:</b> la primera ficha va al centro y la segunda junto a ella. Después, una ficha nueva solo puede tocar fichas de tu color, ninguna del rival.</p>
    <p><b>La reina:</b> tiene que estar puesta a más tardar en tu ${RULES.queenBy}.ª ficha, y no puedes mover nada hasta ponerla.</p>
    <p><b>Colmena única:</b> la colmena nunca puede quedar partida en dos, ni a medio movimiento. Una ficha que une dos partes no se puede mover.</p>
    <p><b>Caber:</b> las fichas se deslizan; no pueden pasar por un hueco donde las fichas de los lados les cierran el paso.</p>
    <p><b>Si no tienes jugadas</b>, pasas. Después de ${RULES.maxPlies} jugadas entre los dos, es empate.</p>
    <p><b>Los bichos:</b></p>
    <ul class="bugs">${Object.keys(PIECES).map((k) => `<li>${bugSVG(k, 40)}<span><b>${NAMES[k]} ×${PIECES[k]}.</b> ${MOVES[k]}</span></li>`).join("")}</ul>
    <p class="hint">Cómo jugar en la pantalla: toca un bicho de tu reserva o de la colmena y luego una de las casillas marcadas.</p>
  </div>`;
}
