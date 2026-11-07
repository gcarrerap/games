// La mesa de Memoria Veloz: los jugadores (pares, cartas abiertas, timers con su botón ⏱) y el tablero de cartas. Dibuja con ctx.view y juega con ctx.act().
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

// Tu último par, si lo acabas de juntar: se resalta un momento
const FRESH_MS = 1500;
function freshPair(v, seat, now) {
  const e = v.log[v.log.length - 1];
  return seat >= 0 && e && e.type === "claim" && e.seat === seat && now - e.t < FRESH_MS ? e : null;
}

// Lo que cambia con el tiempo (sin que cambie el estado): si cambia, se redibuja
function timeSig(v, seat, now) {
  const parts = [seat >= 0 && isFrozen(v, seat, now) ? secs(v.frozen[seat] - now) : 0, freshPair(v, seat, now) ? 1 : 0];
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
      if (c.hold < 0 && c.won < 0 && v.mine.length < RULES.maxOpen && !isFrozen(v, seat, nowOf(ui, v))) ctx.act({ type: "open", i });
      else card.classList.add("nope"), setTimeout(() => card.classList.remove("nope"), 300);
    } else if (btn && !btn.disabled) {
      e.preventDefault();
      const a = btn.dataset.act;
      if (a === "timer") ctx.act({ type: "timer", seat: +btn.dataset.seat });
    }
  };
  const click = (e) => { if (e.target.closest("#menu")) openOverlay("gameMenu"); };
  ui.el.addEventListener("pointerdown", down);
  ui.el.addEventListener("click", click);
  // Si cambia el tamaño de la pantalla (girar el teléfono, aparece la barra del navegador), se reacomoda el tablero
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => fitBoard(ui.el)) : null;
  ro?.observe(ui.el);
  ui.unwire = () => { ui.el.removeEventListener("pointerdown", down); ui.el.removeEventListener("click", click); ro?.disconnect(); };
}

// El tablero ocupa el espacio que dejan los jugadores, el aviso y los botones (que así siempre se ven): escoge
// cuántas columnas dan las cartas más grandes en ese espacio, y les da tamaño en píxeles.
const GAP = 5, RATIO = 0.8; // ancho / alto de una carta
export function bestLayout(n, W, H) {
  let best = { cols: 6, w: 0 };
  for (let cols = 3; cols <= 12; cols++) {
    const rows = Math.ceil(n / cols);
    if (rows * cols - n >= cols) continue;
    const w = Math.min((W - GAP * (cols - 1)) / cols, ((H - GAP * (rows - 1)) / rows) * RATIO);
    // Entre dos casi iguales, la que deja menos huecos al final
    if (w > best.w + 0.5 || (Math.abs(w - best.w) <= 0.5 && n % cols === 0 && n % best.cols !== 0)) best = { cols, w };
  }
  return { cols: best.cols, w: Math.max(16, Math.floor(best.w)) };
}
function fitBoard(app) {
  const box = app.querySelector(".mboard"), grid = app.querySelector(".mgrid");
  if (!box || !grid) return;
  const { cols, w } = bestLayout(grid.children.length, box.clientWidth, box.clientHeight);
  grid.style.gridTemplateColumns = `repeat(${cols}, ${w}px)`;
  grid.style.setProperty("--cw", `${w}px`);
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
  const fresh = freshPair(v, seat, now);
  if (fresh) return `<span class="good">¡Par! ${faceOf(fresh.f)}</span>`;
  if (v.mine.length === 1) return "Ahora busca su pareja";
  const t = activeTimerBy(v, seat);
  const timerTxt = t >= 0 ? `tu timer corre sobre ${esc(nameOf(v, t))}` : now < v.cool[seat] ? `tu timer se recarga en ${secs(v.cool[seat] - now)} s` : "";
  return `Toca una carta${timerTxt ? ` · <small>${timerTxt}</small>` : ""}`;
}

function cardHTML(v, seat, i, now, tv, fresh) {
  const c = v.cards[i];
  const miss = seat >= 0 && v.miss && v.miss.until > now ? v.miss.cards.indexOf(i) : -1;
  if (c.won >= 0 && fresh && fresh.cards.includes(i)) return `<div class="mc up fresh" style="--pc:${COLORS[c.won]}" aria-label="¡Tu par!"><span>${faceOf(c.f)}</span></div>`;
  if (c.won >= 0) return `<div class="mc gone" style="--pc:${COLORS[c.won]}" aria-label="Reclamada"><span>${faceOf(c.f)}</span></div>`;
  if (c.hold === seat && seat >= 0) return `<button class="mc up mine" data-card="${i}" style="--pc:${COLORS[seat]}" aria-label="Tu carta abierta"><span>${faceOf(c.f)}</span></button>`;
  if (c.hold >= 0) return `<div class="mc held" style="--pc:${COLORS[c.hold]}" aria-label="Abierta por ${esc(nameOf(v, c.hold))}"></div>`;
  if (miss >= 0) return `<button class="mc up missed" data-card="${i}" aria-label="No era pareja"><span>${faceOf(v.miss.faces[miss])}</span></button>`;
  return tv || seat < 0 ? `<div class="mc"></div>` : `<button class="mc" data-card="${i}" aria-label="Carta ${i + 1}"></button>`;
}

export function renderTable(app, ctx, ui) {
  const v = ctx.view, seat = ctx.seat, tv = ctx.display === MONITOR;
  if (v.seq !== ui.seenSeq) { ui.seenSeq = v.seq; ui.seenAt = performance.now(); }
  const now = nowOf(ui, v);
  ui.sig = timeSig(v, seat, now);
  const frozen = seat >= 0 && isFrozen(v, seat, now);
  const fresh = freshPair(v, seat, now);

  app.className = `game memoria ${tv ? "tv" : ""}`;
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Memoria Veloz</div>
      <div class="bar-info">Quedan <b>${remaining(v)}</b></div>
    </header>
    <section class="mplayers" aria-label="Jugadores">${playersHTML(v, seat, now, tv)}</section>
    <div class="mstatus" aria-live="polite">${statusHTML(v, seat, now, tv)}</div>
    <div class="mboard"><section class="mgrid ${frozen ? "frozen" : ""}" aria-label="Cartas">
      ${v.cards.map((_, i) => cardHTML(v, seat, i, now, tv, fresh)).join("")}
    </section></div>
    <section class="mactions">
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  fitBoard(app);
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
