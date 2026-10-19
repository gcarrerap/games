// La mesa de Skull: los tapetes de todos, la apuesta al centro, tus discos y tus botones. El botón "Reglas" queda
// siempre a la vista. Con la tele como tablero (ctx.display) se parte en dos: la tele muestra los tapetes y la apuesta
// a todos, y el teléfono solo tu tapete, tu mano y tus botones. Dibuja con ctx.view y juega con ctx.act(). Lo único propio de esta pantalla es el número que
// estás por apostar (`ui.bid`), que se reinicia en cuanto cambia la mesa.
import { nameOf, inHand, onMat, flipTargets, legalActions, FLOWER, SKULL } from "../engine/index.js";
import { discSVG, discName } from "./disc.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { rulesHelp } from "./rules.js";
import { renderTutorial, openTutorial, tutorialSeen } from "./tutorial.js";
import { fullscreenButton, wireFullscreen } from "../../../platform/ui/tv.js";

const PLAYING = ["place", "build", "bid", "flip", "discard"];

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de Skull", `<div class="rules"><button class="tutlink" id="rulestut">¿Primera vez? Ver el tutorial</button></div>${rulesHelp()}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
  $("#rulestut", ctx.modal).onclick = () => openTutorial(ctx);
}

function renderMenu(ctx, st) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Ronda ${st.round} · ${st.config.n} jugadores</p>
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
    <button id="menututorial">Tutorial: cómo jugar</button>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#menututorial", ctx.modal).onclick = () => openTutorial(ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

const me = (st, s, seat) => (s === seat && nameOf(st, s) !== "Tú" ? " (tú)" : "");

// Lo que se volteó en el reto, en orden
function revealsHTML(st, size = 30) {
  if (!st.reveals.length) return "";
  return `<div class="reveals">${st.reveals.map((r) => `<span class="rv" title="${esc(nameOf(st, r.seat))}">${discSVG(r.disc, size)}<small>${esc(nameOf(st, r.seat))}</small></span>`).join("")}</div>`;
}

function renderResult(ctx, st, seat, { tv = false } = {}) {
  closeOverlay();
  const o = st.outcome, over = st.phase === "over";
  const ch = nameOf(st, o.challenger), mine = o.challenger === seat;
  let title, line;
  if (over) title = st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`;
  else if (o.success) title = mine ? "¡Ganaste el reto!" : `${ch} ganó el reto`;
  else title = mine ? "¡Calavera!" : `${ch} se topó con una calavera`;
  if (o.success) line = `${mine ? "Volteaste" : `${esc(ch)} volteó`} ${o.bid} flor${o.bid === 1 ? "" : "es"} sin ${mine ? "toparte" : "toparse"} con una calavera.`;
  else {
    const whose = o.skullOf === o.challenger ? (mine ? "tu propia calavera" : "su propia calavera") : o.skullOf === seat ? "<b>tu</b> calavera" : `la calavera de ${esc(nameOf(st, o.skullOf))}`;
    const lost = mine && o.lost ? ` Perdiste ${o.lost === SKULL ? "<b>tu calavera</b>" : "una <b>flor</b>"}.` : mine ? "" : ` Perdió un disco${o.skullOf === seat ? " (lo escogiste al azar, sin verlo)" : ""}.`;
    line = `${mine ? "Te topaste" : `${esc(ch)} se topó`} con ${whose}.${lost}${o.eliminated ? ` ${mine ? "Te quedaste" : "Se quedó"} sin discos y ${mine ? "sales" : "sale"} del juego.` : ""}`;
  }
  const standings = st.names.map((_, s) => `<div class="strow ${st.out[s] ? "out" : ""}"><b>${esc(nameOf(st, s))}${me(st, s, seat)}</b>
      <span>${"🏆".repeat(st.wins[s]) || "—"} · ${st.out[s] ? "fuera" : `${st.discTotals[s]} disco${st.discTotals[s] === 1 ? "" : "s"}`}</span></div>`).join("");
  renderSheet(ctx.modal, `result-${ctx.table.round}-${st.round}-${st.phase}`, title, `
    <p>${line}</p>
    ${revealsHTML(st)}
    <div class="standings">${standings}</div>
    ${tv ? `<p class="hint center">${over ? "La revancha se pide desde un teléfono." : "La siguiente ronda se pide desde un teléfono."}</p>`
      : seat >= 0 ? (over ? `<button class="primary big-cta" id="again">Revancha</button>` : `<button class="primary big-cta" id="next">Siguiente ronda</button>`) : ""}
    ${tv ? "" : `<button class="ghost" id="exit">Salir</button>`}`, { closable: false });
  $("#next", ctx.modal)?.addEventListener("click", () => ctx.act({ type: "next" }));
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal)?.addEventListener("click", () => ctx.leave());
}

function statusText(st, seat) {
  if (st.phase === "over") return `Ganó ${nameOf(st, st.winner)}`;
  if (st.phase === "pause") return "Fin de la ronda";
  if (st.phase === "place") {
    const waiting = st.stacks.filter((s, i) => !st.out[i] && s.length === 0).length;
    if (seat >= 0 && !st.out[seat] && !st.stacks[seat].length) return "Pon tu primer disco boca abajo";
    return `Esperando a ${waiting} jugador${waiting === 1 ? "" : "es"}`;
  }
  const mine = st.turn === seat, who = nameOf(st, st.turn);
  if (st.phase === "build") return mine ? "Te toca: pon un disco o apuesta" : `Turno de ${who}`;
  if (st.phase === "bid") return mine ? "Te toca: sube la apuesta o pasa" : `${who} decide si sube`;
  if (st.phase === "flip") return mine ? (flipTargets(st).includes(seat) ? "Voltea tus discos" : "Toca un tapete para voltear su disco de arriba") : `${who} está volteando`;
  return mine ? "Te topaste con tu calavera: escoge qué disco pierdes" : `${who} escoge qué disco pierde`;
}

function lastText(st, seat) {
  const l = st.last;
  if (!l || !PLAYING.includes(st.phase)) return "";
  const mine = l.seat === seat, who = mine ? "Tú" : nameOf(st, l.seat);
  if (l.kind === "place") return st.phase === "place" ? "" : `${who} ${mine ? "pusiste" : "puso"} un disco`;
  if (l.kind === "bid") return `${who} ${mine ? "apostaste" : "apostó"} ${l.n}`;
  if (l.kind === "pass") return `${who} ${mine ? "pasaste" : "pasó"}`;
  if (l.kind === "flip") return l.skull ? "¡Calavera!" : `${l.count > 1 ? `${l.count} flores` : "Flor"}`;
  return "";
}

// Un tapete: de abajo (izquierda) hacia arriba (derecha); los volteados se ven aunque sean de otro
function matHTML(stack, flipped, size) {
  if (!stack.length) return `<span class="empty">vacío</span>`;
  return stack.map((d, i) => {
    const up = i >= stack.length - flipped;
    return `<span class="slot ${up ? "up" : ""}" aria-label="${discName(d)}">${discSVG(d, size)}</span>`;
  }).join("");
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  // ctx.display: "full" (lo de siempre), "tv" (la tele: el tablero para todos, sin asiento) o "phone" (mesa con
  // tele: tu teléfono solo muestra lo tuyo y tus botones; los tapetes de todos se ven en la tele)
  const display = ctx.display || "full";
  app.className = `game skull ${display === "full" ? "" : display}`;
  if (st.seq !== ui.seenSeq) { ui.bid = null; ui.seenSeq = st.seq; }
  const playing = PLAYING.includes(st.phase);
  const seated = seat >= 0 && !st.out[seat];
  const myTurn = playing && seated && (st.phase === "place" ? !st.stacks[seat].length : st.turn === seat);
  const clockOn = playing && st.config.timer !== false;
  const total = onMat(st);
  const targets = st.phase === "flip" && myTurn ? flipTargets(st) : [];
  // En la tele se ve a quién puede voltear el retador, aunque nadie toque la tele
  const shown = st.phase === "flip" && display === "tv" ? flipTargets(st) : targets;
  const big = display === "tv";

  const board = st.names.map((_, s) => {
    const out = st.out[s];
    const tags = [
      !out && st.starter === s ? "abre" : "",
      st.phase === "bid" && st.passed[s] ? "pasó" : "",
      st.bid && st.bid.seat === s && playing ? `apuesta ${st.bid.n}` : "",
      st.challenger === s && (st.phase === "flip" || st.phase === "discard") ? "retador" : "",
      out ? "fuera" : "",
    ].filter(Boolean);
    const mark = shown.includes(s) && (display === "tv" || s !== seat);
    const can = targets.includes(s) && s !== seat && display !== "tv";
    const placed = st.phase === "place" && !out && st.stacks[s].length > 0;
    const discs = st.discTotals[s];
    return `<div class="prow ${playing && (st.phase === "place" ? !out && !st.stacks[s].length : st.turn === s) ? "turn" : ""} ${s === seat ? "mine" : ""} ${out ? "out" : ""} ${mark ? "target" : ""}">
      <div class="phead">
        <span class="pname">${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " <small>(tú)</small>" : ""}</span>
        ${st.wins[s] ? `<span class="wins" aria-label="${st.wins[s]} reto ganado">${"🏆".repeat(st.wins[s])}</span>` : ""}
        ${out ? "" : `<span class="dcount" aria-label="${discs} discos">${Array.from({ length: discs }, () => "<i></i>").join("")}</span>`}
        ${placed ? `<span class="ready">listo</span>` : ""}
      </div>
      ${out ? "" : `<div class="mat">${matHTML(st.stacks[s], st.flipped[s], big ? 64 : 26)}${can ? `<button class="flipbtn" data-flip="${s}">Voltear</button>` : ""}</div>`}
      ${tags.length ? `<div class="ptags">${tags.join(" · ")}</div>` : ""}
    </div>`;
  }).join("");

  // Tus discos: el tapete y lo que tienes en la mano
  const myStack = seat >= 0 ? st.stacks[seat] : [];
  const h = seated ? inHand(st, seat) : { F: 0, S: 0 };
  const canPlace = myTurn && (st.phase === "place" || st.phase === "build");
  const handHTML = seated ? [
    ...Array.from({ length: h.F }, () => FLOWER), ...Array.from({ length: h.S }, () => SKULL),
  ].map((d) => `<button class="discbtn" data-place="${d}" ${canPlace ? "" : "disabled"} aria-label="Poner ${discName(d)}">${discSVG(d, display === "phone" ? 64 : 50)}</button>`).join("") : "";

  let actions = "";
  const legal = myTurn ? legalActions(st, seat) : [];
  const bids = legal.filter((a) => a.type === "bid").map((a) => a.n);
  if (bids.length && (st.phase === "build" || st.phase === "bid")) {
    const lo = bids[0], hi = bids[bids.length - 1];
    if (ui.bid === null || ui.bid < lo || ui.bid > hi) ui.bid = lo;
    actions = `<div class="stepper" role="group" aria-label="Cuánto apostar">
        <button id="minus" ${ui.bid <= lo ? "disabled" : ""} aria-label="Menos">−</button><b id="bidn">${ui.bid}</b><button id="plus" ${ui.bid >= hi ? "disabled" : ""} aria-label="Más">+</button>
      </div>
      <button id="bid" class="primary big">${st.phase === "bid" ? `Subir a ${ui.bid}` : `Apostar ${ui.bid}`}</button>
      ${st.phase === "bid" ? `<button id="pass" class="big">Pasar</button>` : ""}`;
  } else if (myTurn && st.phase === "flip" && targets.includes(seat)) {
    actions = `<button id="flipmine" class="primary big">Voltear los míos</button>`;
  } else if (myTurn && st.phase === "flip" && display === "phone") {
    // Sin los tapetes a la vista, se escoge por nombre (en la tele se ve quién tiene cuántos)
    actions = `<div class="fliplist">${targets.filter((x) => x !== seat).map((x) => `<button class="big" data-flip="${x}">Voltear de ${esc(nameOf(st, x))} <small>(${st.stacks[x].length - st.flipped[x]})</small></button>`).join("")}</div>`;
  } else if (myTurn && st.phase === "discard") {
    const own = st.discs[seat];
    actions = `${own.F ? `<button class="big" data-discard="F">Pierdo una flor</button>` : ""}${own.S ? `<button class="big" data-discard="S">Pierdo la calavera</button>` : ""}`;
  }

  const hint = canPlace ? `<p class="hint center">Toca un disco para ponerlo boca abajo en tu tapete.</p>`
    : myTurn && st.phase === "flip" && !targets.includes(seat) ? `<p class="hint center">${display === "phone" ? "Escoge de quién volteas el disco de arriba." : `Toca "Voltear" en el tapete de alguien.`}</p>`
      : display === "phone" && playing && !myTurn ? `<p class="hint center">Mira la mesa en la tele.</p>` : "";
  const bidInfo = st.bid && (st.phase === "bid" || st.phase === "flip" || st.phase === "discard")
    ? `<div class="bidbox"><span>Apuesta</span><b>${st.bid.n}</b><span>de ${total} · ${esc(nameOf(st, st.bid.seat))}</span></div>`
    : `<div class="bidbox quiet"><span>Discos en la mesa</span><b>${total}</b></div>`;
  const progress = st.phase === "flip" ? `<div class="progress">Volteadas ${st.reveals.length} de ${st.bid.n}</div>` : "";
  const last = lastText(st, seat);
  const felt = `<section class="felt ${st.phase === "flip" || st.phase === "discard" ? "challenge" : ""}">
      <div class="status ${myTurn ? "me" : ""}">${esc(statusText(st, seat))}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
      ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
      ${bidInfo}
      ${progress}
      ${st.phase === "flip" || st.phase === "discard" ? revealsHTML(st, big ? 56 : 30) : ""}
      ${last ? `<div class="lastev">${esc(last)}</div>` : ""}
    </section>`;

  if (display === "tv") {
    app.innerHTML = `
      <header class="gbar">
        <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
        <div class="gtitle">Skull</div>
        ${fullscreenButton()}
        <div class="bar-info">Mesa <b>${esc(ctx.table.code)}</b> · Ronda <b>${st.round}</b></div>
      </header>
      <div class="tvlayout">
        <section class="board" aria-label="Jugadores">${board}</section>
        ${felt}
      </div>`;
    wireFullscreen(app);
    // El menú, para cambiar de modo desde aquí (un Monitor con asiento puede volver a Teléfono o Control)
    $("#menu", app).onclick = () => openOverlay("gameMenu");
    // En la tele nadie toca nada: el resultado de la ronda se muestra sin botones (se sigue desde un teléfono)
    if (overlay() && overlay().id === "gameMenu") renderMenu(ctx, st);
    else if (st.phase === "pause" || st.phase === "over") renderResult(ctx, st, seat, { tv: true });
    else ctx.modal.innerHTML = "";
    return;
  }

  const mine = `<section class="me">
      ${seated ? `<div class="mine-row">
          <div><div class="lbl">Tu tapete</div><div class="mat big">${matHTML(myStack, st.flipped[seat], display === "phone" ? 44 : 34)}</div></div>
          <div><div class="lbl">En la mano</div><div class="hand">${handHTML || `<span class="empty">nada</span>`}</div></div>
        </div>` : ""}
      ${hint}
      ${seated && st.round === 1 && !tutorialSeen(ctx) ? `<div class="tutnudge">¿Primera vez jugando Skull? <button id="tutnudge">Ver el tutorial</button></div>` : ""}
      ${actions ? `<div class="actions">${actions}</div>` : ""}
      ${seat < 0 ? `<p class="hint center">Estás mirando la mesa.</p>` : !seated ? `<p class="hint center">Saliste del juego; sigue mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Skull</div>
      <div class="bar-info">Ronda <b>${st.round}</b></div>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    ${display === "phone" ? "" : `<section class="board" aria-label="Jugadores">${board}</section>`}
    ${felt}
    ${mine}`;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  $("#tutnudge", app)?.addEventListener("click", () => openTutorial(ctx));
  app.querySelectorAll("[data-place]").forEach((b) => b.onclick = () => ctx.act({ type: "place", disc: b.dataset.place }));
  app.querySelectorAll("[data-flip]").forEach((b) => b.onclick = () => ctx.act({ type: "flip", seat: Number(b.dataset.flip) }));
  app.querySelectorAll("[data-discard]").forEach((b) => b.onclick = () => ctx.act({ type: "discard", disc: b.dataset.discard }));
  $("#minus", app)?.addEventListener("click", () => { ui.bid -= 1; ctx.refresh(); });
  $("#plus", app)?.addEventListener("click", () => { ui.bid += 1; ctx.refresh(); });
  $("#bid", app)?.addEventListener("click", () => ctx.act({ type: "bid", n: ui.bid }));
  $("#pass", app)?.addEventListener("click", () => ctx.act({ type: "pass" }));
  $("#flipmine", app)?.addEventListener("click", () => ctx.act({ type: "flip", seat }));

  const ov = overlay();
  if (ov && ov.id === "rules") renderRules(ctx);
  else if (ov && ov.id === "tutorial") renderTutorial(ctx);
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
