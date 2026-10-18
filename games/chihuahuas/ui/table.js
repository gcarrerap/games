// La mesa de la Carrera de Chihuahuas, para teléfono: los jugadores arriba, la pista en un cuadro de 5 × 5 (las 16
// casillas alrededor y el tazón en el pasto del centro) y abajo tus jugadas. Dibuja con ctx.view y juega con
// ctx.act(). Lo único propio de esta pantalla es si estás escogiendo casilla para tu tapete (`ui.mode`, `ui.kind`).
//
// La tele como tablero todavía no: este juego no declara `tv` (queda en su propio issue).
import { DOGS, ND, RULES, nameOf, dogName, tileSpaces, ranking, positions } from "../engine/index.js";
import { dogArt, faceArt, thingArt, textureVars, href } from "./art.js";
import { lastLine, actionText, placeName } from "./text.js";
import { rulesHelp } from "./rules.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";

// Dónde va cada casilla en el cuadro de 5 × 5: la 1 abajo a la izquierda, a la derecha por abajo, sube por la
// derecha, a la izquierda por arriba y baja por la izquierda hasta la 16. La meta queda entre la 16 y la 1.
export function cellPos(space) {
  if (space <= 5) return { r: 4, c: space - 1, dir: "right" };
  if (space <= 9) return { r: 9 - space, c: 4, dir: "up" };
  if (space <= 13) return { r: 0, c: 13 - space, dir: "left" };
  return { r: space - 13, c: 0, dir: "down" };
}

const COINS = (n) => `<span class="coins">${thingArt("croqueta", "coin")}<b>${n}</b></span>`;

function renderRules(ctx) {
  const cover = href("portada");
  renderSheet(ctx.modal, "rules", "Reglas de la carrera", `${cover ? `<img class="cover" src="${esc(cover)}" alt="">` : ""}${rulesHelp()}<button class="primary big-cta" id="rulesclose">¡A correr!</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderMenu(ctx, st) {
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Etapa ${st.leg} · ${st.config.n} jugadores</p>
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver a la carrera</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

// Apuesta secreta: al ganador o al último, con las cartas que te quedan
function renderFinal(ctx, st, seat) {
  const cards = st.cards[seat] || [];
  const pay = (bets) => RULES.finals[bets.length] ?? 1;
  const row = (which) => DOGS.map((_, d) => {
    const ok = cards.includes(d);
    return `<button class="cardbtn" data-final="${which}" data-dog="${d}" ${ok ? "" : "disabled"} aria-label="${esc(dogName(d))}">${faceArt(d, "lg")}<small>${esc(dogName(d))}</small></button>`;
  }).join("");
  renderSheet(ctx.modal, "final", "Apuesta secreta", `
    <p class="hint">Nadie ve a qué perro le apuestas hasta el final. Cada carta se usa una sola vez.</p>
    <h4 class="fh">🏆 ¿Quién gana la carrera?</h4>
    <p class="hint">Ya hay ${st.winnerBets.length} apuesta${st.winnerBets.length === 1 ? "" : "s"}: si aciertas cobras ${pay(st.winnerBets)} 🍪; si no, pierdes ${RULES.finalMiss}.</p>
    <div class="cardrow">${row("winner")}</div>
    <h4 class="fh">🐢 ¿Quién llega al último?</h4>
    <p class="hint">Ya hay ${st.loserBets.length} apuesta${st.loserBets.length === 1 ? "" : "s"}: si aciertas cobras ${pay(st.loserBets)} 🍪; si no, pierdes ${RULES.finalMiss}.</p>
    <div class="cardrow">${row("loser")}</div>`);
  ctx.modal.querySelectorAll("[data-final]").forEach((b) => b.onclick = () => {
    closeOverlay();
    ctx.act({ type: "final", which: b.dataset.final, dog: Number(b.dataset.dog) });
  });
}

const podium = (rank) => `<div class="podium">${rank.map((d, i) => `<div class="pod p${i + 1}">${faceArt(d, i === 0 ? "lg" : "")}<small>${placeName(i)} ${esc(dogName(d))}</small></div>`).join("")}</div>`;

function betLines(st, seat, lines, label) {
  if (!lines.length) return "";
  return `<div class="betlines">${lines.map((b) => `<div class="bl ${b.got > 0 ? "win" : "lose"}">
      ${faceArt(b.dog)}<span>${esc(b.seat === seat ? "Tú" : nameOf(st, b.seat))}: ${label(b)}</span><b>${b.got > 0 ? "+" : ""}${b.got}</b></div>`).join("")}</div>`;
}

function standings(st, seat, delta) {
  const order = st.names.map((_, s) => s).sort((a, b) => st.coins[b] - st.coins[a]);
  return `<div class="standings">${order.map((s) => `<div class="strow ${s === seat ? "mine" : ""}"><b>${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " (tú)" : ""}</b>
      <span>${delta && delta[s] ? `<em class="${delta[s] > 0 ? "up" : "down"}">${delta[s] > 0 ? "+" : ""}${delta[s]}</em> ` : ""}${COINS(st.coins[s])}</span></div>`).join("")}</div>`;
}

function renderLeg(ctx, st, seat) {
  const sm = st.summary;
  renderSheet(ctx.modal, `leg-${ctx.table.round}-${sm.leg}`, `Fin de la etapa ${sm.leg}`, `
    ${podium(sm.rank)}
    ${betLines(st, seat, sm.bets, (b) => `boleto de ${b.value} de ${esc(dogName(b.dog))} (${placeName(b.place)})`) || `<p class="hint center">Nadie tomó boletos en esta etapa.</p>`}
    ${standings(st, seat, sm.delta)}
    ${seat >= 0 ? `<button class="primary big-cta" id="next">¡Siguiente etapa!</button>` : `<p class="hint center">Esperando la siguiente etapa.</p>`}`, { closable: false });
  $("#next", ctx.modal)?.addEventListener("click", () => ctx.act({ type: "next" }));
}

function renderOver(ctx, st, seat) {
  const f = st.final;
  const champ = f.champions.length > 1 ? `¡Empate de ${f.champions.map((s) => nameOf(st, s)).join(" y ")}!`
    : f.champions[0] === seat ? "¡Ganaste la carrera de apuestas!" : `¡Ganó ${nameOf(st, f.champions[0])}!`;
  renderSheet(ctx.modal, `over-${ctx.table.round}`, champ, `
    <p class="center"><b>${esc(dogName(f.rank[0]))}</b> cruzó la meta primero; <b>${esc(dogName(f.rank[ND - 1]))}</b> llegó al último.</p>
    ${podium(f.rank)}
    ${betLines(st, seat, st.summary.bets, (b) => `boleto de ${b.value} de ${esc(dogName(b.dog))}`)}
    ${f.winner.length ? `<h4 class="fh">🏆 Apuestas al ganador</h4>${betLines(st, seat, f.winner, (b) => esc(dogName(b.dog)))}` : ""}
    ${f.loser.length ? `<h4 class="fh">🐢 Apuestas al último</h4>${betLines(st, seat, f.loser, (b) => esc(dogName(b.dog)))}` : ""}
    ${standings(st, seat, null)}
    ${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal)?.addEventListener("click", () => ctx.leave());
}

function renderAdvice(ctx, st) {
  const d = ctx.advice.data;
  const body = !d ? `<p class="center">Pensando… 🐾</p>` : `
    <p class="hint">Lo que vale cada jugada, en croquetas que esperas ganar (contando todas las formas en que pueden salir los dados de esta etapa).</p>
    <div class="advlist">${d.options.map((o, i) => `<div class="adv ${i === 0 ? "best" : ""}"><span>${esc(actionText(o.action, st))}</span><b>${o.ev >= 0 ? "+" : ""}${o.ev.toFixed(1)} 🍪</b></div>`).join("")}</div>
    <button class="primary big-cta" id="advdo">${esc(actionText(d.best.action, st))}</button>`;
  renderSheet(ctx.modal, "advice", "Consejo", body);
  $("#sheetclose", ctx.modal).onclick = () => ctx.closeAdvice();
  $("#advdo", ctx.modal)?.addEventListener("click", () => { ctx.closeAdvice(); ctx.act(d.best.action); });
}

// Lo tuyo en esta etapa y en la carrera: boletos, tapete y apuestas secretas
function mineHTML(st, seat) {
  const bets = st.bets.filter((b) => b.seat === seat);
  const tile = st.tiles.find((t) => t.seat === seat);
  const secret = [...st.winnerBets.filter((b) => b.seat === seat).map((b) => ({ ...b, w: "🏆" })), ...st.loserBets.filter((b) => b.seat === seat).map((b) => ({ ...b, w: "🐢" }))];
  const chip = (d, txt) => `<span class="chip" data-dog="${DOGS[d].id}">${faceArt(d, "die")}${txt}</span>`;
  return `<div class="minebox">
      <div><span class="lbl">Tus boletos</span>${bets.length ? bets.map((b) => chip(b.dog, `<b>${b.value}</b>`)).join("") : `<span class="none">ninguno</span>`}</div>
      <div><span class="lbl">Tu tapete</span>${tile ? `<span class="chip">${thingArt(tile.kind)} en la ${tile.space}</span>` : `<span class="none">guardado</span>`}</div>
      <div><span class="lbl">Secretas</span>${secret.length ? secret.map((b) => chip(b.dog, b.w)).join("") : `<span class="none">ninguna</span>`}</div>
    </div>`;
}

function statusText(st, seat, myTurn, ui) {
  if (st.phase === "over") return "¡Se acabó la carrera!";
  if (st.phase === "leg") return `Fin de la etapa ${st.leg}`;
  if (myTurn && ui.mode === "tile") return `Toca una casilla para tu ${ui.kind === "hueso" ? "hueso 🦴" : "aspiradora 🌪️"}`;
  return myTurn ? "¡Te toca!" : `Turno de ${nameOf(st, st.turn)}`;
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  const playing = st.phase === "play";
  const seated = seat >= 0;
  const myTurn = playing && seated && st.turn === seat;
  if (!myTurn) ui.mode = null;
  const fresh = st.seq !== ui.seenSeq; // cambió la mesa: para animar al perro que corrió
  ui.seenSeq = st.seq;
  const clockOn = playing && st.config.timer !== false;
  const can = myTurn && ui.mode === "tile" ? new Set(tileSpaces(st, seat)) : new Set();
  const hop = fresh && st.last && st.last.kind === "roll" ? new Set([st.last.dog, ...st.last.carried]) : new Set();

  app.className = "game chihuahuas";
  app.setAttribute("style", textureVars());

  // Jugadores: croquetas, sus boletos, su tapete y cuántas apuestas secretas hizo
  const players = st.names.map((_, s) => {
    const tickets = st.bets.filter((b) => b.seat === s).map((b) => `<span class="mini" data-dog="${DOGS[b.dog].id}">${b.value}</span>`).join("");
    const tile = st.tiles.find((t) => t.seat === s);
    const secret = st.winnerBets.filter((b) => b.seat === s).length + st.loserBets.filter((b) => b.seat === s).length;
    return `<div class="pl ${playing && st.turn === s ? "turn" : ""} ${s === seat ? "mine" : ""}">
      <div class="plname">${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " <small>(tú)</small>" : ""}</div>
      <div class="plinfo">${COINS(st.coins[s])}${tickets}${tile ? `<span class="minitile" title="Su tapete en la ${tile.space}">${thingArt(tile.kind)}</span>` : ""}${secret ? `<span class="secret" title="Apuestas secretas">🤫${secret}</span>` : ""}</div>
    </div>`;
  }).join("");

  // La pista
  const cells = [];
  for (let space = 1; space <= RULES.track; space++) {
    const { r, c, dir } = cellPos(space);
    const stack = st.spaces[space];
    const tile = st.tiles.find((t) => t.space === space);
    const flip = dir === "left" || dir === "down";
    const dogs = stack.map((d, i) => `<span class="rider ${hop.has(d) ? "hop" : ""}" style="--lvl:${i}">${dogArt(d, flip ? "flip" : "")}</span>`).join("");
    const mark = can.has(space);
    cells.push(`<div class="cell ${space === 1 ? "meta" : ""} ${mark ? "can" : ""} ${st.last && st.last.kind === "roll" && st.last.landed === space && st.last.tile ? "zap" : ""}" style="grid-row:${r + 1};grid-column:${c + 1}" data-space="${space}" ${mark ? `role="button" tabindex="0" aria-label="Casilla ${space}"` : ""}>
      <span class="num">${space}</span>
      ${tile ? `<span class="tile ${tile.kind}">${thingArt(tile.kind)}<small>${tile.kind === "hueso" ? "+1" : "−1"}</small></span>` : ""}
      <div class="stack">${dogs}</div>
    </div>`);
  }
  const finishers = ranking(st.spaces).filter((d) => positions(st.spaces)[d].space > RULES.track);

  // El centro: el tazón con los dados que faltan, lo que ya salió y lo último que pasó
  const inBowl = st.dice.map((d) => faceArt(d, "die")).join("");
  const rolled = st.rolled.map((x) => `<span class="rolled">${faceArt(x.dog, "die")}<b>${x.n}</b></span>`).join("");
  const line = lastLine(st, seat);
  const infield = `<div class="infield">
      ${finishers.length ? `<div class="finish">🏁 ${finishers.map((d) => faceArt(d, "die")).join("")}</div>` : ""}
      <div class="bowl">${thingArt("tazon", "bowlimg")}<div class="bowldice" aria-label="Dados en el tazón">${inBowl}</div></div>
      <div class="rolledrow" aria-label="Ya corrieron">${rolled || `<span class="hint">Nadie ha corrido</span>`}</div>
      ${line ? `<div class="bubble ${fresh ? "pop" : ""}">${esc(line)}</div>` : ""}
    </div>`;

  // Tus jugadas
  let actions = "";
  if (myTurn && ui.mode === "tile") {
    actions = `<div class="tilepick" role="group" aria-label="Qué tapete">
        <button data-kind="hueso" aria-pressed="${ui.kind === "hueso"}">${thingArt("hueso")} Hueso +1</button>
        <button data-kind="aspiradora" aria-pressed="${ui.kind === "aspiradora"}">${thingArt("aspiradora")} Aspiradora −1</button>
      </div>
      <button id="tilecancel" class="ghost">Cancelar</button>`;
  } else if (seated && playing) {
    const tickets = DOGS.map((_, d) => {
      const t = st.tickets[d];
      return `<button class="ticket" data-ticket="${d}" data-dog="${DOGS[d].id}" ${myTurn && t.length ? "" : "disabled"} aria-label="Boleto de ${t[0] || 0} de ${esc(dogName(d))}">
        ${faceArt(d)}<b>${t.length ? t[0] : "—"}</b></button>`;
    }).join("");
    const myTile = st.tiles.find((t) => t.seat === seat);
    actions = `<div class="tickets" aria-label="Boletos de etapa">${tickets}</div>
      <div class="mainacts">
        <button id="roll" class="primary big" ${myTurn ? "" : "disabled"}>${thingArt("tazon")}<span>Sacudir<small>+1 🍪</small></span></button>
        <button id="tilebtn" class="big" ${myTurn && tileSpaces(st, seat).length ? "" : "disabled"}>${thingArt("hueso")}<span>${myTile ? "Mover tapete" : "Tapete"}</span></button>
        <button id="finalbtn" class="big" ${myTurn && (st.cards[seat] || []).length ? "" : "disabled"}>🤫<span>Secreta<small>${(st.cards[seat] || []).length} cartas</small></span></button>
      </div>
      ${myTurn && !ctx.advice ? `<button id="advice" class="ghost advbtn">¿Qué me conviene? 🐾</button>` : ""}
      ${mineHTML(st, seat)}`;
  }

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Carrera de Chihuahuas</div>
      <div class="bar-info">Etapa <b>${st.leg}</b></div>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <section class="players" aria-label="Jugadores">${players}</section>
    <section class="board ${ui.mode === "tile" ? "picking" : ""}" aria-label="Pista">${cells.join("")}${infield}</section>
    <div class="status ${myTurn ? "me" : ""}">${esc(statusText(st, seat, myTurn, ui))}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
    ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
    <section class="acts">
      ${actions}
      ${!seated ? `<p class="hint center">Estás mirando la carrera.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  $("#roll", app)?.addEventListener("click", () => ctx.act({ type: "roll" }));
  app.querySelectorAll("[data-ticket]").forEach((b) => b.onclick = () => ctx.act({ type: "ticket", dog: Number(b.dataset.ticket) }));
  $("#tilebtn", app)?.addEventListener("click", () => { ui.mode = "tile"; ctx.refresh(); });
  $("#tilecancel", app)?.addEventListener("click", () => { ui.mode = null; ctx.refresh(); });
  app.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => { ui.kind = b.dataset.kind; ctx.refresh(); });
  app.querySelectorAll(".cell.can").forEach((el) => {
    const go = () => { const space = Number(el.dataset.space); ui.mode = null; ctx.act({ type: "tile", space, kind: ui.kind }); };
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  $("#finalbtn", app)?.addEventListener("click", () => openOverlay("final"));
  $("#advice", app)?.addEventListener("click", () => ctx.askAdvice());

  const ov = overlay();
  if (ov && ov.id === "rules") renderRules(ctx);
  else if (ov && ov.id === "gameMenu") renderMenu(ctx, st);
  else if (ov && ov.id === "final" && myTurn) renderFinal(ctx, st, seat);
  else if (st.phase === "leg") renderLeg(ctx, st, seat);
  else if (st.phase === "over") renderOver(ctx, st, seat);
  else if (ctx.advice && myTurn) renderAdvice(ctx, st);
  else { if (ov && ov.id === "final") closeOverlay(); ctx.modal.innerHTML = ""; }
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
