// modules/music: la lista barajada, las preferencias y el reproductor con un <audio> de mentira (sin navegador).
// Las canciones son de prueba, no de ningún juego.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, clampVolume, readSettings, saveSettings, shuffleOrder, createPlaylist } from "../../../modules/music/index.js";
import { createMusic, armOnGesture, musicButton, musicControls } from "../../../modules/music/ui.js";
import { seededRandom as mulberry32 } from "../../../modules/random/index.js";

const SONGS = ["a.mp3", "b.mp3", "c.mp3", "d.mp3"];
const fakePrefs = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getJSON: (k, f) => (m.has(k) ? m.get(k) : f), setJSON: (k, v) => m.set(k, v) }; };

// ---------- index.js (puro) ----------

test("volumen entre 0 y 1; lo raro vuelve al de por omisión", () => {
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(0.3), 0.3);
  assert.equal(clampVolume("x"), DEFAULTS.volume);
});

test("preferencias: por omisión sin nada guardado; se guardan y se leen", () => {
  const p = fakePrefs();
  assert.deepEqual(readSettings(p), { muted: false, volume: 0.4 });
  assert.deepEqual(readSettings(null), { muted: false, volume: 0.4 });
  saveSettings(p, { muted: true, volume: 0.7 });
  assert.deepEqual(readSettings(p), { muted: true, volume: 0.7 });
  assert.deepEqual(readSettings(fakePrefs({ music: { muted: "si", volume: 9 } })), { muted: false, volume: 1 });
});

test("barajar da todos los índices una vez, y respeta el que no debe ir primero", () => {
  const rnd = mulberry32(7);
  for (let k = 0; k < 200; k++) {
    const o = shuffleOrder(5, rnd, k % 5);
    assert.deepEqual([...o].sort(), [0, 1, 2, 3, 4]);
    assert.notEqual(o[0], k % 5);
  }
  assert.deepEqual(shuffleOrder(1, rnd, 0), [0]);
});

test("la lista toca todas antes de repetir y nunca la misma dos veces seguidas", () => {
  const pl = createPlaylist(SONGS, mulberry32(3));
  const played = Array.from({ length: 40 }, () => pl.next());
  for (let r = 0; r < 10; r++) assert.deepEqual([...played.slice(r * 4, r * 4 + 4)].sort(), SONGS);
  for (let i = 1; i < played.length; i++) assert.notEqual(played[i], played[i - 1]);
});

test("una sola canción se repite; sin canciones no hay nada", () => {
  const one = createPlaylist(["solo.mp3"], mulberry32(1));
  assert.deepEqual([one.next(), one.next(), one.next()], ["solo.mp3", "solo.mp3", "solo.mp3"]);
  assert.equal(createPlaylist([], Math.random).next(), null);
});

// ---------- ui.js con un <audio> de mentira ----------

class FakeAudio {
  static all = [];
  static block = false; // el navegador no deja sonar
  constructor() { this.volume = 1; this.paused = true; this.src = ""; this.l = {}; this.currentTime = 0; this.duration = NaN; FakeAudio.all.push(this); }
  addEventListener(t, f) { this.l[t] = f; }
  removeEventListener(t) { delete this.l[t]; }
  removeAttribute(a) { if (a === "src") this.src = ""; }
  load() {}
  play() { if (FakeAudio.block) return Promise.reject(new Error("NotAllowedError")); this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  fire(t) { this.l[t] && this.l[t](); }
}
// Temporizadores a mano: tickAll() corre los intervalos hasta que se acaban
function fakeTimers() {
  const live = new Map(); let id = 0;
  return {
    setInterval: (f) => { live.set(++id, f); return id; },
    clearInterval: (i) => live.delete(i),
    run() { for (let n = 0; n < 1000 && live.size; n++) for (const f of [...live.values()]) f(); },
  };
}
function fakeDoc() {
  const l = {};
  return { hidden: false, l, addEventListener: (t, f) => (l[t] = f), removeEventListener: (t) => delete l[t], querySelectorAll: () => [] };
}
function setup(prefsInit) {
  FakeAudio.all = []; FakeAudio.block = false;
  const t = fakeTimers(), doc = fakeDoc(), prefs = fakePrefs(prefsInit);
  const m = createMusic({ songs: SONGS, prefs, rnd: mulberry32(9), Audio: FakeAudio, doc, setInterval: t.setInterval, clearInterval: t.clearInterval });
  return { m, t, doc, prefs, audio: () => FakeAudio.all[0] };
}

test("no crea el audio ni baja nada hasta empezar; luego entra suave hasta el volumen guardado", async () => {
  const { m, t, audio } = setup({ music: { muted: false, volume: 0.6 } });
  assert.equal(FakeAudio.all.length, 0);
  assert.equal(await m.start(), true);
  assert.equal(audio().preload, "none");
  assert.ok(SONGS.includes(audio().src));
  assert.equal(audio().volume, 0);
  t.run();
  assert.ok(Math.abs(audio().volume - 0.6) < 1e-9);
  assert.equal(m.audible, true);
});

test("si el navegador no deja sonar, no truena y queda callada; al tocar el botón lo intenta otra vez", async () => {
  const { m } = setup();
  FakeAudio.block = true;
  assert.equal(await m.start(), false);
  assert.equal(m.audible, false);
  assert.equal(m.muted, false);
  FakeAudio.block = false;
  await m.toggle();
  assert.equal(m.audible, true);
});

test("silencio pausa (iPhone no respeta el volumen), se recuerda, y al quitarlo vuelve a sonar", async () => {
  const { m, prefs, audio } = setup();
  await m.start();
  await m.toggle();
  assert.equal(audio().paused, true);
  assert.deepEqual(prefs.m.get("music"), { muted: true, volume: 0.4 });
  await m.toggle();
  assert.equal(audio().paused, false);
  assert.equal(prefs.m.get("music").muted, false);
});

test("en silencio desde antes, start() no suena", async () => {
  const { m } = setup({ music: { muted: true, volume: 0.5 } });
  assert.equal(await m.start(), false);
  assert.equal(FakeAudio.all.length, 0);
});

test("el volumen se guarda y se aplica al momento", async () => {
  const { m, t, prefs, audio } = setup();
  await m.start(); t.run();
  m.setVolume(0.9);
  assert.equal(audio().volume, 0.9);
  assert.equal(prefs.m.get("music").volume, 0.9);
});

test("al acabar una canción sigue otra distinta; casi al final se va apagando", async () => {
  const { m, t, audio } = setup();
  await m.start(); t.run();
  const first = audio().src;
  audio().duration = 100; audio().currentTime = 99.5;
  audio().fire("timeupdate"); t.run();
  assert.equal(audio().volume, 0);
  audio().fire("ended");
  await Promise.resolve(); await Promise.resolve();
  assert.notEqual(audio().src, first);
  t.run();
  assert.ok(audio().volume > 0.39);
});

test("con la pestaña oculta se pausa y al volver sigue", async () => {
  const { m, doc, audio } = setup();
  await m.start();
  doc.hidden = true; doc.l.visibilitychange();
  assert.equal(audio().paused, true);
  doc.hidden = false; doc.l.visibilitychange();
  await Promise.resolve();
  assert.equal(audio().paused, false);
  assert.equal(m.audible, true);
});

test("destroy calla, suelta el audio y deja de escuchar la pestaña", async () => {
  const { m, doc, audio } = setup();
  await m.start();
  m.destroy();
  assert.equal(audio().paused, true);
  assert.equal(audio().src, "");
  assert.equal(doc.l.visibilitychange, undefined);
  assert.equal(await m.start(), false);
});

test("arranca con el primer toque, pero no con un toque en los controles de música", async () => {
  const { m } = setup();
  const target = { l: {}, addEventListener(t, f) { this.l[t] = f; }, removeEventListener(t) { delete this.l[t]; } };
  armOnGesture(target, m);
  await target.l.pointerdown({ target: { closest: (s) => (s === "[data-music]" ? {} : null) } });
  assert.equal(m.playing, false);
  await target.l.pointerdown({ target: { closest: () => null } });
  assert.equal(m.playing, true);
  assert.equal(target.l.pointerdown, undefined); // ya no espera
});

test("los controles reflejan el estado y no aparecen sin canciones", async () => {
  const { m } = setup();
  assert.match(musicButton(m), /🔇/);
  await m.start();
  assert.match(musicButton(m), /🔊/);
  assert.match(musicControls(m), /value="40"/);
  const none = createMusic({ songs: [], Audio: FakeAudio, doc: fakeDoc() });
  assert.equal(musicButton(none), "");
  assert.equal(musicControls(none), "");
});
