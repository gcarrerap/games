// La mesa de La Pata (de myPata, ui/screens/table.js): marcador, jugadores alrededor, las patas de cada equipo, el
// mazo y el pozo, tu mano y tus acciones. Dibuja con ctx.view (lo que tu asiento puede ver) y juega con ctx.act().
// Lo que es solo de esta pantalla vive en `ui`: cartas escogidas, la bajada que vas apartando, el orden de la mano.
import { RULES, nTeams, teamOf, nameOf, topOf, isBlack3, isNatural, sortCards, cardOrder, suitOf, closedCounts, needsMinimum,
  minimumNow, openingValue, check, checkPair, checkNewMeld, pickupPairs, isClosed } from "../engine/index.js";
import { knownCards } from "../ai/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { modeLabel, teamLabels, teamShort, seatPos, teamColor, isPartner, partnerWord, TOP_ORDER } from "./labels.js";
import { cardSVG, backSVG, cardChip } from "./svg/card.js";
import { meldChip, sortMelds } from "./svg/meld.js";
import { rulesHelp } from "./components/rules.js";
import { renderResult } from "./components/result.js";
import { renderPeek } from "./components/peek.js";
import { renderAdvice } from "./components/advice.js";
import { renderTracker } from "./components/tracker.js";

export const timerOn = (st) => st.config.timer !== false;
export const turnKeyOf = (ctx) => (ctx.table.status === "playing" ? `${ctx.table.round}:${ctx.table.turn}` : null);

// ---------- Lo que haces en tu turno ----------
// Todas regresan una promesa; las cartas escogidas se limpian solo si la jugada se pudo.
export function makeMoves(ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  const setErr = (msg) => { ui.err = msg; ctx.refresh(); return Promise.resolve(false); };
  const act = async (action) => {
    ui.err = "";
    const ok = await ctx.act(action);
    if (ok) ui.sel = [];
    return ok;
  };
  // El par para levantar (o ver) el pozo: el que escogiste, o el único posible
  const choosePair = (verb = "levantar") => {
    const sel = ui.sel;
    if (sel.length === 2) return { pair: sel.slice() };
    const pairs = pickupPairs(st, seat), nat = pairs.filter((p) => isNatural(p[0]));
    if (pairs.length === 1) return { pair: pairs[0] };
    if (nat.length === 1) return { pair: nat[0] };
    if (pairs.length > 1) return { error: `Escoge las dos cartas del par con el que quieres ${verb}.` };
    return { error: checkPair(topOf(st.hand), sel.length === 2 ? sel : ["", ""]) || "No tienes un par para levantar el pozo." };
  };
  const stageSelected = () => {
    const sel = ui.sel.slice(), groups = staged(ctx, ui);
    const e = checkNewMeld(sel); if (e) return setErr(e);
    if (groups.some((g) => g.some((c) => sel.includes(c)))) return setErr("Esa carta ya está en otra pata.");
    ui.stage.groups = [...groups, sel]; ui.sel = []; ui.err = "";
    ctx.refresh(); return Promise.resolve(true);
  };
  return {
    toggle(c) { ui.sel = ui.sel.includes(c) ? ui.sel.filter((x) => x !== c) : [...ui.sel, c]; ui.err = ""; ctx.refresh(); },
    draw: () => act({ type: "draw" }),
    async peek() {
      const r = choosePair("ver el pozo"); if (r.error) return setErr(r.error);
      const ok = await act({ type: "peek", pair: r.pair });
      if (ok) { ui.sel = r.pair.slice(); openOverlay("peek"); }
      return ok;
    },
    async pickup() {
      const r = choosePair(); if (r.error) return setErr(r.error);
      const action = { type: "pickup", pair: r.pair };
      if (needsMinimum(st, seat)) action.open = staged(ctx, ui).filter((g) => !g.some((c) => r.pair.includes(c)));
      const ok = await act(action);
      if (ok) ui.stage.groups = [];
      return ok;
    },
    meld() {
      if (!ui.sel.length) return setErr("Escoge las cartas de la pata.");
      if (needsMinimum(st, seat)) return stageSelected();
      return act({ type: "meld", groups: [ui.sel.slice()] });
    },
    stageSelected,
    async confirm() {
      const groups = staged(ctx, ui).map((g) => g.slice());
      if (!groups.length) return setErr("Primero aparta las patas de tu bajada.");
      const ok = await act({ type: "meld", groups });
      if (ok) ui.stage.groups = [];
      return ok;
    },
    add(meldId) {
      if (!ui.sel.length) return setErr("Escoge las cartas que quieres agregar a esa pata.");
      return act({ type: "add", meld: meldId, cards: ui.sel.slice() });
    },
    discard() {
      if (ui.sel.length !== 1) return setErr("Escoge una sola carta para descartar.");
      return act({ type: "discard", card: ui.sel[0] });
    },
    act,
  };
}

// La bajada que vas apartando (antes de llegar al mínimo): se queda en este teléfono y se borra sola si cambia el
// turno o si alguna carta ya no está en tu mano
export function staged(ctx, ui) {
  const key = turnKeyOf(ctx), hand = ctx.seat >= 0 && ctx.view.hand ? ctx.view.hand.hands[ctx.seat] : [];
  if (ui.stage.key !== key) ui.stage = { key, groups: [] };
  ui.stage.groups = ui.stage.groups.filter((g) => g.every((c) => hand.includes(c)));
  return ui.stage.groups;
}

// ---------- Menú de la partida ----------
function renderGameMenu(ctx, ui, st, seat) {
  const labels = teamLabels(st), mine = seat >= 0 ? teamOf(st, seat) : -1;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Ronda ${st.roundNo} de ${RULES.rounds} · ${esc(modeLabel(st.config))}${st.status === "playing" ? ` · para bajarse: ${minimumNow(st)} puntos` : ""}</p>
    ${st.hand && st.hand.dealer !== undefined ? `<p class="hint">Reparte ${esc(nameOf(st, st.hand.dealer))} · parte ${esc(nameOf(st, st.hand.cutter))} · ${st.hand.sampleTaken ? `${esc(nameOf(st, st.hand.sampler))} se quedó la muestra` : `muestra ${esc(nameOf(st, st.hand.sampler))}`}</p>` : ""}
    <div class="scores">${st.scores.map((v, i) => `<div class="score ${i === mine ? "mine" : ""}"><div class="who"><span class="teamdot" style="background:${teamColor(i)}"></span>${esc(labels[i])}</div>
      <div class="val">${v.toLocaleString("es-MX")}</div></div>`).join("")}</div>
    ${ctx.practice ? `<button id="reveal" class="${ui.reveal ? "primary" : ""}" aria-pressed="${ui.reveal}">${ui.reveal ? "Ocultar manos" : "Ver manos (revisar a la compu)"}</button>` : ""}
    <details class="help"><summary>Cómo se juega</summary>${rulesHelp()}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
  $("#reveal", ctx.modal)?.addEventListener("click", () => { ui.reveal = !ui.reveal; ctx.refresh(); });
}

// Las patas de un equipo con su avance hacia las 5 limpias y 5 sucias. De los otros equipos importa qué patas
// tienen abiertas y cuántas cerradas: las cerradas se juntan en una ficha que se toca para verlas.
function zoneHTML(ctx, ui, st, team, seat, { tappable, sel }) {
  const h = st.hand, melds = h.melds[team], cc = closedCounts(melds), mine = seat >= 0 && teamOf(st, seat) === team;
  const G = RULES.goOut, down = h.down[team];
  const all = sortMelds(melds), closed = all.filter(isClosed);
  const collapse = !mine && closed.length > 0, expanded = ui.showClosed.includes(team);
  const order = collapse && !expanded ? all.filter((m) => !isClosed(m)) : all;
  const toggle = collapse ? `<button class="closed-chip ${expanded ? "on" : ""}" data-closed="${team}" aria-expanded="${expanded}" aria-label="${expanded ? "Ocultar" : "Ver"} sus ${closed.length} patas cerradas">${expanded ? "Ocultar cerradas" : `✓ ${closed.length} cerrada${closed.length === 1 ? "" : "s"}`}</button>` : "";
  const chips = order.map((m) => {
    const can = tappable && sel.length > 0;
    const hot = can && !check(st, seat, { type: "add", meld: m.id, cards: sel });
    return meldChip(m, { tappable: can, hot });
  }).join("");
  const prog = (have, need, label) => `<span class="prog ${have >= need ? "done" : ""}">${label} <b>${Math.min(have, 99)}</b>/${need}</span>`;
  return `<section class="zone ${mine ? "mine" : ""}" aria-label="Patas de ${esc(teamShort(st, team, seat))}">
    <div class="zone-head"><span class="teamdot" style="background:${teamColor(team)}"></span><b>${esc(teamShort(st, team, seat))}</b>
      ${prog(cc.clean, G.clean, "Limpias")}${prog(cc.dirty, G.dirty, "Sucias")}${down ? "" : `<span class="notdown">sin bajarse</span>`}</div>
    <div class="melds">${toggle}${chips || (toggle ? "" : `<span class="empty-z">${down ? "" : "Todavía no hay patas"}</span>`)}</div>
  </section>`;
}

// Tu mano en filas que caben a lo ancho (las cartas se enciman si son muchas)
function handRows(cards, width, cardW) {
  if (!cards.length) return [];
  const minStep = cardW * 0.5;
  const perMax = Math.max(1, Math.floor((width - cardW) / minStep) + 1);
  const rows = Math.ceil(cards.length / perMax);
  const per = Math.ceil(cards.length / rows);
  const out = [];
  for (let i = 0; i < cards.length; i += per) out.push(cards.slice(i, i + per));
  return out;
}

export function sortHand(hand, by) {
  if (by === "suit") return hand.slice().sort((a, b) => ("SHDCRB".indexOf(suitOf(a)) - "SHDCRB".indexOf(suitOf(b))) || cardOrder(a) - cardOrder(b));
  return sortCards(hand);
}

const RANK_WORD = { A: "As", T: "10", J: "J", Q: "Q", K: "K", X: "Joker" };
const SUIT_WORD = { S: "espadas", H: "corazones", D: "diamantes", C: "tréboles" };
const cardLabel = (c) => (c[0] === "X" ? "Joker" : `${RANK_WORD[c[0]] || c[0]} de ${SUIT_WORD[c[1]]}`);

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat, mv = makeMoves(ctx, ui);
  app.className = "game";
  const c = st.config, h = st.hand, n = c.n, T = nTeams(c);
  const myTeam = seat >= 0 ? teamOf(st, seat) : 0;
  const playing = st.status === "playing";
  const myTurn = playing && seat >= 0 && h.turn === seat;
  const real = ui.reveal && ctx.practice ? ctx.peek() : null; // "Ver manos": solo lo que TÚ ves; la compu nunca
  const known = playing ? knownCards(st) : st.seats.map(() => []);
  const hand = seat >= 0 ? h.hands[seat] : [];
  ui.sel = ui.sel.filter((x) => hand.includes(x));
  const sel = ui.sel;
  const stagedNow = seat >= 0 && playing ? staged(ctx, ui) : [];
  const stagedCards = new Set(stagedNow.flat());
  const needMin = seat >= 0 && playing && needsMinimum(st, seat);

  // Marcador corto: mi equipo primero
  const order = [...Array(T).keys()].sort((a, b) => (b === myTeam) - (a === myTeam));
  const many = T > 2;
  const short = order.map((t) => `<span class="sc ${t === myTeam && seat >= 0 ? "mine" : ""}" ${many ? `aria-label="${esc(teamShort(st, t, seat))}: ${st.scores[t]}"` : ""}><span class="teamdot" style="background:${teamColor(t)}"></span>${many ? "" : esc(teamShort(st, t, seat).slice(0, 9)) + " "}<b>${st.scores[t].toLocaleString("es-MX")}</b></span>`).join("");

  // Jugadores alrededor de la mesa: una franja en su orilla
  const badge = (s) => {
    const pos = seatPos(st, seat, s), cnt = h.hands[s].length;
    const partner = isPartner(st, seat, s);
    const backs = real ? `<span class="rl-rev">${sortCards(real.hand.hands[s]).map(cardChip).join("")}</span>` : `<span class="rl-backs">${"<i></i>".repeat(Math.min(cnt, 12))}</span>`;
    const compact = n === 6 && pos.startsWith("top");
    const info = (compact ? [`C:${cnt}`, `M${h.pileNo[s]}/${RULES.piles}`, known[s].length ? `lev ${known[s].length}` : ""]
      : [`${cnt} carta${cnt === 1 ? "" : "s"}`, `montón ${h.pileNo[s]}/${RULES.piles}`, known[s].length ? `levantó ${known[s].length}` : ""]).filter(Boolean).join(" · ");
    const infoLong = [`${cnt} carta${cnt === 1 ? "" : "s"}`, `montón ${h.pileNo[s]} de ${RULES.piles}`, known[s].length ? `levantó ${known[s].length}` : ""].filter(Boolean).join(", ");
    return `<button class="rl rl-${pos} ${playing && h.turn === s ? "turn" : ""}" data-track="${s}" aria-label="${esc(nameOf(st, s))}${partner ? ", tu " + partnerWord(st) : ""}: ${infoLong}. Ver registro">
      <span class="rl-nm"><span class="teamdot" style="background:${teamColor(teamOf(st, s))}"></span>${esc(nameOf(st, s))}${partner ? " · " + partnerWord(st) : ""}${h.dealer === s ? ` <span class="dealer" title="Reparte esta ronda">reparte</span>` : ""}</span>
      ${backs}<span class="rl-info">${esc(info)}</span></button>`;
  };
  const others = []; for (let k = 0; k < n; k++) if (k !== seat) others.push(k);
  const at = (pos) => others.filter((s) => seatPos(st, seat, s) === pos).map(badge).join("");
  const atTop = () => TOP_ORDER.map(at).join("");

  // Patas: rivales arriba, tu equipo abajo (cerca de tu mano)
  const canAdd = myTurn && h.phase === "play" && h.down[myTeam];
  const zonesTop = order.filter((t) => t !== myTeam || seat < 0).reverse().map((t) => zoneHTML(ctx, ui, st, t, seat, { tappable: false, sel })).join("");
  const zoneMine = seat >= 0 ? zoneHTML(ctx, ui, st, myTeam, seat, { tappable: canAdd, sel }) : "";

  // Mazo y pozo
  const top = topOf(h);
  const drawPhase = myTurn && h.phase === "draw";
  const pairs = drawPhase ? pickupPairs(st, seat) : [];
  const pile = `<div class="piles">
      <button class="stack ${drawPhase ? "hot" : ""}" id="stock" ${drawPhase ? "" : "disabled"} aria-label="Mazo: ${h.stock.length} cartas${drawPhase ? ". Robar 2" : ""}">${backSVG(40, 56)}<span class="cnt">${h.stock.length}</span></button>
      <button class="stack ${drawPhase && pairs.length ? "hot" : ""}" id="discard" ${drawPhase && top ? "" : "disabled"} aria-label="Pozo: ${h.discard.length} cartas${top ? "" : ", vacío"}${top && isBlack3(top) ? ", tapado con un 3 negro" : ""}${drawPhase ? ". Levantar" : ""}">
        ${top ? cardSVG(top, 40, 56) : `<span class="emptypile"></span>`}<span class="cnt">${h.discard.length}</span>${top && isBlack3(top) ? `<span class="lock">tapado</span>` : ""}</button>
    </div>`;

  // Estado y ayuda del turno
  let statusTxt = "";
  if (playing) {
    if (myTurn) statusTxt = h.phase === "draw" ? (pairs.length ? "Te toca: roba 2 o levanta el pozo" : "Te toca: roba 2 del mazo") : needMin ? `Bájate con ${minimumNow(st)} puntos, o descarta` : sel.length ? "Toca una pata para agregar, o baja o descarta" : "Escoge cartas para bajar, agregar o descartar";
    else statusTxt = `Turno de ${nameOf(st, h.turn)}`;
    if (h.turns === 0 && h.phase === "draw" && h.dealer === seat && !h.sampleTaken) statusTxt = "Repartiste. " + statusTxt;
    if (h.turns === 0 && h.phase === "draw" && h.sampleTaken) statusTxt = `${h.sampler === seat ? "Te quedaste" : nameOf(st, h.sampler) + " se quedó"} la muestra (salió comodín). ` + statusTxt;
  }

  // Bajada en preparación
  const stagedVal = openingValue(stagedNow), minNow = playing ? minimumNow(st) : 0;
  const stagePanel = needMin && (stagedNow.length || myTurn) ? `<div class="stage" aria-label="Tu bajada">
      <div class="stage-head"><b>Tu bajada</b> <span class="stage-sum ${stagedVal >= minNow ? "ok" : ""}">${stagedVal} / ${minNow}</span>
        ${stagedNow.length ? `<button class="mini ghost" id="unstageall">Quitar</button>` : ""}
        ${myTurn && h.phase === "draw" && sel.length >= 3 ? `<button class="mini primary" id="stagenow">Apartar (${sel.length})</button>` : ""}
        ${stagedNow.length && myTurn && h.phase === "play" ? `<button class="mini primary" id="confirm" ${stagedVal >= minNow ? "" : "disabled"}>Bajarme</button>` : ""}</div>
      ${stagedNow.length ? `<div class="stage-groups">${stagedNow.map((g, i) => `<button class="sgroup" data-unstage="${i}" aria-label="Quitar esta pata de la bajada">${g.map(cardChip).join("")}<span aria-hidden="true">✕</span></button>`).join("")}</div>`
        : `<p class="hint small">${h.phase === "draw" && myTurn ? "Para levantar el pozo sin haberte bajado: escoge las cartas de tu bajada (sin el par), toca Apartar y luego Levantar pozo." : "Escoge 3 o más cartas iguales y toca Apartar."}</p>`}
    </div>` : "";

  const newOnes = new Set(h.lastDraw && h.lastDraw.seat === seat ? h.lastDraw.cards : []);
  const sorted = sortHand(hand.filter((x) => !stagedCards.has(x)), ui.sortBy);
  const err = ui.err || ctx.err;
  const clockOn = playing && timerOn(st);

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="bar-sc ${T > 2 ? "many" : ""}">${short}</div>
      <div class="bar-info">Ronda <b>${st.roundNo}</b>/${RULES.rounds}</div>
    </header>
    <section class="table">
      <div class="rail rail-top ${n === 6 ? "three" : ""}">${atTop()}</div>
      <div class="rail rail-left">${at("left")}</div>
      <div class="board" id="board">
        <div class="zones">${zonesTop}</div>
        ${pile}
        <div class="zones">${zoneMine}</div>
      </div>
      <div class="rail rail-right">${at("right")}</div>
    </section>
    <section class="me">
      <div class="status ${myTurn ? "me" : ""}">${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${stagePanel}
      <div class="hand" id="hand" aria-label="Tu mano: ${hand.length} cartas"></div>
      ${seat >= 0 && playing ? `<div class="actions">
        ${drawPhase ? `<button id="draw" class="primary">Robar 2</button><button id="pick" ${pairs.length ? "" : "disabled"}>Levantar pozo</button>${pairs.length ? `<button id="peek" aria-label="Ver las cartas del pozo enseñando tu par">Ver pozo</button>` : ""}`
          : `<button id="meld" ${myTurn && h.phase === "play" && sel.length >= 3 ? "" : "disabled"}>${needMin ? "Apartar" : "Bajar"}${sel.length >= 3 ? ` (${sel.length})` : ""}</button>
             <button id="discardbtn" ${myTurn && h.phase === "play" && sel.length === 1 ? "" : "disabled"}>Descartar</button>`}
        <button id="advice" class="ghost-felt" ${myTurn ? "" : "disabled"}>Consejo</button>
        <button id="sort" class="ghost-felt" aria-label="Ordenar por ${ui.sortBy === "rank" ? "palo" : "número"}">${ui.sortBy === "rank" ? "Por palo" : "Por número"}</button></div>` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${err ? `<p class="err" role="alert">${esc(err)}</p>` : ""}
    </section>`;

  // Mano: se acomoda en filas según el ancho real
  const handEl = $("#hand", app);
  if (handEl && seat >= 0) {
    const W = handEl.clientWidth || 360, CW = W >= 640 ? 56 : W < 340 ? 42 : 48, CH = Math.round(CW * 1.41);
    const rows = handRows(sorted, W, CW);
    handEl.innerHTML = rows.map((row) => {
      const step = row.length > 1 ? Math.min(CW + 2, (W - CW) / (row.length - 1)) : CW;
      const ov = Math.min(2, step - CW);
      return `<div class="hrow">${row.map((x, i) => `<button class="cardbtn ${sel.includes(x) ? "sel" : ""} ${newOnes.has(x) ? "new" : ""}" style="${i ? `margin-left:${ov.toFixed(1)}px` : ""}" data-card="${x}" aria-pressed="${sel.includes(x)}" aria-label="${esc(cardLabel(x))}">${cardSVG(x, CW, CH)}</button>`).join("")}</div>`;
    }).join("") || `<p class="hint center">${playing ? "Sin cartas en la mano" : ""}</p>`;
    handEl.querySelectorAll("[data-card]").forEach((b) => b.onclick = () => mv.toggle(b.dataset.card));
  }

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  app.querySelectorAll("[data-track]").forEach((b) => b.onclick = () => openOverlay("track", { seat: +b.dataset.track }));
  $("#stock", app)?.addEventListener("click", mv.draw);
  $("#draw", app)?.addEventListener("click", mv.draw);
  $("#discard", app)?.addEventListener("click", mv.pickup);
  $("#pick", app)?.addEventListener("click", mv.pickup);
  $("#peek", app)?.addEventListener("click", mv.peek);
  $("#meld", app)?.addEventListener("click", mv.meld);
  $("#discardbtn", app)?.addEventListener("click", mv.discard);
  $("#advice", app)?.addEventListener("click", () => { closeOverlay(); ctx.askAdvice(); });
  $("#sort", app)?.addEventListener("click", () => { ui.sortBy = ui.sortBy === "rank" ? "suit" : "rank"; ctx.prefs.set("sort", ui.sortBy); ctx.refresh(); });
  $("#confirm", app)?.addEventListener("click", mv.confirm);
  $("#unstageall", app)?.addEventListener("click", () => { ui.stage.groups = []; ctx.refresh(); });
  $("#stagenow", app)?.addEventListener("click", mv.stageSelected);
  app.querySelectorAll("[data-unstage]").forEach((b) => b.onclick = () => { ui.stage.groups = ui.stage.groups.filter((_, k) => k !== +b.dataset.unstage); ctx.refresh(); });
  app.querySelectorAll("[data-meld]").forEach((b) => b.onclick = () => mv.add(+b.dataset.meld));
  app.querySelectorAll("[data-closed]").forEach((b) => b.onclick = () => {
    const t = +b.dataset.closed;
    ui.showClosed = ui.showClosed.includes(t) ? ui.showClosed.filter((x) => x !== t) : ui.showClosed.concat(t);
    ctx.refresh();
  });
  // Si la mesa no cabe, se muestra la parte de abajo (tus patas y el pozo); arriba se llega recorriendo
  const board = $("#board", app);
  if (board && board.scrollHeight > board.clientHeight + 2) board.scrollTop = board.scrollHeight;

  // Una sola ventana a la vez: menú, resultado de la ronda, ver el pozo, consejo, registro
  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderGameMenu(ctx, ui, st, seat);
  else if (st.status === "roundover" || st.status === "gameover") renderResult(ctx, st, seat);
  else if (ov && ov.id === "peek") renderPeek(ctx, ui, st, seat, mv);
  else if (ctx.advice) renderAdvice(ctx, st, seat, mv);
  else if (ov && ov.id === "track") renderTracker(ctx, ui, st, seat, ov.data.seat);
  else ctx.modal.innerHTML = "";
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
