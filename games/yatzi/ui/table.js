// La mesa de Yatzi: la bandeja con los dados en 3D (tray.js), lo que puedes hacer en tu turno y la tarjeta de puntos
// (card.js). El esqueleto se arma una vez (mount) y cada cambio redibuja por partes, para que los dados no se corten a
// medio vuelo.
//
// Acomodo: en vertical, la bandeja arriba y la tarjeta abajo; acostado (tele, tableta, computadora), lado a lado. Con
// ctx.display === "tv" (Monitor) no hay botones de juego: bandeja y tarjeta grandes.
//
// Para tirar: el botón (un toque, o apretado para sacudir), agitar el teléfono (modules/shake) o la tecla R / espacio.
// Teclas 1–5 apartan dados; Esc suelta la casilla escogida.
import { MAX_ROLLS, LABELS, options, counts, isYatzi, totals, nameOf, total, RULES, UPPER } from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { fullscreenButton, wireFullscreen } from "../../../platform/ui/tv.js";
import { sfxButton, sfxControls, wireSfx } from "../../../modules/sfx/ui.js";
import { createShakeControl } from "../../../modules/shake/ui.js";
import { createConfetti } from "../../../modules/confetti/ui.js";
import { cardHTML } from "./card.js";
import { rulesHelp } from "./rules.js";
import { createTray, miniDie, wireRollButton } from "../../../modules/dice/ui.js";

const NONE = [false, false, false, false, false];
const isHotseat = (ctx) => !!ctx.practice && ctx.table.seats.length > 1 && ctx.table.seats.every((s) => s && !s.bot);
const displayOf = (ctx) => ctx.display || "full";

// ---------- Esqueleto ----------
export function buildSkeleton(app, ui) {
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle"><span class="yz-logo" aria-hidden="true">${miniDie(5, 22)}</span>Yatzi</div>
      <span class="yz-tools" id="tools"></span>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <div class="yz-main">
      <section class="yz-play">
        <div class="yz-players" id="players"></div>
        <div class="yz-tray" id="tray"></div>
        <div class="yz-dock" id="dock"></div>
      </section>
      <section class="yz-sheet"><div class="yz-paper" id="card"></div></section>
    </div>
    <canvas class="yz-confetti" id="confetti" aria-hidden="true"></canvas>`;
  // Los botes y el castañeteo solo suenan si este aparato debe oír ese tiro (ui.quiet)
  const traySound = { impact: (s) => !ui.quiet && ui.sound.impact(s), rattle: (p) => ui.sound.rattle(p) };
  ui.tray = createTray($("#tray", app), traySound);
  ui.confetti = createConfetti($("#confetti", app));
  ui.tray.onTap((i) => tapDie(ui, i));
  const fit = () => { if (!ui.tray.busy && ui.ctx) placeDice(ui, ui.ctx, false); };
  if (typeof ResizeObserver === "function") { ui.ro = new ResizeObserver(fit); ui.ro.observe($("#tray", app)); }
  else { ui.onResize = fit; addEventListener("resize", fit); }
}

// ---------- Estado de la jugada ----------
const myTurnOf = (ctx) => {
  const st = ctx.view;
  return st.phase !== "over" && ctx.seat >= 0 && st.turn === ctx.seat && displayOf(ctx) !== "tv";
};
const canRoll = (ui) => {
  const ctx = ui.ctx; if (!ctx) return false;
  return myTurnOf(ctx) && ctx.view.rolls < MAX_ROLLS && !ui.tray.busy && !ui.sending && !overlay();
};
const canHold = (ui) => { const ctx = ui.ctx; return myTurnOf(ctx) && ctx.view.rolls > 0 && ctx.view.rolls < MAX_ROLLS && !ui.tray.busy; };

// Los dados en su lugar, sin volar
function placeDice(ui, ctx, smooth = true) {
  const st = ctx.view;
  if (st.dice) ui.tray.place(st.dice, myTurnOf(ctx) ? ui.held : st.keep, { smooth });
  else ui.tray.place(st.last ? st.last.dice : [3, 6, 1, 4, 5], NONE, { idle: true, smooth });
}

// ---------- Dibujar ----------
export function render(app, ctx, ui) {
  const st = ctx.view, seat = ctx.seat, display = displayOf(ctx);
  const tv = display === "tv", hot = isHotseat(ctx);
  ui.ctx = ctx;
  app.className = `game yatzi ${tv ? "tv" : ""} ${hot ? "hot" : ""} n${st.config.n}`;

  const fresh = st.seq !== ui.seenSeq;
  if (fresh) onFresh(app, ctx, ui, { first: ui.seenSeq === -1, tv, hot });
  else if (!ui.tray.busy && !ui.tray.rattling) placeDice(ui, ctx);

  const myTurn = myTurnOf(ctx);
  ui.tray.tappable(canHold(ui));
  if (!myTurn) { ui.pick = null; }

  // Herramientas: efectos, agitar y, en la tele, pantalla completa
  const tools = $("#tools", app);
  const shakeBtn = ui.shake.available
    ? `<button class="shakebtn" id="shake" aria-pressed="${ui.shake.on}" aria-label="${ui.shake.on ? "Apagar agitar para tirar" : "Agitar el teléfono para tirar"}" title="Agitar para tirar">📳</button>` : "";
  tools.innerHTML = `${tv ? fullscreenButton() : ""}${shakeBtn}${sfxButton(ui.sound.sfx)}`;
  wireSfx(tools, ui.sound.sfx);
  if (tv) wireFullscreen(app);
  $("#shake", tools)?.addEventListener("click", () => ui.shake.toggle());

  renderPlayers(app, ctx, ui, { tv, hot });
  renderDock(app, ctx, ui, { tv, hot, myTurn });
  renderCard(app, ctx, ui, { myTurn, tv });

  if (ctx.err && ctx.err !== ui.lastErr) ui.sound.error();
  ui.lastErr = ctx.err;

  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st, ui);
  else if (ov && ov.id === "rules") renderRules(ctx);
  else if (st.phase === "over" && performance.now() >= ui.resultAt) renderResult(ctx, st, ui, { tv, hot });
  else ctx.modal.innerHTML = "";
}

function renderPlayers(app, ctx, ui, { tv, hot }) {
  const st = ctx.view, n = st.config.n, playing = st.phase !== "over";
  const tots = totals(st);
  const clockOn = playing && st.config.timer !== false;
  const round = `<span class="round">Ronda <b>${Math.min(13, st.round)}</b><small>/13</small></span>`;
  if (n === 1) {
    const rec = ui.record;
    $("#players", app).innerHTML = `<div class="solo">${round}<span class="tot">Total <b>${tots[0]}</b></span>${rec ? `<span class="rec">Récord <b>${rec}</b></span>` : ""}${clockOn && !tv ? `<span id="clock" class="clock"></span>` : ""}</div>`;
    return;
  }
  const you = (s) => s === ctx.seat && !hot && !tv && nameOf(st, s) !== "Tú";
  $("#players", app).innerHTML = `<div class="chips">${st.names.map((_, s) => `<div class="chip ${playing && st.turn === s ? "turn" : ""} ${s === ctx.seat && !hot ? "mine" : ""} p${s}">
      <span class="nm">${esc(nameOf(st, s))}${you(s) ? " <small>(tú)</small>" : ""}</span><b class="sc">${tots[s]}</b></div>`).join("")}</div>
    <div class="meta">${round}${clockOn ? `<span id="clock" class="clock"></span>` : ""}</div>`;
}

function rollPips(rolls) {
  return `<span class="pips" aria-label="Tiro ${rolls} de ${MAX_ROLLS}">${Array.from({ length: MAX_ROLLS }, (_, k) => `<i class="${k < rolls ? "used" : ""}"></i>`).join("")}</span>`;
}

function renderDock(app, ctx, ui, { tv, hot, myTurn }) {
  const st = ctx.view, dock = $("#dock", app), playing = st.phase !== "over";
  const clockOn = playing && st.config.timer !== false;
  const timer = clockOn ? `<div class="timer" aria-hidden="true"><i id="clockbar"></i></div>` : "";
  // En la tele, solo de quién es el turno (el menú está en la barra de arriba, igual en todos los modos)
  if (tv) return void (dock.innerHTML = playing ? `<div class="status big">Turno de <b>${esc(nameOf(st, st.turn))}</b> ${rollPips(st.rolls)}</div>${timer}` : "");
  if (!playing) {
    const res = st.config.n === 1 ? `Terminaste con <b>${total(st.cards[0])}</b>` : st.winner === null ? "Empate" : `Ganó <b>${esc(nameOf(st, st.winner))}</b>`;
    dock.innerHTML = `<div class="status">${res}</div><div class="actions"><button id="showres" class="primary big">Ver resultado</button></div>`;
    $("#showres", dock).onclick = () => { ui.resultAt = 0; ctx.refresh(); };
    return;
  }
  const who = esc(nameOf(st, st.turn));
  if (!myTurn) {
    const bot = ctx.table.seats[st.turn] && ctx.table.seats[st.turn].bot;
    dock.innerHTML = `<div class="status">${bot ? `Juega <b>${who}</b>…` : `Turno de <b>${who}</b>`} ${rollPips(st.rolls)}</div>${timer}
      ${ctx.seat < 0 ? `<p class="hint">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;
    return;
  }
  const rolls = st.rolls, left = MAX_ROLLS - rolls;
  const lead = hot ? `<b class="who">${who}</b> · ` : "";
  let status;
  if (rolls === 0) status = `${lead}${hot ? "tira los dados" : "Te toca: tira los dados"}`;
  else if (rolls < MAX_ROLLS) status = `${lead}Toca los dados para apartarlos`;
  else status = `${lead}Escoge dónde anotar`;
  const adv = ctx.advice && ctx.advice.data;
  const advBox = adv ? `<div class="advbox" role="status"><span>${esc(adv.why || "")}</span><button id="advdo" class="primary">Hacerlo</button><button id="advclose" class="ghost" aria-label="Cerrar consejo">✕</button></div>`
    : ctx.advice && !ctx.advice.data ? `<div class="advbox"><span>Pensando…</span></div>` : "";
  let actions;
  if (ui.pick) {
    const o = options(st.cards[st.turn], st.dice).find((x) => x.cat === ui.pick);
    const pts = o ? o.pts + o.bonus : 0;
    actions = `<button id="score" class="primary big score">${pts ? `Anotar <b>${pts}</b> en ${LABELS[ui.pick]}` : `Tachar ${LABELS[ui.pick]}`}</button>
      <button id="unpick" class="ghost" aria-label="Escoger otra casilla">✕</button>`;
  } else {
    const allHeld = ui.held.every(Boolean) && rolls > 0;
    actions = rolls < MAX_ROLLS
      ? `<button id="roll" class="primary big roll" ${allHeld ? "disabled" : ""}><span class="cup" aria-hidden="true">🎲</span>${rolls === 0 ? "Tirar" : `Tirar otra vez <small>(${left})</small>`}</button>
         <button id="advice" class="ghost">Consejo</button>`
      : `<p class="hint pickhint">Toca un número en tu columna de la tarjeta ↓</p><button id="advice" class="ghost">Consejo</button>`;
  }
  const shakeHint = rolls < MAX_ROLLS && !ui.pick && ui.shake.on && ui.shake.alive ? `<p class="hint shake">📳 o agita el teléfono</p>` : rolls < MAX_ROLLS && !ui.pick ? `<p class="hint shake">Déjalo apretado para sacudir los dados</p>` : "";
  dock.innerHTML = `<div class="status me">${status} ${rollPips(rolls)}</div>${timer}${advBox}
    <div class="actions">${actions}</div>${shakeHint}
    ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;

  const roll = $("#roll", dock);
  if (roll) wireRollButton(roll, {
    canRoll: () => canRoll(ui),
    press: () => ui.tray.startRattle(ui.ctx.view.rolls === 0 ? NONE : ui.held),
    release: (p) => doRoll(ui, p),
    cancel: () => ui.tray.stopRattle(true, ui.held),
    tap: () => doRoll(ui, 0.5),
  });
  $("#score", dock)?.addEventListener("click", () => doScore(ui, ui.pick));
  $("#unpick", dock)?.addEventListener("click", () => { ui.pick = null; ctx.refresh(); });
  $("#advice", dock)?.addEventListener("click", () => ctx.askAdvice());
  $("#advclose", dock)?.addEventListener("click", () => { ui.tray.hint(null); ctx.closeAdvice(); });
  $("#advdo", dock)?.addEventListener("click", () => followAdvice(ui, adv));
  // El consejo marca los dados que conviene apartar
  ui.tray.hint(adv && adv.keep ? adv.keep.map((k, i) => (k ? i : -1)).filter((i) => i >= 0) : null);
}

function renderCard(app, ctx, ui, { myTurn, tv }) {
  const st = ctx.view;
  const adv = ctx.advice && ctx.advice.data;
  const html = cardHTML(st, {
    seat: ctx.seat, myTurn: myTurn && !ui.tray.busy, pick: ui.pick, tv,
    fresh: ui.fresh, advice: adv && adv.cat ? adv.cat : null,
    landing: ui.tray.busy,
  });
  const box = $("#card", app);
  box.innerHTML = html;
  box.classList.toggle("landing", ui.tray.busy && st.rolls > 0);
  box.querySelectorAll("button[data-cat]").forEach((b) => {
    b.onclick = () => {
      const cat = b.dataset.cat;
      if (ui.pick === cat) { doScore(ui, cat); return; }
      ui.pick = cat; ui.sound.hold(true);
      ui.ctx.refresh();
    };
  });
  ui.fresh = null;
}

// ---------- Lo nuevo: tiros, anotaciones, cambio de turno, fin ----------
function onFresh(app, ctx, ui, { first, tv, hot }) {
  const st = ctx.view, prev = ui.prev;
  ui.seenSeq = st.seq;
  ui.prev = { turn: st.turn, rolls: st.rolls, phase: st.phase, seq: st.seq };
  ui.sending = false;
  ui.pick = null;
  ctx.closeAdvice?.();
  const hearAll = tv || ctx.practice;
  const mine = (s) => s === ctx.seat;
  if (first) {
    ui.held = st.keep.slice();
    placeDice(ui, ctx, false);
    if (st.phase !== "over" && st.seq === 0 && (hearAll || mine(st.turn))) ui.sound.voice("inicio", 500);
    if (st.phase === "over") ui.resultAt = 0;
    return;
  }

  if (st.rolls > 0) {
    // Un tiro nuevo
    ui.held = st.keep.slice();
    const audible = hearAll || mine(st.turn);
    ui.quiet = !audible;
    const power = ui.power ?? 0.5;
    ui.power = null;
    ui.tray.roll(st.dice, st.keep, {
      power,
      onDone: () => { afterLanding(ctx, ui, { audible, hot }); if (ui.ctx) ui.ctx.refresh(); },
    });
    return;
  }

  // Se anotó (o terminó la partida)
  const L = st.last;
  if (L) {
    ui.fresh = { seat: L.seat, cat: L.cat, upper: !!L.upper, bonus: !!L.bonus };
    const audible = hearAll || mine(L.seat);
    if (audible) {
      ui.sound.score(L.pts + L.bonus);
      if (L.pts === 0 && L.cat !== "chance" && Math.random() < 0.6) ui.sound.voice("tacha", 350);
    }
    if (L.bonus) {
      ui.tray.burst(`<b>+${RULES.yatziBonus}</b><small>Yatzi extra</small>`, "gold");
      if (audible) { ui.sound.fanfare(false); ui.sound.voice("yatzi-extra", 200); }
      ui.confetti.burst(0.5, 0.35, 90);
    }
    if (L.upper) {
      setTimeout(() => {
        ui.tray.burst(`<b>+${RULES.upperBonus}</b><small>¡Bono de arriba!</small>`, "gold");
        if (audible) { ui.sound.bonus(); ui.sound.voice("bono", 300); }
        ui.confetti.burst(0.5, 0.4, 70, 0.7);
      }, L.bonus ? 1600 : 450);
    }
    floatPoints(app, ui, L);
  }
  ui.held = NONE.slice();
  placeDice(ui, ctx, true);

  if (st.phase === "over") { onOver(ctx, ui, { hearAll }); return; }

  // Cambio de turno
  if (prev && prev.turn !== st.turn) {
    if (hot || tv || (ctx.practice && st.config.n > 1 && !ctx.table.seats[st.turn].bot && st.turn !== ctx.seat)) {
      setTimeout(() => ui.tray.burst(`<small>Turno de</small><b>${esc(nameOf(st, st.turn))}</b>`, "turn"), 650);
      if (hot) ui.sound.voice("siguiente", 900);
    }
    if (mine(st.turn) && !hot && !tv) {
      setTimeout(() => ui.sound.turn(), 700);
      if (!ctx.practice) ui.sound.voice("tu-turno", 1000);
    }
  }
}

// Los dados ya cayeron: se anuncia lo que salió
function afterLanding(ctx, ui, { audible, hot }) {
  const st = ctx.view;
  if (!st.dice || st.phase === "over") return;
  const card = st.cards[st.turn], c = counts(st.dice);
  const open = (k) => card[k] === null;
  const idx = (pred) => st.dice.map((d, i) => (pred(d) ? i : -1)).filter((i) => i >= 0);
  const runIdx = (len) => {
    for (let a = 1; a + len - 1 <= 6; a++) {
      if (Array.from({ length: len }, (_, k) => c[a + k]).every(Boolean)) {
        const used = new Set(); return Array.from({ length: len }, (_, k) => { const i = st.dice.findIndex((d, j) => d === a + k && !used.has(j)); used.add(i); return i; });
      }
    }
    return null;
  };
  const key = `${st.turn}:${st.round}`;
  if (ui.announced.key !== key) ui.announced = { key, said: new Set() };
  const say = (k) => { if (ui.announced.said.has(k)) return false; ui.announced.said.add(k); return true; };
  const max = Math.max(...c), face = c.indexOf(max);
  let shout = null;
  if (isYatzi(st.dice)) {
    ui.tray.glow([0, 1, 2, 3, 4]);
    ui.tray.burst(`<b class="yatzi">¡YATZI!</b>`, "yatzi");
    ui.confetti.burst(0.5, 0.32, 180);
    setTimeout(() => ui.confetti.burst(0.2, 0.5, 70, 0.6), 250);
    setTimeout(() => ui.confetti.burst(0.8, 0.5, 70, 0.6), 400);
    if (audible) { ui.sound.fanfare(true); ui.sound.voice("yatzi", 120); }
    navigator.vibrate?.([40, 60, 40, 60, 120]);
    return;
  }
  const lg = runIdx(5), sm = runIdx(4);
  if (lg && open("large") && say("large")) { shout = ["Escalera grande", "escalera-grande", lg]; }
  else if (c.includes(3) && c.includes(2) && open("full") && say("full")) shout = ["Full", "full", [0, 1, 2, 3, 4]];
  else if (sm && open("small") && !lg && say("small")) shout = ["Escalera chica", "escalera-chica", sm];
  else if (max >= 4 && open("four") && say("four")) shout = ["Póker", "poker", idx((d) => d === face)];
  else if (max === 3 && open("three") && face >= 4 && say("three")) shout = ["Tercia", "tercia", idx((d) => d === face)];
  if (shout) {
    ui.tray.glow(shout[2]);
    ui.tray.burst(`<b>${shout[0]}</b>`, "combo");
    if (audible) ui.sound.voice(shout[1], 80);
  } else if (st.rolls === MAX_ROLLS - 1 && audible && (hot || st.turn === ctx.seat) && say("last")) {
    ui.sound.voice("ultimo-tiro", 150);
  }
}

// "+25" que sube desde la casilla anotada
function floatPoints(app, ui, L) {
  requestAnimationFrame(() => {
    const cell = app.querySelector(`.yz-card tr.c-${L.cat} td:nth-child(${L.seat + 2})`);
    if (!cell) return;
    const r = cell.getBoundingClientRect(), f = document.createElement("div");
    f.className = `yz-float ${L.pts + L.bonus ? "" : "nil"}`;
    f.textContent = L.pts + L.bonus ? `+${L.pts + L.bonus}` : "✕";
    f.style.left = `${r.left + r.width / 2}px`; f.style.top = `${r.top}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  });
}

function onOver(ctx, ui, { hearAll }) {
  const st = ctx.view;
  ui.resultAt = performance.now() + 1800;
  setTimeout(() => ui.ctx && ui.ctx.refresh(), 1850);
  const n = st.config.n;
  let rec = false;
  if (n === 1 && ctx.seat === 0) {
    const t = total(st.cards[0]), old = ui.record || 0;
    ui.lastRecord = old;
    if (t > old) { rec = old > 0; ui.record = t; ctx.prefs.set("record", String(t)); }
  }
  ui.overRecord = rec;
  setTimeout(() => {
    ui.confetti.rain(st.winner !== null || rec ? 200 : 60);
    if (!hearAll && !(st.winners || []).includes(ctx.seat)) { ui.sound.voice("fin"); return; }
    if (n === 1) { ui.sound.fanfare(rec); ui.sound.voice(rec ? "record" : "fin", 600); }
    else if (st.winner === null) { ui.sound.fanfare(false); ui.sound.voice("empate", 500); }
    else { ui.sound.fanfare(true); ui.sound.voice("gana", 700); }
  }, 900);
}

// ---------- Jugar ----------
function tapDie(ui, i) {
  if (!canHold(ui)) return;
  ui.held[i] = !ui.held[i];
  ui.sound.hold(ui.held[i]);
  ui.tray.place(ui.ctx.view.dice, ui.held, { smooth: true });
  ui.ctx.refresh();
}

function doRoll(ui, power = 0.5) {
  if (!canRoll(ui)) { ui.tray.stopRattle(true, ui.held); return; }
  const st = ui.ctx.view;
  const keep = st.rolls === 0 ? NONE.slice() : ui.held.slice();
  if (keep.every(Boolean)) { ui.tray.stopRattle(true, ui.held); return; }
  ui.power = power;
  ui.sending = true;
  ui.ctx.closeAdvice?.();
  const ok = ui.ctx.act({ type: "roll", keep });
  Promise.resolve(ok).then((r) => {
    if (r === false) { ui.sending = false; ui.power = null; ui.tray.stopRattle(true, ui.held); }
  });
}

function doScore(ui, cat) {
  if (!cat || !myTurnOf(ui.ctx) || ui.tray.busy) return;
  ui.pick = null;
  ui.ctx.closeAdvice?.();
  ui.ctx.act({ type: "score", cat });
}

function followAdvice(ui, adv) {
  if (!adv || !adv.action) return;
  ui.tray.hint(null);
  if (adv.action.type === "score") { doScore(ui, adv.action.cat); return; }
  if (ui.ctx.view.rolls > 0) ui.held = adv.action.keep.slice();
  doRoll(ui, 0.5);
}

// ---------- Agitar el teléfono (modules/shake) ----------
export function initShake(ui) {
  ui.shake = createShakeControl({
    root: ui.el, prefs: ui.ctx.prefs, enabled: displayOf(ui.ctx) !== "tv",
    canStart: () => canRoll(ui),
    onStart: () => { ui.tray.startRattle(ui.ctx.view.rolls === 0 ? NONE : ui.held); navigator.vibrate?.(15); },
    onPower: (p) => ui.tray.setPower(p),
    onThrow: (p) => { navigator.vibrate?.(25); doRoll(ui, p); },
    onCancel: () => ui.tray.stopRattle(true, ui.held),
    onChange: () => ui.ctx && ui.ctx.refresh(),
  });
}

// ---------- Teclado ----------
export function onKey(e, ui) {
  const ctx = ui.ctx;
  if (!ctx || overlay() || !myTurnOf(ctx)) return;
  if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
  const k = e.key;
  if (k >= "1" && k <= "5") { tapDie(ui, Number(k) - 1); e.preventDefault(); return; }
  if (k === "r" || k === "R" || (k === " " && !(e.target && e.target.tagName === "BUTTON"))) { e.preventDefault(); doRoll(ui, 0.6); return; }
  if (k === "Escape" && ui.pick) { ui.pick = null; ctx.refresh(); }
}

// ---------- Ventanas ----------
function renderMenu(ctx, st, ui) {
  const shake = ui.shake.available
    ? `<div class="yz-menurow"><span>📳 Agitar para tirar</span><button id="mshake" class="${ui.shake.on ? "primary" : ""}" aria-pressed="${ui.shake.on}">${ui.shake.on ? "Encendido" : "Apagado"}</button></div>
       ${ui.shake.denied ? `<p class="hint">El navegador no dio permiso para leer el movimiento.</p>` : ""}` : "";
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    <p class="hint">${st.config.n === 1 ? "Solo, contra tu récord" : `${st.config.n} jugadores`} · Ronda ${Math.min(13, st.round)} de 13</p>
    ${sfxControls(ui.sound.sfx)}
    ${shake}
    <details class="help"><summary>Cómo se juega</summary>${rulesHelp()}</details>
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
  renderSheet(ctx.modal, "rules", "Reglas de Yatzi", `${rulesHelp()}<button class="primary big-cta" id="rulesclose">Entendido</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderResult(ctx, st, ui, { tv, hot }) {
  const seat = ctx.seat, n = st.config.n;
  const tots = totals(st);
  const order = tots.map((v, s) => ({ v, s })).sort((a, b) => b.v - a.v);
  let title;
  if (n === 1) title = ui.overRecord ? "¡Nuevo récord!" : "Fin de la partida";
  else if (st.winner === null) title = "¡Empate!";
  else if (st.winner === seat && !hot && !tv) title = "¡Ganaste!";
  else title = `¡Ganó ${nameOf(st, st.winner)}!`;
  const parts = (s) => { const c = st.cards[s], up = UPPER.reduce((a, k) => a + (c[k] || 0), 0); return `Arriba ${up}${up >= RULES.upperBonusAt ? " +35" : ""} · Abajo ${total(c) - up - (up >= RULES.upperBonusAt ? 35 : 0)}`; };
  const body = n === 1
    ? `<div class="yz-final"><b class="big">${tots[0]}</b><span>${parts(0)}</span>
        <span class="rec">${ui.overRecord ? `Antes: ${ui.lastRecord}` : `Tu récord: ${ui.record || tots[0]}`}</span></div>`
    : `<div class="res">${order.map(({ v, s }, k) => `<div class="resrow ${(st.winners || []).includes(s) ? "win" : ""}"><span>${k === 0 || (st.winners || []).includes(s) ? "🏆 " : ""}${esc(nameOf(st, s))}${s === seat && !hot && nameOf(st, s) !== "Tú" ? " (tú)" : ""}<small>${parts(s)}</small></span><b>${v}</b></div>`).join("")}</div>`;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `${body}
    ${seat >= 0 && !tv ? `<button class="primary big-cta" id="again">Otra partida</button>` : ""}
    <button class="ghost" id="seecard">Ver la tarjeta</button>
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#seecard", ctx.modal).onclick = () => { ui.resultAt = Infinity; ctx.modal.innerHTML = ""; ctx.refresh(); };
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

export function paintClock(c) {
  const el = document.getElementById("clock"), bar = document.getElementById("clockbar");
  if (!c) return;
  if (el) { el.textContent = `${c.secs} s`; el.classList.toggle("low", c.secs <= 10); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", c.secs <= 10); }
}
