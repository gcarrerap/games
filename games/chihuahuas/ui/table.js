// La mesa de la Carrera de Chihuahuas, para teléfono: los jugadores arriba, la pista en un cuadro de 5 × 5 (las 16
// casillas alrededor y el tazón en el pasto del centro) y abajo tus jugadas. Dibuja con ctx.view y juega con
// ctx.act(). Lo propio de esta pantalla: si estás escogiendo casilla para tu tapete (`ui.mode`, `ui.kind`) y la
// animación en curso (`ui.fx`, ver fx.js): al sacudir el tazón se ve qué perro salió y cómo avanza casilla por casilla,
// y al empezar la partida, la salida. Mientras dura, tus botones esperan y el fin de etapa no se abre.
//
// Con la tele como tablero (ctx.display, docs/ARCHITECTURE.md §5) se parte en dos: "tv" dibuja la pista grande, los
// jugadores y el tazón para todos, sin botones; "phone" solo lo tuyo (tus botones, boletos, tapete y apuestas) y la
// casilla del tapete se escoge con una tira de números. "full" es la mesa de siempre.
import { DOGS, ND, RULES, SHOW, nameOf, dogName, tileSpaces, ranking, positions } from "../engine/index.js";
import { facingAt } from "./facing.js";
import { dogArt, faceArt, thingArt, textureVars, href, useTv } from "./art.js";
import { lastLine, actionText, placeName } from "./text.js";
import { rulesHelp } from "./rules.js";
import { historyHTML } from "./history.js";
import { startFx, activeFx, hiddenDogs, fxStatus, revealed, paintFx, elapsed } from "./fx.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { fullscreenButton, wireFullscreen } from "../../../platform/ui/tv.js";
import { musicButton, musicControls, wireMusic } from "../../../modules/music/ui.js";
import { sfxButton, sfxControls, wireSfx } from "../../../modules/sfx/ui.js";
import { syncSounds } from "./sound.js";
import { syncParty } from "./party.js";

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

function renderMenu(ctx, st, ui) {
  const music = ui.music, sfx = ui.sfx;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Etapa ${st.leg} · ${st.config.n} jugadores</p>
    ${music && music.hasSongs ? `<h4 class="fh">🎵 Música</h4>${musicControls(music)}` : ""}
    ${sfx && sfx.hasClips ? `<h4 class="fh">🔔 Efectos</h4>${sfxControls(sfx)}` : ""}
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
    <button id="menuhist">📜 Jugadas</button>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver a la carrera</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#menuhist", ctx.modal).onclick = () => openOverlay("hist");
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
  wireMusic(ctx.modal, music, { setDragging: ctx.setDragging });
  wireSfx(ctx.modal, sfx, { setDragging: ctx.setDragging });
}

function renderHistory(ctx, st, seat) {
  renderSheet(ctx.modal, "hist", "Jugadas", `<div class="histwrap">${historyHTML(st, seat)}</div>
    <button class="primary big-cta" id="histclose">Volver a la carrera</button>`);
  $("#histclose", ctx.modal).onclick = closeOverlay;
}

// Apuesta secreta: al ganador o al último, con las cartas que te quedan
function renderFinal(ctx, st, seat) {
  const cards = st.cards[seat] || [];
  const row = (which) => DOGS.map((_, d) => {
    const ok = cards.includes(d);
    return `<button class="cardbtn" data-final="${which}" data-dog="${d}" ${ok ? "" : "disabled"} aria-label="${esc(dogName(d))}">${faceArt(d, "lg")}<small>${esc(dogName(d))}</small></button>`;
  }).join("");
  const count = (bets) => `Ya hay ${bets.length} apuesta${bets.length === 1 ? "" : "s"} secreta${bets.length === 1 ? "" : "s"}.`;
  renderSheet(ctx.modal, "final", "Apuesta secreta", `
    <p class="hint">Nadie ve a qué perro le apuestas hasta el final. Cada carta se usa una sola vez.</p>
    <p class="hint"><b>Cómo paga:</b> al final se revelan en el orden en que se hicieron. La primera que atina cobra ${RULES.finals[0]} 🍪, la segunda ${RULES.finals[1]}, luego ${RULES.finals.slice(2).join(", ")}… Las que fallan pierden ${RULES.finalMiss} y no cuentan: entre más temprano le atines, más cobras.</p>
    <h4 class="fh">🏆 ¿Quién gana la carrera?</h4>
    <p class="hint">${count(st.winnerBets)}</p>
    <div class="cardrow">${row("winner")}</div>
    <h4 class="fh">🐢 ¿Quién llega al último?</h4>
    <p class="hint">${count(st.loserBets)}</p>
    <div class="cardrow">${row("loser")}</div>`);
  ctx.modal.querySelectorAll("[data-final]").forEach((b) => b.onclick = () => {
    closeOverlay();
    ctx.act({ type: "final", which: b.dataset.final, dog: Number(b.dataset.dog) });
  });
}

// ---------- Revelar los puntos ----------
// Al terminar una etapa (y la carrera) los pagos no salen de golpe: primero el podio, luego cada boleto con su pago y,
// al final de la carrera, cada apuesta secreta volteándose una por una, en el orden en que se hicieron. Al último
// suben las croquetas y aparece el botón. Todo con animaciones de CSS cuyo retraso (--d) se calcula desde que se abrió
// la ventana (`ui.reveal`), así que redibujar a media revelación no la reinicia. "Ver todo" la salta.
const REVEAL = { podium: 160, first: 1100, gap: 400 };
const stepMs = (n) => Math.max(550, Math.min(1150, 1300 - n * 40));

export function revealPlan(st) {
  if (st.phase !== "leg" && st.phase !== "over") return null;
  const sm = st.summary, f = st.phase === "over" ? st.final : null;
  const items = sm.bets.length + (f ? f.winner.length + f.loser.length : 0);
  const step = stepMs(items);
  let t = REVEAL.first;
  const legAt = sm.bets.map(() => { const x = t; t += step; return x; });
  let winAt = [], loseAt = [], winHead = 0, loseHead = 0;
  if (f) {
    if (f.winner.length) { t += REVEAL.gap; winHead = t; t += REVEAL.gap; winAt = f.winner.map(() => { const x = t; t += step; return x; }); }
    if (f.loser.length) { t += REVEAL.gap; loseHead = t; t += REVEAL.gap; loseAt = f.loser.map(() => { const x = t; t += step; return x; }); }
  }
  const end = t + 300;
  return { key: `${st.phase}-${sm.leg}`, legAt, winAt, loseAt, winHead, loseHead, end, done: end + 900 };
}

function revealClock(ui, plan) {
  if (!ui.reveal || ui.reveal.key !== plan.key) ui.reveal = { key: plan.key, start: performance.now() };
  return performance.now() - ui.reveal.start;
}

const at = (ms, t) => `style="--d:${Math.round(ms - t)}ms" data-when="${Math.round(ms)}"`;

const podium = (rank, t = 1e9) => `<div class="podium">${rank.map((d, i) => `<div class="pod p${i + 1} rv" ${at(i * REVEAL.podium, t)}>${faceArt(d, i === 0 ? "lg" : "")}<small>${placeName(i)} ${esc(dogName(d))}</small></div>`).join("")}</div>`;

// Una línea de pago: lo que se sabe desde antes a la izquierda, el pago aparece a su tiempo
function payLine(st, seat, b, label, when, t, { secret = false } = {}) {
  const name = esc(b.seat === seat ? "Tú" : nameOf(st, b.seat));
  const res = `<b class="pay rv ${b.got > 0 ? "up" : "down"}" ${at(when + 350, t)}>${b.got > 0 ? "+" : ""}${b.got}</b>`;
  if (!secret) {
    return `<div class="bl rvline ${b.got > 0 ? "win" : "lose"}" ${at(when, t)}>${faceArt(b.dog)}<span>${name}: ${label}</span>${res}</div>`;
  }
  // Apuesta secreta: primero boca abajo (🤫) y luego se voltea con el perro
  return `<div class="bl rvline flipper ${b.got > 0 ? "win" : "lose"}" ${at(when, t)}>
      <span class="fcard"><span class="fback rvout" ${at(when, t)}>🤫</span><span class="ffront rv" ${at(when, t)}>${faceArt(b.dog)}</span></span>
      <span>${name}: <span class="rv" ${at(when, t)}>${esc(dogName(b.dog))}</span>${label ? ` <small class="rv" ${at(when + 350, t)}>${label}</small>` : ""}</span>${res}</div>`;
}

// Croquetas: las de antes, y al final la diferencia y las nuevas
function standings(st, seat, delta, t = 1e9, end = 0) {
  const order = st.names.map((_, s) => s).sort((a, b) => st.coins[b] - st.coins[a]);
  return `<div class="standings">${order.map((s) => {
    const d = delta ? delta[s] : 0, before = st.coins[s] - d;
    return `<div class="strow ${s === seat ? "mine" : ""}"><b>${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " (tú)" : ""}</b>
      <span>${d ? `<em class="rv ${d > 0 ? "up" : "down"}" ${at(end, t)}>${d > 0 ? "+" : ""}${d}</em> ` : ""}<span class="coins">${thingArt("croqueta", "coin")}<span class="swap"><b class="rvout" ${at(end, t)}>${before}</b><b class="rv" ${at(end, t)}>${st.coins[s]}</b></span></span></span></div>`;
  }).join("")}</div>`;
}

function skipButton(plan, t, tv) {
  return t < plan.end && !tv ? `<button class="ghost skip" id="skip">Ver todo ⏩</button>` : "";
}

function wireSkip(ctx, ui) {
  $("#skip", ctx.modal)?.addEventListener("click", () => { if (ui.reveal) ui.reveal.start -= 1e6; ctx.refresh(); });
  // La ventana baja sola para que siempre se vea lo último que se reveló
  (ui.scrollTimers || []).forEach(clearTimeout);
  const t = ui.reveal ? performance.now() - ui.reveal.start : 0;
  ui.scrollTimers = [...ctx.modal.querySelectorAll(".sheet [data-when]")]
    .map((el) => ({ el, ms: Number(el.dataset.when) - t }))
    .filter((x) => x.ms > 0)
    .map(({ el, ms }) => setTimeout(() => { if (el.isConnected) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, ms));
}

// tv: en la tele la ventana se ve sin botones (la siguiente etapa y la revancha se piden desde un teléfono)
function renderLeg(ctx, st, seat, ui, tv = false) {
  const sm = st.summary, plan = revealPlan(st), t = revealClock(ui, plan);
  const lines = sm.bets.map((b, i) => payLine(st, seat, b, `boleto de ${b.value} de ${esc(dogName(b.dog))} <small>(${placeName(b.place)})</small>`, plan.legAt[i], t)).join("");
  renderSheet(ctx.modal, `leg-${ctx.table.round}-${sm.leg}`, `Fin de la etapa ${sm.leg}`, `
    ${podium(sm.rank, t)}
    ${lines ? `<div class="betlines">${lines}</div>` : `<p class="hint center rv" ${at(REVEAL.first, t)}>Nadie tomó boletos en esta etapa.</p>`}
    ${standings(st, seat, sm.delta, t, plan.end)}
    ${skipButton(plan, t, tv)}
    <div class="rv" ${at(plan.end + 300, t)}>${tv ? `<p class="hint center">La siguiente etapa se pide desde un teléfono.</p>` : seat >= 0 ? `<button class="primary big-cta" id="next">¡Siguiente etapa!</button>` : `<p class="hint center">Esperando la siguiente etapa.</p>`}</div>`, { closable: false });
  $("#next", ctx.modal)?.addEventListener("click", () => ctx.act({ type: "next" }));
  wireSkip(ctx, ui);
}

function renderOver(ctx, st, seat, ui, tv = false) {
  const f = st.final, plan = revealPlan(st), t = revealClock(ui, plan);
  const champ = f.champions.length > 1 ? `¡Empate de ${f.champions.map((s) => esc(nameOf(st, s))).join(" y ")}!`
    : f.champions[0] === seat ? "¡Ganaste la carrera de apuestas!" : `¡Ganó ${esc(nameOf(st, f.champions[0]))}!`;
  const nthLabel = (b) => (b.ok ? `${b.nth + 1}º en atinarle` : "falló");
  const legLines = st.summary.bets.map((b, i) => payLine(st, seat, b, `boleto de ${b.value} de ${esc(dogName(b.dog))}`, plan.legAt[i], t)).join("");
  const win = f.winner.map((b, i) => payLine(st, seat, b, nthLabel(b), plan.winAt[i], t, { secret: true })).join("");
  const lose = f.loser.map((b, i) => payLine(st, seat, b, nthLabel(b), plan.loseAt[i], t, { secret: true })).join("");
  renderSheet(ctx.modal, `over-${ctx.table.round}`, "¡Fin de la carrera!", `
    <p class="center"><b>${esc(dogName(f.rank[0]))}</b> cruzó la meta primero; <b>${esc(dogName(f.rank[ND - 1]))}</b> llegó al último.</p>
    ${podium(f.rank, t)}
    ${legLines ? `<h4 class="fh rv" ${at(REVEAL.first - 200, t)}>Boletos de la última etapa</h4><div class="betlines">${legLines}</div>` : ""}
    ${win ? `<h4 class="fh rv" ${at(plan.winHead, t)}>🏆 Apuestas al ganador</h4><div class="betlines">${win}</div>` : ""}
    ${lose ? `<h4 class="fh rv" ${at(plan.loseHead, t)}>🐢 Apuestas al último</h4><div class="betlines">${lose}</div>` : ""}
    ${standings(st, seat, st.summary.delta, t, plan.end)}
    <div class="champ rv" ${at(plan.end + 300, t)}>🎉 ${champ}</div>
    ${skipButton(plan, t, tv)}
    <div class="rv" ${at(plan.end + 600, t)}>
      ${tv ? `<p class="hint center">La revancha se pide desde un teléfono.</p>` : `${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
      <button class="ghost" id="exit">Salir</button>`}
    </div>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal)?.addEventListener("click", () => ctx.leave());
  wireSkip(ctx, ui);
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
function mineHTML(st, seat, coins = null) {
  const bets = st.bets.filter((b) => b.seat === seat);
  const tile = st.tiles.find((t) => t.seat === seat);
  const secret = [...st.winnerBets.filter((b) => b.seat === seat).map((b) => ({ ...b, w: "🏆" })), ...st.loserBets.filter((b) => b.seat === seat).map((b) => ({ ...b, w: "🐢" }))];
  const chip = (d, txt) => `<span class="chip" data-dog="${DOGS[d].id}">${faceArt(d, "die")}${txt}</span>`;
  return `<div class="minebox">
      ${coins === null ? "" : `<div><span class="lbl">Croquetas</span>${COINS(coins)}</div>`}
      <div><span class="lbl">Tus boletos</span>${bets.length ? bets.map((b) => chip(b.dog, `<b>${b.value}</b>`)).join("") : `<span class="none">ninguno</span>`}</div>
      <div><span class="lbl">Tu tapete</span>${tile ? `<span class="chip">${thingArt(tile.kind)} en la ${tile.space}</span>` : `<span class="none">guardado</span>`}</div>
      <div><span class="lbl">Secretas</span>${secret.length ? secret.map((b) => chip(b.dog, b.w)).join("") : `<span class="none">ninguna</span>`}</div>
    </div>`;
}

function statusText(st, seat, myTurn, ui, fx, phone = false) {
  if (fx) return fxStatus(fx, dogName);
  if (st.phase === "over") return "¡Se acabó la carrera!";
  if (st.phase === "leg") return `Fin de la etapa ${st.leg}`;
  if (myTurn && ui.mode === "tile") return `${phone ? "Escoge la casilla" : "Toca una casilla"} para tu ${ui.kind === "hueso" ? "hueso 🦴" : "aspiradora 🌪️"}`;
  return myTurn ? "¡Te toca!" : `Turno de ${nameOf(st, st.turn)}`;
}

export function renderTable(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat;
  // ctx.display: "full" (lo de siempre), "tv" (la tele: el tablero para todos, sin asiento) o "phone" (mesa con tele:
  // tu teléfono solo con lo tuyo; la pista se ve en la tele)
  const display = ctx.display || "full";
  const tv = display === "tv", phone = display === "phone";
  useTv(tv); // en la tele, las imágenes en alta
  const playing = st.phase === "play";
  const seated = seat >= 0;
  const first = ui.seenSeq === -1;
  const fresh = st.seq !== ui.seenSeq; // cambió la mesa
  ui.seenSeq = st.seq;
  if (fresh) startFx(ui, st, { first, refresh: ctx.refresh });
  const fx = activeFx(ui, st);
  const hidden = hiddenDogs(fx);
  const myTurn = playing && seated && st.turn === seat;
  const canAct = myTurn && !fx; // mientras se ve la jugada anterior, tus botones esperan
  if (!canAct) ui.mode = null;
  const clockOn = playing && st.config.timer !== false;
  const can = myTurn && ui.mode === "tile" ? new Set(tileSpaces(st, seat)) : new Set();
  // Al terminar la animación, los que corrieron dan un brinquito en su casilla; sin animación (movimiento reducido),
  // al momento
  const settled = !fx && ui.landSeq !== st.seq && st.last && st.last.kind === "roll" && !first;
  if (settled) ui.landSeq = st.seq;
  const hop = settled ? new Set([st.last.dog, ...st.last.carried]) : new Set();

  app.className = `game chihuahuas ${display === "full" ? "" : display}`;
  app.setAttribute("style", textureVars());

  // Mientras se revelan los pagos (o corre el perro que cerró la etapa), arriba se ven las croquetas de antes
  const plan = revealPlan(st);
  let holding = false;
  if (plan) {
    const left = fx ? Infinity : ui.reveal && ui.reveal.key === plan.key ? plan.end - (performance.now() - ui.reveal.start) : plan.end;
    holding = left > 0;
    clearTimeout(ui.holdTimer);
    if (holding && Number.isFinite(left)) ui.holdTimer = setTimeout(() => ctx.refresh(), left + 50);
  }
  const shownCoins = (s) => (holding ? st.coins[s] - st.summary.delta[s] : st.coins[s]);
  // Sonidos de lo que acaba de pasar (no del redibujado). La tele y el teléfono se reparten en sound.js.
  // La fiesta sale en ese mismo momento (fin de etapa o ganador), no al redibujar.
  const party = syncSounds(ui, ctx, { fxOn: !!fx, plan });
  syncParty(ui, ctx, party);

  // Jugadores: croquetas, sus boletos, su tapete y cuántas apuestas secretas hizo
  const players = st.names.map((_, s) => {
    const tickets = st.bets.filter((b) => b.seat === s).map((b) => `<span class="mini" data-dog="${DOGS[b.dog].id}">${b.value}</span>`).join("");
    const tile = st.tiles.find((t) => t.seat === s);
    const secret = st.winnerBets.filter((b) => b.seat === s).length + st.loserBets.filter((b) => b.seat === s).length;
    return `<div class="pl ${playing && st.turn === s ? "turn" : ""} ${s === seat ? "mine" : ""}">
      <div class="plname">${esc(nameOf(st, s))}${s === seat && nameOf(st, s) !== "Tú" ? " <small>(tú)</small>" : ""}</div>
      <div class="plinfo">${COINS(shownCoins(s))}${tickets}${tile ? `<span class="minitile" title="Su tapete en la ${tile.space}">${thingArt(tile.kind)}</span>` : ""}${secret ? `<span class="secret" title="Apuestas secretas">🤫${secret}</span>` : ""}</div>
    </div>`;
  }).join("");

  // La pista
  const cells = [];
  for (let space = 1; space <= RULES.track; space++) {
    const { r, c } = cellPos(space);
    const stack = st.spaces[space];
    const tile = st.tiles.find((t) => t.space === space);
    const dogs = stack.map((d, i) => `<span class="rider ${hop.has(d) ? "hop" : ""} ${hidden.has(d) ? "pending" : ""}" style="--lvl:${i}">${dogArt(d, facingAt(space))}</span>`).join("");
    const mark = can.has(space);
    const zap = st.last && ((settled && st.last.landed === space && st.last.tile) || (fresh && !first && st.last.kind === "tile" && st.last.space === space));
    cells.push(`<div class="cell ${space === 1 ? "meta" : ""} ${mark ? "can" : ""} ${zap ? "zap" : ""}" style="grid-row:${r + 1};grid-column:${c + 1}" data-space="${space}" ${mark ? `role="button" tabindex="0" aria-label="Casilla ${space}"` : ""}>
      <span class="num">${space}</span>
      ${tile ? `<span class="tile ${tile.kind}">${thingArt(tile.kind)}<small>${tile.kind === "hueso" ? "+1" : "−1"}</small></span>` : ""}
      <div class="stack">${dogs}</div>
    </div>`);
  }
  const finishers = ranking(st.spaces).filter((d) => positions(st.spaces)[d].space > RULES.track && !hidden.has(d));

  // El centro: el tazón con los dados que faltan, lo que ya salió y lo último que pasó
  // Mientras se sacude el tazón, el dado que salió sigue adentro; luego brinca al centro con su número
  const rolling = fx && fx.kind === "roll" ? fx.last : null;
  const bowlDice = rolling && !revealed(fx) ? [...st.dice, rolling.dog] : st.dice;
  const inBowl = bowlDice.map((d) => faceArt(d, "die")).join("");
  const done = rolling ? st.rolled.slice(0, -1) : st.rolled;
  const rolled = done.map((x) => `<span class="rolled">${faceArt(x.dog, "die")}<b>${x.n}</b></span>`).join("");
  const reveal = rolling ? `<div class="reveal" style="--t:-${Math.round(elapsed(fx))}ms;--rv:${SHOW.reveal}ms">${faceArt(rolling.dog, "xl")}<b>${rolling.n}</b></div>` : "";
  const line = fx ? "" : lastLine(st, seat);
  const emptyRow = st.leg === 1 ? "Salida: cada perro tiró para su lugar de arranque" : "Nadie ha corrido en esta etapa";
  const infield = `<div class="infield">
      ${finishers.length ? `<div class="finish">🏁 ${finishers.map((d) => faceArt(d, "die")).join("")}</div>` : ""}
      <div class="bowl ${rolling && !revealed(fx) ? "shake" : ""}" style="--t:-${fx ? Math.round(elapsed(fx)) : 0}ms">${thingArt("tazon", "bowlimg")}<div class="bowldice" aria-label="Dados en el tazón">${inBowl}</div></div>
      ${reveal}
      <div class="rolledrow" aria-label="Ya corrieron">${rolled || `<span class="hint">${emptyRow}</span>`}</div>
      ${line && tv ? `<div class="bubble ${fresh || settled ? "pop" : ""}">${esc(line)}</div>` : line ? `<button class="bubble ${fresh || settled ? "pop" : ""}" id="bubble" aria-label="Ver las jugadas">${esc(line)} <span class="more">📜</span></button>` : ""}
    </div>`;

  // Tus jugadas
  let actions = "";
  if (canAct && ui.mode === "tile") {
    // En el teléfono de una mesa con tele no hay pista a la vista: la casilla se escoge por número y se ve en la tele
    const strip = phone ? `<div class="spacepick" role="group" aria-label="Casilla">${[...can].sort((a, b) => a - b).map((x) => `<button data-pick="${x}" aria-label="Casilla ${x}">${x}</button>`).join("")}</div>
      <p class="hint center">Las que no salen están ocupadas o junto a otro tapete. Mira en la tele dónde quedó.</p>` : "";
    actions = `<div class="tilepick" role="group" aria-label="Qué tapete">
        <button data-kind="hueso" aria-pressed="${ui.kind === "hueso"}">${thingArt("hueso")} Hueso +1</button>
        <button data-kind="aspiradora" aria-pressed="${ui.kind === "aspiradora"}">${thingArt("aspiradora")} Aspiradora −1</button>
      </div>
      ${strip}
      <button id="tilecancel" class="ghost">Cancelar</button>`;
  } else if (seated && playing) {
    const tickets = DOGS.map((_, d) => {
      const t = st.tickets[d];
      return `<button class="ticket" data-ticket="${d}" data-dog="${DOGS[d].id}" ${canAct && t.length ? "" : "disabled"} aria-label="Boleto de ${t[0] || 0} de ${esc(dogName(d))}">
        ${faceArt(d)}<b>${t.length ? t[0] : "—"}</b></button>`;
    }).join("");
    const myTile = st.tiles.find((t) => t.seat === seat);
    actions = `<div class="tickets" aria-label="Boletos de etapa">${tickets}</div>
      <div class="mainacts">
        <button id="roll" class="primary big" ${canAct ? "" : "disabled"}>${thingArt("tazon")}<span>Sacudir<small>+1 🍪</small></span></button>
        <button id="tilebtn" class="big" ${canAct && tileSpaces(st, seat).length ? "" : "disabled"}>${thingArt("hueso")}<span>${myTile ? "Mover tapete" : "Tapete"}</span></button>
        <button id="finalbtn" class="big" ${canAct && (st.cards[seat] || []).length ? "" : "disabled"}>🤫<span>Secreta<small>${(st.cards[seat] || []).length} cartas</small></span></button>
      </div>
      ${canAct && !ctx.advice ? `<button id="advice" class="ghost advbtn">¿Qué me conviene? 🐾</button>` : ""}
      ${mineHTML(st, seat, phone ? shownCoins(seat) : null)}`;
  }

  if (tv) {
    // La tele: la pista grande y a un lado lo de todos. Nadie la toca.
    const left = DOGS.map((_, d) => `<span class="tleft" data-dog="${DOGS[d].id}">${faceArt(d)}<b>${st.tickets[d].length ? st.tickets[d][0] : "—"}</b></span>`).join("");
    app.innerHTML = `
      <header class="gbar">
        <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
        <div class="gtitle">Carrera de Chihuahuas</div>
        ${musicControls(ui.music)}
        ${sfxControls(ui.sfx)}
        ${fullscreenButton()}
        <div class="bar-info">Mesa <b>${esc(ctx.table.code)}</b> · Etapa <b>${st.leg}</b></div>
      </header>
      <div class="tvlayout">
        <section class="board" aria-label="Pista">${cells.join("")}${infield}</section>
        <aside class="side">
          <div class="status ${fx ? "fx" : ""}">${esc(statusText(st, seat, false, ui, fx))}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
          ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
          <div class="tleftrow" aria-label="Boletos que quedan"><span class="lbl">Boletos</span>${left}</div>
          <section class="players" aria-label="Jugadores">${players}</section>
        </aside>
      </div>`;
    wireFullscreen(app);
    wireMusic(app, ui.music, { setDragging: ctx.setDragging });
    wireSfx(app, ui.sfx, { setDragging: ctx.setDragging });
    paintFx($(".board", app), fx, st);
    // El menú, para cambiar de modo desde aquí (un Monitor con asiento puede volver a Teléfono o Control)
    $("#menu", app).onclick = () => openOverlay("gameMenu");
    if (overlay() && overlay().id === "gameMenu") renderMenu(ctx, st, ui.music);
    else if (fx) ctx.modal.innerHTML = ""; // primero se ve la carrera
    else if (st.phase === "leg") renderLeg(ctx, st, seat, ui, true);
    else if (st.phase === "over") renderOver(ctx, st, seat, ui, true);
    else ctx.modal.innerHTML = "";
    return;
  }

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Carrera de Chihuahuas</div>
      <div class="bar-info">Etapa <b>${st.leg}</b></div>
      ${musicButton(ui.music)}
      ${sfxButton(ui.sfx)}
      <button class="histbtn" id="hist" aria-haspopup="dialog" aria-label="Jugadas">📜</button>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    ${phone ? "" : `<section class="players" aria-label="Jugadores">${players}</section>
    <section class="board ${ui.mode === "tile" ? "picking" : ""}" aria-label="Pista">${cells.join("")}${infield}</section>`}
    <div class="status ${canAct ? "me" : ""} ${fx ? "fx" : ""}">${esc(statusText(st, seat, myTurn, ui, fx, phone))}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>
    ${clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : ""}
    ${phone ? `<p class="tvnote">📺 Mira la pista en la tele</p>` : ""}
    <section class="acts">
      ${actions}
      ${!seated ? `<p class="hint center">Estás mirando la carrera.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}
    </section>`;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  $("#hist", app).onclick = () => openOverlay("hist");
  wireMusic(app, ui.music);
  wireSfx(app, ui.sfx);
  $("#bubble", app)?.addEventListener("click", () => openOverlay("hist"));
  paintFx($(".board", app), fx, st);
  $("#roll", app)?.addEventListener("click", () => ctx.act({ type: "roll" }));
  app.querySelectorAll("[data-ticket]").forEach((b) => b.onclick = () => ctx.act({ type: "ticket", dog: Number(b.dataset.ticket) }));
  $("#tilebtn", app)?.addEventListener("click", () => { ui.mode = "tile"; ctx.refresh(); });
  $("#tilecancel", app)?.addEventListener("click", () => { ui.mode = null; ctx.refresh(); });
  app.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => { ui.kind = b.dataset.kind; ctx.refresh(); });
  app.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { ui.mode = null; ctx.act({ type: "tile", space: Number(b.dataset.pick), kind: ui.kind }); });
  app.querySelectorAll(".cell.can").forEach((el) => {
    const go = () => { const space = Number(el.dataset.space); ui.mode = null; ctx.act({ type: "tile", space, kind: ui.kind }); };
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  $("#finalbtn", app)?.addEventListener("click", () => openOverlay("final"));
  $("#advice", app)?.addEventListener("click", () => ctx.askAdvice());

  const ov = overlay();
  if (ov && ov.id === "rules") renderRules(ctx);
  else if (ov && ov.id === "gameMenu") renderMenu(ctx, st, ui);
  else if (ov && ov.id === "hist") renderHistory(ctx, st, seat);
  else if (ov && ov.id === "final" && canAct) renderFinal(ctx, st, seat);
  else if (fx) { if (ov && ov.id === "final") closeOverlay(); ctx.modal.innerHTML = ""; } // primero se ve la carrera
  else if (st.phase === "leg") renderLeg(ctx, st, seat, ui);
  else if (st.phase === "over") renderOver(ctx, st, seat, ui);
  else if (ctx.advice && canAct) renderAdvice(ctx, st);
  else { if (ov && ov.id === "final") closeOverlay(); ctx.modal.innerHTML = ""; }
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
