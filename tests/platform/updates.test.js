// Pruebas de "cargar siempre la versión más reciente" (heredado de myDomino #19): el service worker y el aviso.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.window = globalThis;

// ---------- Service worker (sw.js se carga como en el navegador, con self, caches y fetch de mentira) ----------

function loadSW({ network, putFails = false }) {
  const store = new Map(), listeners = {};
  const cache = {
    put: async (req, res) => { if (putFails) throw new TypeError("Partial response (status code 206) is unsupported"); store.set(req.url, res); },
    match: async (req, opts) => { const u = opts && opts.ignoreSearch ? req.url.split("?")[0] : req.url; for (const [k, v] of store) if ((opts && opts.ignoreSearch ? k.split("?")[0] : k) === u) return v; return undefined; },
  };
  const fetchCalls = [];
  const ctx = {
    self: { location: { origin: "https://gcarrerap.github.io" }, addEventListener: (t, f) => (listeners[t] = f), skipWaiting() {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async (req, opts) => { fetchCalls.push([req.url, opts && opts.cache]); return network(req); },
    URL, Response, module: { exports: {} },
  };
  vm.runInNewContext(fs.readFileSync(new URL("../../sw.js", import.meta.url), "utf8"), ctx);
  return { sw: ctx.module.exports, store, fetchCalls, listeners };
}
const req = (url, method = "GET") => ({ url, method });
const SITE = "https://gcarrerap.github.io/games/";

test("sw: los archivos del juego se piden al servidor confirmando que siguen iguales, y se guarda copia", async () => {
  const { sw, store, fetchCalls } = loadSW({ network: async () => new Response("nuevo", { status: 200 }) });
  const res = await sw.handle(req(SITE + "platform/main.js"), "https://gcarrerap.github.io");
  assert.equal(await res.text(), "nuevo");
  assert.deepEqual(fetchCalls[0], [SITE + "platform/main.js", "no-cache"]);
  assert.ok(store.has(SITE + "platform/main.js"));
});

test("sw: sin conexión usa la copia guardada", async () => {
  let online = true;
  const { sw } = loadSW({ network: async () => { if (!online) throw new TypeError("Failed to fetch"); return new Response("v1", { status: 200 }); } });
  await sw.handle(req(SITE + "index.html"), "https://gcarrerap.github.io");
  online = false;
  const res = await sw.handle(req(SITE + "index.html"), "https://gcarrerap.github.io");
  assert.equal(await res.text(), "v1");
});

test("sw: sin conexión y sin copia, falla como sin service worker", async () => {
  const { sw } = loadSW({ network: async () => { throw new TypeError("Failed to fetch"); } });
  await assert.rejects(sw.handle(req(SITE + "platform/x.js"), "https://gcarrerap.github.io"), /Failed to fetch/);
});

test("sw: no guarda respuestas de error (un 404 no reemplaza la copia buena)", async () => {
  let status = 200;
  const { sw, store } = loadSW({ network: async () => new Response(String(status), { status }) });
  await sw.handle(req(SITE + "a.js"), "https://gcarrerap.github.io");
  status = 404;
  await sw.handle(req(SITE + "a.js"), "https://gcarrerap.github.io");
  assert.equal(await store.get(SITE + "a.js").text(), "200");
});

test("sw: la música no pasa por aquí (se pide por pedazos y una respuesta parcial no se puede guardar)", () => {
  const { sw } = loadSW({ network: async () => new Response("x") });
  const o = "https://gcarrerap.github.io";
  assert.equal(sw.handle(req(SITE + "games/chihuahuas/music/marimba-jaroche.mp3"), o), null);
  assert.equal(sw.handle({ url: SITE + "x", method: "GET", destination: "audio" }, o), null);
  assert.equal(sw.handle({ url: SITE + "x.js", method: "GET", headers: new Headers({ range: "bytes=0-" }) }, o), null);
});

test("sw: los efectos sí se guardan (son chicos y se piden enteros); con Range, tampoco", async () => {
  const { sw, store } = loadSW({ network: async () => new Response("clip", { status: 200 }) });
  const o = "https://gcarrerap.github.io";
  const url = SITE + "games/chihuahuas/sfx/boton.mp3";
  const res = await sw.handle(req(url), o);
  assert.equal(await res.text(), "clip");
  assert.ok(store.has(url));
  assert.equal(sw.handle({ url, method: "GET", headers: new Headers({ range: "bytes=0-" }) }, o), null);
});

test("sw: si guardar la copia falla, la respuesta llega igual", async () => {
  const { sw } = loadSW({ network: async () => new Response("ok", { status: 200 }), putFails: true });
  const res = await sw.handle({ url: SITE + "a.js", method: "GET" }, "https://gcarrerap.github.io");
  assert.equal(await res.text(), "ok");
});

test("sw: Firebase, Google y otros sitios no pasan por aquí; tampoco lo que no es GET", () => {
  const { sw } = loadSW({ network: async () => new Response("x") });
  const o = "https://gcarrerap.github.io";
  assert.equal(sw.handle(req("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"), o), null);
  assert.equal(sw.handle(req("https://firestore.googleapis.com/v1/x"), o), null);
  assert.equal(sw.handle(req("https://fonts.googleapis.com/css2"), o), null);
  assert.equal(sw.handle(req(SITE + "x", "POST"), o), null);
});

test("sw: al instalarse y activarse toma control enseguida", () => {
  const { listeners } = loadSW({ network: async () => new Response("x") });
  assert.ok(listeners.install && listeners.activate && listeners.fetch);
});

// ---------- Aviso de versión nueva ----------

const { VERSION } = await import("../../platform/version.js");
const { checkForUpdate } = await import("../../platform/app/updates.js");
const { fetchPublishedVersion } = await import("../../platform/services/index.js");

test("sw: su caché no choca con las de las otras apps del mismo dominio", () => {
  const { sw } = loadSW({ network: async () => new Response("x") });
  assert.equal(sw.CACHE, "juegos-v1");
  for (const other of ["mydomino-v1", "mypata-v1", "noli-v1"]) assert.ok(!other.startsWith(sw.PREFIX));
});

test("sw: al activarse borra solo sus cachés viejos, nunca los de Noli, La Pata o myDomino", async () => {
  const deleted = [];
  const ctx = {
    self: { location: { origin: "https://gcarrerap.github.io" }, addEventListener: (t, f) => (ctx.listeners[t] = f), skipWaiting() {}, clients: { claim: async () => {} } },
    listeners: {},
    caches: { open: async () => ({}), keys: async () => ["juegos-v0", "juegos-v1", "noli-v1", "mypata-v1", "mydomino-v1"], delete: async (k) => { deleted.push(k); return true; } },
    fetch: async () => new Response("x"), URL, Response, module: { exports: {} },
  };
  vm.runInNewContext(fs.readFileSync(new URL("../../sw.js", import.meta.url), "utf8"), ctx);
  let done; ctx.listeners.activate({ waitUntil: (p) => (done = p) }); await done;
  assert.deepEqual(deleted, ["juegos-v0"]);
});

test("la versión tiene el formato AAAA-MM-DD.N", () => {
  assert.match(VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/);
});

test("leer la versión publicada: directo del servidor y sin caché", async () => {
  const realFetch = globalThis.fetch; let opts = null;
  globalThis.fetch = async (url, o) => { opts = o; return new Response('export const VERSION = "2099-01-01.3";', { status: 200 }); };
  try {
    assert.equal(await fetchPublishedVersion("https://x/platform/version.js"), "2099-01-01.3");
    assert.equal(opts.cache, "no-store");
    globalThis.fetch = async () => new Response("", { status: 404 });
    assert.equal(await fetchPublishedVersion("https://x/platform/version.js"), null);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    assert.equal(await fetchPublishedVersion("https://x/platform/version.js"), null);
  } finally { globalThis.fetch = realFetch; }
});

test("hay versión nueva solo si la publicada existe y es distinta", async () => {
  assert.equal(await checkForUpdate(async () => VERSION), null);
  assert.equal(await checkForUpdate(async () => null), null, "sin conexión: sin aviso");
  assert.equal(await checkForUpdate(async () => "2099-01-01.1"), "2099-01-01.1");
});
