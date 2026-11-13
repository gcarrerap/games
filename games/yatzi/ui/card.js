// La tarjeta de puntos: una hoja de block con renglones, una columna por jugador. En la columna de quien tiene el
// turno se ven a lápiz los puntos que daría cada casilla libre con los dados de ahora; si es tu turno, se tocan para
// anotar. Lo anotado va "en pluma".
import { UPPER, LOWER, LABELS, HINTS, RULES, options, upperSum, upperBonusOf, total, nameOf } from "../engine/index.js";
import { esc } from "../../../platform/ui/dom.js";
import { miniDie } from "../../../modules/dice/ui.js";

const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const ICON = {
  three: "③", four: "④", full: "⌂", small: "▸", large: "⏵", yatzi: "★", chance: "?",
};

// opts: { seat, myTurn, pick, fresh: { seat, cat } | null, advice: cat | null, tv }
export function cardHTML(st, opts) {
  const n = st.config.n, playing = st.phase !== "over";
  const live = playing && st.rolls > 0 ? options(st.cards[st.turn], st.dice) : [];
  const liveOf = (cat) => live.find((o) => o.cat === cat);
  const wide = n <= 2;
  const nameLen = n <= 2 ? 12 : n <= 4 ? 7 : 5;

  const head = `<tr class="hd"><th class="lbl"><span class="brand">Yatzi</span></th>${st.cards.map((_, s) => `<th class="pc ${playing && st.turn === s ? "turn" : ""} ${s === opts.seat ? "mine" : ""}" scope="col"><span>${esc(short(nameOf(st, s), nameLen))}</span></th>`).join("")}</tr>`;

  const cell = (s, cat) => {
    const v = st.cards[s][cat];
    const fresh = opts.fresh && opts.fresh.seat === s && opts.fresh.cat === cat;
    if (v !== null) return `<td class="pc ink ${v === 0 ? "zero" : ""} ${fresh ? "fresh" : ""} ${playing && st.turn === s ? "turn" : ""}"><b>${v === 0 ? "✕" : v}</b></td>`;
    if (!playing || s !== st.turn || !st.rolls) return `<td class="pc ${playing && st.turn === s ? "turn" : ""}"></td>`;
    const o = liveOf(cat);
    if (!o) return `<td class="pc turn off"><i>·</i></td>`;
    const pts = o.pts + o.bonus;
    const cls = `pc turn ghost ${pts ? "" : "nil"} ${opts.pick === cat ? "pick" : ""} ${opts.advice === cat ? "adv" : ""}`;
    const label = `${LABELS[cat]}: ${pts ? `anotar ${pts}` : "tachar"}`;
    return opts.myTurn
      ? `<td class="${cls}"><button data-cat="${cat}" aria-label="${label}">${pts || "0"}</button></td>`
      : `<td class="${cls}"><i>${pts || "0"}</i></td>`;
  };

  const row = (cat, i) => `<tr class="cat c-${cat}">
    <th class="lbl" scope="row"><span class="ic">${i !== undefined ? miniDie(i + 1, 16) : `<em>${ICON[cat]}</em>`}</span><span class="nm">${LABELS[cat]}</span>${wide ? `<small>${HINTS[cat]}</small>` : ""}</th>
    ${st.cards.map((_, s) => cell(s, cat)).join("")}</tr>`;

  const upRow = `<tr class="sum up"><th class="lbl" scope="row"><span class="nm">Arriba</span>${wide ? `<small>Bono con ${RULES.upperBonusAt}</small>` : ""}</th>${st.cards.map((c, s) => {
    const u = upperSum(c), pct = Math.min(100, (u / RULES.upperBonusAt) * 100);
    return `<td class="pc ${playing && st.turn === s ? "turn" : ""}"><b>${u}</b><span class="bar" aria-hidden="true"><i style="width:${pct.toFixed(0)}%" class="${u >= RULES.upperBonusAt ? "done" : ""}"></i></span></td>`;
  }).join("")}</tr>`;
  const bonusRow = `<tr class="sum bonus"><th class="lbl" scope="row"><span class="ic"><em>✦</em></span><span class="nm">Bono</span>${wide ? `<small>+${RULES.upperBonus}</small>` : ""}</th>${st.cards.map((c, s) => {
    const b = upperBonusOf(c), left = UPPER.filter((k) => c[k] === null).length, need = RULES.upperBonusAt - upperSum(c);
    const txt = b ? `<b>${b}</b>` : left ? `<small>−${need}</small>` : `<b class="zero">✕</b>`;
    const fresh = opts.fresh && opts.fresh.seat === s && opts.fresh.upper;
    return `<td class="pc ink ${fresh ? "fresh" : ""} ${b ? "won" : ""} ${playing && st.turn === s ? "turn" : ""}">${txt}</td>`;
  }).join("")}</tr>`;
  const extra = st.cards.some((c) => c.bonus) ? `<tr class="sum xtra"><th class="lbl" scope="row"><span class="ic"><em>★</em></span><span class="nm">Yatzi extra</span>${wide ? `<small>+${RULES.yatziBonus} cada uno</small>` : ""}</th>${st.cards.map((c, s) => `<td class="pc ink ${c.bonus ? "won" : ""} ${opts.fresh && opts.fresh.seat === s && opts.fresh.bonus ? "fresh" : ""}">${c.bonus ? `<b>${c.bonus * RULES.yatziBonus}</b>` : ""}</td>`).join("")}</tr>` : "";
  const best = Math.max(...st.cards.map(total));
  const totRow = `<tr class="sum tot"><th class="lbl" scope="row"><span class="nm">Total</span></th>${st.cards.map((c, s) => {
    const t = total(c);
    return `<td class="pc ${playing && st.turn === s ? "turn" : ""} ${!playing && t === best ? "champ" : ""}"><b data-total="${s}">${t}</b></td>`;
  }).join("")}</tr>`;

  return `<table class="yz-card n${n} ${wide ? "wide" : ""}">
    <thead>${head}</thead>
    <tbody>${UPPER.map((c, i) => row(c, i)).join("")}${upRow}${bonusRow}
      <tr class="gap" aria-hidden="true"><td colspan="${n + 1}"></td></tr>
      ${LOWER.map((c) => row(c)).join("")}${extra}${totRow}</tbody>
  </table>`;
}
