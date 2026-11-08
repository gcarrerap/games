// La mesa de Cucharas: los jugadores (fichas y cuántas cartas tienen), la mesa con sus cartas, las cucharas cada una
// en su lugar alrededor de la orilla, y tu mano. Dibuja con ctx.view y juega con ctx.act().
//
// Para cambiar: tocas una carta de tu mano y luego la carta de la mesa que quieres; se intercambian en su lugar.
// Ni tu mano ni la mesa se reordenan. Con la mesa tapada se ven los reversos y tomas a ciegas. Las cucharas están
// repartidas por toda la orilla (cambian de lugar cada ronda): para tomar una tienes que buscar dónde queda alguna.
// Nadie anuncia nada: la que se toman deja su lugar vacío.
import { nameOf, isPoker, aliveSeats, HIDDEN, RULES } from "../engine/index.js";
import { rankOf } from "../../../modules/cards/index.js";
import { cardSVG, backSVG, cardChip } from "../../../modules/cards/ui.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { rulesHelp } from "./rules.js";

const MONITOR = "tv";
const ORDER = "A23456789TJQK";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const who = (v, s, seat) => (s === seat ? "Tú" : nameOf(v, s));
const sortHand = (h) => h.slice().sort((a, b) => ORDER.indexOf(rankOf(a)) - ORDER.indexOf(rankOf(b)) || (a < b ? -1 : 1));
const chipsHTML = (n) => (n > 0 ? `<span class="cuchips" aria-label="${plural(n, "ficha", "fichas")}">${"●".repeat(n)}</span>` : `<span class="cuout">fuera</span>`);

export function wire(ui) {
  const down = (e) => {
    const ctx = ui.ctx; if (!ctx) return;
    const v = ctx.view, seat = ctx.seat;
    if (seat < 0 || v.phase !== "play" || ctx.display === MONITOR || v.mySpoon || !v.hand.length) return;
    const card = e.target.closest("[data-hand]"), slot = e.target.closest("[data-slot]"), spoon = e.target.closest("[data-spoon]");
    if (spoon) { e.preventDefault(); ui.sel = null; ctx.act({ type: "spoon", i: +spoon.dataset.spoon }); return; }
    if (card) {
      e.preventDefault();
      ui.sel = ui.sel === card.dataset.hand ? null : card.dataset.hand;
      renderTable(ui.el, ctx, ui);
    } else if (slot) {
      e.preventDefault();
      const i = +slot.dataset.slot;
      if (!ui.sel) return nope(slot);
      const c = ui.sel; ui.sel = null;
      ctx.act({ type: "swap", c, slot: i });
    }
  };
  const click = (e) => { if (e.target.closest("#menu")) openOverlay("gameMenu"); };
  ui.el.addEventListener("pointerdown", down);
  ui.el.addEventListener("click", click);
  ui.unwire = () => { ui.el.removeEventListener("pointerdown", down); ui.el.removeEventListener("click", click); };
}
function nope(el) { el.classList.add("nope"); setTimeout(() => el.classList.remove("nope"), 300); }

function renderMenu(ctx, v) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Ronda ${v.round} · ${plural(aliveSeats(v).length, "jugador", "jugadores")} en juego</p>
    <details class="help" open><summary>Cómo se juega</summary>${rulesHelp(v.config.table)}</details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

// Lo que pasó en la ronda: las manos de todos, quién tomó primero (y si tenía póker) y quién se quedó sin cuchara
function roundHTML(v, seat) {
  const L = v.last;
  const firstTxt = L.firstPoker ? `tenía póker: gana ficha` : `<b class="bad">no tenía póker: pierde ficha</b>`;
  const rows = L.hands.map((h, s) => {
    if (!h.length) return "";
    const k = L.spoonBy.indexOf(s);
    const tag = s === L.loser ? `<span class="bad">sin cuchara</span>` : `🥄 ${k + 1}º`;
    const d = L.delta[s];
    return `<div class="curow ${s === L.loser ? "lost" : ""}">
      <span class="curname">${esc(who(v, s, seat))}</span>
      <span class="curhand ${isPoker(h) ? "poker" : ""}">${sortHand(h).map(cardChip).join("")}</span>
      <span class="curtag">${tag}</span>
      <b class="curdelta ${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+1" : d < 0 ? d : ""}</b>
      ${chipsHTML(v.chips[s])}
    </div>`;
  }).join("");
  return `<p><b>${esc(who(v, L.first, seat))}</b> tomó la primera cuchara y ${firstTxt}.
    <b>${esc(who(v, L.loser, seat))}</b> se quedó sin cuchara.</p>
    ${L.out.length ? `<p class="bad">Fuera: ${L.out.map((s) => esc(nameOf(v, s))).join(", ")}</p>` : ""}
    <div class="curesult">${rows}</div>`;
}

function renderBetween(ctx, v, seat) {
  const canNext = seat >= 0 && v.chips[seat] > 0 && ctx.display !== MONITOR;
  renderSheet(ctx.modal, `round-${ctx.table.round}-${v.last.round}`, `Ronda ${v.last.round}`, `
    ${roundHTML(v, seat)}
    ${canNext ? `<button class="primary big-cta" id="next">Siguiente ronda</button>` : `<p class="hint center">Esperando la siguiente ronda…</p>`}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#next", ctx.modal)?.addEventListener("click", () => ctx.act({ type: "next" }));
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

function renderResult(ctx, v, seat) {
  const title = v.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(v, v.winner)}!`;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    ${v.last ? roundHTML(v, seat) : ""}
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

function playersHTML(v, seat) {
  return v.names.map((_, s) => `<div class="cup ${s === seat ? "mine" : ""} ${v.chips[s] <= 0 ? "gone" : ""}">
      <span class="cupname">${esc(who(v, s, seat))}</span>
      ${v.chips[s] > 0 && v.phase === "play" ? `<span class="cupcards" aria-label="${plural(v.counts[s], "carta", "cartas")}">${"▮".repeat(v.counts[s])}</span>` : ""}
      ${chipsHTML(v.chips[s])}
    </div>`).join("");
}

function statusHTML(v, seat, tv, sel) {
  if (v.phase === "over") return `Ganó ${esc(nameOf(v, v.winner))}`;
  if (v.phase !== "play") return "Terminó la ronda";
  if (seat < 0 || tv) return `Ronda ${v.round}`;
  if (v.chips[seat] <= 0) return "Ya no tienes fichas: estás mirando";
  if (v.mySpoon) return "🥄 Tienes cuchara. Espera a que termine la ronda.";
  if (isPoker(v.hand)) return `<span class="good">¡Póker! Toma una cuchara</span>`;
  if (sel) return v.slots.includes(HIDDEN) ? "Ahora toca una carta de la mesa (a ciegas)" : "Ahora toca la carta de la mesa que quieres";
  return "Toca una carta tuya para cambiarla";
}

// Dónde va el lugar `pos` (0 … ring-1) en la orilla de la mesa, en % del ancho y alto: arranca arriba a la izquierda
// y da la vuelta como reloj. Los lados largos tienen más lugares que los cortos.
function spotXY(pos) {
  const W = 1, H = 0.75, t = ((pos + 0.5) / RULES.ring) * 2 * (W + H);
  if (t < W) return [t / W, 0];
  if (t < W + H) return [1, (t - W) / H];
  if (t < 2 * W + H) return [1 - (t - W - H) / W, 1];
  return [0, 1 - (t - 2 * W - H) / H];
}

function spotsHTML(v, canAct) {
  return v.spots.map((sp, i) => {
    const [x, y] = spotXY(sp.pos);
    const at = `style="--x:${(x * 100).toFixed(1)}%;--y:${(y * 100).toFixed(1)}%"`;
    if (!sp.free) return `<span class="cuspot taken" ${at}></span>`;
    return canAct ? `<button class="cuspot" data-spoon="${i}" ${at} aria-label="Tomar cuchara">🥄</button>` : `<span class="cuspot" ${at}>🥄</span>`;
  }).join("");
}

function slotHTML(v, i, canAct, sel) {
  const c = v.slots[i];
  const inner = c === HIDDEN ? backSVG() : cardSVG(c);
  return canAct ? `<button class="cus ${sel ? "pick" : ""}" data-slot="${i}" aria-label="Tomar esta carta">${inner}</button>` : `<div class="cus">${inner}</div>`;
}

export function renderTable(app, ctx, ui) {
  const v = ctx.view, seat = ctx.seat, tv = ctx.display === MONITOR;
  if (ui.sel && !v.hand.includes(ui.sel)) ui.sel = null;
  const playing = v.phase === "play";
  const canAct = playing && seat >= 0 && !tv && !v.mySpoon && v.hand.length > 0;
  const n = v.slots.length, cols = n <= 4 ? 2 : 4;

  app.className = `game cucharas ${tv ? "tv" : ""}`;
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Cucharas</div>
      <div class="bar-info">Ronda <b>${v.round}</b></div>
    </header>
    <section class="cuplayers" aria-label="Jugadores">${playersHTML(v, seat)}</section>
    <section class="cutable">
      <div class="cuslots" style="--cols:${cols}" aria-label="Mesa">${v.slots.map((_, i) => slotHTML(v, i, canAct, !!ui.sel)).join("")}</div>
      <div class="curing" aria-label="Cucharas">${playing ? spotsHTML(v, canAct) : ""}</div>
    </section>
    <div class="custatus" aria-live="polite">${statusHTML(v, seat, tv, ui.sel)}</div>
    ${seat >= 0 && !tv ? `<section class="cuhand ${v.mySpoon ? "frozen" : ""}" aria-label="Tu mano">
      ${v.hand.map((c) => canAct
        ? `<button class="cuc ${ui.sel === c ? "sel" : ""}" data-hand="${c}" aria-label="Soltar esta carta">${cardSVG(c)}</button>`
        : `<div class="cuc">${cardSVG(c)}</div>`).join("")}
    </section>` : ""}
    ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
    ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, v);
  else if (v.phase === "over") renderResult(ctx, v, seat);
  else if (v.phase === "between") renderBetween(ctx, v, seat);
  else ctx.modal.innerHTML = "";
}
