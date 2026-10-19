// modules/sfx: preferencias, el tope de repetición y el reproductor con un AudioContext de mentira (sin navegador).
// Los efectos son de prueba, no de ningún juego. La llave "sfx" no toca la de la música.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, PREF_KEY, clampVolume, readSettings, saveSettings, clipOf, canRepeat, createGate } from "../../../modules/sfx/index.js";
import { createSfx, armOnGesture, sfxButton, sfxControls } from "../../../modules/sfx/ui.js";

const CLIPS = { tapa: "tapa.mp3", paso: "paso.mp3", falta: "" };
const fakePrefs = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { m, getJSON: (k, f) => (m.has(k) ? m.get(k) : f), setJSON: (k, v) => m.set(k, v) };
};

test("volumen entre 0 y 1; lo raro vuelve al de por omisión (0.6, no el de la música)", () => {
  assert.equal(PREF_KEY, "sfx");
  assert.equal(DEFAULTS.volume, 0.6);
  assert.equal(DEFAULTS.muted, false);
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(0.3), 0.3);
  assert.equal(clampVolume("x"), 0.6);
});

test("preferencias: por omisión sin nada guardado; se guardan en sfx y no pisan music", () => {
  const p = fakePrefs({ music: { muted: true, volume: 0.2 } });
  assert.deepEqual(readSettings(p), { muted: false, volume: 0.6 });
  assert.deepEqual(readSettings(null), { muted: false, volume: 0.6 });
  saveSettings(p, { muted: true, volume: 0.8 });
  assert.deepEqual(readSettings(p), { muted: true, volume: 0.8 });
  assert.deepEqual(p.m.get("music"), { muted: true, volume: 0.2 });
  assert.deepEqual(readSettings(fakePrefs({ sfx: { muted: "si", volume: 9 } })), { muted: false, volume: 1 });
});

test("clipOf devuelve la url o null si falta la llave o el archivo", () => {
  assert.equal(clipOf(CLIPS, "tapa"), "tapa.mp3");
  assert.equal(clipOf(CLIPS, "no-esta"), null);
  assert.equal(clipOf(CLIPS, "falta"), null);
  assert.equal(clipOf(null, "tapa"), null);
});

test("el mismo efecto no se repite demasiado seguido; otro sí puede sonar encima", () => {
  assert.equal(canRepeat(null, 1000, 120), true);
  assert.equal(canRepeat(1000, 1100, 120), false);
  assert.equal(canRepeat(1000, 1120, 120), true);
  const gate = createGate((k) => (k === "paso" ? 300 : 100));
  assert.equal(gate.allow("paso", 0), true);
  assert.equal(gate.allow("paso", 200), false);
  assert.equal(gate.allow("tapa", 200), true);
  assert.equal(gate.allow("paso", 300), true);
});

// ---------- ui.js con Web Audio de mentira ----------

class FakeCtx {
  static all = [];
  static block = false;
  constructor() {
    this.state = "suspended";
    this.destination = {};
    this.sources = [];
    FakeCtx.all.push(this);
  }
  resume() {
    if (FakeCtx.block) return Promise.reject(new Error("NotAllowedError"));
    this.state = "running";
    return Promise.resolve();
  }
  createGain() { return { gain: { value: 1 }, connect() {} }; }
  createBufferSource() {
    const s = { buffer: null, started: false, stopped: false, connect() {}, start() { s.started = true; }, stop() { s.stopped = true; } };
    this.sources.push(s);
    return s;
  }
  decodeAudioData(buf) {
    if (FakeCtx.bad) return Promise.reject(new Error("decode"));
    return Promise.resolve({ bytes: buf.byteLength });
  }
  close() { this.state = "closed"; }
}

function fakeFetch(fail = null) {
  const calls = [];
  const fetch = (url) => {
    calls.push(url);
    if (fail && fail(url)) return Promise.resolve({ ok: false, status: 404 });
    if (url === "boom") return Promise.reject(new Error("red"));
    return Promise.resolve({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer });
  };
  return { fetch, calls };
}

function timers() {
  const q = [];
  return {
    later(fn, ms) { const id = q.length + 1; q.push({ id, fn, ms, dead: false }); return id; },
    cancel(id) { const t = q.find((x) => x.id === id); if (t) t.dead = true; },
    run() { for (const t of q) if (!t.dead) t.fn(); },
  };
}

const drain = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };

function setup({ prefs, clips = { tapa: "tapa.mp3", paso: "paso.mp3" }, fail = null, gapFor } = {}) {
  FakeCtx.all = []; FakeCtx.block = false; FakeCtx.bad = false;
  const net = fakeFetch(fail);
  const t = timers();
  let clock = 0;
  const s = createSfx({
    clips, prefs: prefs || fakePrefs(), gapFor,
    AudioContext: FakeCtx, fetch: net.fetch, doc: { querySelectorAll: () => [] },
    now: () => clock, setTimeout: t.later, clearTimeout: t.cancel,
  });
  return { s, t, net, at: (n) => { clock = n; }, ctx: () => FakeCtx.all[0] };
}

test("no crea el contexto hasta desbloquear; luego precarga y un efecto suena", async () => {
  const { s, net, ctx } = setup({});
  assert.equal(FakeCtx.all.length, 0);
  assert.equal(s.unlocked, false);
  assert.equal(await s.unlock(), true);
  assert.equal(ctx().state, "running");
  await drain();
  assert.deepEqual(net.calls.sort(), ["paso.mp3", "tapa.mp3"]);
  s.play("tapa");
  await drain();
  assert.equal(ctx().sources.length, 1);
  assert.equal(ctx().sources[0].started, true);
  assert.equal(ctx().sources[0].buffer.bytes, 4);
});

test("si el navegador no deja, no truena; si falta el archivo o la red, tampoco", async () => {
  const blocked = setup({});
  FakeCtx.block = true;
  assert.equal(await blocked.s.unlock(), false);
  blocked.s.play("tapa");
  await drain();
  assert.equal(blocked.ctx().sources.length, 0);

  const missing = setup({ fail: (u) => u === "no.mp3", clips: { x: "no.mp3", tapa: "tapa.mp3" } });
  await missing.s.unlock();
  assert.equal(missing.s.play("no-existe"), false);
  missing.s.play("x");
  await drain();
  assert.equal(missing.ctx().sources.length, 0);

  const boom = setup({ clips: { tapa: "boom" } });
  await boom.s.unlock();
  boom.s.play("tapa");
  await drain();
  assert.equal(boom.ctx().sources.length, 0);
});

test("el silencio corta de verdad (no solo baja el volumen) y se recuerda aparte de la música", async () => {
  const prefs = fakePrefs({ music: { muted: false, volume: 0.4 } });
  const { s, ctx } = setup({ prefs });
  await s.unlock();
  s.play("tapa");
  await drain();
  assert.equal(ctx().sources[0].started, true);
  await s.toggle();
  assert.equal(ctx().sources[0].stopped, true);
  assert.equal(s.play("paso"), false);
  assert.deepEqual(prefs.m.get("sfx"), { muted: true, volume: 0.6 });
  assert.deepEqual(prefs.m.get("music"), { muted: false, volume: 0.4 });
  await s.toggle();
  s.play("paso");
  await drain();
  assert.equal(ctx().sources.filter((x) => x.started && !x.stopped).length, 1);
});

test("volumen 0 no arranca nada; el deslizador se guarda en sfx", async () => {
  const prefs = fakePrefs();
  const { s, ctx } = setup({ prefs });
  await s.unlock();
  s.setVolume(0);
  assert.equal(s.play("tapa"), false);
  assert.equal(ctx().sources.length, 0);
  s.setVolume(0.25);
  assert.equal(prefs.m.get("sfx").volume, 0.25);
  s.play("tapa");
  await drain();
  assert.equal(ctx().sources.length, 1);
});

test("dos efectos a la vez sí; el mismo, solo si pasó el mínimo", async () => {
  const { s, ctx, at } = setup({ gapFor: () => 100 });
  await s.unlock();
  at(1000);
  assert.equal(s.play("tapa"), true);
  assert.equal(s.play("paso"), true);
  assert.equal(s.play("tapa"), false);
  at(1200);
  assert.equal(s.play("tapa"), true);
  await drain();
  assert.equal(ctx().sources.length, 3);
});

test("se puede programar para después, y cancel() no lo deja sonar", async () => {
  const { s, t, ctx } = setup({});
  await s.unlock();
  assert.equal(s.playAll([{ key: "paso", at: 400 }, { key: "tapa", at: 0 }]), 2);
  await drain();
  assert.equal(ctx().sources.length, 1);
  s.cancel();
  t.run();
  await drain();
  assert.equal(ctx().sources.length, 1);
});

test("en silencio desde antes, play no suena y destroy deja el contexto", async () => {
  const { s, ctx } = setup({ prefs: fakePrefs({ sfx: { muted: true, volume: 0.5 } }) });
  assert.equal(s.play("tapa"), false);
  assert.equal(FakeCtx.all.length, 0);
  await s.unlock();
  s.destroy();
  assert.equal(ctx().state, "closed");
  assert.equal(s.play("tapa"), false);
});

test("arranca el audio con el primer toque, pero no con un toque en los controles", async () => {
  const { s } = setup({});
  const target = { l: {}, addEventListener(ev, f) { this.l[ev] = f; }, removeEventListener(ev) { delete this.l[ev]; } };
  armOnGesture(target, s);
  await target.l.pointerdown({ target: { closest: (sel) => (sel === "[data-sfx]" ? {} : null) } });
  assert.equal(s.unlocked, false);
  await target.l.pointerdown({ target: { closest: () => null } });
  assert.equal(s.unlocked, true);
  assert.equal(target.l.pointerdown, undefined);
});

test("los controles reflejan el silencio y no aparecen sin efectos", async () => {
  const { s } = setup({});
  assert.match(sfxButton(s), /🔔/);
  assert.match(sfxControls(s), /value="60"/);
  await s.setMuted(true);
  assert.match(sfxButton(s), /🔕/);
  const none = createSfx({ clips: {}, AudioContext: FakeCtx, doc: { querySelectorAll: () => [] } });
  assert.equal(sfxButton(none), "");
  assert.equal(sfxControls(none), "");
});
