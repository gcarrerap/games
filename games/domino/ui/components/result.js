// Resultado de la mano o de la partida (de myDomino). Sin ✕: la mano terminó y hay que escoger qué sigue.
import { P, TARGET, nameOf } from "../../engine/index.js";
import { $, esc } from "../../../../platform/ui/dom.js";
import { renderSheet, closeOverlay } from "../../../../platform/ui/sheet.js";
import { scoreLabels, teamColor } from "../labels.js";
import { tileSVG } from "../svg/tile.js";

export function renderResult(ctx, st, seat) {
  closeOverlay(); // el registro o el menú se cierran solos
  const r = st.result, c = st.config, labels = scoreLabels(st), m = ctx.modal;
  const title = r.type === "domino" ? `${nameOf(st, r.seat)} dominó` : "Juego cerrado";
  const winTxt = c.teams ? `Gana la mano: ${labels[r.winner]}` : `Gana la mano: ${nameOf(st, r.winner)}`;
  const rows = st.seats.map((_, i) => `<div class="resrow"><div><strong>${c.teams ? `<span class="teamdot" style="background:${teamColor(i % 2)}"></span>` : ""}${esc(nameOf(st, i))}</strong>
      <div class="mini">${r.hands[i].map((t) => tileSVG(...P(t), false, 10)).join("") || '<span class="hint">sin fichas</span>'}</div></div>
      <span>${r.sums[i]} pts</span></div>`).join("");
  const adds = st.scores.map((s, i) => `<div class="resrow"><span>${esc(labels[i])}</span><span><span class="plus">${r.add[i] ? "+" + r.add[i] : "—"}</span> · ${s}</span></div>`).join("");
  const over = st.status === "gameover";
  const champ = over ? (c.teams ? labels[r.champion] : nameOf(st, r.champion)) : "";
  renderSheet(m, `result-${ctx.table.round}-${st.handNo}-${st.status}`, over ? `¡Ganó ${champ}!` : title, `
    <p class="hint">${esc(over ? `${title}. Alguien llegó a ${TARGET} puntos en contra.` : winTxt + (r.type === "cerrado" ? " (menos puntos)" : ""))}</p>
    <div class="res">${rows}</div>
    <h2>Puntos en contra</h2><div class="res">${adds}</div>
    ${seat >= 0 ? (over ? `<button class="primary big-cta" id="again">Revancha</button>` : `<button class="primary big-cta" id="next">Siguiente mano</button>`) : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#next", m)?.addEventListener("click", () => ctx.act({ type: "next" }));
  $("#again", m)?.addEventListener("click", () => ctx.again());
  $("#exit", m).onclick = () => ctx.leave();
}
