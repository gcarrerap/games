// El reproductor de efectos: Web Audio (varios a la vez, sin el retraso de un <audio> nuevo cada vez), silencio y
// volumen que se recuerdan, y los controles (botón 🔔/🔕 y deslizador).
//
// Los navegadores no dejan sonar hasta que la persona toca algo: armOnGesture() reanuda el AudioContext con el
// primer toque o tecla y entonces precarga. En iPhone el volumen por código no siempre se respeta; el silencio sí,
// porque no arranca sonidos y corta los que estén sonando, en vez de bajar la ganancia a 0.
//
// Si falta un archivo, o el navegador rechaza el audio, no hay error: ese efecto no suena.
// Para probar sin navegador se pueden pasar AudioContext, fetch, doc y el reloj.
import { clipOf, createGate, readSettings, saveSettings, clampVolume, PREF_KEY, DEFAULT_GAP_MS } from "./index.js";

export const SFX_STYLES = new URL("./ui/sfx.css", import.meta.url).href;

export function createSfx({
  clips = {}, prefs = null, key = PREF_KEY, gapFor = () => DEFAULT_GAP_MS,
  AudioContext: AC = globalThis.AudioContext || globalThis.webkitAudioContext,
  fetch: doFetch = globalThis.fetch, doc = globalThis.document,
  now = () => (globalThis.performance ? globalThis.performance.now() : 0),
  setTimeout: later = globalThis.setTimeout, clearTimeout: cancel = globalThis.clearTimeout,
} = {}) {
  const settings = readSettings(prefs, key);
  const gate = createGate(gapFor);
  const listeners = new Set();
  const cache = new Map();
  const live = new Set();
  const queued = [];
  let ctx = null, master = null, dead = false, unlocked = false;

  const emit = () => { for (const f of listeners) f(api); paintAll(doc, api); };
  const save = () => saveSettings(prefs, settings, key);
  const names = () => Object.keys(clips || {}).filter((k) => clipOf(clips, k));

  function ensure() {
    if (ctx || !AC) return ctx;
    try { ctx = new AC(); } catch { return null; }
    try {
      master = ctx.createGain();
      master.gain.value = settings.muted ? 0 : settings.volume;
      master.connect(ctx.destination);
    } catch { /* sin salida */ }
    return ctx;
  }

  function stopSources() {
    for (const id of queued) cancel(id);
    queued.length = 0;
    for (const s of live) { try { s.stop(); } catch { /* ya terminó */ } }
    live.clear();
  }

  // Reanuda el contexto (hay que llamarlo desde un gesto). Devuelve si quedó listo para sonar.
  function unlock() {
    const c = ensure();
    if (!c || dead) return Promise.resolve(false);
    let pending = Promise.resolve();
    if (c.state === "suspended" && typeof c.resume === "function") {
      try { pending = Promise.resolve(c.resume()); } catch (e) { pending = Promise.reject(e); }
    }
    return pending.then(() => {
      unlocked = !dead && (!c.state || c.state === "running");
      if (unlocked) preload();
      emit();
      return unlocked;
    }, () => false);
  }

  function preload() {
    for (const k of names()) load(k);
  }

  function load(k) {
    if (cache.has(k)) return Promise.resolve(cache.get(k)).then((v) => (v && typeof v.then === "function" ? v : v));
    const url = clipOf(clips, k);
    const c = ensure();
    if (!url || !c || typeof c.decodeAudioData !== "function" || typeof doFetch !== "function") {
      cache.set(k, null);
      return Promise.resolve(null);
    }
    const p = Promise.resolve()
      .then(() => doFetch(url))
      .then((res) => {
        if (!res || !res.ok || typeof res.arrayBuffer !== "function") return null;
        return res.arrayBuffer();
      })
      .then((raw) => {
        if (!raw) return null;
        const copy = raw.slice ? raw.slice(0) : raw;
        return c.decodeAudioData(copy);
      })
      .then((buf) => buf || null)
      .catch(() => null);
    cache.set(k, p);
    p.then((buf) => { if (cache.get(k) === p) cache.set(k, buf); });
    return p;
  }

  function startBuffer(buf) {
    const c = ensure();
    if (!c || !buf || dead || settings.muted || !(settings.volume > 0)) return false;
    if (typeof c.createBufferSource !== "function") return false;
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = typeof c.createGain === "function" ? c.createGain() : null;
      if (g) { g.gain.value = settings.volume; src.connect(g); if (master) g.connect(master); else g.connect(c.destination); }
      else if (master) src.connect(master);
      else src.connect(c.destination);
      src.onended = () => live.delete(src);
      src.start(0);
      live.add(src);
      return true;
    } catch { return false; }
  }

  function fire(k) {
    if (dead || settings.muted || !(settings.volume > 0)) return;
    const go = () => load(k).then((buf) => { if (!dead && !settings.muted) startBuffer(buf); });
    if (unlocked) { go(); return; }
    unlock().then((ok) => { if (ok) go(); });
  }

  // Programa la llave. at es el retraso en ms. false si está en silencio, si no existe, o si sonó hace muy poco.
  function play(k, at = 0) {
    if (dead || settings.muted || !(settings.volume > 0)) return false;
    if (!clipOf(clips, k)) return false;
    const wait = Number.isFinite(at) ? Math.max(0, at) : 0;
    if (!gate.allow(k, now() + wait)) return false;
    if (wait <= 0) { fire(k); return true; }
    const id = later(() => {
      const i = queued.indexOf(id);
      if (i >= 0) queued.splice(i, 1);
      fire(k);
    }, wait);
    queued.push(id);
    return true;
  }

  const api = {
    get muted() { return settings.muted; },
    get volume() { return settings.volume; },
    get unlocked() { return unlocked; },
    // Encendido según la preferencia (no hace falta que esté sonando algo ahora)
    get audible() { return !settings.muted && settings.volume > 0; },
    hasClips: names().length > 0,
    unlock,
    play,
    playAll(cues) {
      let n = 0;
      for (const c of cues || []) if (c && play(c.key, c.at || 0)) n++;
      return n;
    },
    // Corta lo que esté sonando y lo que esté programado (silencio de verdad, y al cambiar de jugada)
    cancel() { stopSources(); },
    setMuted(on) {
      settings.muted = !!on;
      save();
      if (settings.muted) {
        stopSources();
        if (master) { try { master.gain.value = 0; } catch { /* ganancia de solo lectura */ } }
      } else if (master) {
        try { master.gain.value = settings.volume; } catch { /* iPhone */ }
      }
      emit();
      return settings.muted ? Promise.resolve(false) : unlock();
    },
    toggle() { return api.setMuted(!settings.muted); },
    setVolume(v) {
      settings.volume = clampVolume(v);
      save();
      if (master && !settings.muted) { try { master.gain.value = settings.volume; } catch { /* iPhone */ } }
      if (!(settings.volume > 0)) stopSources();
      emit();
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    destroy() {
      dead = true;
      stopSources();
      if (ctx && typeof ctx.close === "function") { try { ctx.close(); } catch { /* ya cerrado */ } }
      ctx = null; master = null; listeners.clear(); cache.clear(); gate.reset();
    },
  };
  return api;
}

// Espera el primer toque o tecla en `target` para desbloquear (los navegadores no dejan sonar antes). Los toques en
// los controles de efectos no cuentan: ellos mismos deciden. Devuelve cómo dejar de esperar.
export function armOnGesture(target, sfx) {
  if (!target || !target.addEventListener || !sfx) return () => {};
  const events = ["pointerdown", "keydown", "touchend"];
  const off = () => events.forEach((e) => target.removeEventListener(e, go, true));
  async function go(e) {
    if (e && e.target && e.target.closest && e.target.closest("[data-sfx]")) return;
    if (sfx.muted) { off(); return; }
    if (await sfx.unlock()) off();
  }
  events.forEach((e) => target.addEventListener(e, go, true));
  return off;
}

const icon = (s) => (s.muted ? "🔕" : "🔔");
const label = (s) => (s.muted ? "Poner los efectos" : "Silenciar los efectos");

export function sfxButton(s) {
  if (!s || !s.hasClips) return "";
  return `<button class="sfxbtn" data-sfx="toggle" aria-label="${label(s)}" aria-pressed="${s.muted}" title="Efectos">${icon(s)}</button>`;
}

export function sfxControls(s) {
  if (!s || !s.hasClips) return "";
  return `<div class="sfxvol" data-sfx="panel" role="group" aria-label="Efectos de sonido">
    ${sfxButton(s)}
    <input type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" data-sfx="volume" aria-label="Volumen de los efectos">
  </div>`;
}

// Conecta los controles dentro de `root` (se llama cada vez que se dibujan). setDragging evita que la mesa se
// redibuje mientras el dedo mueve el deslizador.
export function wireSfx(root, s, { setDragging = null } = {}) {
  if (!root || !s) return;
  root.querySelectorAll('[data-sfx="toggle"]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); s.toggle(); }; });
  root.querySelectorAll('[data-sfx="volume"]').forEach((r) => {
    if (setDragging) {
      r.onpointerdown = () => setDragging(true);
      r.onpointerup = r.onpointercancel = r.onchange = r.onblur = () => setDragging(false);
    }
    r.oninput = () => {
      s.setVolume(Number(r.value) / 100);
      if (Number(r.value) > 0 && s.muted) s.setMuted(false);
    };
  });
}

function paintAll(doc, s) {
  if (!doc || !doc.querySelectorAll) return;
  doc.querySelectorAll('[data-sfx="toggle"]').forEach((b) => {
    b.textContent = icon(s);
    b.setAttribute("aria-label", label(s));
    b.setAttribute("aria-pressed", String(s.muted));
  });
  doc.querySelectorAll('[data-sfx="volume"]').forEach((r) => {
    const v = String(Math.round(s.volume * 100));
    if (r.value !== v && doc.activeElement !== r) r.value = v;
  });
}
