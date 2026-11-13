// La mesa del Láser: los dos bandos, el tablero (SVG) con el láser y las explosiones encima (canvas), y lo que puedes
// hacer en tu turno. El esqueleto se arma una vez (mount) y cada cambio redibuja por partes, para que el canvas y las
// animaciones no se corten.
//
// Acomodo: en vertical, un bando arriba, el tablero y tu bando abajo; en horizontal (tele, tableta, computadora) los
// bandos van a los lados y el tablero toma toda la altura. Con ctx.display === "tv" (Monitor) no hay botones de juego:
// tablero enorme, paneles grandes con lo perdido y la bitácora.
//
// Teclado y control de la tele: flechas mueven el cursor, Enter/OK escoge o mueve, Q/E giran, Esc suelta.
import {
  W, H, N, rc, idx, typeOf, ownerOf, orientOf, piece, movesFor, nameOf, other, PHARAOH, SPHINX, SCARAB, SPHINX_DIRS, TYPE_NAMES, COLOR_NAMES, SETUP_NAMES,
} from "../engine/index.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { fullscreenButton, wireFullscreen } from "../../../platform/ui/tv.js";
import { sfxButton, sfxControls, wireSfx } from "../../../modules/sfx/ui.js";
import { boardSVG, place, viewPoint, VIEW } from "./board.js";
import { TEAM, iconSVG, angleOf } from "./art.js";
import { createFx } from "./fx.js";
import { rulesHelp } from "./rules.js";

const ROT_MS = 320, MOVE_MS = 300;

const isHotseat = (ctx) => !!ctx.practice && ctx.table.seats.every((s) => s && !s.bot);
const displayOf = (ctx) => ctx.display || "full";

// ---------- Esqueleto ----------
export function buildSkeleton(app, ui) {
  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle"><span class="kh-logo" aria-hidden="true"></span>Láser <small>de los Faraones</small></div>
      <span id="sfxslot"></span>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    <div class="arena" id="arena">
      <aside class="side far" id="sidefar"></aside>
      <div class="bwrap" id="bwrap">
        <div class="bbox" id="bbox">
          <div class="bsvg" id="board"></div>
          <canvas class="fx" id="fx" aria-hidden="true"></canvas>
          <div class="banner" id="banner" aria-live="polite"></div>
        </div>
      </div>
      <aside class="side near" id="sidenear"></aside>
    </div>`;
  ui.fx = createFx($("#fx", app));
  const fit = () => {
    const wrap = $("#bwrap", app), box = $("#bbox", app);
    if (!wrap || !box) return;
    const r = wrap.getBoundingClientRect();
    const k = VIEW.w / VIEW.h;
    let w = Math.min(r.width, r.height * k), h = w / k;
    if (w < 40) { w = r.width; h = w / k; }
    box.style.width = `${Math.floor(w)}px`;
    box.style.height = `${Math.floor(h)}px`;
    box.style.setProperty("--cell", `${(w / VIEW.w).toFixed(1)}px`);
    ui.fx.resize();
  };
  ui.fit = fit;
  if (typeof ResizeObserver === "function") { ui.ro = new ResizeObserver(fit); ui.ro.observe($("#bwrap", app)); }
  else { ui.onResize = fit; addEventListener("resize", fit); }
  requestAnimationFrame(fit);
}

// ---------- Paneles de cada bando ----------
function sideHTML(ctx, st, s, { me, near, tv, playing }) {
  const team = TEAM[s];
  const turn = playing && st.turn === s;
  const lost = st.lost[s];
  const alive = st.board.filter((p) => p && ownerOf(p) === s && typeOf(p) !== SPHINX).length;
  const lostIcons = lost.length ? lost.map((p) => iconSVG(p, 40)).join("") : `<span class="none">Ninguna</span>`;
  const you = s === me && !tv && !isHotseat(ctx) && !(nameOf(st, s) === "Tú") ? ` <small>(tú)</small>` : "";
  const clockOn = st.config.timer !== false && playing;
  return `<div class="crest c${s} ${turn ? "turn" : ""}">
      <div class="medal">${iconSVG(piece(PHARAOH, s), 64)}</div>
      <div class="who">
        <div class="pname">${esc(nameOf(st, s))}${you}</div>
        <div class="pteam">${COLOR_NAMES[s]} · ${alive} piezas</div>
      </div>
      ${turn ? `<div class="turnflag">${tv || isHotseat(ctx) || s !== me ? "Le toca" : "Te toca"}${clockOn ? ` · <span id="clock${s}"></span>` : ""}</div>` : ""}
    </div>
    ${clockOn ? `<div class="timer ${turn ? "" : "idle"}" aria-hidden="true"><i ${turn ? `id="clockbar${s}"` : ""}></i></div>` : ""}
    <div class="lost"><span class="lbl">Perdió</span><div class="icons">${lostIcons}</div></div>
    ${near ? `<div class="klog" aria-label="Bitácora">${st.log.slice(-6).reverse().map((l, k) => `<div class="${k ? "" : "new"}">${esc(l)}</div>`).join("")}</div>` : ""}
    ${near && !tv ? `<div class="dock" id="dock"></div>` : ""}`;
}

// ---------- Lo que puedes hacer ----------
function targetsOf(st, seat, sel) {
  if (sel < 0) return [];
  return movesFor(st.board, seat).filter((a) => a.type === "move" && a.from === sel).map((a) => ({ i: a.to, swap: !!st.board[a.to] }));
}
function rotationsOf(st, seat, sel) {
  if (sel < 0) return [];
  return movesFor(st.board, seat).filter((a) => a.type === "rotate" && a.at === sel);
}

function rotbarHTML(st, seat, ui) {
  const rots = rotationsOf(st, seat, ui.sel);
  if (!rots.length) return "";
  const p = st.board[ui.sel];
  const one = typeOf(p) === SPHINX || typeOf(p) === SCARAB;
  const k = ui.kb.mode === "rotate" ? ui.kb.rot : 0;
  // Con el tablero volteado, la derecha del jugador sigue siendo "horario" en la pantalla
  if (one) return `<button class="rot cw ${ui.kb.mode === "rotate" ? "kfocus" : ""}" data-rot="${rots[0].dir}" aria-label="Girar ${TYPE_NAMES[typeOf(p)]}"><b>⟳</b> Girar</button>`;
  return `<button class="rot ccw ${k === -1 ? "kfocus" : ""}" data-rot="-1" aria-label="Girar a la izquierda"><b>⟲</b> Girar</button>
    <button class="rot cw ${k === 1 ? "kfocus" : ""}" data-rot="1" aria-label="Girar a la derecha">Girar <b>⟳</b></button>`;
}

// ---------- Dibujar ----------
export function render(app, ctx, ui, sound) {
  const st = ctx.view, seat = ctx.seat, display = displayOf(ctx);
  const tv = display === "tv";
  const hot = isHotseat(ctx);
  app.className = `game khet ${tv ? "tv" : ""} ${hot ? "hot" : ""}`;
  const playing = st.phase === "play";
  const myTurn = playing && seat >= 0 && st.turn === seat && !tv;
  ui.flip = !hot && !tv && seat === 1;
  if (!myTurn) { ui.sel = -1; if (ui.kb.mode !== "cursor") ui.kb.mode = "cursor"; }
  if (ui.sel >= 0 && !(st.board[ui.sel] && ownerOf(st.board[ui.sel]) === seat)) ui.sel = -1;

  const fresh = st.seq !== ui.seenSeq;
  if (fresh) {
    const first = ui.seenSeq === -1;
    ui.seenSeq = st.seq;
    ui.sel = -1; ui.kb.mode = "cursor";
    if (!first && st.last) startAnim(app, ctx, ui, sound);
    else if (first && st.ply === 0 && playing) sound.voice("inicio", 400);
  }

  // Paneles: el bando de abajo (cerca) es el tuyo; quien mira o juega en el mismo aparato ve a Plata abajo
  const me = seat >= 0 && !hot ? seat : 0;
  const nearSeat = ui.flip ? 1 : 0;
  const opts = { me, tv, playing };
  $("#sidefar", app).innerHTML = sideHTML(ctx, st, other(nearSeat), { ...opts, near: false });
  $("#sidenear", app).innerHTML = sideHTML(ctx, st, nearSeat, { ...opts, near: true });
  $("#sidefar", app).className = `side far c${other(nearSeat)}`;
  $("#sidenear", app).className = `side near c${nearSeat}`;

  // Barra de arriba: efectos y, en la tele, pantalla completa
  $("#sfxslot", app).innerHTML = `${tv ? fullscreenButton() : ""}${sfxButton(sound.sfx)}`;
  wireSfx($("#sfxslot", app), sound.sfx);
  if (tv) wireFullscreen(app);

  // Lo de tu turno
  const dock = $("#dock", app);
  const adv = ctx.advice && ctx.advice.data;
  const advice = myTurn && adv && adv.action ? adv : null;
  if (dock) {
    let status;
    if (!playing) status = st.draw ? "Empate" : `Ganó ${esc(nameOf(st, st.winner))}`;
    else if (hot) status = `Turno de <b class="t${st.turn}">${esc(nameOf(st, st.turn))}</b> · ${COLOR_NAMES[st.turn]}`;
    else if (!myTurn) status = seat < 0 ? `Turno de ${esc(nameOf(st, st.turn))}` : `Piensa ${esc(nameOf(st, st.turn))}…`;
    else if (ui.sel >= 0) status = `Mueve a un punto dorado o gírala`;
    else status = "Te toca: escoge una pieza";
    dock.innerHTML = `
      <div class="status ${myTurn ? "me" : ""}">${status}</div>
      ${advice ? `<div class="advbox" role="status"><span>${esc(advice.why || "")}</span><button id="advdo" class="primary">Hacerlo</button><button id="advclose" class="ghost" aria-label="Cerrar consejo">✕</button></div>`
        : myTurn && ctx.advice && !ctx.advice.data ? `<div class="advbox"><span>Pensando…</span></div>` : ""}
      <div class="actions ${myTurn ? "" : "idle"}">${ui.sel >= 0 && myTurn
        ? `${rotbarHTML(st, seat, ui)}<button id="drop" class="ghost">Soltar</button>`
        : `<button id="advice" class="ghost" ${myTurn ? "" : "disabled tabindex=\"-1\""}>Consejo</button>`}</div>
      ${seat < 0 ? `<p class="hint">Estás mirando la mesa.</p>` : ""}
      ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;
    $("#advice", dock)?.addEventListener("click", () => ctx.askAdvice());
    $("#advclose", dock)?.addEventListener("click", () => ctx.closeAdvice());
    $("#advdo", dock)?.addEventListener("click", () => doAct(ctx, ui, sound, advice.action));
    $("#drop", dock)?.addEventListener("click", () => { ui.sel = -1; ctx.refresh(); });
  }
  if (ctx.err && ctx.err !== ui.lastErr) sound.error();
  ui.lastErr = ctx.err;

  // Tablero (no se redibuja mientras se anima la última jugada)
  if (!ui.anim) drawBoard(app, st, ui, { myTurn, advice, seat });
  app.querySelectorAll("#dock [data-rot]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); doAct(ctx, ui, sound, { type: "rotate", at: ui.sel, dir: Number(b.dataset.rot) }); });

  $("#board", app).onclick = (e) => {
    const hit = e.target.closest("[data-cell]");
    if (!hit || !myTurn || ui.anim) return;
    tapCell(ctx, ui, sound, Number(hit.dataset.cell));
  };
  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");

  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st, sound);
  else if (ov && ov.id === "rules") renderRules(ctx, st);
  else if (!playing && !ui.anim) renderResult(ctx, st, seat, { tv, hot });
  else ctx.modal.innerHTML = "";
}

function drawBoard(app, st, ui, { myTurn, advice, seat }) {
  const last = st.last;
  const lastFrom = last && last.moved ? last.moved[0] : -1;
  const lastTo = last && last.moved ? last.moved[1] : last && last.action.type === "rotate" ? last.action.at : -1;
  const adv = advice ? (advice.action.type === "move" ? { from: advice.action.from, to: advice.action.to } : { at: advice.action.at }) : null;
  $("#board", app).innerHTML = boardSVG(st, {
    flip: ui.flip, sel: ui.sel, targets: myTurn ? targetsOf(st, seat, ui.sel) : [], lastFrom, lastTo, advice: adv,
    doomed: ui.doomed, cursor: myTurn && ui.kb.show ? ui.kb.cursor : -1, playable: myTurn,
  });
}

// ---------- Jugar ----------
function doAct(ctx, ui, sound, action) {
  ui.sel = -1; ui.kb.mode = "cursor";
  ctx.closeAdvice?.();
  ctx.act(action);
}

function tapCell(ctx, ui, sound, i) {
  const st = ctx.view, seat = ctx.seat;
  if (ui.sel >= 0 && targetsOf(st, seat, ui.sel).some((t) => t.i === i)) { doAct(ctx, ui, sound, { type: "move", from: ui.sel, to: i }); return; }
  const p = st.board[i];
  if (p && ownerOf(p) === seat && i !== ui.sel) { ui.sel = i; sound.select(); }
  else ui.sel = -1;
  ui.kb.cursor = i;
  ctx.refresh();
}

// Teclado / control remoto
export function onKey(e, ctx, ui, sound) {
  if (!ctx || overlay() || ui.anim) return;
  const st = ctx.view, seat = ctx.seat;
  const myTurn = st.phase === "play" && seat >= 0 && st.turn === seat && displayOf(ctx) !== "tv";
  if (!myTurn) return;
  const k = e.key;
  const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (!ui.kb.show && (arrows[k] || k === "Enter")) {
    ui.kb.show = true;
    // Empieza en tu faraón, salvo que el cursor ya esté sobre una pieza tuya
    const c = ui.kb.cursor, own = c >= 0 && st.board[c] && ownerOf(st.board[c]) === seat;
    if (!own) ui.kb.cursor = st.board.findIndex((p) => p && ownerOf(p) === seat && typeOf(p) === PHARAOH);
    e.preventDefault(); ctx.refresh(); return;
  }
  if (ui.kb.mode === "rotate") {
    if (k === "ArrowLeft" || k === "ArrowRight") { ui.kb.rot = k === "ArrowLeft" ? -1 : 1; e.preventDefault(); ctx.refresh(); return; }
    if (k === "Enter") { e.preventDefault(); const rots = rotationsOf(st, seat, ui.sel); const r = rots.find((x) => x.dir === ui.kb.rot) || rots[0]; if (r) doAct(ctx, ui, sound, r); return; }
    if (k === "Escape" || k === "Backspace" || k === "ArrowUp" || k === "ArrowDown") { ui.kb.mode = "cursor"; e.preventDefault(); ctx.refresh(); return; }
  }
  if (arrows[k]) {
    let [dr, dc] = arrows[k];
    if (ui.flip) { dr = -dr; dc = -dc; }
    const [r, c] = rc(Math.max(0, ui.kb.cursor));
    ui.kb.cursor = idx(Math.min(H - 1, Math.max(0, r + dr)), Math.min(W - 1, Math.max(0, c + dc)));
    e.preventDefault(); ctx.refresh(); return;
  }
  if (k === "Enter" || k === " ") {
    e.preventDefault();
    const i = ui.kb.cursor;
    if (ui.sel >= 0 && i === ui.sel) { if (rotationsOf(st, seat, i).length) { ui.kb.mode = "rotate"; ui.kb.rot = 1; ctx.refresh(); } return; }
    tapCell(ctx, ui, sound, i);
    return;
  }
  if ((k === "q" || k === "Q" || k === "e" || k === "E" || k === "r" || k === "R") && ui.sel >= 0) {
    const want = k.toLowerCase() === "q" ? -1 : 1;
    const rots = rotationsOf(st, seat, ui.sel);
    const r = rots.find((x) => x.dir === want) || rots[0];
    if (r) { e.preventDefault(); doAct(ctx, ui, sound, r); }
    return;
  }
  if (k === "Escape" && ui.sel >= 0) { ui.sel = -1; e.preventDefault(); ctx.refresh(); }
}

// ---------- La animación de la última jugada ----------
// 1) la pieza se desliza o gira, 2) el láser sale de la esfinge y rebota, 3) explosión, escudo o se pierde, 4) aviso
// de turno o resultado. Mientras dura, el tablero no se redibuja (ui.anim).
function startAnim(app, ctx, ui, sound) {
  stopAnim(ui, sound);
  const st = ctx.view, last = st.last, display = displayOf(ctx);
  const tv = display === "tv", hot = isHotseat(ctx);
  const narrate = tv || hot || ctx.practice;
  const flip = !hot && !tv && ctx.seat === 1;
  const beam = last.beam;
  const shooter = last.seat;
  const doomed = beam.end === "kill" ? { i: beam.at, code: beam.hit } : null;
  const anim = { timers: [], seq: st.seq };
  ui.anim = anim;
  ui.doomed = doomed;
  // Tablero con la pieza condenada todavía en su lugar
  drawBoard(app, st, { ...ui, flip, sel: -1, kb: { ...ui.kb, show: false } }, { myTurn: false, advice: null, seat: ctx.seat });
  const later = (ms, fn) => anim.timers.push(setTimeout(() => { if (ui.anim === anim) fn(); }, ms));

  // 1) Movimiento o giro
  const a = last.action;
  if (a.type === "move") {
    sound.move();
    slide(app, a.to, a.from, a.to, flip);
    if (st.board[a.from]) slide(app, a.from, a.to, a.from, flip); // intercambio del escarabajo
    later(MOVE_MS, () => ui.fx.pulse(center(a.to, flip)));
  } else {
    sound.rotate();
    const p = st.board[a.at];
    const prev = typeOf(p) === SPHINX ? piece(SPHINX, ownerOf(p), SPHINX_DIRS[ownerOf(p)].find((d) => d !== orientOf(p))) : piece(typeOf(p), ownerOf(p), (orientOf(p) - a.dir) & 3);
    spin(app, a.at, angleOf(prev) - angleOf(p), flip);
    later(ROT_MS, () => ui.fx.pulse(center(a.at, flip)));
  }

  // 2) El láser
  later(Math.max(MOVE_MS, ROT_MS) + 120, () => {
    const pts = beam.path.map((pt) => viewPoint(pt, flip));
    const team = TEAM[shooter];
    let secs = 0;
    secs = ui.fx.beam(pts, {
      color: team.laser, glow: team.glow,
      onReflect: (k) => sound.reflect(k),
      onEnd: () => {
        const end = pts[pts.length - 1];
        if (beam.end === "kill") {
          const el = $("#kdoomed", app); if (el) el.style.display = "none";
          ui.doomed = null;
          const victim = ownerOf(beam.hit);
          ui.fx.explode(end, TEAM[victim].shard, TEAM[victim].glow);
          sound.explode();
          const box = $("#bbox", app); box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
          if (typeOf(beam.hit) === PHARAOH) sound.voice("faraon-cae", 350);
          else sound.voice(victim === shooter ? "fuego-propio" : "destruida", 350);
        } else if (beam.end === "block") { ui.fx.block(end, team.laser); sound.block(); if (narrate) sound.voice("anubis", 300); }
        else { ui.fx.fizzle(end, team.laser); sound.fizzle(); }
        later(1100, () => sound.stopHum());
        // 4) Fin de la animación
        later(beam.end === "kill" ? 1300 : 900, () => finishAnim(app, ctx, ui, sound, { tv, hot, narrate }));
      },
    });
    sound.fire(secs, shooter);
  });
}

function finishAnim(app, ctx, ui, sound, { tv, hot, narrate }) {
  ui.anim = null; ui.doomed = null;
  const st = ctx.view;
  if (st.phase === "over") {
    const mine = ctx.seat >= 0 && !tv && !hot;
    const won = st.winner !== null && (!mine || st.winner === ctx.seat);
    sound.fanfare(st.draw ? false : won || !mine);
    sound.voice(st.draw ? "empate" : st.winner === 0 ? "gana-plata" : "gana-rojo", 900);
  } else {
    const t = st.turn;
    if (tv || hot) { banner(app, `Turno de ${nameOf(st, t)}`, t); sound.voice(t === 0 ? "turno-plata" : "turno-rojo", 100); }
    else if (ctx.seat === t) { sound.turn(); if (!ctx.practice) sound.voice("tu-turno", 250); }
    else if (narrate) sound.turn();
  }
  ctx.refresh();
}

export function stopAnim(ui, sound) {
  if (!ui.anim) return;
  ui.anim.timers.forEach(clearTimeout);
  ui.anim = null; ui.doomed = null;
  ui.fx && ui.fx.stop();
  sound && sound.stopHum();
}

const center = (i, flip) => { const [x, y] = place(i, flip); return [x + 0.5, y + 0.5]; };

// Desliza la pieza que quedó en `at` desde la casilla `from`
function slide(app, at, from, to, flip) {
  const el = $(`#kpc-${at}`, app);
  if (!el) return;
  const [x0, y0] = place(from, flip), [x1, y1] = place(to, flip);
  const t0 = performance.now();
  const go = (t) => {
    const k = Math.min(1, (t - t0) / MOVE_MS), e = 1 - Math.pow(1 - k, 3);
    const lift = Math.sin(k * Math.PI) * 0.08;
    el.setAttribute("transform", `translate(${x0 + (x1 - x0) * e} ${y0 + (y1 - y0) * e - lift})`);
    if (k < 1) requestAnimationFrame(go);
  };
  requestAnimationFrame(go);
}

// Gira la pieza de `at` desde `delta` grados hasta su orientación nueva
function spin(app, at, delta, flip) {
  const el = $(`#kpc-${at}`, app);
  if (!el) return;
  let d = ((delta % 360) + 540) % 360 - 180; // el camino corto
  const [x, y] = place(at, flip);
  const t0 = performance.now();
  const go = (t) => {
    const k = Math.min(1, (t - t0) / ROT_MS), e = 1 - Math.pow(1 - k, 3);
    el.setAttribute("transform", `translate(${x} ${y}) rotate(${d * (1 - e)} .5 .5)`);
    if (k < 1) requestAnimationFrame(go);
  };
  requestAnimationFrame(go);
}

function banner(app, text, team) {
  const b = $("#banner", app);
  if (!b) return;
  b.innerHTML = `<span class="c${team}">${esc(text)}</span>`;
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

// ---------- Ventanas ----------
function renderRules(ctx, st) {
  renderSheet(ctx.modal, "rules", "Reglas del Láser", `${rulesHelp(st.config)}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderMenu(ctx, st, sound) {
  const c = st.config;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? (isHotseat(ctx) ? "En este aparato" : "Práctica") : "Mesa " + ctx.table.code, `
    <p class="hint">Acomodo ${SETUP_NAMES[c.setup] || ""} · ${c.timer ? `${c.secs} s por turno` : "sin límite de tiempo"} · jugada ${st.ply}</p>
    ${sfxControls(sound.sfx)}
    <details class="help"><summary>Reglas</summary>${rulesHelp(c)}</details>
    <details class="help"><summary>Bitácora (${st.log.length})</summary><div class="log">${st.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>
    ${modeMenu(ctx)}
    ${displayOf(ctx) === "tv" ? fullscreenButton() : ""}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  wireSfx(ctx.modal, sound.sfx, { setDragging: ctx.setDragging });
  wireFullscreen(ctx.modal);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  wireModeMenu(ctx.modal, ctx);
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderResult(ctx, st, seat, { tv, hot }) {
  closeOverlay();
  const mine = seat >= 0 && !tv && !hot;
  const title = st.draw ? "¡Empate!" : mine ? (st.winner === seat ? "¡Ganaste!" : `¡Ganó ${nameOf(st, st.winner)}!`) : `¡Gana ${nameOf(st, st.winner)}!`;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, title, `
    <div class="khres">
      ${st.winner !== null ? `<div class="crown c${st.winner}">${iconSVG(piece(PHARAOH, st.winner), tv ? 120 : 72)}</div>` : ""}
      <p class="reason">${esc(st.reason || "")}</p>
      <div class="res">${[0, 1].map((s) => `<div class="resrow ${s === st.winner ? "win" : ""}">
        <span><i class="dot c${s}"></i>${esc(nameOf(st, s))} · ${COLOR_NAMES[s]}</span><b>perdió ${st.lost[s].length}</b></div>`).join("")}</div>
      <p class="hint">${st.ply} jugadas</p>
    </div>
    ${tv ? `<p class="hint center">La revancha se pide desde un teléfono.</p>` : `${seat >= 0 ? `<button class="primary big-cta" id="again">Revancha</button>` : ""}<button class="ghost" id="exit">Salir</button>`}`, { closable: false });
  $("#again", ctx.modal)?.addEventListener("click", () => ctx.again());
  $("#exit", ctx.modal)?.addEventListener("click", () => ctx.leave());
}

export function paintClock(c, st) {
  if (!c || !st) return;
  const s = st.turn;
  const el = document.getElementById(`clock${s}`), bar = document.getElementById(`clockbar${s}`);
  const low = c.secs <= Math.min(10, Math.ceil(c.limitMs / 4000));
  if (el) { el.textContent = `${c.secs} s`; el.classList.toggle("low", low); }
  if (bar) { bar.style.width = c.pct + "%"; bar.classList.toggle("low", low); }
}

export { N };
