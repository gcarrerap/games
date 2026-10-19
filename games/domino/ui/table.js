// La mesa del dominó (de myDomino, ui/screens/table.js): marcador, jugadores alrededor, la cadena, tu mano y tus
// acciones. Dibuja con ctx.view (lo que tu asiento puede ver) y juega con ctx.act().
import { P, TARGET, canDraw, canPass, ends, hasPozo, legalPlays, nameOf, pts, teamOf } from "../engine/index.js";
import { deduce } from "../ai/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { modeLabel, scoreLabels, seatPos, teamColor } from "./labels.js";
import { chainSVG } from "./svg/chain.js";
import { tileSVG } from "./svg/tile.js";
import { renderResult } from "./components/result.js";
import { renderAdvice } from "./components/advice.js";
import { renderTracker } from "./components/tracker.js";

const RESULT_DELAY_MS = 2500; // cuánto se ve la mesa al terminar la mano antes de que suba el resultado
export const timerOn = (st) => st.config.timer !== false;
export const turnKeyOf = (ctx) => (ctx.table.status === "playing" ? `${ctx.table.round}:${ctx.table.turn}` : null);

// Tu mano: orden y giro que tú escoges (solo en este teléfono). Fichas nuevas (las que comes) van al final.
function handOrder(ctx, ui, st, seat) {
  const key = `${ctx.table.created}|${ctx.table.round}|${st.handNo}|${seat}`, hand = st.hand.hands[seat];
  if (!ui.arr || ui.arr.key !== key) ui.arr = { key, order: hand.slice().sort((x, y) => pts(y) - pts(x)), flip: {} };
  const keep = ui.arr.order.filter((t) => hand.includes(t));
  ui.arr.order = [...keep, ...hand.filter((t) => !keep.includes(t))];
  return ui.arr.order;
}
const saveArr = (ctx, ui) => ctx.prefs.setJSON("arr", ui.arr);

// Menú de la partida: marcador, ver manos (práctica), jugadas y salir
function renderGameMenu(ctx, ui, st, seat) {
  const c = st.config, labels = scoreLabels(st), mine = seat >= 0 ? teamOf(st, seat) : -1;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Mano ${st.handNo} · ${esc(modeLabel(c))}</p>
    <div class="scores">${st.scores.map((v, i) => `<div class="score ${i === mine ? "mine" : ""}"><div class="who">${c.teams ? `<span class="teamdot" style="background:${teamColor(i)}"></span>` : ""}${esc(labels[i])}</div>
      <div class="val">${v}<small> / ${TARGET}</small></div><div class="bar"><i style="width:${Math.min(100, v)}%"></i></div></div>`).join("")}</div>
    ${ctx.practice ? `<button id="reveal" class="${ui.reveal ? "primary" : ""}" aria-pressed="${ui.reveal}">${ui.reveal ? "Ocultar manos" : "Ver manos (evaluar)"}</button>` : ""}
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
  $("#reveal", ctx.modal)?.addEventListener("click", () => { ui.reveal = !ui.reveal; ctx.refresh(); });
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  app.className = "game";
  const c = st.config, h = st.hand, n = c.n;
  const real = ui.reveal && ctx.practice ? ctx.peek() : null; // "Ver manos": solo lo que TÚ ves; la compu nunca
  const myScoreIdx = seat >= 0 ? teamOf(st, seat) : -1;
  const turnSeats = st.status === "playing" ? (h.turn !== null ? [h.turn] : (h.board.length ? [] : h.openers)) : [];
  const ded = st.status === "playing" ? deduce(st, seat) : null;
  const sureCount = (s) => (ded ? Object.values(ded.possible).filter((p) => p.length === 1 && p[0] === s).length : 0);

  const short = c.teams
    ? [0, 1].map((k) => { const t = myScoreIdx < 0 ? k : (k === 0 ? myScoreIdx : 1 - myScoreIdx); return `<span class="sc"><span class="teamdot" style="background:${teamColor(t)}"></span>${k === 0 ? "Nos" : "Ellos"} <b>${st.scores[t]}</b></span>`; }).join("")
    : st.scores.map((v, i) => `<span class="sc ${i === seat ? "mine" : ""}">${esc(i === seat ? "Tú" : nameOf(st, i).slice(0, 6))} <b>${v}</b></span>`).join("");

  // Cada jugador es una franja delgada pegada a su orilla de la mesa
  const badge = (s) => {
    const pos = seatPos(st, seat, s), cnt = h.hands[s].length, lk = (h.lacks && h.lacks[s]) || [], sc = sureCount(s);
    const tiles = real ? `<span class="rl-rev">${real.hand.hands[s].map((x) => tileSVG(...P(x), false, 8)).join("")}</span>`
      : `<span class="rl-backs">${"<i></i>".repeat(Math.min(cnt, 14))}</span>`;
    const info = [s === h.mano ? "salió" : "", lk.length ? `sin ${lk.join(",")}` : "", sc ? `${sc} segura${sc === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");
    return `<button class="rl rl-${pos} ${turnSeats.includes(s) ? "turn" : ""}" data-track="${s}" aria-label="${esc(nameOf(st, s))}: ${cnt} fichas${info ? ", " + info : ""}. Ver registro">
      <span class="rl-nm">${c.teams ? `<span class="teamdot" style="background:${teamColor(s % 2)}"></span>` : ""}${esc(nameOf(st, s))}</span>
      ${tiles}${info ? `<span class="rl-info">${esc(info)}</span>` : ""}</button>`;
  };
  const others = []; for (let k = 0; k < n; k++) if (k !== seat) others.push(k);
  const at = (pos) => others.filter((s) => seatPos(st, seat, s) === pos).map(badge).join("");

  const legal = seat >= 0 && st.status === "playing" ? legalPlays(st, seat) : [];
  const legalTiles = new Set(legal.map((p) => p.tile));
  const sel = ui.sel && legalTiles.has(ui.sel) ? ui.sel : null;
  const selSides = sel ? legal.filter((p) => p.tile === sel).map((p) => p.side) : [];
  const [le, re] = h.board.length ? ends(h) : [null, null];

  // La cadena crece al inicio hacia la pareja (o el jugador) que lleva la mano
  let vertical = false;
  if (h.board.length && h.mano !== null && h.mano !== undefined) {
    const team = others.concat(seat >= 0 ? [seat] : []).filter((s) => (c.teams ? s % 2 === h.mano % 2 : s === h.mano));
    vertical = team.some((s) => ["top", "bottom"].includes(seatPos(st, seat, s)));
  }

  let statusTxt = "", myTurn = false;
  if (st.status === "playing") {
    myTurn = turnSeats.includes(seat);
    if (myTurn) statusTxt = "Te toca";
    else if (turnSeats.length) statusTxt = `Turno de ${turnSeats.map((s) => nameOf(st, s)).join(" o ")}`;
    if (h.turn === null && !h.board.length && myTurn) statusTxt = "Sale tu pareja o tú";
    if (myTurn && !legal.length) statusTxt += canDraw(st, seat) ? " · come" : " · pasa";
    else if (myTurn && sel && selSides.length > 1) statusTxt += " · ¿de qué lado?";
  }

  // La última ficha que se tiró se resalta en la mesa. Al terminar la mano, la mesa se queda a la vista un momento
  // antes de que suba el resultado, y desde el resultado se puede volver a verla.
  const lastPlay = (h.history || []).filter((e) => e.a === "play").pop() || null;
  const lastIdx = !lastPlay || !h.board.length ? null : lastPlay.side === "L" ? 0 : lastPlay.side === "R" ? h.board.length - 1 : Math.min(h.left || 0, h.board.length - 1);
  const ended = st.status === "handover" || st.status === "gameover";
  const resKey = ended ? `result-${ctx.table.round}-${st.handNo}-${st.status}` : null;
  if (resKey !== (ui.res ? ui.res.key : null)) {
    ui.res = resKey ? { key: resKey, show: false } : null;
    if (resKey) setTimeout(() => { if (ui.res && ui.res.key === resKey && !ui.res.seen) { ui.res.show = ui.res.seen = true; ctx.refresh(); } }, RESULT_DELAY_MS);
  }
  const showResult = ended && ui.res.show;
  if (ended) {
    const r = st.result;
    if (r.type === "domino") statusTxt = `${nameOf(st, r.seat)} dominó${lastPlay ? ` con la ${lastPlay.tile}` : ""}`;
    else statusTxt = `Juego cerrado${lastPlay ? ` · la última fue ${lastPlay.tile} de ${nameOf(st, lastPlay.s)}` : ""}`;
  }

  const emptyMsg = !h.board.length && st.status === "playing" ? (() => {
    const who = h.turn !== null ? nameOf(st, h.turn) : h.openers.map((s) => nameOf(st, s)).join(" o ");
    return `<div class="empty">Sale ${esc(who)}${h.firstReq ? ` con la ${h.firstReq === "6-6" ? "mula de 6" : "ficha " + h.firstReq}` : ""}</div>`;
  })() : "";
  const sideBtns = sel && selSides.length > 1 ? `<div class="sidebtns">${selSides.map((sd) => `<button class="endbtn" data-side="${sd}">${sd === "X" ? `Tirar ${sel}` : `Pegar al ${sd === "L" ? le : re}`}</button>`).join("")}</div>` : "";

  const order = seat >= 0 ? handOrder(ctx, ui, st, seat) : [];
  const flip = (ui.arr && ui.arr.flip) || {};
  const handHTML = seat >= 0 ? order.map((t) => {
    const [a, b] = P(t), fl = flip[t], cls = legalTiles.has(t) ? (t === sel ? "sel" : "play") : "dim";
    return `<button class="tilebtn ${cls} ${ui.rotMode ? "rot" : ""}" data-tile="${t}" aria-label="Ficha ${t}">${tileSVG(fl ? b : a, fl ? a : b, true, 22)}</button>`;
  }).join("") : `<p class="hint" style="color:var(--felt-muted)">Estás mirando la mesa.</p>`;

  const clockOn = st.status === "playing" && timerOn(st);
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="bar-sc">${short}</div>
      <div class="bar-info">${hasPozo(c) ? `Pozo <b>${h.pozo.length}</b>` : ""}${h.muestra ? ` <span class="muestra">${tileSVG(...P(h.muestra), false, 8)}</span>` : ""}</div>
    </header>
    <section class="table">
      <div class="rail rail-top">${at("top")}</div>
      <div class="rail rail-left">${at("left")}</div>
      <div class="board" id="board"><div class="chain" id="chain">${emptyMsg}</div></div>
      <div class="rail rail-right">${at("right")}</div>
      <div class="band band-bot"><span class="ends" id="ends"></span></div>
    </section>
    <section class="me">
      <div class="status ${myTurn ? "me" : ""}">${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${sideBtns}
      <div class="hand ${ui.rotMode ? "rotmode" : ""}" id="hand">${handHTML}</div>
      ${seat >= 0 && st.status === "playing" ? `<div class="actions">
        <button id="draw" ${canDraw(st, seat) ? "" : "disabled"}>Comer${hasPozo(c) ? ` (${h.pozo.length})` : ""}</button>
        <button id="pass" ${canPass(st, seat) ? "" : "disabled"}>Pasar</button>
        <button id="advice" class="ghost-felt" ${myTurn && legal.length ? "" : "disabled"}>Consejo</button>
        <button id="rot" class="ghost-felt ${ui.rotMode ? "on" : ""}" aria-pressed="${ui.rotMode}">${ui.rotMode ? "Listo" : "Girar"}</button></div>` : ""}
      ${ended && !showResult ? `<button class="primary big-cta" id="seeres">Ver resultado</button>` : ""}
      ${ui.rotMode ? `<p class="rothint">Toca una ficha para girarla. Arrastra para acomodarla.</p>` : ""}
      ${ctx.err ? `<p class="err">${esc(ctx.err)}</p>` : ""}
    </section>`;

  if (h.board.length) {
    const bd = $("#board", app), W = Math.max(120, bd.clientWidth), H = Math.max(120, bd.clientHeight);
    const origin = Math.min(h.left || 0, h.board.length - 1);
    $("#chain", app).innerHTML = chainSVG(h.board, origin, W, H, vertical, undefined, lastIdx).svg;
    $("#ends", app).innerHTML = `Puntas <b>${le}</b> y <b>${re}</b>`;
  }

  const playTile = (t, side) => { ui.sel = null; ctx.act({ type: "play", tile: t, side }); };
  // Mano: tocar = tirar (o girar en modo Girar); arrastrar = acomodar
  const tapTile = (t) => {
    if (ui.rotMode) { ui.arr.flip[t] = !ui.arr.flip[t]; saveArr(ctx, ui); return ctx.refresh(); }
    if (!legalTiles.has(t)) return;
    const sides = legal.filter((p) => p.tile === t).map((p) => p.side);
    if (sides.length === 1) return playTile(t, sides[0]);
    ui.sel = ui.sel === t ? null : t; ctx.refresh();
  };
  const handEl = $("#hand", app);
  if (handEl && seat >= 0) {
    let drag = null;
    const finish = (cancel) => {
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
      const d = drag; drag = null; ctx.setDragging(false);
      if (!d) return;
      d.el.classList.remove("dragging");
      if (cancel) return ctx.refresh();
      if (d.moved) { ui.arr.order = [...handEl.querySelectorAll("[data-tile]")].map((x) => x.dataset.tile); saveArr(ctx, ui); ctx.refresh(); }
      else tapTile(d.t);
    };
    const onMove = (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
      if (!drag.moved) { drag.moved = true; drag.el.classList.add("dragging"); ctx.setDragging(true); }
      e.preventDefault();
      const sibs = [...handEl.querySelectorAll("[data-tile]")].filter((x) => x !== drag.el);
      for (const o of sibs) {
        const r = o.getBoundingClientRect();
        if (e.clientY >= r.top - 10 && e.clientY <= r.bottom + 10 && e.clientX >= r.left && e.clientX <= r.right) {
          handEl.insertBefore(drag.el, e.clientX < r.left + r.width / 2 ? o : o.nextSibling); break;
        }
      }
    };
    const onUp = () => finish(false), onCancel = () => finish(true);
    handEl.addEventListener("pointerdown", (e) => {
      const b = e.target.closest("[data-tile]"); if (!b || drag) return;
      drag = { el: b, t: b.dataset.tile, x: e.clientX, y: e.clientY, moved: false };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onCancel);
    });
    handEl.querySelectorAll("[data-tile]").forEach((b) => b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapTile(b.dataset.tile); } }));
  }
  app.querySelectorAll("[data-side]").forEach((b) => b.onclick = () => playTile(sel, b.dataset.side));
  $("#draw", app)?.addEventListener("click", () => ctx.act({ type: "draw" }));
  $("#pass", app)?.addEventListener("click", () => ctx.act({ type: "pass" }));
  $("#advice", app)?.addEventListener("click", () => { closeOverlay(); ctx.askAdvice(); });
  $("#rot", app)?.addEventListener("click", () => { ui.rotMode = !ui.rotMode; ctx.refresh(); });
  $("#seeres", app)?.addEventListener("click", () => { ui.res.show = ui.res.seen = true; ctx.refresh(); });
  $("#menu", app).onclick = () => openOverlay("gameMenu");
  app.querySelectorAll("[data-track]").forEach((b) => b.onclick = () => openOverlay("track", { seat: +b.dataset.track, sel: null }));

  // Una sola ventana a la vez, en este orden: menú de la partida, resultado de la mano, consejo, registro
  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderGameMenu(ctx, ui, st, seat);
  else if (showResult) renderResult(ctx, st, seat, () => { ui.res.show = false; ui.res.seen = true; ctx.refresh(); });
  else if (ctx.advice) renderAdvice(ctx, st, seat);
  else if (ov && ov.id === "track") renderTracker(ctx, ui, st, seat, ov.data);
  else ctx.modal.innerHTML = "";
}

// El reloj se pinta varias veces por segundo sin redibujar la mesa
export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 5); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 5); }
}
