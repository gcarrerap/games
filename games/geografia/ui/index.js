// La mesa de Geografía. Dibuja los cuatro tipos de pregunta (continentes, siluetas, pin en el mapa, banderas), el marcador,
// el reloj, el resultado de cada pregunta y el final. Las reglas viven en engine/; aquí solo se lee `ctx.view` y se
// manda `ctx.act({ type: "answer" | "next" })`.
//
// El lienzo del mapa (world.js) se crea una vez y se pasa de un lugar a otro de la página: así no pierde su vista ni
// su pin cuando la mesa se vuelve a dibujar. La mesa solo se redibuja entera cuando cambia algo que se ve (la pregunta,
// el turno, la pista…); lo demás (poner el pin, escribir, el reloj) toca solo su pedacito.
import { BY_CODE, CONTINENTS, CONTINENT_BY_ID, COUNTRIES, LEVEL_BY_ID, REGION_BY_ID, nameOf, search, exact, subregionName, sameFlag } from "../engine/catalog.js";
import { question, levelOf, LIMITS_MS, POINTS } from "../engine/index.js";
import { nearest, mainlandBox, countryAt } from "../engine/geo.js";
import { createWorld, countryMeta } from "./world.js";
import { flagUrl, shapeSVG } from "./art.js";
import { createSound } from "./sound.js";
import { esc } from "../../../platform/ui/dom.js";
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { wireSfx, SFX_STYLES } from "../../../modules/sfx/ui.js";
import { createConfetti } from "../../../modules/confetti/ui.js";

const url = (p) => new URL(p, import.meta.url).href;
const SEAT_COLORS = ["#e5484d", "#3b82f6", "#f59e0b", "#10b981"];
const KINDS = {
  cont: { icon: "🌎", title: "Continentes" },
  shape: { icon: "🗺️", title: "Siluetas" },
  pin: { icon: "📍", title: "Ubica en el mapa" },
  flag: { icon: "🚩", title: "Banderas" },
};
const PRAISE = ["¡Correcto!", "¡Muy bien!", "¡Eso es!", "¡Exacto!", "¡Qué buen ojo!", "¡Perfecto!"];
const reducedMotion = () => !!(globalThis.matchMedia && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches);
const fmt = (n) => Number(n).toLocaleString("es");

let ui = null;

// ───────── Montar y desmontar
export function mount(el, ctx) {
  loadStyles("geografia", [url("../styles/table.css"), SFX_STYLES]);
  const canvas = document.createElement("canvas");
  canvas.className = "geo-canvas"; canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  const conf = document.createElement("canvas");
  conf.className = "geo-confetti"; conf.setAttribute("aria-hidden", "true");
  ui = {
    el, ctx, sound: createSound(ctx.prefs), canvas, conf, confetti: null, world: null, seq: null, qi: -1, pin: null, typed: "", sel: 0, selTouched: false,
    hint: false, busy: false, t0: performance.now(), sig: "", shown: null, lastTick: -1, rounds: 0, reduced: reducedMotion(), regionBoxes: {}, timers: [],
  };
  ui.world = createWorld(canvas, { reduced: ui.reduced, onTap: (ll) => mapTap(ll) });
  ui.confetti = createConfetti(conf);
  canvas.addEventListener("keydown", mapKey);
  ui.onKey = (e) => ui && ui.keyHandler && ui.keyHandler(e);
  document.addEventListener("keydown", ui.onKey); // las teclas valen aunque el foco no esté dentro de la mesa
  render(ctx);
}
export function update(ctx) { if (ui) render(ctx); }
export function unmount() {
  if (ui) {
    ui.timers.forEach(clearTimeout);
    ui.world.destroy(); ui.confetti.destroy(); ui.sound.destroy();
    document.removeEventListener("keydown", ui.onKey); ui.el.innerHTML = "";
  }
  ui = null; unloadStyles("geografia");
}
export function tick(ctx, clock) {
  if (!ui) return;
  ui.ctx = ctx;
  const st = ctx.view;
  let c = clock;
  if (st.sim && st.phase === "play" && st.config.timer !== false) {
    // «A la vez» el reloj de la mesa se reinicia con cada respuesta: cada pantalla cuenta desde que vio la pregunta
    const q = qFor(ctx, st), limit = LIMITS_MS[q.t], left = limit - (performance.now() - ui.t0);
    c = { secs: Math.max(0, Math.ceil(left / 1000)), pct: Math.max(0, Math.min(100, (left / limit) * 100)) };
    if (left <= 0 && canAct() && !ui.busy) answer({ timeout: true });
  }
  paintClock(c);
  if (c && st.phase === "play" && canAct() && c.secs > 0 && c.secs <= 5 && ui.lastTick !== c.secs) {
    ui.lastTick = c.secs; ui.sound.play("tick", c.secs === 1);
  }
}
function paintClock(c) {
  if (!ui || !c) return;
  const t = ui.el.querySelector("#geo-clock"), b = ui.el.querySelector("#geo-clockbar");
  if (t) t.textContent = `${c.secs} s`;
  const reveal = ui.ctx.view.phase === "reveal";
  if (b) { b.style.width = `${c.pct}%`; b.classList.toggle("low", !reveal && c.secs <= 5); }
  ui.el.querySelector(".geo-timer")?.classList.toggle("low", !reveal && c.secs <= 5);
  const ns = ui.el.querySelector("#geo-next-secs");
  if (ns) ns.textContent = reveal && c.secs > 0 ? ` (${c.secs})` : "";
}

// ───────── Ayudas
const later = (f, ms) => { const id = setTimeout(() => { ui && (ui.timers = ui.timers.filter((x) => x !== id)); f(); }, ms); ui.timers.push(id); };
const mySeat = (ctx) => (ctx.seat >= 0 ? ctx.seat : 0);
/** La pregunta que ve esta pantalla: «a la vez», la de mi asiento; por turnos, la de quien le toca. */
const qFor = (ctx, st) => question(st, st.sim ? mySeat(ctx) : st.turn);
const canAct = () => {
  const { view: st, seat, display } = ui.ctx;
  if (st.phase !== "play" || display === "tv") return false;
  return st.sim ? seat >= 0 && seat < st.n && !st.pend[seat] : seat === st.turn;
};
/** Si esta pantalla puede pasar a la siguiente pregunta (por turnos, solo quien contestó; «a la vez», cualquiera sentado). */
const canNext = (ctx, st) => ctx.display !== "tv" && (st.sim ? ctx.seat >= 0 && ctx.seat < st.n : ctx.seat === st.turn);
const isRight = (q, pick) => { const c = BY_CODE[q.code]; return q.t === "cont" ? pick === c.cont || pick === c.alt : pick === q.code || (q.t === "flag" && sameFlag(pick, q.code)); };
const seatName = (st, i) => st.names[i] || `Jugador ${i + 1}`;

/** La caja [lon0, lat0, lon1, lat1] de una región (sin pasarse del 180°), o null para todo el mundo. */
function regionBox(id) {
  if (ui.regionBoxes[id] !== undefined) return ui.regionBoxes[id];
  const rg = REGION_BY_ID[id];
  let box = null;
  if (rg && rg.conts) {
    const ref = { africa: 20, america: -80, asia: 90, europa: 15, oceania: 160 }[id] ?? 0;
    for (const c of COUNTRIES.filter((x) => rg.conts.includes(x.cont))) {
      const mb = mainlandBox(c.code);
      if (!mb) continue;
      const shift = 360 * Math.round((ref - (mb.box[0] + mb.box[2]) / 2) / 360);
      const b = [mb.box[0] + shift, mb.box[1], mb.box[2] + shift, mb.box[3]];
      box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
    }
  }
  return (ui.regionBoxes[id] = box);
}

// ───────── Una pregunta nueva: el mapa se prepara aparte
function newQuestion(st) {
  const q = qFor(ui.ctx, st);
  ui.qi = st.i; ui.picked = null;
  ui.pin = null; ui.typed = ""; ui.sel = 0; ui.selTouched = false; ui.hint = false; ui.busy = false; ui.t0 = performance.now(); ui.lastTick = -1;
  const w = ui.world;
  w.setMarkers([]); w.setLines([]);
  if (!q) return;
  if (q.t === "pin") {
    w.setInteractive(true);
    w.setStyle({ paint: q.borders ? "con" : "sin", highlight: null, dim: false });
    w.flyTo(regionBox(st.config.region), { pad: 0.08, instant: true });
  } else if (q.t === "cont") {
    // Sin estrella ni brillo: marcar el país regalaría la respuesta. Se señala hasta que se ve el resultado.
    w.setInteractive(false);
    w.setStyle({ paint: "cont", highlight: null, dim: false });
    w.fit({ instant: true });
  }
}

// ───────── Respuestas
async function answer(payload) {
  if (!ui || ui.busy || !canAct()) return;
  const mine = ui;
  mine.picked = payload.pick ?? null;
  mine.busy = true; paintBusy();
  try {
    await mine.ctx.act({ type: "answer", ...payload, ...(mine.hint ? { hint: true } : {}), ms: Math.round(performance.now() - mine.t0) });
  } finally {
    if (ui === mine) { mine.busy = false; render(mine.ctx); }
  }
}
function paintBusy() { ui.el.querySelectorAll(".geo-answer button, .geo-actions button, .geo-answer input").forEach((b) => { b.disabled = true; }); }
function mapTap(ll) {
  if (!ui || !ll || !canAct()) return;
  const q = qFor(ui.ctx, ui.ctx.view);
  if (q.t === "pin") {
    ui.pin = ll;
    ui.world.setMarkers([{ kind: "pin", lon: ll[0], lat: ll[1], color: SEAT_COLORS[ui.ctx.seat % 4] }]);
    ui.sound.play("pin");
    const b = ui.el.querySelector("#geo-confirm"); if (b) { b.disabled = false; b.focus({ preventScroll: true }); }
    const s = ui.el.querySelector("#geo-pinhelp"); if (s) s.textContent = "¿Ahí está? Pulsa «Confirmar pin» o toca otro lugar para moverlo.";
  } else if (q.t === "cont") {
    const code = countryAt(ll[0], ll[1]), cont = code && countryMeta(code)?.cont;
    if (cont && CONTINENT_BY_ID[cont]) { ui.sound.play("tap"); answer({ pick: cont }); }
  }
}
function mapKey(e) {
  if (!ui || e.ctrlKey || e.metaKey || e.altKey) return;
  const step = 60, w = ui.world, q = qFor(ui.ctx, ui.ctx.view);
  const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (!q || q.t !== "pin") return;
  if (keys[e.key]) { e.preventDefault(); w.pan(...keys[e.key]); }
  else if (e.key === "+" || e.key === "=") { e.preventDefault(); w.zoomBy(1.5); }
  else if (e.key === "-") { e.preventDefault(); w.zoomBy(1 / 1.5); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (canAct()) mapTap(w.centerLonLat()); }
}

// ───────── Qué suena y qué se mueve cuando algo cambia
function onChange(st, first) {
  const me = mySeat(ui.ctx);
  if (st.phase === "over") {
    const top = Math.max(...st.scores);
    ui.sound.play(top > 0 ? "fanfare" : "soft");
    if (top > 0 && !ui.reduced) { ui.confetti.rain(150); later(() => ui && ui.confetti.burst(0.5, 0.35, 120), 350); }
    return;
  }
  if (st.phase === "play") {
    // «A la vez» cada respuesta de otro cambia el estado, pero la pregunta sigue siendo la misma
    if (ui.qi !== st.i) { newQuestion(st); ui.sound.play(first && st.i === 0 ? "start" : "whoosh"); }
    return;
  }
  const lasts = st.lasts && st.lasts.length ? st.lasts : st.last ? [st.last] : [];
  if (!lasts.length) return;
  const L = lasts.find((l) => l.seat === me) || lasts[0];
  const c = BY_CODE[L.code];
  ui.sound.play(L.timeout ? "timeout" : L.ok ? (L.t === "pin" && L.base < 100 ? "near" : "correct") : "wrong", L.streak);
  if (L.ok && !ui.reduced && (L.streak >= 3 || (L.t === "pin" && L.base >= 100))) later(() => ui && ui.confetti.burst(0.5, 0.4, 70 + Math.min(80, L.streak * 12)), 150);
  const w = ui.world;
  if (L.t === "cont") {
    w.setStyle({ paint: "cont", highlight: L.code, tint: "#fff6c2", dim: true });
    w.setMarkers([{ kind: "star", lon: c.ll[1], lat: c.ll[0], color: "#ffd45a", text: c.name }]);
  }
  if (L.t === "pin") {
    const mb = mainlandBox(L.code), pts = [[mb.box[0], mb.box[1]], [mb.box[2], mb.box[3]], [mb.box[0], mb.box[3]], [mb.box[2], mb.box[1]]];
    const markers = [{ kind: "star", lon: c.ll[1], lat: c.ll[0], color: "#ffd45a", text: c.name }], lines = [];
    // Los pines de todos los que contestaron este mismo país (con hándicap puede tocar otro país a cada quien)
    for (const l of lasts.filter((x) => x.code === L.code && x.lon != null)) {
      markers.push({ kind: "pin", lon: l.lon, lat: l.lat, color: SEAT_COLORS[l.seat % 4], t0: -1e9, ...(lasts.length > 1 ? { text: seatName(st, l.seat) } : {}) });
      pts.push([l.lon, l.lat]);
      const nr = nearest(l.code, l.lon, l.lat, c.ll);
      if (!l.inside && nr.point) { lines.push({ a: [l.lon, l.lat], b: nr.point, color: "#fff", text: `${fmt(l.dist)} km` }); pts.push(nr.point); }
    }
    w.setStyle({ highlight: L.code, tint: "#ffd45a" });
    w.setMarkers(markers); w.setLines(lines);
    w.flyToPoints(pts, { pad: 0.5, maxK: 18 });
  }
}

// ───────── Dibujar
function render(ctx) {
  if (!ui) return;
  ui.ctx = ctx;
  const st = ctx.view, first = ui.seq === null, changed = ui.seq !== st.seq;
  if (changed) { ui.seq = st.seq; onChange(st, first); }
  const ov = overlay();
  const sig = [st.seq, st.phase, canAct(), ctx.display, ctx.mode, ui.busy, ui.hint, ui.picked, ctx.advice ? (ctx.advice.data ? 2 : 1) : 0, ctx.err || "", ov ? ov.id : "", ctx.clock ? 1 : 0].join("|");
  if (sig === ui.sig && !changed) { paintClock(ctx.clock); return; }
  ui.sig = sig;
  // Las animaciones de entrada solo al llegar una pregunta nueva (no cada vez que otro contesta)
  const intro = first || (st.phase === "play" && ui.introQ !== st.i) || (st.phase !== "play" && ui.introPhase !== st.phase);
  ui.introQ = st.phase === "play" ? st.i : ui.introQ; ui.introPhase = st.phase;

  const q = qFor(ctx, st), over = st.phase === "over", reveal = st.phase === "reveal", mine = canAct();
  const lv = LEVEL_BY_ID[st.config.level], rg = REGION_BY_ID[st.config.region];
  const focused = ui.el.contains(document.activeElement) ? document.activeElement.id : "";
  const caret = document.activeElement?.id === "geo-input" ? document.activeElement.selectionStart : null;

  ui.el.className = `game geo-game ${over ? "geo-over" : ""}`;
  ui.el.innerHTML = `<div class="geo ${intro ? "geo-intro" : ""} geo-k-${over ? "end" : q.t}">
    <header class="geo-top">
      <button class="geo-ib" id="geo-back" aria-label="Salir al menú del juego">←</button>
      <div class="geo-brand"><span class="geo-globe" aria-hidden="true">🌍</span><div><b>GEOGRAFÍA</b><small>${esc(lv.name)} · ${esc(rg.name)}</small></div></div>
      <div class="geo-tools">${sfxButton()}<button class="geo-ib" id="geo-rules" aria-label="Cómo jugar">?</button><button class="geo-ib" id="menu" aria-label="Menú del juego">☰</button></div>
    </header>
    ${scoreboard(st)}
    ${over ? finalHTML(st, ctx) : questionHTML(st, ctx, q, { mine, reveal })}
  </div>`;
  ui.el.appendChild(ui.conf);
  const slot = ui.el.querySelector(".geo-map-slot");
  if (slot) { slot.prepend(ui.canvas); ui.world.resize(); ui.world.redraw(); }
  wire(ctx, st, q, { mine, reveal, over });
  paintClock(ctx.clock);
  animateScores(st);
  if (focused && focused !== "geo-input") ui.el.querySelector(`#${focused}`)?.focus({ preventScroll: true });
  if (focused === "geo-input" || (mine && q && !reveal && !over && LEVEL_BY_ID[levelOf(st, st.sim ? mySeat(ctx) : st.turn)].typed && q.t !== "pin" && q.t !== "cont" && intro)) {
    const inp = ui.el.querySelector("#geo-input");
    if (inp) { if (focused === "geo-input" || !matchMedia("(pointer: coarse)").matches) inp.focus({ preventScroll: true }); if (caret != null) inp.setSelectionRange(caret, caret); }
  }
  if (ov?.id === "geo-menu") menu(ctx); else if (ov?.id === "geo-rules") rules(ctx); else ctx.modal.innerHTML = "";
}

const sfxButton = () => `<button class="geo-ib" data-sfx="toggle" aria-label="${ui.sound.sfx.muted ? "Poner los efectos" : "Silenciar los efectos"}" aria-pressed="${ui.sound.sfx.muted}" title="Efectos">${ui.sound.sfx.muted ? "🔕" : "🔔"}</button>`;

function scoreboard(st) {
  const solo = st.n === 1, play = st.phase === "play";
  return `<section class="geo-board ${solo ? "solo" : ""}" aria-label="Marcador">${st.scores.map((s, i) => {
    const turn = !st.sim && st.phase !== "over" && st.turn === i, streak = st.streaks[i], done = st.sim && play && !!st.pend[i];
    const hc = st.config.handicap && st.phase !== "over" && st.lv[i] !== st.config.level;
    return `<div class="geo-chip ${turn ? "turn" : ""} ${done ? "done" : ""}" style="--c:${SEAT_COLORS[i % 4]}" ${turn ? 'aria-current="true"' : ""}>
      <span class="geo-dot" aria-hidden="true"></span><span class="geo-pname">${esc(seatName(st, i))}</span>
      ${st.sim && play ? (done ? '<span class="geo-ok" title="Ya contestó">✓</span>' : '<span class="geo-think" title="Está pensando">…</span>') : ""}${hc ? `<span class="geo-hc" title="Hándicap: preguntas de nivel ${esc(LEVEL_BY_ID[st.lv[i]].name)}">🎯</span>` : ""}
      <b class="geo-score" data-score="${i}">${fmt(ui.shown ? ui.shown[i] ?? s : s)}</b>${streak >= 2 ? `<span class="geo-streak" title="Racha de ${streak}">🔥${streak}</span>` : ""}</div>`;
  }).join("")}</section>`;
}
function animateScores(st) {
  const prev = ui.shown || st.scores.map(() => 0);
  if (!ui.shown) ui.shown = st.scores.slice();
  st.scores.forEach((target, i) => {
    const from = prev[i] ?? 0, node = ui.el.querySelector(`[data-score="${i}"]`);
    if (!node || from === target) { ui.shown[i] = target; return; }
    if (ui.reduced) { node.textContent = fmt(target); ui.shown[i] = target; return; }
    const t0 = performance.now(), run = (now) => {
      if (!ui || !node.isConnected) return;
      const p = Math.min(1, (now - t0) / 700), v = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      node.textContent = fmt(v); ui.shown[i] = v;
      if (p < 1) requestAnimationFrame(run); else ui.shown[i] = target;
    };
    node.classList.add("bump"); requestAnimationFrame(run);
  });
}

// ───────── La pregunta
function questionHTML(st, ctx, q, { mine, reveal }) {
  const k = KINDS[q.t], c = BY_CODE[q.code], me = mySeat(ctx);
  const lasts = st.lasts && st.lasts.length ? st.lasts : st.last ? [st.last] : [];
  const L = lasts.find((l) => l.seat === me) || lasts[0];
  const round = st.sim ? st.i + 1 : Math.floor(st.i / st.n) + 1, per = st.config.rounds;
  // Quién falta: por turnos, el que piensa; «a la vez», los que aún no contestan (si yo ya contesté)
  const waiting = st.sim ? st.pend[me] && !reveal : false;
  const missing = st.sim ? Array.from({ length: st.n }, (_, i) => i).filter((i) => !st.pend[i]).map((i) => seatName(st, i)) : [];
  const who = reveal ? "" : st.sim ? (waiting ? `<p class="geo-wait" role="status">✓ Contestaste. Esperando a ${esc(missing.join(" y "))}…</p>` : "")
    : !mine ? `<p class="geo-wait" role="status">Piensa ${esc(seatName(st, st.turn))}…</p>` : "";
  const asked = st.sim ? me : st.turn, lvl = levelOf(st, asked);
  const hcBadge = st.config.handicap && lvl !== st.config.level ? `<span class="geo-hcbadge" title="Vas ganando: tus preguntas suben de nivel mientras mantengas la ventaja">🎯 Hándicap: nivel ${esc(LEVEL_BY_ID[lvl].name)}</span>` : "";
  const showBar = reveal ? !!ctx.clock : !!ctx.clock || (st.sim && st.config.timer !== false);
  const header = `<div class="geo-progress"><span>Ronda <b>${round}</b> de ${per}${st.n > 1 && !st.sim ? ` · turno de <b style="color:${SEAT_COLORS[st.turn % 4]}">${esc(seatName(st, st.turn))}</b>` : ""}${st.sim ? " · todos a la vez" : ""}</span><span class="geo-kind">${k.icon} ${k.title}</span></div>
    ${showBar ? `<div class="geo-timer ${reveal ? "rv" : ""}" aria-hidden="true"><i id="geo-clockbar"></i><span id="geo-clock"></span></div>` : '<div class="geo-timer idle" aria-hidden="true"></div>'}`;
  let stage = "", answer = "";
  if (q.t === "cont") {
    stage = `<div class="geo-prompt"><small>¿En qué continente está…?</small><h1>${esc(c.name)}</h1>${hcBadge}</div>
      <div class="geo-map geo-map-cont"><div class="geo-map-slot"></div></div>`;
    answer = `<div class="geo-conts" role="group" aria-label="Continentes">${CONTINENTS.map((ct, i) => {
      const cls = reveal ? (isRight(q, ct.id) ? "good" : L.pick === ct.id ? "bad" : "faded") : ui.picked === ct.id ? "picked" : "";
      return `<button class="geo-cont ${cls}" data-pick="${ct.id}" style="--c:${ct.color}" ${mine && !reveal && !ui.busy ? "" : "disabled"}><kbd>${i + 1}</kbd><b>${esc(ct.short)}</b>${ct.hint ? `<small>${esc(ct.hint)}</small>` : ""}</button>`;
    }).join("")}</div>`;
  } else if (q.t === "pin") {
    stage = `<div class="geo-prompt"><small>${ui.world ? "Clava el pin donde está…" : ""}</small><h1>${esc(c.name)}</h1><span class="geo-borders">${q.borders ? "🧭 Con división política" : "🌊 Sin división política"}</span>${hcBadge}</div>
      <div class="geo-map"><div class="geo-map-slot"></div>
        <div class="geo-zoom" role="group" aria-label="Zoom del mapa"><button class="geo-ib" id="geo-zin" aria-label="Acercar">+</button><button class="geo-ib" id="geo-zout" aria-label="Alejar">−</button><button class="geo-ib" id="geo-fit" aria-label="Ver todo el mapa">⌂</button></div>
        <p class="geo-mapnote" aria-hidden="true">Arrastra · pellizca para acercar</p></div>`;
  } else if (q.t === "shape") {
    stage = `<div class="geo-prompt"><small>¿De qué país es esta forma?</small>${hcBadge}</div>
      <div class="geo-art">${shapeSVG(q.code, { solved: reveal })}</div>`;
  } else {
    stage = `<div class="geo-prompt"><small>¿De qué país es esta bandera?</small>${hcBadge}</div>
      <div class="geo-art"><div class="geo-flagwrap"><span class="geo-pole" aria-hidden="true"></span><div class="geo-flag"><img src="${flagUrl(q.code)}" alt="Una bandera" draggable="false"><i aria-hidden="true"></i></div></div></div>`;
  }
  if (q.t === "shape" || q.t === "flag") {
    if (q.opts) {
      answer = `<div class="geo-opts n${q.opts.length}" role="group" aria-label="Respuestas">${q.opts.map((code, i) => {
        const cls = reveal ? (isRight(q, code) ? "good" : L.pick === code ? "bad" : "faded") : ui.picked === code ? "picked" : "";
        return `<button class="geo-opt ${cls}" data-pick="${code}" ${mine && !reveal && !ui.busy ? "" : "disabled"}><kbd>${i + 1}</kbd><span>${esc(nameOf(code))}</span></button>`;
      }).join("")}</div>`;
    } else if (!reveal) {
      answer = `<div class="geo-type"><label for="geo-input" class="sr">Escribe el nombre del país</label>
        <input id="geo-input" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Escribe el país…" value="${esc(ui.typed)}" ${mine && !ui.busy ? "" : "disabled"} role="combobox" aria-expanded="false" aria-controls="geo-sugg">
        <ul id="geo-sugg" class="geo-sugg" role="listbox" hidden></ul><p class="geo-typehelp" id="geo-typehelp" role="status">Empieza a escribir y escoge de la lista (o pulsa Enter).</p></div>`;
    } else {
      const typed = L.pick && BY_CODE[L.pick] ? `<p class="geo-youtyped ${L.ok ? "ok" : "no"}">Escribiste: <b>${esc(nameOf(L.pick))}</b> ${L.ok ? "✓" : "✗"}</p>` : "";
      answer = typed;
    }
  }
  const actions = reveal ? "" : `<div class="geo-actions">
      ${mine && q.t !== "cont" ? `<button class="geo-ghost" id="geo-hint" ${ui.hint || ui.busy ? "disabled" : ""}>💡 Pista <small>(vale la mitad)</small></button>` : ""}
      ${mine ? `<button class="geo-ghost" id="geo-skip" ${ui.busy ? "disabled" : ""}>Saltar</button>` : ""}
      ${q.t === "pin" && mine ? `<button class="geo-go" id="geo-confirm" ${ui.pin && !ui.busy ? "" : "disabled"}>📍 Confirmar pin</button>` : ""}
    </div>
    ${q.t === "pin" && mine ? `<p class="geo-pinhelp" id="geo-pinhelp" role="status">${ui.pin ? "¿Ahí está? Pulsa «Confirmar pin» o toca otro lugar para moverlo." : "Toca el mapa para clavar el pin. Con el teclado: flechas para moverte y Enter para poner el pin en el centro."}</p>` : ""}
    ${hintHTML(ctx, mine)}`;
  return `${header}<main class="geo-stage">${stage}</main><section class="geo-answer" aria-label="Respuesta">${answer}${who}</section>${actions}${reveal ? resultHTML(st, ctx, q) : ""}`;
}
function hintHTML(ctx, mine) {
  if (!mine || !ctx.advice) return "";
  const d = ctx.advice.data;
  return `<div class="geo-hint" role="status">${d ? `<p>💡 ${esc(d.why)}</p><button class="geo-ghost" id="geo-hint-close">Cerrar</button>` : "<p>💡 Pensando…</p>"}</div>`;
}

// Lo que pasó con una respuesta: el texto corto, el detalle y las etiquetas de puntos
const statusOf = (l) => (l.skipped ? "Se la saltó" : l.timeout ? "Se acabó el tiempo" : l.ok ? "Acertó" : "Falló");
function detailOf(l) {
  if (l.t === "pin" && l.lon != null) return l.inside ? "📍 ¡Justo dentro del país!" : l.near ? `📍 Casi en la orilla (${fmt(l.dist)} km)` : `📍 A ${fmt(l.dist)} km del país`;
  if (l.pick && l.t !== "pin" && !l.ok) return `Eligió: ${l.t === "cont" ? CONTINENT_BY_ID[l.pick]?.name : nameOf(l.pick)}`;
  return "";
}
function chipsOf(l) {
  const chips = [];
  if (l.gain > 0 || l.ok) {
    chips.push(`<span>${l.t === "pin" ? "Cercanía" : "Acierto"} +${l.base}</span>`);
    if (l.streakBonus) chips.push(`<span class="hot">🔥 Racha ×${l.streak} +${l.streakBonus}</span>`);
    if (l.speedBonus) chips.push(`<span class="fast">⚡ Rapidez +${l.speedBonus}</span>`);
  }
  if (l.hint) chips.push(`<span class="dim">💡 Con pista: vale la mitad</span>`);
  return chips.length ? `<div class="geo-chips">${chips.join("")}</div>` : "";
}

function resultHTML(st, ctx, q) {
  const lasts = st.lasts && st.lasts.length ? st.lasts : [st.last], me = mySeat(ctx);
  const L = lasts.find((l) => l.seat === me) || lasts[0], multi = lasts.length > 1;
  const c = BY_CODE[L.code], ct = CONTINENT_BY_ID[c.cont], sub = subregionName(L.code);
  const last = st.i + 1 >= st.questions.length, next = canNext(ctx, st);
  const head = L.skipped ? "Te la saltaste" : L.timeout ? "⏰ ¡Se acabó el tiempo!" : L.ok ? PRAISE[(st.i + L.gain) % PRAISE.length] : "¡Casi!";
  const detail = detailOf(L).replace("Eligió:", "Elegiste:");
  const card = `<div class="geo-answer-card"><img src="${flagUrl(L.code)}" alt="" draggable="false"><div><b>${esc(c.name)}</b><span>${esc(ct.name)}${sub ? ` · ${esc(sub)}` : ""}</span>
      ${c.alt ? `<em>También cuenta ${esc(CONTINENT_BY_ID[c.alt].name)}: está en los dos.</em>` : ""}</div></div>`;
  const nextBtn = next ? `<button class="geo-go big" id="geo-next" autofocus>${last ? "Ver resultados" : "Siguiente"}<span id="geo-next-secs"></span> <span aria-hidden="true">→</span></button>`
    : `<p class="geo-wait">${ctx.display === "tv" || ctx.seat < 0 ? "Siguiente pregunta en un momento…" : "Siguiente pregunta en un momento…"}</p>`;
  if (!multi) {
    return `<section class="geo-result ${L.ok ? "ok" : "no"}" role="status" aria-live="polite">
    <div class="geo-result-head"><div><h2>${esc(head)}</h2>${st.n > 1 ? `<small>${esc(seatName(st, L.seat))}</small>` : ""}${detail ? `<p>${esc(detail)}</p>` : ""}</div>
      <div class="geo-gain ${L.gain > 0 ? "pos" : ""}">+${L.gain}</div></div>
    ${card}${chipsOf(L)}${nextBtn}
  </section>`;
  }
  // «A la vez»: lo de todos juntos, el más rápido primero entre los que acertaron
  const order = lasts.slice().sort((a, b) => b.gain - a.gain || a.seat - b.seat);
  return `<section class="geo-result ${L.ok ? "ok" : "no"}" role="status" aria-live="polite">
    <div class="geo-result-head"><div><h2>${esc(L.seat === me ? head : "Resultados")}</h2><p>Todos contestaron a la vez</p></div><div class="geo-gain ${L.gain > 0 ? "pos" : ""}">+${L.gain}</div></div>
    ${card}
    <ul class="geo-seats">${order.map((l) => {
    const other = l.code !== L.code ? ` · ${esc(BY_CODE[l.code].name)}` : "", d = detailOf(l);
    return `<li class="geo-seatres ${l.ok ? "ok" : "no"}" style="--c:${SEAT_COLORS[l.seat % 4]}"><span class="geo-dot" aria-hidden="true"></span>
      <div><b>${esc(seatName(st, l.seat))}${l.seat === me ? " (tú)" : ""}</b><small>${statusOf(l)}${other}${d ? ` · ${esc(d)}` : ""}${l.lvl !== st.config.level ? " · 🎯" : ""}</small>${chipsOf(l)}</div><strong>+${l.gain}</strong></li>`;
  }).join("")}</ul>
    ${nextBtn}
  </section>`;
}

// ───────── Final
function finalHTML(st, ctx) {
  const per = st.config.rounds, order = st.scores.map((s, i) => i).sort((a, b) => st.scores[b] - st.scores[a] || st.hits[b] - st.hits[a]);
  const top = st.scores[order[0]], champs = order.filter((i) => st.scores[i] === top);
  const solo = st.n === 1, acc = (i) => Math.round((st.hits[i] / Math.max(1, per)) * 100);
  const grade = (p) => (p >= 90 ? "🌟 ¡Eres un explorador de talla mundial!" : p >= 70 ? "🧭 ¡Gran navegante!" : p >= 40 ? "🗺️ Vas muy bien, sigue explorando." : "🌱 Cada partida te enseña países nuevos.");
  const medal = ["🥇", "🥈", "🥉", "·"];
  const title = solo ? "¡Fin del viaje!" : champs.length > 1 ? "¡Empate!" : `¡Gana ${esc(seatName(st, champs[0]))}!`;
  const wrong = st.log.filter((l) => !l.ok);
  return `<main class="geo-final">
    <div class="geo-trophy" aria-hidden="true">${solo ? "🌍" : "🏆"}</div><h1>${title}</h1>
    ${solo ? `<p class="geo-grade">${grade(acc(0))}</p>` : ""}
    <ol class="geo-rank">${order.map((i, pos) => `<li style="--c:${SEAT_COLORS[i % 4]}"><span class="geo-medal">${solo ? "" : medal[Math.min(3, st.scores[i] === top ? 0 : pos)]}</span>
      <div><b>${esc(seatName(st, i))}</b><small>${st.hits[i]} de ${per} aciertos (${acc(i)} %) · mejor racha ${st.best[i]}</small></div><strong>${fmt(st.scores[i])}</strong></li>`).join("")}</ol>
    ${wrong.length ? `<details class="geo-review"><summary>Para repasar (${wrong.length})</summary><ul>${wrong.map((l) => `<li><img src="${flagUrl(l.code)}" alt="" draggable="false"><span><b>${esc(nameOf(l.code))}</b> <small>${esc(CONTINENT_BY_ID[BY_CODE[l.code].cont].name)} · ${KINDS[l.t].icon}</small></span></li>`).join("")}</ul></details>` : `<p class="geo-grade">¡Sin un solo error para repasar!</p>`}
    <div class="geo-endbtns"><button class="geo-go big" id="geo-again">¡Otra partida! <span aria-hidden="true">→</span></button><button class="geo-ghost" id="geo-levels">Cambiar opciones</button></div>
  </main>`;
}

// ───────── Conectar lo que se dibujó
function wire(ctx, st, q, { mine, reveal, over }) {
  const el = ui.el;
  el.querySelector("#geo-back").onclick = () => ctx.leave();
  el.querySelector("#menu").onclick = () => openOverlay("geo-menu");
  el.querySelector("#geo-rules").onclick = () => openOverlay("geo-rules");
  wireSfx(el, ui.sound.sfx, { setDragging: ctx.setDragging });
  el.querySelector("#geo-again")?.addEventListener("click", () => ctx.again());
  el.querySelector("#geo-levels")?.addEventListener("click", () => ctx.leave());
  el.querySelector("#geo-next")?.addEventListener("click", () => { ui.sound.play("tap"); ctx.act({ type: "next" }); });
  el.querySelectorAll("[data-pick]").forEach((b) => { b.onclick = () => { ui.sound.play("tap"); answer({ pick: b.dataset.pick }); }; });
  el.querySelector("#geo-skip")?.addEventListener("click", () => answer({ skip: true }));
  el.querySelector("#geo-confirm")?.addEventListener("click", () => { if (ui.pin) answer({ lon: ui.pin[0], lat: ui.pin[1] }); });
  el.querySelector("#geo-hint")?.addEventListener("click", () => { ui.hint = true; ui.sound.play("hint"); ctx.askAdvice(); });
  el.querySelector("#geo-hint-close")?.addEventListener("click", () => ctx.closeAdvice());
  el.querySelector("#geo-zin")?.addEventListener("click", () => ui.world.zoomBy(1.7));
  el.querySelector("#geo-zout")?.addEventListener("click", () => ui.world.zoomBy(1 / 1.7));
  el.querySelector("#geo-fit")?.addEventListener("click", () => ui.world.fit());
  const inp = el.querySelector("#geo-input");
  if (inp) wireTyped(inp);
  ui.keyHandler = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || overlay() || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target === ui.canvas) return;
    if (reveal && canNext(ctx, st) && (e.key === "Enter" || e.key === " ") && !/BUTTON/.test(e.target.tagName)) { e.preventDefault(); ui.sound.play("tap"); ctx.act({ type: "next" }); return; }
    if (!mine || reveal || over || !/^[1-6]$/.test(e.key)) return;
    const n = Number(e.key) - 1;
    if (q.t === "cont" && CONTINENTS[n]) answer({ pick: CONTINENTS[n].id });
    else if (q.opts && q.opts[n]) answer({ pick: q.opts[n] });
  };
}

function wireTyped(inp) {
  const list = ui.el.querySelector("#geo-sugg"), help = ui.el.querySelector("#geo-typehelp");
  let sugg = [];
  const paint = () => {
    sugg = search(inp.value, 6);
    list.hidden = !sugg.length; inp.setAttribute("aria-expanded", String(!!sugg.length));
    list.innerHTML = sugg.map((c, i) => `<li role="option" aria-selected="${i === ui.sel}"><button type="button" data-sugg="${c}" tabindex="-1" class="${i === ui.sel ? "sel" : ""}">${esc(nameOf(c))}</button></li>`).join("");
    list.querySelectorAll("[data-sugg]").forEach((b) => { b.onpointerdown = (e) => e.preventDefault(); b.onclick = () => submit(b.dataset.sugg); });
  };
  const submit = (code) => { ui.sound.play("tap"); answer({ pick: code }); };
  inp.oninput = () => { ui.typed = inp.value; ui.sel = 0; ui.selTouched = false; ui.sound.play("key"); paint(); };
  inp.onkeydown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!sugg.length) return;
      ui.sel = (ui.sel + (e.key === "ArrowDown" ? 1 : sugg.length - 1)) % sugg.length; ui.selTouched = true; paint();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const code = ui.selTouched ? sugg[ui.sel] : exact(inp.value) || sugg[0];
      if (code) submit(code); else if (help) help.textContent = "No encuentro ese país: revisa cómo se escribe.";
    }
  };
  if (ui.typed) paint();
}

// ───────── Ventanas
function rules(ctx) {
  renderSheet(ctx.modal, "geo-rules", "Cómo se juega", `<div class="geo-help">
    <p>Un viaje por el mundo con cuatro tipos de pregunta (marca en el lobby los que quieras; si marcas varios, salen mezclados):</p>
    <ul><li><b>🌎 Continentes:</b> ¿en qué continente está el país? Toca un botón o el propio mapa (el país no se marca hasta ver la respuesta).</li>
      <li><b>🗺️ Siluetas:</b> adivina el país por su forma.</li>
      <li><b>📍 Ubica en el mapa:</b> clava un pin donde crees que está. Mientras más cerca, más puntos. A veces el mapa trae fronteras y a veces no.</li>
      <li><b>🚩 Banderas:</b> ¿de quién es esta bandera?</li></ul>
    <p><b>Puntos:</b> hasta ${POINTS.base} por pregunta. Cada acierto seguido suma <b>racha</b> (+${POINTS.streakStep} cada vez, hasta +${POINTS.streakMax}) y contestar rápido da hasta +${POINTS.speedMax}. Si usas la <b>pista</b>, ese acierto vale la mitad.</p>
    <p>En el mapa, acercar y mover ayuda: arrastra, pellizca o usa la rueda. Con el teclado, flechas para moverte, + y − para acercar, Enter para poner el pin al centro. Con 1–6 escoges una respuesta.</p>
    <p>Con varias personas se juega por turnos en el mismo aparato. Casillas del lobby: <b>Todos contestan a la vez</b> (las mismas preguntas al mismo tiempo, cada quien en su aparato; las respuestas se ven cuando contesta el último), <b>Hándicap automático</b> (quien va ganando por mucho recibe preguntas más difíciles, 🎯) y <b>Avanzar solo</b> (la siguiente pregunta llega sola; «Siguiente» sirve para no esperar).</p>
    <p class="hint">Los niveles cambian los países y las opciones; en Experto escribes el nombre.</p>
  </div><button class="primary big-cta" id="geo-rules-close">¡A explorar!</button>`);
  ctx.modal.querySelector("#geo-rules-close").onclick = closeOverlay;
}
function menu(ctx) {
  const s = ui.sound.sfx;
  renderSheet(ctx.modal, "geo-menu", "Geografía", `<p>Efectos</p>
    <div class="sfxvol" data-sfx="panel" role="group" aria-label="Efectos de sonido"><button class="sfxbtn" data-sfx="toggle" aria-label="${s.muted ? "Poner los efectos" : "Silenciar los efectos"}" aria-pressed="${s.muted}">${s.muted ? "🔕" : "🔔"}</button>
      <input type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" data-sfx="volume" aria-label="Volumen de los efectos"></div>
    ${modeMenu(ctx)}<button id="geo-menu-rules">Cómo jugar</button><button id="geo-leave">Salir al menú del juego</button>`);
  wireModeMenu(ctx.modal, ctx); wireSfx(ctx.modal, s, { setDragging: ctx.setDragging });
  ctx.modal.querySelector("#geo-menu-rules").onclick = () => openOverlay("geo-rules");
  ctx.modal.querySelector("#geo-leave").onclick = () => { closeOverlay(); ctx.leave(); };
}
