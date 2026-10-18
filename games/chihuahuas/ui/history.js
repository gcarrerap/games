// La ventana "Jugadas": todo lo que ha pasado en la carrera, de lo más nuevo a lo más viejo, por etapa. Usa el
// historial del estado (st.hist); la vista ya esconde a qué perro apostaron los demás en secreto.
import { DOGS, nameOf, dogName } from "../engine/index.js";
import { faceArt, thingArt } from "./art.js";
import { placeName } from "./text.js";
import { esc } from "../../../platform/ui/dom.js";

const who = (st, seat, me) => (seat === me ? "Tú" : esc(nameOf(st, seat)));
const dn = (d) => `<b>${esc(dogName(d))}</b>`;
const casilla = (s) => (s > 16 ? "la meta" : `la ${s}`);

function row(icon, html, cls = "") {
  return `<li class="hrow ${cls}"><span class="hicon">${icon}</span><span class="htext">${html}</span></li>`;
}

function entryHTML(st, h, me) {
  const mine = h.seat === me;
  if (h.kind === "start") {
    return row("🏁", `Salida: cada perro tiró para su lugar de arranque. ${(h.start || []).map((o) => `${faceArt(o.dog, "die")} ${esc(dogName(o.dog))} ${o.n}`).join(" · ")}`, "hsys");
  }
  if (h.kind === "roll") {
    const riders = h.carried.length ? `, con ${h.carried.map(dn).join(" y ")} encima` : "";
    let tile = "";
    if (h.tile) tile = h.tile.kind === "hueso" ? `. Cayó en el hueso de ${who(st, h.tile.seat, me)} y corrió a la ${h.to}` : `. La aspiradora de ${who(st, h.tile.seat, me)} lo regresó a la ${h.to}`;
    return row(`<span class="hdie">${faceArt(h.dog, "die")}<b>${h.n}</b></span>`,
      `${who(st, h.seat, me)} ${mine ? "sacudiste" : "sacudió"} el tazón: ${dn(h.dog)} corrió ${h.n} (de la ${h.from} a ${casilla(h.landed)})${riders}${tile}. <em>+1 🍪</em>`);
  }
  if (h.kind === "ticket") return row(faceArt(h.dog, "die"), `${who(st, h.seat, me)} ${mine ? "tomaste" : "tomó"} el boleto de <b>${h.value}</b> de ${dn(h.dog)}`);
  if (h.kind === "tile") return row(thingArt(h.tileKind), `${who(st, h.seat, me)} ${mine ? "pusiste" : "puso"} ${h.tileKind === "hueso" ? "un hueso (+1)" : "la aspiradora (−1)"} en la ${h.space}`);
  if (h.kind === "final") {
    const what = h.which === "winner" ? "al ganador" : "al último";
    return row("🤫", h.dog === null ? `${who(st, h.seat, me)} apostó en secreto ${what}` : `${who(st, h.seat, me)} ${mine ? "apostaste" : "apostó"} en secreto ${what}: ${dn(h.dog)}`);
  }
  if (h.kind === "legEnd") {
    const pays = h.bets.map((b) => `${who(st, b.seat, me)} ${b.got > 0 ? "+" : ""}${b.got} (${esc(dogName(b.dog))} ${b.value})`).join(" · ");
    return row("🏆", `<b>Fin de la etapa ${h.leg}</b>: ${h.rank.slice(0, 2).map((d, i) => `${placeName(i)} ${esc(dogName(d))}`).join(", ")}.${pays ? ` Boletos: ${pays}` : " Nadie tomó boletos."}`, "hsys");
  }
  if (h.kind === "over") {
    const champs = h.champions.map((s) => who(st, s, me)).join(" y ");
    return row("🎉", `<b>¡Fin de la carrera!</b> Ganó ${dn(h.rank[0])} y llegó al último ${dn(h.rank[DOGS.length - 1])}. ${champs} ${h.champions.length > 1 ? "empatan" : h.champions[0] === me ? "ganas" : "gana"} con ${h.coins[h.champions[0]]} 🍪`, "hsys");
  }
  return "";
}

export function historyHTML(st, me) {
  const hist = st.hist || [];
  if (!hist.length) return `<div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div>`;
  const legs = new Map();
  for (const h of hist) { if (!legs.has(h.leg)) legs.set(h.leg, []); legs.get(h.leg).push(h); }
  return [...legs.entries()].reverse().map(([leg, list]) => `
    <h4 class="hleg">Etapa ${leg}</h4>
    <ol class="hist">${list.slice().reverse().map((h) => entryHTML(st, h, me)).join("")}</ol>`).join("");
}
