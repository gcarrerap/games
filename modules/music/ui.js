// La música que suena: un solo <audio> que va tocando la lista (index.js), con entrada y salida suaves, silencio y
// volumen que se recuerdan, y los controles para la mesa (botón 🔊/🔇 y deslizador).
//
// Los navegadores (sobre todo Safari en iPhone) no dejan sonar audio hasta que la persona toca algo: armOnGesture()
// espera el primer toque o tecla y entonces arranca. Si el navegador aún así la rechaza, no hay error: el botón queda en
// 🔇 y al tocarlo se intenta otra vez. En iPhone el volumen por código no siempre se respeta; el silencio sí, porque
// pausa el audio en vez de bajarlo a 0.
//
// Para probar sin navegador se pueden pasar Audio, doc y los temporizadores.
import { createPlaylist, readSettings, saveSettings, clampVolume, PREF_KEY } from "./index.js";

// La hoja de estilos de los controles (.musicbtn, .musicvol). El juego la agrega a su loadStyles.
export const MUSIC_STYLES = new URL("./ui/music.css", import.meta.url).href;

const STEP_MS = 50;

export function createMusic({
  songs, prefs = null, key = PREF_KEY, rnd = Math.random, fadeMs = 1000,
  Audio: AudioCtor = globalThis.Audio, doc = globalThis.document,
  setInterval: every = globalThis.setInterval, clearInterval: stopEvery = globalThis.clearInterval,
} = {}) {
  const playlist = createPlaylist(songs, rnd);
  const settings = readSettings(prefs, key);
  const listeners = new Set();
  let audio = null, current = null, playing = false, fading = null, fadingOut = false, resumeOnShow = false, dead = false;

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
    if (!playing || fadingOut || !audio || !(audio.duration > 0)) return;
    if (audio.duration - audio.currentTime <= fadeMs / 1000) { fadingOut = true; fadeTo(0, fadeMs); }
  }

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
    fadeTo(target(), fadeMs);
    emit();
    return true;
  }

  function pause() {
    stopFade();
    if (audio) audio.pause();
    playing = false;
  }

  function onVisibility() {
    if (!doc) return;
    if (doc.hidden) { resumeOnShow = playing; if (playing) pause(); emit(); }
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
    setMuted(on) {
      settings.muted = !!on; save();
      if (settings.muted) { pause(); emit(); return Promise.resolve(false); }
      return tryPlay();
    },
    // El botón: si suena, silencio; si no (en silencio o bloqueada por el navegador), a sonar
    toggle() { return api.audible ? api.setMuted(true) : api.setMuted(false); },
    setVolume(v) {
      settings.volume = clampVolume(v); save();
      if (playing && !fadingOut) { stopFade(); setVol(target()); }
      emit();
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    // Se acabó la mesa: calla y suelta el audio
    destroy() {
      dead = true; pause();
      if (doc && doc.removeEventListener) doc.removeEventListener("visibilitychange", onVisibility);
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
