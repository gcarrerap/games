// Lo que dice la mesa: lo que acaba de pasar, con un poco de chiste. Se escoge la frase con el número de jugada,
// así no cambia cada que se redibuja y todos los teléfonos ven la misma.
import { dogName, nameOf } from "../engine/index.js";

const pick = (list, seq) => list[seq % list.length];
const plural = (n, one, many) => (n === 1 ? one : many);

export function lastLine(st, seat) {
  const l = st.last;
  if (!l) return "";
  const who = l.seat === seat ? "Tú" : nameOf(st, l.seat);
  const mine = l.seat === seat;
  if (l.kind === "roll") {
    const d = dogName(l.dog), n = l.n, c = `${n} ${plural(n, "casilla", "casillas")}`;
    let line = pick([
      `¡${d} arrancó y corrió ${c}!`,
      `${d} vio una ardilla y corrió ${c}`,
      `${d} corrió ${c}… y se paró a olfatear`,
      `¡Zoom! ${d} avanzó ${c}`,
      `${d} oyó la bolsa de croquetas: ${c}`,
    ], st.seq);
    if (l.carried.length) line += `. ${l.carried.map(dogName).join(" y ")} ${l.carried.length > 1 ? "van" : "va"} de aventón 🐾`;
    if (l.tile) {
      const owner = l.tile.seat === seat ? "ti" : nameOf(st, l.tile.seat);
      line += l.tile.kind === "hueso" ? `. ¡Huele a hueso! Una más (🍪 para ${owner})` : `. ¡LA ASPIRADORA! Se regresa espantado (🍪 para ${owner})`;
    }
    return line;
  }
  if (l.kind === "ticket") return `${who} le ${mine ? "apuestas" : "apuesta"} ${l.value} a ${dogName(l.dog)}`;
  if (l.kind === "tile") return `${who} ${mine ? "pusiste" : "puso"} ${l.tileKind === "hueso" ? "un hueso" : "la aspiradora"} en la ${l.space}`;
  if (l.kind === "final") return mine ? `Apostaste a ${dogName(l.dog)} como ${l.which === "winner" ? "ganador" : "último"} 🤫` : `${who} hizo una apuesta secreta 🤫`;
  return "";
}

export function actionText(a, st) {
  if (a.type === "roll") return "Sacudir el tazón";
  if (a.type === "ticket") return `Boleto de ${st.tickets[a.dog][0]} de ${dogName(a.dog)}`;
  if (a.type === "tile") return `${a.kind === "hueso" ? "Hueso" : "Aspiradora"} en la casilla ${a.space}`;
  if (a.type === "final") return `${dogName(a.dog)} como ${a.which === "winner" ? "ganador" : "último"}`;
  return "";
}

export const placeName = (i) => `${i + 1}º`;
