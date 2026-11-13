// La mesa de Vikingos: el selector de retos (con un dibujito de cada uno, como el cuadernillo) y el mar con sus
// botones. Dibuja con ctx.view y juega con ctx.act(). Lo propio de esta pantalla vive en `ui`: la pieza escogida
// (`sel`), un aviso (`msg`), la pestaña del selector (`tab`) y la última jugada que ya se animó (`seenSeq`).
//
// Sonido (ui/sound.js): cada cosa suena una sola vez, cuando pasa (seq nuevo), no al redibujar.
//
// Los retos resueltos se recuerdan en este aparato (ctx.prefs, "resueltos": { reto: menos movimientos }). «Siguiente
// reto» guarda el número en "siguiente" y pide otra partida; al llegar la partida nueva (en "pick") se escoge sola.
import { LEVELS, CHALLENGES, levelOf, boardOf, boardOfState } from "../engine/index.js";
import { whyNot } from "../engine/board.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { boardSVG, bannerSVG, spinSecs } from "./board.js";
import { ARRIVE_VOICE } from "./sound.js";
import { sfxButton, sfxControls, wireSfx } from "../../../modules/sfx/ui.js";
import { rulesHelp } from "./rules.js";

const solvedMap = (ctx) => { const m = ctx.prefs.getJSON("resueltos", {}); return m && typeof m === "object" ? m : {}; };
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

function renderRules(ctx) {
  renderSheet(ctx.modal, "rules", "Reglas de Vikingos", `${rulesHelp()}
    <button class="primary big-cta" id="rulesclose">Volver al juego</button>`);
  $("#rulesclose", ctx.modal).onclick = closeOverlay;
}

function renderMenu(ctx, st, sound) {
  const lv = st.reto ? levelOf(st.reto) : null;
  renderSheet(ctx.modal, "gameMenu", ctx.practice ? "Práctica" : "Mesa " + ctx.table.code, `
    ${st.reto ? `<p class="hint">Reto ${st.reto} · ${esc(lv.name)} · ${plural(st.history.length, "movimiento", "movimientos")} (mínimo ${st.min})</p>` : ""}
    ${sfxControls(sound.sfx)}
    <details class="help"><summary>Reglas</summary>${rulesHelp()}</details>
    ${st.phase === "play" && ctx.seat === 0 ? `<button id="choose">Escoger otro reto</button>` : ""}
    ${modeMenu(ctx)}
    <button id="back">← Salir</button>
    <button class="primary big-cta" id="menuclose">Volver al juego</button>`);
  $("#menuclose", ctx.modal).onclick = closeOverlay;
  $("#choose", ctx.modal)?.addEventListener("click", () => { closeOverlay(); ctx.act({ type: "choose" }); });
  wireModeMenu(ctx.modal, ctx);
  wireSfx(ctx.modal, sound.sfx, { setDragging: ctx.setDragging });
  $("#back", ctx.modal).onclick = () => { closeOverlay(); ctx.leave(); };
}

function renderResult(ctx, st) {
  const n = st.reto, k = st.history.length, best = k <= st.min;
  const me = ctx.seat === 0;
  renderSheet(ctx.modal, `result-${ctx.table.round}`, best ? "¡Perfecto! ⭐" : "¡Llegaron todos los barcos!", `
    <div class="vk-res">
      <p>Reto ${n} resuelto en <b>${plural(k, "movimiento", "movimientos")}</b>.</p>
      <p class="${best ? "star" : "hint"}">${best ? "Lo hiciste en el mínimo de movimientos." : `El mínimo es ${st.min}. ¿Lo intentas otra vez?`}</p>
    </div>
    ${me && n < CHALLENGES.length ? `<button class="primary big-cta" id="next">Siguiente reto (${n + 1})</button>` : ""}
    ${me && !best ? `<button id="retry">Otra vez el reto ${n}</button>` : ""}
    ${me ? `<button id="other">Escoger otro reto</button>` : ""}
    <button class="ghost" id="exit">Salir</button>`, { closable: false });
  const again = (next) => { if (next) ctx.prefs.set("siguiente", next); else ctx.prefs.remove("siguiente"); ctx.again(); };
  $("#next", ctx.modal)?.addEventListener("click", () => again(n + 1));
  $("#retry", ctx.modal)?.addEventListener("click", () => again(n));
  $("#other", ctx.modal)?.addEventListener("click", () => again(null));
  $("#exit", ctx.modal).onclick = () => ctx.leave();
}

// El selector: una pestaña por nivel y un dibujito de cada reto
function pickerHTML(ctx, ui) {
  const done = solvedMap(ctx);
  if (!ui.tab) {
    const first = CHALLENGES.find((c) => !done[c.n]);
    ui.tab = (levelOf(first ? first.n : 1) || LEVELS[0]).id;
  }
  const lv = LEVELS.find((l) => l.id === ui.tab) || LEVELS[0];
  const mine = ctx.seat === 0;
  const tabs = LEVELS.map((l) => {
    const count = CHALLENGES.filter((c) => c.n >= l.from && c.n <= l.to && done[c.n]).length;
    return `<button role="tab" class="lv-${l.id}" data-tab="${l.id}" aria-selected="${l.id === lv.id}">${esc(l.name)}<small>${count}/${l.to - l.from + 1}</small></button>`;
  }).join("");
  const cards = CHALLENGES.filter((c) => c.n >= lv.from && c.n <= lv.to).map((c) => {
    const best = done[c.n];
    const mark = best === undefined ? "" : best <= c.min ? `<span class="mark star" aria-label="resuelto en el mínimo">⭐</span>` : `<span class="mark ok" aria-label="resuelto">✓</span>`;
    return `<button class="card" data-pick="${c.n}" ${mine ? "" : "disabled"} aria-label="Reto ${c.n}, mínimo ${c.min} movimientos${best !== undefined ? ", resuelto" : ""}">
      <span class="num lv-${lv.id}">${c.n}</span>${mark}
      ${boardSVG(boardOf(c), { mini: true })}
      <small>mín. ${c.min}</small></button>`;
  }).join("");
  return `<section class="pick">
    ${bannerSVG(reduced())}
    <p class="lead">${mine ? "Escoge un reto" : "Escogiendo reto…"}</p>
    <div class="tabs" role="tablist">${tabs}</div>
    <div class="cards lv-${lv.id}">${cards}</div>
  </section>`;
}

// Lo que suena cuando llega una jugada nueva. Devuelve los barcos que acaban de llegar a su flecha.
function playNews(st, ui, sound, fresh) {
  const prev = ui.prev || {};
  const arrived = [];
  if (st.phase !== "pick" && st.reto !== prev.reto) { sound.start(); return arrived; }
  if (!fresh || st.phase === "pick") return arrived;
  const spin = spinSecs(fresh.turns || 1);
  if (fresh.type === "rotate") sound.rotate(fresh.turns, spin);
  else if (fresh.type === "undo") sound.undo(spin);
  else if (fresh.type === "reset") sound.reset();
  if (prev.boats && st.boats) {
    let k = 0;
    for (const col of Object.keys(st.boats)) {
      const now = st.boats[col] === st.arrows[col], before = prev.boats[col] === st.arrows[col];
      if (now && !before) { arrived.push(col); setTimeout(() => sound.arrive(0), spin * 1000 + k * 250); if (st.phase !== "over") sound.voice(ARRIVE_VOICE[col], spin * 1000 + 300 + k * 1800); k++; }
      else if (!now && before && fresh.type !== "reset") setTimeout(() => sound.leave(), spin * 1000);
    }
  }
  if (st.phase === "over") { const perfect = st.history.length <= st.min; setTimeout(() => sound.victory(perfect), spin * 1000 + 250); }
  return arrived;
}

export function renderTable(app, ctx, ui) {
  const sound = ui.sound;
  const st = ctx.view, seat = ctx.seat;
  const me = seat === 0;
  app.className = "game vikingos";

  // «Siguiente reto»: la partida nueva empieza en "pick"; se escoge sola una vez
  if (st.phase === "pick" && me && ui.autoRound !== ctx.table.round) {
    ui.autoRound = ctx.table.round;
    const next = Number(ctx.prefs.get("siguiente"));
    ctx.prefs.remove("siguiente");
    if (CHALLENGES.some((c) => c.n === next)) { ctx.act({ type: "pick", n: next }); }
  }
  // Recordar lo resuelto en este aparato
  if (st.phase === "over" && me && st.reto) {
    const done = solvedMap(ctx), k = st.history.length;
    if (done[st.reto] === undefined || k < done[st.reto]) { done[st.reto] = k; ctx.prefs.setJSON("resueltos", done); }
  }

  const isNew = st.seq !== ui.seenSeq;
  const fresh = isNew ? st.last : null;
  ui.seenSeq = st.seq;
  const arrived = isNew ? playNews(st, ui, sound, fresh) : [];
  if (isNew) ui.prev = { reto: st.reto, boats: st.boats ? { ...st.boats } : null };
  sound.sync();
  const shake = ui.shake ?? -1; ui.shake = -1;
  if (st.reto !== ui.reto) { ui.reto = st.reto; ui.sel = -1; ui.msg = ""; }
  const playing = st.phase === "play";
  const b = st.kinds ? boardOfState(st) : null;
  const can = b && playing && me ? [...Array(9).keys()].filter((i) => !whyNot(b, i)) : [];
  if (!can.includes(ui.sel)) ui.sel = -1;
  const adv = ctx.advice && ctx.advice.data;
  const advice = playing && me && adv && adv.action ? adv : null;
  if (advice && ui.advSeen !== adv) { ui.advSeen = adv; sound.advice(); sound.voice("consejo", 150); }
  const lv = st.reto ? levelOf(st.reto) : null;

  let body;
  if (st.phase === "pick") body = pickerHTML(ctx, ui);
  else {
    const k = st.history.length;
    const status = st.phase === "over" ? (k <= st.min ? "¡En el mínimo! ⭐" : "¡Llegaron todos!")
      : !me ? `${esc(st.names[0])} está resolviendo`
        : ui.sel >= 0 ? "Gírala con ↺ o ↻ (o tócala otra vez)"
          : "Toca una pieza con barco";
    const advBox = advice ? `<div class="advbox" role="status"><span>${esc(advice.why || "")}</span>
        <button id="advdo" class="primary">Hacerlo</button><button id="advclose" class="ghost" aria-label="Cerrar consejo">✕</button></div>`
      : playing && me && ctx.advice && !ctx.advice.data ? `<div class="advbox"><span>Pensando…</span></div>` : "";
    body = `<section class="seawrap">
      <div class="status"><span class="chip lv-${lv.id}">${esc(lv.name)}</span>
        <span>Movimientos <b>${k}</b> <small>· mínimo ${st.min}</small></span></div>
      <div class="boardwrap" id="board">${boardSVG(st, { sel: ui.sel, can, advice: advice ? advice.action.piece : -1, fresh, arrived, shake, celebrate: isNew && st.phase === "over", still: reduced() })}</div>
      <p class="say ${ui.msg ? "warn" : ""}" role="status">${esc(ui.msg || status)}</p>
      ${advBox}
    </section>
    ${me && playing ? `<section class="controls">
      <div class="turns">
        <button id="ccw" class="primary big" ${ui.sel >= 0 ? "" : "disabled"} aria-label="Girar a la izquierda">↺</button>
        <button id="cw" class="primary big" ${ui.sel >= 0 ? "" : "disabled"} aria-label="Girar a la derecha">↻</button>
      </div>
      <div class="tools">
        <button id="undo" ${k ? "" : "disabled"}>Deshacer</button>
        <button id="reset" ${k ? "" : "disabled"}>Reiniciar</button>
        <button id="advice" class="ghost">Consejo</button>
      </div>
    </section>` : ""}`;
  }

  app.innerHTML = `
    <header class="gbar">
      <button class="menubtn" id="menu" aria-label="Menú de la partida" aria-haspopup="dialog"><span></span><span></span><span></span></button>
      <div class="gtitle">Vikingos${st.reto ? ` <small>· Reto ${st.reto}</small>` : ""}</div>
      <span id="sfxslot">${sfxButton(sound.sfx)}</span>
      <button class="rulesbtn" id="rules" aria-haspopup="dialog">Reglas</button>
    </header>
    ${body}
    ${ctx.err ? `<p class="err" role="alert">${esc(ctx.err)}</p>` : ""}`;

  wireSfx($("#sfxslot", app), sound.sfx);
  const act = (a) => { ui.msg = ""; ctx.closeAdvice?.(); ctx.act(a); };
  const turn = (k) => { if (ui.sel >= 0) act({ type: "rotate", piece: ui.sel, turns: k }); };
  $("#menu", app).onclick = () => openOverlay("gameMenu");
  $("#rules", app).onclick = () => openOverlay("rules");
  app.querySelectorAll("[data-tab]").forEach((el) => el.onclick = () => { ui.tab = el.dataset.tab; renderTable(app, ctx, ui); });
  app.querySelectorAll("[data-pick]").forEach((el) => el.onclick = () => act({ type: "pick", n: Number(el.dataset.pick) }));
  $("#cw", app)?.addEventListener("click", () => turn(1));
  $("#ccw", app)?.addEventListener("click", () => turn(3));
  $("#undo", app)?.addEventListener("click", () => act({ type: "undo" }));
  $("#reset", app)?.addEventListener("click", () => act({ type: "reset" }));
  $("#advice", app)?.addEventListener("click", () => ctx.askAdvice());
  $("#advclose", app)?.addEventListener("click", () => ctx.closeAdvice());
  $("#advdo", app)?.addEventListener("click", () => { ui.sel = advice.action.piece; act(advice.action); });
  const board = $("#board", app);
  if (board && me && playing) board.onclick = (e) => {
    const hit = e.target.closest("[data-piece]");
    if (!hit) return;
    const i = Number(hit.dataset.piece);
    if (can.includes(i)) {
      if (ui.sel === i) { turn(1); return; }
      ui.sel = i; ui.msg = ""; sound.select();
    } else {
      ui.sel = -1; ui.msg = whyNot(b, i); ui.shake = i;
      if (/trabada/.test(ui.msg)) { sound.blocked(); sound.voice("trabada", 250); } else { sound.empty(); sound.voice("sin-barco", 250); }
    }
    renderTable(app, ctx, ui);
  };

  // El resultado sale cuando terminó de girar la última pieza
  if (st.phase === "over") {
    if (ui.overSeq !== st.seq) { ui.overSeq = st.seq; ui.overReady = false; setTimeout(() => { ui.overReady = true; ctx.refresh(); }, reduced() ? 0 : 2600); }
  }
  const ov = overlay();
  if (ov && ov.id === "gameMenu") renderMenu(ctx, st, sound);
  else if (ov && ov.id === "rules") renderRules(ctx);
  else if (st.phase === "over" && ui.overReady) renderResult(ctx, st);
  else ctx.modal.innerHTML = "";
}
