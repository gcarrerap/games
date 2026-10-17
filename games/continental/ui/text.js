// Textos de la mesa: el contrato, la regla de compra y cómo se dice cada jugada.
import { contractOf, contractLabel, nameOf, buyMode, RULES, cardName } from "../engine/index.js";

export { contractLabel };

export const BUY_TEXT = {
  limit: `Se compra con castigo, hasta ${RULES.maxBuys} por ronda`,
  free: "Se compra con castigo, sin límite",
  none: "No se compra",
};
export const buyText = (config) => BUY_TEXT[buyMode(config)];

// "Ronda 3 · 2 escaleras"
export const roundTitle = (round) => `Ronda ${round} · ${contractLabel(round)}`;

const chips = (cards) => cards.map(cardName).join(" ");

// Una jugada en palabras (para el consejo)
export function actionText(st, a) {
  const h = st.hand;
  const owner = (id) => { const m = h.melds.find((x) => x.id === id); return m ? `de ${m.owner === h.turn ? "ti" : nameOf(st, m.owner)}` : ""; };
  switch (a.type) {
    case "draw": return "Roba del mazo";
    case "take": return `Toma ${cardName(h.discard[h.discard.length - 1])} del pozo`;
    case "buy": return "Compra el descarte";
    case "down": return `Bájate: ${a.groups.map(chips).join("  ·  ")}`;
    case "add": return `Acomoda ${chips(a.cards)} en el juego ${owner(a.meld)}`;
    case "swap": return `Pon ${cardName(a.card)} en lugar del comodín ${cardName(a.wild)} y quédate con él`;
    case "discard": return `Descarta ${cardName(a.card)}`;
    default: return a.type;
  }
}

// Lo que necesita la bajada de esta ronda, para la ayuda del panel
export function needText(round) {
  const k = contractOf(round), parts = [];
  if (k.sets) parts.push(`${k.sets} tercia${k.sets === 1 ? "" : "s"} (3 iguales)`);
  if (k.runs) parts.push(`${k.runs} escalera${k.runs === 1 ? "" : "s"} (4 seguidas del mismo palo)`);
  return parts.join(" y ");
}

export function rulesHelp() {
  return `<div class="rules">
    <p>Se juegan 7 rondas. En cada una hay que <b>bajarse</b> con un contrato y luego quedarse sin cartas. Gana quien
      junte <b>menos puntos</b> al final.</p>
    <ol>${[1, 2, 3, 4, 5, 6, 7].map((r) => `<li>${contractLabel(r)} · ${contractOf(r).deal} cartas</li>`).join("")}</ol>
    <p><b>Tercia:</b> 3 o más del mismo número. <b>Escalera:</b> 4 o más seguidas del mismo palo; el As va abajo
      (A-2-3-4) o arriba (J-Q-K-A), sin dar la vuelta.</p>
    <p><b>Comodines:</b> jokers y doses. En cada juego no puede haber más comodines que cartas naturales.</p>
    <p><b>Tu turno:</b> roba del mazo o toma el descarte; si ya tienes el contrato, bájate todo junto; ya bajado puedes
      acomodar cartas en cualquier juego de la mesa y cambiar un comodín por la carta que ocupa su lugar. Termina
      descartando una carta. Quien se queda sin cartas cierra la ronda.</p>
    <p><b>Comprar:</b> mientras quien sigue no ha robado, puedes pedir el descarte. Si él lo toma, nadie lo compra; si
      roba del mazo, se lo lleva el primero que lo pidió (en el orden de la mesa) con una carta del mazo de castigo.
      Quien ya se bajó no compra.</p>
    <p><b>Puntos de lo que queda en la mano:</b> joker 50, 2 y As 20, 10, J, Q y K 10, las demás su número.</p>
  </div>`;
}
