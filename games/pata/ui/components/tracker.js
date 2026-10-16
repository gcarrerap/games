// Registro de un jugador (de myPata): cuántas cartas tiene, en qué montón va, lo que levantó del pozo y todavía
// tiene, y lo que ha descartado en esta ronda. Todo sale de tu vista: lo que cualquiera en la mesa pudo ver.
import { nameOf, RULES, sortCards } from "../../engine/index.js";
import { tracker } from "../../ai/index.js";
import { $, esc } from "../../../../platform/ui/dom.js";
import { closeOverlay, renderSheet } from "../../../../platform/ui/sheet.js";
import { levelSeg } from "../labels.js";
import { cardChip } from "../svg/card.js";

export function renderTracker(ctx, ui, st, seat, t) {
  const m = ctx.modal;
  if (t === null || t === undefined || !st.hand || t === seat) { m.innerHTML = ""; return; }
  const tr = tracker(st, seat, t), name = nameOf(st, t);
  const real = ui.reveal && ctx.practice ? ctx.peek() : null;
  const list = (cards) => cards.length ? sortCards(cards).map(cardChip).join(" ") : `<span class="hint">nada</span>`;
  const botSeat = ctx.table.seats[t];
  renderSheet(m, "track-" + t, `Registro de ${name}`, `
    ${ctx.practice && botSeat && botSeat.bot ? `<div class="cpurow"><span class="cpuname">Nivel</span>${levelSeg("seat" + t, Number(botSeat.profile) || 2)}</div>` : ""}
    <p>Tiene <b>${tr.count}</b> carta${tr.count === 1 ? "" : "s"} y va en su montón <b>${tr.pileNo}</b> de ${RULES.piles}.
      ${tr.down ? "Su equipo ya se bajó." : "Su equipo todavía no se baja."}</p>
    <p class="trk-line"><b>Levantó del pozo y todavía tiene:</b> ${list(tr.known)}</p>
    <p class="trk-line"><b>Descartó en esta ronda:</b> ${tr.discarded.length ? tr.discarded.map(cardChip).join(" ") : `<span class="hint">nada</span>`}</p>
    ${real ? `<p class="reveal-note"><b>Su mano (modo revisión):</b> ${list(real.hand.hands[t])}</p>` : ""}
    <p class="hint">Solo se ve lo que cualquiera en la mesa pudo ver: las cartas que levantó del pozo y las que tiró.</p>
    <button class="primary" id="trkclose">Cerrar</button>`);
  $("#trkclose", m).onclick = closeOverlay;
  m.querySelectorAll("[data-lvl]").forEach((b) => b.onclick = () => {
    const [id, l] = b.dataset.lvl.split(":");
    ctx.setSeatBot(+id.replace("seat", ""), String(l));
  });
}
