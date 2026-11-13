// La mesa de Piojos, de la misma familia que Yatzi: la caja de dados (modules/dice) con marco de talavera verde y ocre
// y paño vino, el contador de lo que llevas en el turno sobre el paño, tus botones, y el marcador como hoja de cuaderno
// con la meta. El esqueleto se arma una vez y cada cambio redibuja por partes, para no cortar los dados a medio vuelo.
//
// Cómo se ve un tiro: los dados vuelan y caen; los piojos (9, 10, As) brillan, suenan uno por uno y se van a la repisa;
// los demás se apagan. Sin piojos: todo se apaga y se pierde lo del turno. Plantarse: lluvia de monedas y "+N" que sube
// al marcador. Cinco piojos: fanfarria, confeti y los cinco regresan a tirarse.
//
// Para tirar: el botón (un toque, o apretado para sacudir), agitar el teléfono (modules/shake) o la tecla R / espacio;
// P te planta.
import { RULES, isLouse, bustChance, nameOf, valueOf } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { fullscreenButton, wireFullscreen } from "../../../platform/ui/tv.js";
import { sfxButton, sfxControls, wireSfx } from "../../../modules/sfx/ui.js";
import { createShakeControl } from "../../../modules/shake/ui.js";
import { createTray, wireRollButton } from "../../../modules/dice/ui.js";
import { createConfetti } from "../../../modules/confetti/ui.js";
import { pokerFace, slotOf, miniFace } from "./faces.js";

const NONE = [false, false, false, false, false];
const pct = (p) => `${Math.round(p * 100)}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const isHotseat = (ctx) => !!ctx.practice && ctx.table.seats.length > 1 && ctx.table.seats.every((s) => s && !s.bot);
const displayOf = (ctx) => ctx.display || "full";

export function rulesHelp(goal = RULES.goal) {
  const V = RULES.values;
  return `<div class="rules">
    <p><b>Material:</b> ${RULES.dice} dados de póker (9, 10, J, Q, K y As).</p>
    <p><b>Piojos:</b> solo el 9 (${V[9]}), el 10 (${V[10]}) y el As (${V.A}) valen puntos. Sin puntos extra por combinaciones.</p>
    <p><b>Tu turno:</b> tira los ${RULES.dice} dados. Los piojos que salgan se apartan en la repisa y se suman a lo del turno. Entonces te plantas (lo del turno pasa a tu marcador) o tiras los dados que quedan buscando más.</p>
    <p><b>Sin piojos:</b> si en un tiro no sale ningún piojo, pierdes todo lo del turno y pasa al siguiente.</p>
    <p><b>Cinco piojos:</b> si apartas los ${RULES.dice} dados, vuelves a tirar los ${RULES.dice} sin perder lo que llevas.</p>
    <p><b>Para tirar:</b> el botón «Tirar»; o déjalo apretado para sacudir los dados; o <b>agita el teléfono</b> (📳).</p>
    <p><b>Gana</b> quien se planta y llega a ${goal} puntos.</p>
  </div>`;
}

// ---------- Esqueleto ----------
export function buildSkeleton(app, ui) {
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle"><span class="pj-logo" aria-hidden="true">${miniFace("A")}</span>Piojos</div>
      <span class="pj-tools" id="tools"></span>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <div class="pj-main">
      <section class="pj-play">
        <div class="pj-tray" id="tray"></div>
        <div class="pj-dock" id="dock"></div>
      </section>
      <section class="pj-sheet"><div class="pj-paper" id="board"></div></section>
    </div>
    <canvas class="pj-confetti" id="confetti" aria-hidden="true"></canvas>`;
  const traySound = { impact: (s) => !ui.quiet && ui.sound.impact(s), rattle: (p) => ui.sound.rattle(p) };
  ui.tray = createTray($("#tray", app), traySound, { faces: pokerFace });
  // Lo que llevas en el turno, pintado sobre el paño
  const pot = document.createElement("div");
  pot.className = "pj-pot"; pot.id = "pot"; pot.setAttribute("aria-live", "polite");
  $("#tray .dz-felt", app).appendChild(pot);
  ui.confetti = createConfetti($("#confetti", app));
  const fit = () => { if (!ui.tray.busy && !ui.anim && ui.ctx) placeDice(ui, ui.ctx.view, false); };
  if (typeof ResizeObserver === "function") { ui.ro = new ResizeObserver(fit); ui.ro.observe($("#tray", app)); }
  else { ui.onResize = fit; addEventListener("resize", fit); }
}

// ---------- Los dados según el estado ----------
// En la repisa van los piojos apartados del turno (o los 5 si salieron 5 piojos); en el paño, lo que no sirvió del
// último tiro (apagado). Al empezar un turno, los 5 alineados y apagados.
// Con cinco piojos el estado ya vació los apartados (st.apart = []): los de antes del tiro los recuerda la mesa
// (hotFaces); si no los tiene (recién abierta), repite caras del tiro, que de todos modos son piojos.
function layout(st, hotFaces = null) {
  if (st.phase === "choose" || (st.phase === "over" && st.roll)) {
    const roll = st.roll, lice = roll.filter(isLouse), rest = roll.filter((f) => !isLouse(f));
    const rack = !st.hot ? st.apart.slice()
      : hotFaces && hotFaces.length === 5 ? hotFaces.slice() : [...Array(5 - roll.length).fill(roll[0]), ...roll];
    const faces = [...rack, ...rest];
    return { values: faces.map(slotOf), held: faces.map((_, i) => i < rack.length), dim: faces.map((_, i) => i >= rack.length), lice: lice.length };
  }
  return null;
}
function placeDice(ui, st, smooth = true) {
  const L = layout(st, ui.hotFaces);
  if (L) ui.tray.place(L.values, L.held, { smooth, dim: L.dim });
  else ui.tray.place(ui.idleValues, NONE, { idle: true, smooth });
  ui.idleValues = L ? L.values : ui.idleValues;
}

const myTurnOf = (ctx) => ctx.view.phase !== "over" && ctx.seat >= 0 && ctx.view.turn === ctx.seat && displayOf(ctx) !== "tv";
const canRoll = (ui) => !!ui.ctx && myTurnOf(ui.ctx) && !ui.tray.busy && !ui.anim && !ui.sending && !overlay();
// Los que se tiran ahora: los que no están en la repisa
const heldNow = (st) => { const L = layout(st); return st.phase === "choose" && L && !st.hot ? L.held : NONE; };

// ---------- Dibujar ----------
export function render(app, ctx, ui) {
  const st = ctx.view, display = displayOf(ctx);
  const tv = display === "tv", hot = isHotseat(ctx);
  ui.ctx = ctx;
  app.className = `game piojos ${tv ? "tv" : ""} ${hot ? "hot" : ""}`;

  if (st.seq !== ui.seenSeq) onFresh(app, ctx, ui, { first: ui.seenSeq === -1, tv, hot });
  else if (!ui.tray.busy && !ui.anim && !ui.tray.rattling) placeDice(ui, st);

  const tools = $("#tools", app);
  const shakeBtn = ui.shake.available
    ? `<button class="shakebtn" id="shake" aria-pressed="${ui.shake.on}" aria-label="${ui.shake.on ? "Apagar agitar para tirar" : "Agitar el teléfono para tirar"}" title="Agitar para tirar">📳</button>` : "";
  tools.innerHTML = `${tv ? fullscreenButton() : ""}${shakeBtn}${sfxButton(ui.sound.sfx)}`;
  wireSfx(tools, ui.sound.sfx);
  if (tv) wireFullscreen(app);
  $("#shake", tools)?.addEventListener("click", () => ui.shake.toggle());

  if (!ui.anim) paintPot(app, st, ui);
  renderDock(app, ctx, ui, { tv, hot });
  renderBoard(app, ctx, ui, { tv, hot });

  if (ctx.err && ctx.err !== ui.lastErr) ui.sound.error();
  ui.lastErr = ctx.err;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st, ui);
  else if (ov && ov.id === "rules") renderRules(ctx);
  else if (st.phase === "over" && performance.now() >= ui.resultAt) renderResult(ctx, st, { tv, hot });
  else ctx.modal.innerHTML = "";
}

// El contador sobre el paño. shown: el número que se ve (para contar hacia arriba)
function paintPot(app, st, ui, { shown = null, lost = false } = {}) {
  const pot = $("#pot", app);
  const v = shown ?? (st.phase === "choose" ? st.turnPts : 0);
  pot.classList.toggle("show", v > 0 || lost);
  pot.classList.toggle("lost", lost);
  pot.innerHTML = `<small>${lost ? "Se fue" : "En este turno"}</small><b>${v}</b>`;
}
function countUp(app, ui, from, to, ms = 600) {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
    paintPot(app, null, ui, { shown: v });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderDock(app, ctx, ui, { tv, hot }) {
  const st = ctx.view, dock = $("#dock", app), playing = st.phase !== "over";
  const clockOn = playing && st.config.timer !== false;
  const timer = clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : "";
  const who = esc(nameOf(st, st.turn));
  if (tv) return void (dock.innerHTML = playing ? `<div class="status big">Turno de <b>${who}</b>${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>${timer}` : "");
  if (!playing) {
    dock.innerHTML = `<div class="status">Ganó <b>${esc(nameOf(st, st.winner))}</b></div><div class="actions"><button id="showres" class="primary big">Ver resultado</button></div>`;
    $("#showres", dock).onclick = () => { ui.resultAt = 0; ctx.refresh(); };
    return;
  }
  const myTurn = myTurnOf(ctx);
  if (!myTurn) {
    const bot = ctx.table.seats[st.turn] && ctx.table.seats[st.turn].bot;
    dock.innerHTML = `<div class="status">${bot ? `Juega <b>${who}</b>…` : `Turno de <b>${who}</b>`}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>${timer}
      ${ctx.seat < 0 ? `<p class="hint">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;
    return;
  }
  const lead = hot ? `<b class="who">${who}</b> · ` : "";
  const status = st.phase === "roll" ? `${lead}${hot ? "tira" : "Te toca: tira"} ${plural(st.dice, "dado", "dados")}`
    : st.hot ? `${lead}¡Los 5 son piojos! Tira los 5 o plántate` : `${lead}¿Te plantas o sigues?`;
  const busy = ui.tray.busy || ui.anim;
  const risk = st.phase === "choose" && !st.hot ? `<p class="risk">Con ${plural(st.dice, "dado", "dados")}: <b>${pct(bustChance(st.dice))}</b> de quedarte sin piojos y perder ${st.turnPts}.</p>` : "";
  const rollBtn = `<button id="roll" class="primary big roll" ${busy ? "disabled" : ""}><span class="cup" aria-hidden="true">🎲</span>Tirar ${st.phase === "roll" ? plural(st.dice, "dado", "dados") : st.dice}</button>`;
  const actions = st.phase === "roll" ? rollBtn
    : `<button id="bank" class="big bank" ${busy ? "disabled" : ""}>Plantarme <b>+${st.turnPts}</b></button>${rollBtn}`;
  const shakeHint = ui.shake.on && ui.shake.alive ? `<p class="hint shake">📳 o agita el teléfono para tirar</p>` : `<p class="hint shake">Deja «Tirar» apretado para sacudir los dados</p>`;
  dock.innerHTML = `<div class="status me">${status}${clockOn ? ` <span id="clock" class="clock"></span>` : ""}</div>${timer}
    ${risk}<div class="actions">${actions}</div>${shakeHint}
    ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;
  const roll = $("#roll", dock);
  if (roll) wireRollButton(roll, {
    canRoll: () => canRoll(ui),
    press: () => ui.tray.startRattle(heldNow(ui.ctx.view)),
    release: (p) => doRoll(ui, p),
    cancel: () => stopRattle(ui),
    tap: () => doRoll(ui, 0.5),
  });
  $("#bank", dock)?.addEventListener("click", () => doBank(ui));
}

// El marcador: una hoja de cuaderno con cada quien, su marcador en pluma y su camino a la meta
function renderBoard(app, ctx, ui, { tv, hot }) {
  const st = ctx.view, goal = st.config.goal, playing = st.phase !== "over";
  const best = Math.max(...st.scores);
  const ticks = Array.from({ length: Math.floor(goal / 100) - 1 }, (_, k) => `<i style="left:${(((k + 1) * 100) / goal) * 100}%"></i>`).join("");
  const rows = st.scores.map((v, s) => {
    const turn = playing && st.turn === s;
    const pend = turn && st.phase === "choose" && !ui.anim ? st.turnPts : 0;
    const w = Math.min(100, (v / goal) * 100), wp = Math.min(100 - w, (pend / goal) * 100);
    const you = s === ctx.seat && !hot && !tv && nameOf(st, s) !== "Tú";
    const fresh = ui.fresh && ui.fresh.seat === s;
    return `<tr class="${turn ? "turn" : ""} ${!playing && s === st.winner ? "champ" : ""}" data-seat="${s}">
      <th scope="row"><span class="nm">${esc(nameOf(st, s))}${you ? " <small>(tú)</small>" : ""}</span></th>
      <td class="sc ${fresh ? "fresh" : ""}"><b>${v}</b>${pend ? `<em>+${pend}</em>` : ""}</td>
      <td class="track"><span class="rule">${ticks}<span class="ink" style="width:${w.toFixed(1)}%"></span><span class="pencil" style="left:${w.toFixed(1)}%;width:${wp.toFixed(1)}%"></span>
        <span class="mark ${v === best && v > 0 ? "lead" : ""}" style="left:${(w + wp).toFixed(1)}%"></span></span></td>
    </tr>`;
  }).join("");
  $("#board", app).innerHTML = `<table class="pj-score">
    <thead><tr><th class="brand">Piojos</th><th class="sc">Puntos</th><th class="track"><span>Meta <b>${goal}</b></span></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  ui.fresh = null;
}

// ---------- Lo nuevo ----------
function onFresh(app, ctx, ui, { first, tv, hot }) {
  const st = ctx.view, prev = ui.prev;
  ui.seenSeq = st.seq;
  ui.prev = st;
  ui.sending = false;
  const hearAll = tv || ctx.practice;
  const mine = (s) => s === ctx.seat;
  if (first) {
    placeDice(ui, st, false);
    if (st.phase !== "over" && st.seq === 0 && (hearAll || mine(st.turn))) ui.sound.voice("inicio", 500);
    if (st.phase === "over") ui.resultAt = 0;
    return;
  }
  // Lo que estaba en la repisa antes de este tiro
  const before = prev && prev.phase === "choose" && prev.turn === (st.last ? st.last.seat : st.turn) && !prev.hot ? prev.apart.slice() : [];
  const actor = st.phase === "choose" ? st.turn : st.last ? st.last.seat : prev ? prev.turn : st.turn;
  const audible = hearAll || mine(actor);
  ui.quiet = !audible;

  ui.hotFaces = st.phase === "choose" && st.hot ? [...before, ...st.roll] : null;
  if (st.phase === "choose") {
    // Un tiro con piojos
    throwDice(ui, before, st.roll, () => afterGoodRoll(app, ctx, ui, st, { before, audible, hot, prevPts: prev && prev.phase === "choose" ? prev.turnPts : 0 }));
  } else if (st.last && st.last.kind === "bust") {
    throwDice(ui, before, st.last.roll, () => afterBust(app, ctx, ui, { before, audible, lost: st.last.pts }));
  } else if (st.last && st.last.kind === "bank") {
    afterBank(app, ctx, ui, { audible, prev });
  }

  if (st.phase === "over") { onOver(ctx, ui, { hearAll }); return; }
  // Cambio de turno
  if (prev && prev.turn !== st.turn) {
    const delay = st.last && st.last.kind === "bust" ? 1900 : 900;
    if (hot || tv || (ctx.practice && st.config.n > 1 && !ctx.table.seats[st.turn].bot && st.turn !== ctx.seat)) {
      setTimeout(() => ui.tray.burst(`<small>Turno de</small><b>${esc(nameOf(st, st.turn))}</b>`, "turn"), delay);
      if (hot) ui.sound.voice("siguiente", delay + 200);
    }
    if (mine(st.turn) && !hot && !tv) {
      setTimeout(() => ui.sound.turn(), delay);
      if (!ctx.practice) ui.sound.voice("tu-turno", delay + 300);
    }
  }
}

// Tira: los de la repisa se quedan, los demás vuelan con las caras del tiro
function throwDice(ui, before, roll, then) {
  const faces = [...before, ...roll];
  const held = faces.map((_, i) => i < before.length);
  const power = ui.power ?? 0.5; ui.power = null;
  ui.anim = true;
  paintPot(ui.el, ui.ctx.view, ui, { shown: ui.potShown || 0 });
  ui.tray.roll(faces.map(slotOf), held, { power, onDone: then });
  ui.thrown = { faces, held };
}

// st: el estado de ese tiro (la mesa pudo avanzar mientras los dados volaban)
function afterGoodRoll(app, ctx, ui, st, { before, audible, hot, prevPts }) {
  const { faces } = ui.thrown;
  const thrownIdx = faces.map((_, i) => i).filter((i) => i >= before.length);
  const liceIdx = thrownIdx.filter((i) => isLouse(faces[i]));
  ui.tray.glow(liceIdx);
  liceIdx.forEach((i, k) => setTimeout(() => audible && ui.sound.louse(k, valueOf(faces[i])), 120 + k * 140));
  countUp(app, ui, prevPts, st.turnPts, 300 + liceIdx.length * 140);
  ui.potShown = st.turnPts;
  const aces = st.roll.filter((f) => f === "A").length;
  setTimeout(() => {
    // Los piojos a la repisa (en orden), lo demás se apaga
    const slot = faces.map((_, i) => i);
    let next = before.length;
    const held = faces.map((f, i) => i < before.length || isLouse(f));
    liceIdx.forEach((i) => { slot[i] = next++; });
    ui.tray.place(faces.map(slotOf), held, { smooth: true, slot, dim: held.map((h) => !h) });
    if (st.hot) {
      ui.tray.burst(`<b class="five">¡5 piojos!</b><small>Tira los cinco otra vez</small>`, "gold");
      ui.confetti.burst(0.5, 0.3, 150);
      if (audible) { ui.sound.fanfare(false); ui.sound.voice("cinco", 300); }
      navigator.vibrate?.([30, 50, 30]);
    } else if (aces >= 3) {
      ui.tray.burst(`<b>¡Puros ases!</b>`, "gold");
      if (audible) ui.sound.voice("ases", 150);
    } else if (audible && st.turnPts >= 50 && (ctx.practice ? !ctx.table.seats[st.turn].bot : st.turn === ctx.seat)) {
      ui.sound.voice("arriesgas", 300);
    }
    setTimeout(() => { ui.anim = false; ui.idleValues = faces.map(slotOf); if (ui.ctx) ui.ctx.refresh(); }, 480);
  }, 380 + liceIdx.length * 140);
}

function afterBust(app, ctx, ui, { before, audible, lost }) {
  const { faces } = ui.thrown;
  ui.tray.place(faces.map(slotOf), faces.map(() => false), { smooth: true, dim: faces.map(() => true) });
  ui.tray.burst(`<b class="bust">¡Sin piojos!</b>`, "bust");
  paintPot(app, null, ui, { shown: lost, lost: !!lost });
  ui.potShown = 0;
  if (audible) { ui.sound.bust(); ui.sound.voice("sin-piojos", 250); }
  $("#tray", app).classList.add("shudder");
  setTimeout(() => $("#tray", app)?.classList.remove("shudder"), 500);
  setTimeout(() => { ui.anim = false; ui.idleValues = faces.map(slotOf); paintPot(app, null, ui, { shown: 0 }); if (ui.ctx) ui.ctx.refresh(); }, 1600);
}

function afterBank(app, ctx, ui, { audible, prev }) {
  const st = ui.ctx.view, L = st.last;
  ui.fresh = { seat: L.seat };
  ui.potShown = 0;
  const me = L.seat === ctx.seat && !isHotseat(ctx) && displayOf(ctx) !== "tv";
  ui.tray.burst(`<b>+${L.pts}</b><small>${me ? "Te plantas" : `${esc(nameOf(st, L.seat))} se planta`}</small>`, "gold");
  if (audible) { ui.sound.coins(L.pts); ui.sound.voice("planta", 200); }
  const near = st.phase !== "over" && st.config.goal - st.scores[L.seat] <= 60;
  if (near && audible) setTimeout(() => ui.sound.voice("casi"), 1300);
  floatPoints(app, L.seat, `+${L.pts}`);
  paintPot(app, null, ui, { shown: 0 });
  // Los piojos de la repisa se juntan con los demás y quedan listos para el siguiente
  setTimeout(() => { if (ui.ctx) placeDice(ui, ui.ctx.view, true); }, 350);
}

function floatPoints(app, seat, text) {
  requestAnimationFrame(() => {
    const cell = app.querySelector(`.pj-score tr[data-seat="${seat}"] .sc`);
    if (!cell) return;
    const r = cell.getBoundingClientRect(), f = document.createElement("div");
    f.className = "pj-float"; f.textContent = text;
    f.style.left = `${r.left + r.width / 2}px`; f.style.top = `${r.top}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  });
}

function onOver(ctx, ui, { hearAll }) {
  const st = ctx.view;
  ui.resultAt = performance.now() + 2000;
  setTimeout(() => ui.ctx && ui.ctx.refresh(), 2050);
  setTimeout(() => {
    ui.confetti.rain(200);
    if (hearAll || st.winner === ctx.seat) { ui.sound.fanfare(true); ui.sound.voice("gana", 800); }
  }, 1000);
}

// ---------- Jugar ----------
function stopRattle(ui) { const st = ui.ctx.view, L = layout(st, ui.hotFaces); ui.tray.stopRattle(true, heldNow(st), L ? { dim: L.dim } : {}); }

function doRoll(ui, power = 0.5) {
  if (!canRoll(ui)) { stopRattle(ui); return; }
  ui.power = power;
  ui.sending = true;
  Promise.resolve(ui.ctx.act({ type: "roll" })).then((r) => { if (r === false) { ui.sending = false; ui.power = null; stopRattle(ui); } });
}
function doBank(ui) {
  const st = ui.ctx.view;
  if (!myTurnOf(ui.ctx) || st.phase !== "choose" || ui.tray.busy || ui.anim) return;
  ui.ctx.act({ type: "bank" });
}

// ---------- Agitar el teléfono (modules/shake) ----------
export function initShake(ui) {
  ui.shake = createShakeControl({
    root: ui.el, prefs: ui.ctx.prefs, enabled: displayOf(ui.ctx) !== "tv",
    canStart: () => canRoll(ui),
    onStart: () => { ui.tray.startRattle(heldNow(ui.ctx.view)); navigator.vibrate?.(15); },
    onPower: (p) => ui.tray.setPower(p),
    onThrow: (p) => { navigator.vibrate?.(25); doRoll(ui, p); },
    onCancel: () => stopRattle(ui),
    onChange: () => ui.ctx && ui.ctx.refresh(),
  });
}

export function onKey(e, ui) {
  const ctx = ui.ctx;
  if (!ctx || overlay() || !myTurnOf(ctx)) return;
  if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
  const k = e.key;
  if (k === "r" || k === "R" || (k === " " && !(e.target && e.target.tagName === "BUTTON"))) { e.preventDefault(); doRoll(ui, 0.6); }
  else if (k === "p" || k === "P") { e.preventDefault(); doBank(ui); }
}

// ---------- Ventanas ----------
function renderMenu(ctx, st, ui) {
  const shake = ui.shake.available
    ? `<div class="pj-menurow"><span>📳 Agitar para tirar</span><button id="mshake" class="${ui.shake.on ? "primary" : ""}" aria-pressed="${ui.shake.on}">${ui.shake.on ? "Encendido" : "Apagado"}</button></div>
       ${ui.shake.denied ? `<p class="hint">El navegador no dio permiso para leer el movimiento.</p>` : ""}` : "";
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">Meta: ${st.config.goal} puntos · ${st.config.n} jugadores</p>
    ${sfxControls(ui.sound.sfx)}
    ${shake}
    <details class="help"><summary>Cómo se juega</summary>${rulesHelp(st.config.goal)}</details>
    <details class="help"><summary>Jugadas (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  wireSfx(ctx.modal, ui.sound.sfx, { setDragging: ctx.setDragging });
  $("#mshake", ctx.modal)?.addEventListener("click", () => ui.shake.toggle());
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de Piojos", `${rulesHelp(ctx.view.config.goal)}<button class="primary big-cta" id="rulesclose">Entendido</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderResult(ctx, st, { tv, hot }) {
  const seat = ctx.seat;
  const order = st.scores.map((v, s) => ({ v, s })).sort((a, b) => b.v - a.v);
  const title = st.winner === seat && !hot && !tv ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    <p class="hint">Llegó a ${st.config.goal} puntos.</p>
    <div class="res">${order.map(({ v, s }) => `<div class="resrow ${s === st.winner ? "win" : ""}"><span>${s === st.winner ? "🏆 " : ""}${esc(nameOf(st, s))}${s === seat && !hot && nameOf(st, s) !== "Tú" ? " (tú)" : ""}</span><b>${v}</b></div>`).join("")}</div>
    ${seat >= 0 && !tv ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `· ${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}

