// La mesa de Memoria Veloz: los jugadores (pares, cartas abiertas, timers), el tablero de cartas y los botones
// Reclamar / Regresar. Dibuja con ctx.view y juega con ctx.act().
//
// Tiempo: congelado, timers y recarga se cuentan con la hora del estado (`view.t`, la de la última acción) más lo
// que ha pasado en este teléfono desde que la vio. Así no importa si los relojes de los teléfonos no coinciden.
// Cada 250 ms (tick) se revisa si algo de eso cambió; solo entonces se vuelve a dibujar.
//
// Los toques van con pointerdown y un solo escuchador en la mesa (no se pierden aunque se redibuje en medio).
import { RULES, nameOf, isFrozen, canTimer, activeTimerBy, ranking, remaining } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { faceOf } from "./faces.js";
import { rulesHelp } from "./rules.js";

const COLORS = ["var(--ta)", "var(--tb)", "var(--tc)", "var(--td)"];
// En Monitor (ctx.display "tv") se dibuja la misma mesa, con su menú, sin caras ni botones de juego
const MONITOR = "tv";
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
const nowOf = (ui, v) => v.t + (performance.now() - ui.seenAt);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const who = (v, s, seat) => (s === seat ? "Tú" : nameOf(v, s));

// Lo que cambia con el tiempo (sin que cambie el estado): si cambia, se redibuja
function timeSig(v, seat, now) {
  const parts = [seat >= 0 && isFrozen(v, seat, now) ? secs(v.frozen[seat] - now) : 0];
  parts.push(seat >= 0 ? (canTimer(v, seat, now) ? "ok" : secs(v.cool[seat] - now)) : "");
  for (const tm of v.timers) parts.push(tm ? secs(tm.end - now) : "-");
  return parts.join("|");
}

export function wire(ui) {
  const down = (e) => {
    const ctx = ui.ctx; if (!ctx) return;
    const v = ctx.view, seat = ctx.seat;
    if (seat < 0 || v.phase !== "play" || ctx.display === MONITOR) return;
    const card = e.target.closest("[data-card]"), btn = e.target.closest("[data-act]");
    if (card) {
      e.preventDefault();
      const i = +card.dataset.card, c = v.cards[i];
      if (c.hold === seat) ctx.act({ type: "back", i });
      else if (c.hold < 0 && c.won < 0 && v.mine.length < RULES.maxOpen && !isFrozen(v, seat, nowOf(ui, v))) ctx.act({ type: "open", i });
      else card.classList.add("nope"), setTimeout(() => card.classList.remove("nope"), 300);
    } else if (btn && !btn.disabled) {
      e.preventDefault();
      const a = btn.dataset.act;
      if (a === "timer") ctx.act({ type: "timer", seat: +btn.dataset.seat });
      else ctx.act({ type: a });
    }
  };
  const click = (e) => { if (e.target.closest("#menu")) openOverlay("gameMenu"); };
  ui.el.addEventListener("pointerdown", down);
  ui.el.addEventListener("click", click);
  ui.unwire = () => { ui.el.removeEventListener("pointerdown", down); ui.el.removeEventListener("click", click); };
}

function renderMenu(ctx, v) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">${plural(v.config.pairs, "par", "pares")} · ${plural(v.config.n, "jugador", "jugadores")}</p>
    <details class="help" open><summary>Cómo se juega</summary>${rulesHelp()}</details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderResult(ctx, v, seat) {
  const order = ranking(v);
  const title = v.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(v, v.winner)}!`;
  const tie = order.length > 1 && v.pairs[order[0]] === v.pairs[order[1]];
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    ${tie ? `<p class="hint">Empate en pares: gana quien llegó primero.</p>` : ""}
    <div class="res">${order.map((s) => `<div class="resrow ${s === v.winner ? "win" : ""}"><span><i class="dot" style="--pc:${COLORS[s]}"></i> ${esc(nameOf(v, s))}${s === seat && nameOf(v, s) !== "Tú" ? " (tú)" : ""}</span><b>${v.pairs[s]}</b></div>`).join("")}</div>
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

function playersHTML(v, seat, now, tv) {
  const iCan = seat >= 0 && !tv && v.phase === "play" && canTimer(v, seat, now);
  return v.names.map((_, s) => {
    const tm = v.timers[s];
    const held = v.counts[s];
    const canHit = iCan && s !== seat && held > 0 && !tm;
    const showBtn = seat >= 0 && !tv && s !== seat && v.phase === "play";
    return `<div class="mp ${s === seat ? "mine" : ""} ${isFrozen(v, s, now) ? "frozen" : ""}" style="--pc:${COLORS[s]}">
      <i class="dot"></i>
      <span class="mpname">${esc(who(v, s, seat))}</span>
      <span class="mpheld" aria-label="${plural(held, "carta abierta", "cartas abiertas")}">${"●".repeat(held)}${"○".repeat(RULES.maxOpen - held)}</span>
      ${tm ? `<span class="mptimer" title="Timer de ${esc(who(v, tm.by, seat))}">⏱ ${secs(tm.end - now)}</span>` : isFrozen(v, s, now) ? `<span class="mpfrozen">❄️</span>` : `<span></span>`}
      <b class="mppairs">${v.pairs[s]}</b>
      ${showBtn ? `<button class="tbtn" data-act="timer" data-seat="${s}" ${canHit ? "" : "disabled"} aria-label="Ponerle timer a ${esc(nameOf(v, s))}">⏱</button>` : ""}
    </div>`;
  }).join("");
}

function statusHTML(v, seat, now, tv) {
  if (v.phase !== "play") return `Ganó ${esc(nameOf(v, v.winner))}`;
  if (seat < 0 || tv) return `Quedan ${plural(remaining(v), "par", "pares")}`;
  if (isFrozen(v, seat, now)) return `<span class="warn">❄️ No era pareja: congelado ${secs(v.frozen[seat] - now)} s</span>`;
  const tm = v.timers[seat];
  if (tm) return `<span class="warn">⏱ ${esc(nameOf(v, tm.by))} te puso timer: ${secs(tm.end - now)} s</span>`;
  const mine = v.mine;
  if (mine.length === 2) return v.cards[mine[0]].f === v.cards[mine[1]].f ? "¡Son iguales! Reclámalas" : "";
  if (mine.length === 1) return "Abre otra, o toca la tuya para regresarla";
  const t = activeTimerBy(v, seat);
  const timerTxt = t >= 0 ? `tu timer corre sobre ${esc(nameOf(v, t))}` : now < v.cool[seat] ? `tu timer se recarga en ${secs(v.cool[seat] - now)} s` : "";
  return `Toca una carta${timerTxt ? ` · <small>${timerTxt}</small>` : ""}`;
}

function cardHTML(v, seat, i, now, tv) {
  const c = v.cards[i];
  const miss = seat >= 0 && v.miss && v.miss.until > now ? v.miss.cards.indexOf(i) : -1;
  if (c.won >= 0) return `<div class="mc gone" style="--pc:${COLORS[c.won]}" aria-label="Reclamada"><span>${faceOf(c.f)}</span></div>`;
  if (c.hold === seat && seat >= 0) return `<button class="mc up mine" data-card="${i}" style="--pc:${COLORS[seat]}" aria-label="Tu carta: regresarla"><span>${faceOf(c.f)}</span></button>`;
  if (c.hold >= 0) return `<div class="mc held" style="--pc:${COLORS[c.hold]}" aria-label="Abierta por ${esc(nameOf(v, c.hold))}"></div>`;
  if (miss >= 0) return `<button class="mc up missed" data-card="${i}" aria-label="No era pareja"><span>${faceOf(v.miss.faces[miss])}</span></button>`;
  return tv || seat < 0 ? `<div class="mc"></div>` : `<button class="mc" data-card="${i}" aria-label="Carta ${i + 1}"></button>`;
}

export function renderTable(app, ctx, ui) {
  const v = ctx.view, seat = ctx.seat, tv = ctx.display === MONITOR;
  if (v.seq !== ui.seenSeq) { ui.seenSeq = v.seq; ui.seenAt = performance.now(); }
  const now = nowOf(ui, v);
  ui.sig = timeSig(v, seat, now);
  const n = v.cards.length, cols = tv ? (n > 36 ? 12 : 9) : 6, rows = Math.ceil(n / cols);
  const playing = v.phase === "play";
  const frozen = seat >= 0 && isFrozen(v, seat, now);
  const mine = v.mine;
  const canClaim = mine.length === 2 && v.cards[mine[0]].f === v.cards[mine[1]].f;

  app.className = `game memoria ${tv ? "tv" : ""}`;
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Memoria Veloz</div>
      <div class="bar-info">Quedan <b>${remaining(v)}</b></div>
    </header>
    <section class="mplayers" aria-label="Jugadores">${playersHTML(v, seat, now, tv)}</section>
    <div class="mstatus" aria-live="polite">${statusHTML(v, seat, now, tv)}</div>
    <section class="mgrid ${frozen ? "frozen" : ""}" style="--cols:${cols};--rows:${rows}" aria-label="Cartas">
      ${v.cards.map((_, i) => cardHTML(v, seat, i, now, tv)).join("")}
    </section>
    <section class="mactions">
      ${playing && seat >= 0 && !tv && mine.length === 2 ? `
        <button class="big" data-act="backAll">Regresar las dos</button>
        ${canClaim ? `<button class="primary big" data-act="claim">¡Reclamar!</button>` : ""}` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, v);
  else if (v.phase === "over") renderResult(ctx, v, seat);
  else ctx.modal.innerHTML = "";
}

export function onTick(ctx, ui) {
  const v = ctx.view;
  if (v.phase !== "play") return;
  if (timeSig(v, ctx.seat, nowOf(ui, v)) !== ui.sig) renderTable(ui.el, ctx, ui);
}
