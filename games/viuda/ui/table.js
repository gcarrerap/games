// La mesa de La Viuda: los jugadores con sus fichas, la viuda al centro, tu mano y tus botones. El botón "Reglas"
// queda siempre a la vista. Dibuja con ctx.view y juega con ctx.act(). Lo único propio de esta pantalla es la
// selección para cambiar una carta (`ui.give`, `ui.take`), que se borra en cuanto cambia la mesa.
import { evaluate, describe, nameOf, rankLabel } from "../engine/index.js";
import { cardSVG, backSVG } from "../../../modules/cards/ui.js";
import { cardName } from "../../../modules/cards/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { rulesHelp } from "./rules.js";

const CW = 58, CH = 82;
const isWild = (c, st) => !!st.wild && c[0] === st.wild;

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de La Viuda", `${rulesHelp()}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderMenu(ctx, st) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Mano ${st.hand} · ${st.config.n} jugadores</p>
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

const chipsHTML = (n, viuda) => `<span class="chips" aria-label="${n} ficha${n === 1 ? "" : "s"}">${Array.from({ length: n }, (_, i) => `<i class="chip ${viuda && i === n - 1 ? "viuda" : ""}"></i>`).join("")}</span>`;

// Las manos al final de la mano (o de la partida)
function showdownHTML(st, seat) {
  const sd = st.showdown;
  const rows = sd.rows.map((r) => {
    const lost = sd.losers.includes(r.seat);
    const notes = [
      lost ? "pierde una ficha" : "",
      sd.viuda === r.seat ? "recibe la viuda" : "",
      sd.eliminated.includes(r.seat) ? "sale del juego" : "",
      sd.knocker === r.seat ? "tocó" : "",
    ].filter(Boolean).join(" · ");
    return `<div class="sdrow ${lost ? "lost" : ""}">
      <div class="sdhead"><b>${esc(nameOf(st, r.seat))}${r.seat === seat && nameOf(st, r.seat) !== "Tú" ? " (tú)" : ""}</b><span>${esc(r.label)}</span></div>
      <div class="sdcards">${r.cards.map((c) => `<span class="${isWild(c, st) ? "wildc" : ""}" aria-label="${esc(cardName(c))}">${cardSVG(c, 34, 48)}</span>`).join("")}</div>
      ${notes ? `<div class="sdnote">${notes}</div>` : ""}
    </div>`;
  }).join("");
  const w = sd.widow;
  const widowRow = w ? `<div class="sdrow widowrow">
      <div class="sdhead"><b>La viuda${w.wasOpen ? "" : " (nadie la tomó)"}</b><span>${esc(w.label)}</span></div>
      <div class="sdcards">${w.cards.map((c) => `<span class="${isWild(c, st) ? "wildc" : ""}" aria-label="${esc(cardName(c))}">${cardSVG(c, 34, 48)}</span>`).join("")}</div>
    </div>` : "";
  return `<p class="hint">${sd.reason === "pass" ? "Todos pasaron con la viuda tapada." : ""} Comodín: ${sd.wild ? rankLabel(sd.wild) : "ninguno"}.</p><div class="sd">${rows}${widowRow}</div>`;
}

function renderResult(ctx, st, seat) {
  closeOverlay();
  const over = st.phase === "over";
  const lost = st.showdown.losers.map((s) => nameOf(st, s)).join(" y ");
  const title = over ? (st.winner === null ? "Empate" : st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`)
    : st.showdown.losers.includes(seat) ? `Mano ${st.hand}: perdiste una ficha` : `Mano ${st.hand}: pierde ${lost}`;
  renderSheet(ctx.modal, `result-${ctx.table.round}-${st.hand}-${st.phase}`, title, `
    ${showdownHTML(st, seat)}
    ${seat >= 0 ? (over ? `<button class="primary big-cta" id="again">Revancha</button>` : `<button class="primary big-cta" id="next">Siguiente mano</button>`) : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#next", ctx.modal)?.addEventListener("click", () => ctx.act({ type: "next" }));
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

function statusText(st, seat) {
  if (st.phase === "over") return st.winner === null ? "Empate" : `Ganó ${nameOf(st, st.winner)}`;
  if (st.phase === "pause") return "Se muestran las manos";
  const mine = st.turn === seat;
  if (st.phase === "blind") return mine ? "Te toca: toma la viuda a ciegas, pasa o toca" : `${nameOf(st, st.turn)} decide si toma la viuda`;
  if (st.phase === "open") return mine ? "Te toca: cambia una, cambia las 5 o toca" : `Turno de ${nameOf(st, st.turn)}`;
  return mine ? "Tu último intento" : `Último intento de ${nameOf(st, st.turn)}`;
}

// Aviso de que alguien tocó: su nombre destacado y que ya es la última vuelta
function knockAlert(st, seat, fresh) {
  if (st.phase !== "last") return "";
  const me = st.knocker === seat;
  const who = me ? "Tocaste" : `<b class="knocker">${esc(nameOf(st, st.knocker))}</b> tocó`;
  const sub = me ? "Los demás tienen un último intento" : st.turn === seat ? "Última vuelta" : "Última vuelta: cada quien tiene un último intento";
  return `<div class="knockalert ${fresh ? "flash" : ""}" role="alert"><span class="kicon" aria-hidden="true">✋</span><div><div class="ktitle">${who}</div><div class="ksub">${sub}</div></div></div>`;
}

function lastText(st, seat) {
  const l = st.last;
  if (!l || st.phase === "pause" || st.phase === "over") return "";
  if (l.kind === "knock") return ""; // ya lo dice el aviso de última vuelta
  const who = l.seat === seat ? "Tú" : nameOf(st, l.seat);
  const me = l.seat === seat;
  let verb;
  if (l.kind === "all") verb = l.blind ? (me ? "tomaste la viuda a ciegas" : "tomó la viuda a ciegas") : (me ? "cambiaste las 5" : "cambió las 5");
  else if (l.kind === "swap") verb = me ? `cambiaste ${cardName(l.give)} por ${cardName(l.take)}` : `dejó ${cardName(l.give)} y se llevó ${cardName(l.take)}`;
  else if (l.kind === "knock") verb = me ? "tocaste" : "tocó";
  else verb = me ? "pasaste" : "pasó";
  return `${who} ${verb}`;
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  app.className = "game viuda";
  if (st.seq !== ui.seenSeq) { ui.give = null; ui.take = null; ui.seenSeq = st.seq; }
  const playing = ["blind", "open", "last"].includes(st.phase);
  const myTurn = playing && seat >= 0 && st.turn === seat;
  const clockOn = playing && st.config.timer !== false;
  const hand = seat >= 0 && Array.isArray(st.hands[seat]) ? st.hands[seat] : [];

  const board = st.names.map((_, s) => {
    const out = st.out[s];
    const tags = [
      !out && st.dealer === s ? "reparte" : "",
      !out && st.cut && st.cut.seat === s && st.cut.took ? "partió con comodín" : "",
      st.viuda === s && !out ? "tiene la viuda" : "",
      out ? "fuera" : "",
    ].filter(Boolean);
    const knocked = st.phase === "last" && st.knocker === s;
    return `<div class="prow ${playing && st.turn === s ? "turn" : ""} ${s === seat ? "mine" : ""} ${out ? "out" : ""} ${knocked ? "knocked" : ""}">
      <span class="pname">${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " <small>(tú)</small>" : ""}</span>
      ${knocked ? `<span class="kbadge">TOCÓ</span>` : ""}
      ${out ? "" : chipsHTML(st.chips[s], st.viuda === s)}
      ${tags.length ? `<span class="ptags">${tags.join(" · ")}</span>` : ""}
    </div>`;
  }).join("");

  // La viuda: tapada hasta que alguien la toma; abierta, se puede escoger una carta para cambiar
  const canSwap = myTurn && st.widowOpen;
  // El aviso de que tocaron parpadea solo la primera vez que se ve
  const knockKey = st.phase === "last" ? `${st.hand}:${st.knocker}` : null;
  const freshKnock = !!knockKey && ui.knockSeen !== knockKey;
  ui.knockSeen = knockKey;
  const widow = st.widow
    ? st.widow.map((c) => `<button class="cardbtn ${ui.take === c ? "sel" : ""} ${isWild(c, st) ? "wildc" : ""}" data-take="${c}" ${canSwap ? "" : "disabled"} aria-pressed="${ui.take === c}" aria-label="${esc(cardName(c))} de la viuda">${cardSVG(c, CW, CH)}</button>`).join("")
    : Array.from({ length: st.widowCount }, () => `<span class="cardback">${backSVG(CW, CH)}</span>`).join("");

  const ev = hand.length === 5 ? evaluate(hand, st.wild) : null;
  const handHTML = hand.map((c) => `<button class="cardbtn ${ui.give === c ? "sel" : ""} ${isWild(c, st) ? "wildc" : ""}" data-give="${c}" ${canSwap ? "" : "disabled"} aria-pressed="${ui.give === c}" aria-label="${esc(cardName(c))}${isWild(c, st) ? ", comodín" : ""}">${cardSVG(c, CW, CH)}</button>`).join("");

  let actions = "";
  if (myTurn && !st.widowOpen) {
    actions = `<button id="all" class="primary big">Tomar la viuda</button><button id="pass" class="big">Pasar</button>
      ${st.phase === "blind" ? `<button id="knock" class="big knockbtn">Tocar</button>` : ""}`;
  } else if (myTurn) {
    const ready = ui.give && ui.take;
    actions = `<button id="swap" class="primary big" ${ready ? "" : "disabled"}>${ready ? `Cambiar ${cardName(ui.give)} por ${cardName(ui.take)}` : "Cambiar una"}</button>
      <button id="all" class="big">Cambiar las 5</button>
      ${st.phase === "open" ? `<button id="knock" class="big knockbtn">Tocar</button>` : `<button id="pass" class="big">Pasar</button>`}`;
  }
  const hint = canSwap && !(ui.give && ui.take) ? `<p class="hint center">Para cambiar una, toca una carta tuya y una de la viuda.</p>` : "";
  const last = lastText(st, seat);

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">La Viuda</div>
      <div class="bar-info">Mano <b>${st.hand}</b> · Comodín <b>${st.wild ? rankLabel(st.wild) : "—"}</b></div>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <section class="board" aria-label="Jugadores">${board}</section>
    <section class="felt ${st.phase === "last" ? "lastround" : ""}">
      ${knockAlert(st, seat, freshKnock)}
      <div class="status ${myTurn ? "me" : ""}">${esc(statusText(st, seat))}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      <div class="widowlbl">La viuda${st.widow ? "" : " (tapada)"}</div>
      <div class="widow">${widow}</div>
      ${last ? `<div class="lastev">${esc(last)}</div>` : ""}
    </section>
    <section class="me">
      ${hand.length ? `<div class="handlbl">Tu mano${ev ? `: <b>${esc(describe(ev))}</b>` : ""}</div><div class="hand">${handHTML}</div>` : ""}
      ${hint}
      ${actions ? `<div class="actions">${actions}</div>` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : seat >= 0 && st.out[seat] ? `<p class="hint center">Saliste del juego; sigue mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  app.querySelectorAll("[data-give]").forEach((b) => b.onclick = () => { ui.give = ui.give === b.dataset.give ? null : b.dataset.give; ctx.refresh(); });
  app.querySelectorAll("[data-take]").forEach((b) => b.onclick = () => { ui.take = ui.take === b.dataset.take ? null : b.dataset.take; ctx.refresh(); });
  $("#all", app)?.addEventListener("click", () => ctx.act({ type: "all" }));
  $("#pass", app)?.addEventListener("click", () => ctx.act({ type: "pass" }));
  $("#knock", app)?.addEventListener("click", () => ctx.act({ type: "knock" }));
  $("#swap", app)?.addEventListener("click", () => { if (ui.give && ui.take) ctx.act({ type: "swap", give: ui.give, take: ui.take }); });

  const ov = overlay();
  if (ov && ov.id === "rules") renderRules(ctx);
  else if (ov && ov.id === "gameMenu") renderMenu(ctx, st);
  else if (st.phase === "pause" || st.phase === "over") renderResult(ctx, st, seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
