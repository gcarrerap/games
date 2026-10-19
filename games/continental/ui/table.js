// La mesa del Continental: marcador, los demás jugadores, los juegos bajados, el mazo y el pozo, tu bajada, tu mano y
// tus acciones. Dibuja con ctx.view (lo que tu asiento puede ver) y juega con ctx.act().
// Lo que es solo de esta pantalla vive en `ui`: cartas escogidas, la bajada que vas apartando y el orden de la mano.
import { RULES, contractOf, nameOf, topOf, canBuy, buyers, buyLimit, arrange, fitsOf, swappable, isWild, sortByRank, sortBySuit,
  cardName, cardWords } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { cardSVG, backSVG, cardChip } from "../../../modules/cards/ui.js";
import { roundTitle, contractLabel, needText, buyText, actionText, rulesHelp } from "./text.js";

export const timerOn = (st) => st.config.timer !== false;

// La bajada que vas apartando: se queda en este teléfono durante la ronda; se quitan los grupos con cartas que ya no
// están en tu mano
export function staged(ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  if (ui.stage.round !== st.roundNo) ui.stage = { round: st.roundNo, groups: [] };
  const hand = seat >= 0 && st.hand ? st.hand.hands[seat] : [];
  if (seat < 0 || !st.hand || st.hand.down[seat]) ui.stage.groups = [];
  ui.stage.groups = ui.stage.groups.filter((g) => g.every((c) => hand.includes(c)));
  return ui.stage.groups;
}

// ---------- Lo que haces ----------
export function makeMoves(ctx, ui) {
  const st = ctx.view, seat = ctx.seat, h = st.hand;
  const setErr = (msg) => { ui.err = msg; ctx.refresh(); return Promise.resolve(false); };
  const act = async (action) => {
    ui.err = "";
    const ok = await ctx.act(action);
    if (ok) ui.sel = [];
    return ok;
  };
  return {
    toggle(c) { ui.sel = ui.sel.includes(c) ? ui.sel.filter((x) => x !== c) : [...ui.sel, c]; ui.err = ""; ctx.refresh(); },
    draw: () => act({ type: "draw" }),
    take: () => act({ type: "take" }),
    buy: () => act({ type: "buy" }),
    pass: () => act({ type: "pass" }),
    // Apartar las cartas escogidas como un juego de tu bajada
    stage() {
      const k = contractOf(h.round), groups = staged(ctx, ui), sel = ui.sel.slice();
      const m = arrange(sel);
      if (m.error) return setErr(m.error);
      const sets = groups.filter((g) => arrange(g).type === "set").length, runs = groups.length - sets;
      if (m.type === "set" && sets >= k.sets) return setErr(k.sets ? `Ya apartaste ${k.sets === 1 ? "la tercia" : `las ${k.sets} tercias`}.` : "Esta ronda no lleva tercias.");
      if (m.type === "run" && runs >= k.runs) return setErr(k.runs ? `Ya apartaste ${k.runs === 1 ? "la escalera" : `las ${k.runs} escaleras`}.` : "Esta ronda no lleva escaleras.");
      ui.stage.groups = [...groups, sel]; ui.sel = []; ui.err = "";
      ctx.refresh(); return Promise.resolve(true);
    },
    async down() {
      const ok = await act({ type: "down", groups: staged(ctx, ui).map((g) => g.slice()) });
      if (ok) ui.stage.groups = [];
      return ok;
    },
    // Tocar un juego de la mesa con cartas escogidas: acomodarlas, o cambiar un comodín
    meld(id, choice) {
      const m = h.melds.find((x) => x.id === id); if (!m) return Promise.resolve(false);
      if (!h.down[seat]) return setErr("Para acomodar en la mesa primero bájate.");
      if (!ui.sel.length) return setErr("Escoge las cartas que quieres acomodar en ese juego.");
      if (ui.sel.length > 1) return act({ type: "add", meld: id, cards: ui.sel.slice() });
      const c = ui.sel[0], fits = fitsOf(m, c), sw = swappable(m, c);
      if (choice === "swap" || (!choice && sw.length && !fits.length)) return act({ type: "swap", meld: id, card: c, wild: sw[0] });
      if (choice === "lo" || choice === "hi") return act({ type: "add", meld: id, cards: [c], end: choice });
      if (choice === "add") return act({ type: "add", meld: id, cards: [c] });
      if (sw.length || fits.length > 1) { openOverlay("meldpick", { meld: id, card: c }); return Promise.resolve(false); }
      return act({ type: "add", meld: id, cards: [c] });
    },
    discard() {
      if (ui.sel.length !== 1) return setErr("Escoge una sola carta para descartar.");
      return act({ type: "discard", card: ui.sel[0] });
    },
    act,
  };
}

// ---------- Piezas ----------
const meldCards = (m) => m.cards.map((c) => (isWild(c) ? `<span class="wildc">${cardChip(c)}</span>` : cardChip(c))).join("");

function meldsHTML(st, seat, sel, canPlay) {
  const h = st.hand, n = st.config.n, me = seat < 0 ? 0 : seat;
  const owners = [...Array(n).keys()].map((k) => (me + k) % n).filter((s) => h.melds.some((m) => m.owner === s));
  if (!owners.length) return `<p class="empty-z">Nadie se ha bajado todavía.</p>`;
  return owners.map((s) => `<section class="zone ${s === seat ? "mine" : ""}">
      <div class="zone-head"><b>${s === seat ? "Tú" : esc(nameOf(st, s))}</b></div>
      <div class="melds">${h.melds.filter((m) => m.owner === s).map((m) => {
        const hot = canPlay && sel.length > 0 && (sel.length === 1 ? fitsOf(m, sel[0]).length > 0 || swappable(m, sel[0]).length > 0 : true);
        const label = m.type === "set" ? `Tercia de ${m.rank === "T" ? "10" : m.rank}` : `Escalera de ${m.cards.length}`;
        return canPlay
          ? `<button class="meld ${hot ? "hot" : ""}" data-meld="${m.id}" aria-label="${esc(label)}: ${m.cards.map(cardWords).join(", ")}">${meldCards(m)}</button>`
          : `<div class="meld" aria-label="${esc(label)}">${meldCards(m)}</div>`;
      }).join("")}</div></section>`).join("");
}

function handRows(cards, width, cardW) {
  if (!cards.length) return [];
  const perMax = Math.max(1, Math.floor((width - cardW) / (cardW * 0.5)) + 1);
  const rows = Math.ceil(cards.length / perMax), per = Math.ceil(cards.length / rows), out = [];
  for (let i = 0; i < cards.length; i += per) out.push(cards.slice(i, i + per));
  return out;
}

// ---------- La mesa ----------
export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat, mv = makeMoves(ctx, ui);
  app.className = "game";
  const h = st.hand, n = st.config.n, k = contractOf(h.round);
  const playing = st.status === "playing";
  const myTurn = playing && seat >= 0 && h.turn === seat;
  const drawPhase = myTurn && h.phase === "draw", playPhase = myTurn && h.phase === "play";
  const iAmDown = seat >= 0 && h.down[seat];
  const real = ui.reveal && ctx.practice ? ctx.peek() : null; // "Ver manos": lo ves tú, la compu nunca
  const hand = seat >= 0 ? h.hands[seat] : [];
  ui.sel = ui.sel.filter((x) => hand.includes(x));
  const sel = ui.sel;
  const stagedNow = playing ? staged(ctx, ui) : [];
  const stagedCards = new Set(stagedNow.flat());
  const top = topOf(h);
  const mayBuy = playing && seat >= 0 && canBuy(st, seat);
  // Comprar: se le pregunta a cada quien en el orden de la mesa
  const offer = playing && h.phase === "offer" ? h.offer : null;
  const asking = offer ? offer.asking : null;
  const queue = offer ? buyers(st).slice(1) : [];
  const who = (s) => (s === seat ? "tú" : nameOf(st, s));

  // Marcador: puntos en contra, el tuyo primero
  const order = [...Array(n).keys()].map((x) => (Math.max(seat, 0) + x) % n);
  const best = Math.min(...st.scores);
  const short = order.map((s) => `<span class="sc ${s === seat ? "mine" : ""} ${st.roundNo > 1 && st.scores[s] === best ? "lead" : ""}">${s === seat ? "Tú" : esc(nameOf(st, s).slice(0, 8))} <b>${st.scores[s]}</b></span>`).join("");

  // Los demás jugadores, en el orden de la mesa después de ti
  const lim = buyLimit(st.config);
  const badge = (s) => {
    const cnt = h.hands[s].length;
    const backs = real ? `<span class="rl-rev">${sortByRank(real.hand.hands[s]).map(cardChip).join("")}</span>` : `<span class="rl-backs">${"<i></i>".repeat(Math.min(cnt, 13))}</span>`;
    const info = [`${cnt} carta${cnt === 1 ? "" : "s"}`, h.down[s] ? "bajado" : "", lim > 0 && h.buys[s] ? `compró ${h.buys[s]}${lim < Infinity ? `/${lim}` : ""}` : "", s === asking ? "decide si compra" : offer && offer.passed.includes(s) ? "no compró" : ""].filter(Boolean).join(" · ");
    return `<div class="rl ${playing && h.turn === s ? "turn" : ""} ${h.down[s] ? "down" : ""}" aria-label="${esc(nameOf(st, s))}: ${esc(info)}">
      <span class="rl-nm">${esc(nameOf(st, s))}${h.dealer === s ? ` <span class="dealer" title="Reparte esta ronda">reparte</span>` : ""}</span>
      ${backs}<span class="rl-info">${esc(info)}</span></div>`;
  };
  const others = order.filter((s) => s !== seat);

  // Mazo y pozo
  const pile = `<div class="piles">
      <button class="stack ${drawPhase ? "hot" : ""}" id="stock" ${drawPhase ? "" : "disabled"} aria-label="Mazo: ${h.stock.length} cartas${drawPhase ? ". Robar" : ""}">${backSVG(40, 56)}<span class="cnt">${h.stock.length}</span></button>
      <button class="stack ${(drawPhase || mayBuy) && top ? "hot" : ""}" id="pile" ${(drawPhase || mayBuy) && top ? "" : "disabled"} aria-label="Pozo${top ? `: ${esc(cardWords(top))}` : ", vacío"}${drawPhase ? ". Tomarlo" : mayBuy ? ". Comprarlo" : ""}">
        ${top ? cardSVG(top, 40, 56) : `<span class="emptypile"></span>`}<span class="cnt">${h.discard.length}</span></button>
      ${offer ? `<span class="askers">¿Lo compra ${esc(who(asking))}?${queue.length ? ` Después: ${queue.map((s) => esc(who(s))).join(", ")}` : ""}</span>` : ""}
    </div>`;

  // Qué sigue
  let statusTxt = "";
  if (playing) {
    if (drawPhase) statusTxt = top ? `Te toca: roba del mazo o toma ${cardName(top)}` : "Te toca: roba del mazo";
    else if (playPhase) statusTxt = iAmDown ? (sel.length ? "Toca un juego para acomodar, o descarta" : "Acomoda cartas en la mesa o descarta") : stagedNow.length === k.sets + k.runs ? "¡Ya puedes bajarte!" : "Aparta tu bajada o descarta";
    else if (mayBuy) statusTxt = `¿Compras ${cardName(top)}? Te llevas una más de castigo`;
    else if (offer) statusTxt = `${h.turn === seat ? "Espera: " : ""}${who(asking)} decide si compra ${cardName(top)}`;
    else statusTxt = `Turno de ${nameOf(st, h.turn)}`;
  }

  // Tu bajada en preparación
  const need = k.sets + k.runs, complete = stagedNow.length === need;
  const stagePanel = seat >= 0 && playing && !iAmDown ? `<div class="stage" aria-label="Tu bajada">
      <div class="stage-head"><b>Tu bajada</b> <span class="stage-sum ${complete ? "ok" : ""}">${stagedNow.length}/${need}</span>
        ${sel.length >= 3 && !complete ? `<button class="mini primary" id="stagenow">Apartar (${sel.length})</button>` : ""}
        ${complete && playPhase ? `<button class="mini primary" id="downbtn">Bajarme</button>` : ""}</div>
      ${stagedNow.length ? `<div class="stage-groups">${stagedNow.map((g, i) => `<button class="sgroup" data-unstage="${i}" aria-label="Quitar este juego de la bajada">${(arrange(g).cards || g).map(cardChip).join("")}<span aria-hidden="true">✕</span></button>`).join("")}</div>`
        : `<p class="hint small">${esc(needText(h.round))}. Escoge las cartas de cada juego y toca Apartar.</p>`}
    </div>` : "";

  const newOnes = new Set(h.lastDraw && h.lastDraw.seat === seat ? h.lastDraw.cards : []);
  if (h.lastBuy && h.lastBuy.seat === seat) { newOnes.add(h.lastBuy.card); if (h.lastBuy.penalty) newOnes.add(h.lastBuy.penalty); }
  const visible = hand.filter((x) => !stagedCards.has(x));
  const sorted = ui.sortBy === "suit" ? sortBySuit(visible) : sortByRank(visible);
  const err = ui.err || ctx.err;
  const clockOn = playing && timerOn(st);

  let actions = "";
  if (seat >= 0 && playing) {
    if (drawPhase) actions = `<button id="draw" class="primary">Robar</button><button id="take" ${top ? "" : "disabled"}>${top ? `Tomar ${esc(cardName(top))}` : "Tomar"}</button>`;
    else if (playPhase) actions = `${iAmDown ? "" : `<button id="stagebtn" ${sel.length >= 3 && !complete ? "" : "disabled"}>Apartar</button>`}
      <button id="discardbtn" ${sel.length === 1 ? "" : "disabled"}>Descartar</button>`;
    else if (mayBuy) actions = `<button id="buy" class="primary">Comprar ${esc(cardName(top))}</button><button id="pass">No lo quiero</button>`;
    actions += `<button id="advice" class="ghost-felt" ${myTurn && !offer ? "" : "disabled"}>Consejo</button>
      <button id="sort" class="ghost-felt" aria-label="Ordenar por ${ui.sortBy === "rank" ? "palo" : "número"}">${ui.sortBy === "rank" ? "Por palo" : "Por número"}</button>`;
  }

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="bar-sc">${short}</div>
      <div class="bar-info"><b>${st.roundNo}</b>/${RULES.rounds} · ${esc(contractLabel(st.roundNo))}</div>
    </header>
    <section class="table">
      <div class="rail">${others.map(badge).join("")}</div>
      <div class="board" id="board">
        ${meldsHTML(st, seat, sel, playPhase && iAmDown)}
        ${pile}
      </div>
    </section>
    <section class="me">
      <div class="status ${myTurn || mayBuy ? "me" : ""}">${esc(statusTxt)}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${stagePanel}
      <div class="hand" id="hand" aria-label="Tu mano: ${hand.length} cartas"></div>
      ${actions ? `<div class="actions">${actions}</div>` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : ""}
      ${err ? `<p class="err" role="alert">${esc(err)}</p>` : ""}
    </section>`;

  // Mano: se acomoda en filas según el ancho real
  const handEl = $("#hand", app);
  if (handEl && seat >= 0) {
    const W = handEl.clientWidth || 360, CW = W >= 640 ? 56 : W < 340 ? 42 : 48, CH = Math.round(CW * 1.41);
    handEl.innerHTML = handRows(sorted, W, CW).map((row) => {
      const step = row.length > 1 ? Math.min(CW + 2, (W - CW) / (row.length - 1)) : CW;
      const ov = Math.min(2, step - CW);
      return `<div class="hrow">${row.map((x, i) => `<button class="cardbtn ${sel.includes(x) ? "sel" : ""} ${newOnes.has(x) ? "new" : ""}" style="${i ? `margin-left:${ov.toFixed(1)}px` : ""}" data-card="${x}" aria-pressed="${sel.includes(x)}" aria-label="${esc(cardWords(x))}">${cardSVG(x, CW, CH)}</button>`).join("")}</div>`;
    }).join("") || `<p class="hint center">${playing && !stagedNow.length ? "Sin cartas en la mano" : ""}</p>`;
    handEl.querySelectorAll("[data-card]").forEach((b) => b.onclick = () => mv.toggle(b.dataset.card));
  }

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#stock", app)?.addEventListener("click", mv.draw);
  $("#draw", app)?.addEventListener("click", mv.draw);
  $("#pile", app)?.addEventListener("click", () => (drawPhase ? mv.take() : mv.buy()));
  $("#take", app)?.addEventListener("click", mv.take);
  $("#buy", app)?.addEventListener("click", mv.buy);
  $("#pass", app)?.addEventListener("click", mv.pass);
  $("#stagenow", app)?.addEventListener("click", mv.stage);
  $("#stagebtn", app)?.addEventListener("click", mv.stage);
  $("#downbtn", app)?.addEventListener("click", mv.down);
  $("#discardbtn", app)?.addEventListener("click", mv.discard);
  $("#advice", app)?.addEventListener("click", () => { closeOverlay(); ctx.askAdvice(); });
  $("#sort", app)?.addEventListener("click", () => { ui.sortBy = ui.sortBy === "rank" ? "suit" : "rank"; ctx.prefs.set("sort", ui.sortBy); ctx.refresh(); });
  app.querySelectorAll("[data-unstage]").forEach((b) => b.onclick = () => { ui.stage.groups = ui.stage.groups.filter((_, i) => i !== +b.dataset.unstage); ctx.refresh(); });
  app.querySelectorAll("[data-meld]").forEach((b) => b.onclick = () => mv.meld(+b.dataset.meld));

  // Una sola ventana a la vez: menú, resultado de la ronda, escoger cómo acomodar, consejo
  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, ui, st, seat);
  else if (st.status === "roundover" || st.status === "gameover") renderResult(ctx, st, seat);
  else if (ov && ov.id === "meldpick") renderMeldPick(ctx, st, ov.data, mv);
  else if (ctx.advice) renderAdvice(ctx, st, seat, mv);
  else ctx.modal.innerHTML = "";
}

// ---------- Ventanas ----------
function renderMenu(ctx, ui, st, seat) {
  const n = st.config.n;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">${esc(roundTitle(st.roundNo))} · ${n} jugadores · ${esc(buyText(st.config))}${timerOn(st) ? ` · ${RULES.turnMs / 1000} s por turno` : ""}</p>
    <div class="scores">${st.scores.map((v, s) => `<div class="score ${s === seat ? "mine" : ""}"><div class="who">${esc(nameOf(st, s))}</div><div class="val">${v}</div></div>`).join("")}</div>
    <p class="hint small">Puntos en contra: gana quien tenga menos al terminar la ronda 7.</p>
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

function renderResult(ctx, st, seat) {
  closeOverlay();
  const m = ctx.modal, r = st.result, over = st.status === "gameover", n = st.config.n;
  const title = r.winner === null ? `Ronda ${r.round}: se acabaron las cartas` : `Ronda ${r.round}: cerró ${r.winner === seat ? "tú" : nameOf(st, r.winner)}`;
  const best = Math.min(...st.scores), champs = st.scores.map((v, s) => (v === best ? s : -1)).filter((s) => s >= 0);
  const champ = champs.length > 1 ? `Empate: ${champs.map((s) => nameOf(st, s)).join(" y ")}` : `¡Ganó ${champs[0] === seat ? "tú" : nameOf(st, champs[0])}!`;
  const rows = [...Array(n).keys()].map((s) => `<div class="res-row ${s === seat ? "mine" : ""}">
      <div class="res-head"><b>${esc(nameOf(st, s))}</b><span class="res-pts ${r.pts[s] ? "neg" : "zero"}">${r.pts[s] ? "+" + r.pts[s] : "0"}</span><span class="res-total">${st.scores[s]}</span></div>
      ${r.hands[s].length ? `<div class="res-cards">${sortByRank(r.hands[s]).map(cardChip).join("")}</div>` : ""}
    </div>`).join("");
  renderSheet(m, `result-${ctx.table.round}-${st.roundNo}-${st.status}`, over ? champ : title, `
    ${over ? `<p class="hint">${esc(title)}. Terminaron las ${RULES.rounds} rondas; gana quien tenga menos puntos.</p>` : ""}
    <div class="res"><div class="res-row res-cols"><span></span><span>Ronda</span><span>Total</span></div>${rows}</div>
    ${!over ? `<p class="hint">Sigue la ronda ${st.roundNo + 1}: ${esc(contractLabel(st.roundNo + 1))}.</p>` : ""}
    ${seat >= 0 ? (over ? `<button class="primary big-cta" id="again">Revancha</button>` : `<button class="primary big-cta" id="next">Repartir la ronda ${st.roundNo + 1}</button>`) : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#next", m)?.addEventListener("click", () => ctx.act({ type: "next" }));
  $("#again", m)?.addEventListener("click", () => ctx.again());
  $("#exit", m).onclick = () => ctx.leave();
}

// Una carta que cabe de dos maneras en un juego: en una punta o la otra, o en lugar de un comodín
function renderMeldPick(ctx, st, { meld, card }, mv) {
  const m = st.hand.melds.find((x) => x.id === meld);
  if (!m) { closeOverlay(); return; }
  const fits = fitsOf(m, card), sw = swappable(m, card);
  const opts = [
    ...fits.map((f) => [f === "set" ? "add" : f, f === "lo" ? "Acomodarla abajo" : f === "hi" ? "Acomodarla arriba" : "Acomodarla"]),
    ...(sw.length ? [["swap", `Cambiarla por el comodín ${cardName(sw[0])}`]] : []),
  ];
  renderSheet(ctx.modal, "meldpick", `${cardName(card)} en ese juego`, `
    <div class="meld big">${meldCards(m)}</div>
    <div class="pick">${opts.map(([id, label]) => `<button data-pick="${id}" class="${id === "swap" ? "primary" : ""}">${esc(label)}</button>`).join("")}</div>`);
  ctx.modal.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeOverlay(); mv.meld(meld, b.dataset.pick); });
}

function renderAdvice(ctx, st, seat, mv) {
  const m = ctx.modal, d = ctx.advice.data;
  let body;
  if (!d) body = `<p class="hint">Pensando…</p>`;
  else if (d.error) body = `<p class="err">No se pudo calcular el consejo. Intenta otra vez.</p>`;
  else if (!d.steps.length) body = `<p class="hint">Ahora no hay nada que aconsejar.</p>`;
  else {
    body = `<section class="adv-card"><ol>${d.steps.map((s) => `<li><b>${esc(actionText(st, s.action))}.</b> ${s.why ? esc(s.why[0].toUpperCase() + s.why.slice(1)) + "." : ""}</li>`).join("")}</ol>
      <button class="primary adv-play" id="advplay">${esc(actionText(st, d.steps[0].action))}</button></section>`;
    if (["draw", "take"].includes(d.steps[0].action.type)) body += `<p class="hint">Después de robar, pide consejo otra vez para saber qué bajar y qué descartar.</p>`;
  }
  renderSheet(m, "advice", "Consejo", `
    <p class="hint">Lo que haría la compu difícil con lo que tú puedes ver.${timerOn(st) ? " El reloj sigue corriendo." : ""}</p>
    ${body}`);
  const close = () => ctx.closeAdvice();
  const x = m.querySelector("#sheetclose"); if (x) x.onclick = close;
  m.querySelector("#sheetbg").onclick = (e) => { if (e.target.id === "sheetbg") close(); };
  $("#advplay", m)?.addEventListener("click", () => { ctx.closeAdvice(); mv.act(d.steps[0].action); });
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
