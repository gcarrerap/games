// La música que suena: un solo <audio> que va tocando la lista (index.js), con entrada y salida suaves, silencio y
// volumen que se recuerdan, y los controles para la mesa (botón 🔊/🔇 y deslizador).
//
// Un clip corto (playCue) sale por el mismo silencio y el mismo volumen. Mientras suena, la música de fondo baja
// (ducking) y al terminar vuelve. Si la música está en silencio, el clip no suena.
//
// Los navegadores (sobre todo Safari en iPhone) no dejan sonar audio hasta que la persona toca algo: armOnGesture()
// espera el primer toque o tecla y entonces arranca. Si el navegador aún así la rechaza, no hay error: el botón queda en
// 🔇 y al tocarlo se intenta otra vez. En iPhone el volumen por código no siempre se respeta; el silencio sí, porque
// pausa el audio en vez de bajarlo a 0. El segundo elemento del clip se desbloquea en ese primer arranque, para que
// un festejo más tarde no dependa de otro toque.
//
// Para probar sin navegador se pueden pasar Audio, doc y los temporizadores.
import { createPlaylist, readSettings, saveSettings, clampVolume, PREF_KEY } from "./index.js";

// La hoja de estilos de los controles (.musicbtn, .musicvol). El juego la agrega a su loadStyles.
export const MUSIC_STYLES = new URL("./ui/music.css", import.meta.url).href;

const STEP_MS = 50;
// Un wav mudo y mínimo, solo para que el navegador suelte el elemento del clip en el primer arranque.
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

export function createMusic({
  songs, prefs = null, key = PREF_KEY, rnd = Math.random, fadeMs = 1000,
  Audio: AudioCtor = globalThis.Audio, doc = globalThis.document,
  setInterval: every = globalThis.setInterval, clearInterval: stopEvery = globalThis.clearInterval,
  setTimeout: later = globalThis.setTimeout, clearTimeout: cancelLater = globalThis.clearTimeout,
} = {}) {
  const playlist = createPlaylist(songs, rnd);
  const settings = readSettings(prefs, key);
  const listeners = new Set();
  let audio = null, current = null, playing = false, fading = null, fadingOut = false, resumeOnShow = false, dead = false;
  let cueEl = null, cueTimer = null, cueGen = 0, ducked = false, duckRatio = 0.22, cueUnlocking = false;

  const target = () => (settings.muted ? 0 : settings.volume);
  const emit = () => { for (const f of listeners) f(api); paintAll(doc, api); };
  const save = () => saveSettings(prefs, settings, key);

  function stopFade() { if (fading) { stopEvery(fading); fading = null; } }
  // Lleva el volumen del audio a `to` en `ms`; al llegar llama `done`
  function fadeTo(to, ms, done) {
    stopFade();
    if (!audio) return;
    const from = audio.volume, steps = Math.max(1, Math.round(ms / STEP_MS));
    let i = 0;
    if (ms <= 0) { setVol(to); if (done) done(); return; }
    fading = every(() => {
      i++;
      setVol(from + (to - from) * Math.min(1, i / steps));
      if (i >= steps) { stopFade(); if (done) done(); }
    }, STEP_MS);
  }
  function setVol(v) { try { audio.volume = clampVolume(v); } catch { /* iPhone: el volumen es de solo lectura */ } }

  function ensureAudio() {
    if (audio || !AudioCtor) return audio;
    audio = new AudioCtor();
    audio.preload = "none"; // no se baja nada hasta que de verdad va a sonar
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    return audio;
  }
  function load(src) { current = src; fadingOut = false; audio.src = src; }

  // Al acabar una canción sigue la próxima de la lista
  function onEnded() {
    if (dead || !playing) return;
    const next = playlist.next();
    if (!next) return;
    load(next);
    setVol(0);
    tryPlay();
  }
  // Ya casi acaba: se va apagando para que no corte de golpe
  function onTime() {
    if (!playing || fadingOut || ducked || !audio || !(audio.duration > 0)) return;
    if (audio.duration - audio.currentTime <= fadeMs / 1000) { fadingOut = true; fadeTo(0, fadeMs); }
  }

  const landed = () => (ducked ? settings.volume * duckRatio : target());

  async function tryPlay() {
    if (dead || settings.muted || !ensureAudio()) return false;
    if (!current) { const s = playlist.next(); if (!s) return false; load(s); setVol(0); }
    try {
      await audio.play();
    } catch {
      playing = false; emit(); // el navegador no deja: se queda callada hasta el siguiente toque
      return false;
    }
    if (dead || settings.muted) { audio.pause(); return false; }
    playing = true;
    fadeTo(landed(), fadeMs);
    unlockCue();
    emit();
    return true;
  }

  function ensureCueEl() {
    if (cueEl || !AudioCtor) return cueEl;
    try { cueEl = new AudioCtor(); } catch { return null; }
    cueEl.preload = "auto";
    return cueEl;
  }

  // El primer arranque (ya hubo un toque) suelta también el elemento del clip.
  function unlockCue() {
    if (cueUnlocking || !AudioCtor) return;
    const c = ensureCueEl();
    if (!c) return;
    cueUnlocking = true;
    const gen = cueGen;
    try { c.src = SILENT_WAV; } catch { return; }
    let p;
    try { p = c.play(); } catch { return; }
    Promise.resolve(p).then(() => {
      if (cueGen === gen && !ducked) { try { c.pause(); } catch { /* ya pausado */ } }
    }, () => {});
  }

  function endCue(restore) {
    cueGen++;
    stopFade();
    if (cueTimer) { cancelLater(cueTimer); cueTimer = null; }
    if (cueEl && cueEl._cueFinish) {
      try { cueEl.removeEventListener("ended", cueEl._cueFinish); } catch { /* sin evento */ }
      cueEl._cueFinish = null;
    }
    if (cueEl) { try { cueEl.pause(); } catch { /* ya pausado */ } }
    const was = ducked;
    ducked = false;
    if (restore && was && playing && audio && !dead && !settings.muted && !fadingOut) {
      fadeTo(target(), Math.min(480, fadeMs));
    }
  }

  function pause() {
    stopFade();
    if (audio) audio.pause();
    playing = false;
  }

  function onVisibility() {
    if (!doc) return;
    if (doc.hidden) { resumeOnShow = playing; if (ducked) endCue(false); if (playing) pause(); emit(); }
    else if (resumeOnShow) { resumeOnShow = false; tryPlay(); }
  }
  if (doc && doc.addEventListener) doc.addEventListener("visibilitychange", onVisibility);

  const api = {
    get muted() { return settings.muted; },
    get volume() { return settings.volume; },
    get playing() { return playing; },
    get audible() { return playing && !settings.muted; },
    get song() { return current; },
    hasSongs: playlist.size > 0,
    // Empieza (o sigue) si no está en silencio. Devuelve si quedó sonando.
    start() { return playing ? Promise.resolve(true) : tryPlay(); },
    // Clip corto por este mismo canal. `duck` (0–1) es a qué fracción baja la música de fondo.
    // `ms` es un tope por si el archivo no avisa que terminó. false si está en silencio, el volumen es 0 o no hay src.
    playCue(src, { ms = 8000, duck = 0.22 } = {}) {
      const wait = Number.isFinite(ms) ? Math.max(0, ms) : 8000;
      const ratio = Number.isFinite(duck) ? Math.min(1, Math.max(0, duck)) : 0.22;
      if (dead || settings.muted || !(settings.volume > 0) || typeof src !== "string" || !src) return Promise.resolve(false);
      const el = ensureCueEl();
      if (!el) return Promise.resolve(false);
      endCue(false);
      duckRatio = ratio;
      ducked = true;
      const gen = ++cueGen;
      try { el.volume = settings.volume; } catch { /* iPhone */ }
      try { el.src = src; } catch { endCue(false); return Promise.resolve(false); }
      const finish = () => { if (gen === cueGen) endCue(true); };
      el._cueFinish = finish;
      try { el.addEventListener("ended", finish); } catch { /* sin eventos */ }
      if (playing && audio) fadeTo(settings.volume * duckRatio, Math.min(420, fadeMs));
      if (wait > 0) cueTimer = later(() => finish(), wait);
      let started;
      try { started = el.play(); } catch (e) { started = Promise.reject(e); }
      return Promise.resolve(started).then(() => {
        if (dead || settings.muted || gen !== cueGen) { if (gen === cueGen) endCue(false); return false; }
        return true;
      }, () => { if (gen === cueGen) endCue(false); return false; });
    },
    stopCue() { endCue(true); },
    setMuted(on) {
      settings.muted = !!on; save();
      if (settings.muted) { endCue(false); pause(); emit(); return Promise.resolve(false); }
      return tryPlay();
    },
    // El botón: si suena, silencio; si no (en silencio o bloqueada por el navegador), a sonar
    toggle() { return api.audible ? api.setMuted(true) : api.setMuted(false); },
    setVolume(v) {
      settings.volume = clampVolume(v); save();
      if (!(settings.volume > 0)) endCue(false);
      else if (cueEl && ducked) { try { cueEl.volume = settings.volume; } catch { /* iPhone */ } }
      if (playing && !fadingOut) { stopFade(); setVol(landed()); }
      emit();
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    // Se acabó la mesa: calla y suelta el audio
    destroy() {
      dead = true; endCue(false); pause();
      if (doc && doc.removeEventListener) doc.removeEventListener("visibilitychange", onVisibility);
      if (cueEl) {
        try { cueEl.removeAttribute("src"); cueEl.load(); } catch { /* sin navegador */ }
      }
      cueEl = null;
      if (audio) {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("timeupdate", onTime);
        try { audio.removeAttribute("src"); audio.load(); } catch { /* sin navegador */ }
      }
      audio = null; listeners.clear();
    },
  };
  return api;
}

// Espera el primer toque o tecla en `target` para arrancar (los navegadores no dejan sonar antes). Los toques en los
// controles de música no cuentan: ellos mismos deciden. Devuelve cómo dejar de esperar.
export function armOnGesture(target, music) {
  if (!target || !target.addEventListener) return () => {};
  const events = ["pointerdown", "keydown", "touchend"];
  const off = () => events.forEach((e) => target.removeEventListener(e, go, true));
  async function go(e) {
    if (e && e.target && e.target.closest && e.target.closest("[data-music]")) return;
    if (music.muted) { off(); return; } // en silencio no hay nada que arrancar; el botón lo hará
    if (await music.start()) off();
  }
  events.forEach((e) => target.addEventListener(e, go, true));
  return off;
}

const icon = (m) => (m.audible ? "🔊" : "🔇");
const label = (m) => (m.audible ? "Silenciar la música" : "Poner la música");

// El botón de silencio para la barra de la mesa
export function musicButton(m) {
  if (!m || !m.hasSongs) return "";
  return `<button class="musicbtn" data-music="toggle" aria-label="${label(m)}" aria-pressed="${!m.audible}" title="Música">${icon(m)}</button>`;
}

// El deslizador de volumen (0–100), con su botón de silencio al lado
export function musicControls(m) {
  if (!m || !m.hasSongs) return "";
  return `<div class="musicvol" data-music="panel" role="group" aria-label="Música">
    ${musicButton(m)}
    <input type="range" min="0" max="100" step="5" value="${Math.round(m.volume * 100)}" data-music="volume" aria-label="Volumen de la música">
  </div>`;
}

// Conecta los controles que haya dentro de `root` (se llama cada vez que se dibujan). `setDragging(on)` (como
// ctx.setDragging) evita que la mesa se redibuje mientras el dedo mueve el deslizador.
export function wireMusic(root, m, { setDragging = null } = {}) {
  if (!root || !m) return;
  root.querySelectorAll('[data-music="toggle"]').forEach((b) => { b.onclick = () => m.toggle(); });
  root.querySelectorAll('[data-music="volume"]').forEach((r) => {
    if (setDragging) {
      r.onpointerdown = () => setDragging(true);
      r.onpointerup = r.onpointercancel = r.onchange = r.onblur = () => setDragging(false);
    }
    r.oninput = () => {
      m.setVolume(Number(r.value) / 100);
      if (Number(r.value) > 0 && !m.audible) m.setMuted(false); // subir el volumen también quita el silencio
    };
  });
}

// Pone al día los controles sin redibujar la mesa
function paintAll(doc, m) {
  if (!doc || !doc.querySelectorAll) return;
  doc.querySelectorAll('[data-music="toggle"]').forEach((b) => {
    b.textContent = icon(m);
    b.setAttribute("aria-label", label(m));
    b.setAttribute("aria-pressed", String(!m.audible));
  });
  doc.querySelectorAll('[data-music="volume"]').forEach((r) => {
    const v = String(Math.round(m.volume * 100));
    if (r.value !== v && doc.activeElement !== r) r.value = v;
  });
}
