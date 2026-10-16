// Pruebas de los servicios (Firebase y localStorage) con un Firebase de mentira en memoria.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fakeFirebase, fakeFirestore } from "../fakes/firebase.js";
import { _resetLoaderForTests } from "../../platform/services/firebase.js";
import {
  createPrefs, prefs, gamePrefs, loadFirebaseSdk, initFirebase, signInWithGoogle, signOut,
  TABLES, SKIP, makeDb, watchTableList, watchTable, saveNewTable, updateTable, RECORDINGS, saveRecording,
} from "../../platform/services/index.js";
import { newTable, sit, addBot, start, act } from "../../platform/app/table.js";
import { playGame } from "../../modules/tournament/index.js";
import nim from "../modules/fixtures/nim.js";
import domino from "../../games/domino/index.js";

// Los servicios corren en el navegador; aquí `window` es el objeto global de Node
globalThis.window = globalThis;

function memoryStorage() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// Una mesa de dominó empezada, con una jugada (listas dentro de listas en la mesa)
function dominoTable(code, created = 1000) {
  let t = newTable(domino, { code, mode: "2x7", seed: "s", now: created });
  t = sit(t, 0, { id: "a", name: "Ana" });
  t = addBot(t, 1, { profile: "b02", name: "Lupe" });
  t = start(domino, t, created + 1);
  const seat = domino.currentSeats(t.state)[0];
  return act(domino, t, seat, domino.legalActions(t.state, seat)[0], created + 2);
}
const nimTable = (code, created = 1000) => sit(newTable(nim, { code, mode: "normal", seed: "n", now: created }), 0, { id: "a", name: "Ana" });

// ---------- localStorage ----------

test("prefs: todo va con prefijo propio, para no chocar con myDomino en el mismo dominio", () => {
  const ls = memoryStorage(); globalThis.localStorage = ls;
  try {
    prefs.set("name", "Memo");
    gamePrefs("domino").set("timer", "0");
    assert.deepEqual([...ls.m.keys()].sort(), ["juegos.domino.timer", "juegos.name"]);
    assert.equal(prefs.get("name"), "Memo");
    assert.equal(gamePrefs("domino").get("name"), null, "lo de un juego no se mezcla con lo del sitio");
    ls.setItem("dom.name", "de myDomino");
    assert.equal(prefs.get("dom.name"), null);
  } finally { delete globalThis.localStorage; }
});

test("prefs: JSON con valor por omisión si falta o está dañado", () => {
  const ls = memoryStorage(); globalThis.localStorage = ls;
  try {
    const p = createPrefs("x");
    assert.deepEqual(p.getJSON("arr", []), []);
    p.setJSON("arr", [1, 2]); assert.deepEqual(p.getJSON("arr"), [1, 2]);
    ls.setItem("x.bad", "{no es json"); assert.equal(p.getJSON("bad", "def"), "def");
    p.remove("arr"); assert.equal(p.get("arr"), null);
  } finally { delete globalThis.localStorage; }
});

test("prefs: sin localStorage, o si el navegador lo bloquea, no truena", () => {
  delete globalThis.localStorage;
  assert.equal(prefs.get("name"), null);
  assert.doesNotThrow(() => prefs.set("name", "Memo"));
  globalThis.localStorage = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceeded"); }, removeItem() { throw new Error("x"); } };
  try {
    assert.equal(prefs.get("name"), null);
    assert.doesNotThrow(() => { prefs.set("name", "Memo"); prefs.remove("name"); });
  } finally { delete globalThis.localStorage; }
});

// ---------- Mesas en Firestore ----------

test("las mesas van en su propia colección, no en la de myDomino", () => {
  assert.equal(TABLES, "juegos-mesas");
  assert.notEqual(TABLES, "mesas");
  assert.equal(RECORDINGS, "juegos-grabaciones");
});

test("una mesa se guarda como JSON y regresa idéntica, con listas dentro de listas", async () => {
  const fs = fakeFirestore(), db = makeDb(fs, () => 5000);
  const t = dominoTable("ABCD");
  await saveNewTable(db, t);
  const raw = fs._docs.get("juegos-mesas/ABCD");
  assert.equal(typeof raw.json, "string");
  assert.deepEqual([raw.code, raw.game, raw.created, raw.updated], ["ABCD", "domino", 1000, 5000]);
  const back = (await db.doc("juegos-mesas/ABCD").get()).data();
  assert.deepEqual(back, t);
  assert.ok(Array.isArray(back.state.hand.board[0]));
});

test("una mesa sin juego o sin código no se guarda", () => {
  const db = makeDb(fakeFirestore());
  assert.throws(() => saveNewTable(db, { ...nimTable("X"), game: undefined }), /code y game/);
});

test("escuchar una mesa: recibe cada cambio, y null cuando la borran", async () => {
  const fs = fakeFirestore(), db = makeDb(fs);
  const seen = [];
  await saveNewTable(db, nimTable("W"));
  const stop = watchTable(db, "W", (t) => seen.push(t && t.seats[0] && t.seats[0].name));
  await updateTable(db, "W", (t) => sit(t, 1, { id: "b", name: "Beto" }));
  await updateTable(db, "W", () => null);
  stop();
  assert.deepEqual(seen, ["Ana", "Ana", null]);
});

test("la lista del lobby trae solo las mesas de ese juego, las más recientes primero", async () => {
  const fs = fakeFirestore(), db = makeDb(fs);
  await saveNewTable(db, nimTable("N1", 1));
  await saveNewTable(db, dominoTable("D1", 2));
  await saveNewTable(db, nimTable("N2", 3));
  let got = null, upd = null;
  const stop = watchTableList(db, "nim", (list, updated) => { got = list.map((t) => t.code); upd = updated; });
  assert.deepEqual(got, ["N2", "N1"]);
  assert.deepEqual(Object.keys(upd).sort(), ["N1", "N2"]);
  stop();
});

test("updateTable aplica el cambio sobre lo último guardado; SKIP no guarda", async () => {
  const fs = fakeFirestore(), db = makeDb(fs);
  await saveNewTable(db, nimTable("U"));
  await updateTable(db, "U", (t) => addBot(t, 1, { profile: "listo", name: "Lupe" }));
  const writes = fs.writes;
  assert.equal(await updateTable(db, "U", () => SKIP), true);
  assert.equal(fs.writes, writes);
  assert.equal((await db.doc("juegos-mesas/U").get()).data().seats[1].name, "Lupe");
});

test("una jugada inválida no se guarda y el error llega a quien la pidió", async () => {
  const fs = fakeFirestore(), db = makeDb(fs);
  await saveNewTable(db, start(nim, addBot(nimTable("J"), 1, { profile: "listo", name: "L" }), 2000));
  await assert.rejects(updateTable(db, "J", (t) => act(nim, t, 1 - t.state.turn, { type: "take", n: 1 }, 3000)), /No se vale/);
  assert.equal((await db.doc("juegos-mesas/J").get()).data().turn, 0);
});

test("cambiar una mesa que ya no existe da un error claro; el cambio recibe una copia", async () => {
  const fs = fakeFirestore(), db = makeDb(fs);
  await assert.rejects(updateTable(db, "NOPE", (t) => t), /ya no existe/);
  await saveNewTable(db, nimTable("COPY"));
  await updateTable(db, "COPY", (t) => { t.seats[0].name = "Cambiado"; return SKIP; });
  assert.equal((await db.doc("juegos-mesas/COPY").get()).data().seats[0].name, "Ana");
});

// ---------- Grabaciones ----------

test("una partida grabada se guarda como JSON, con lo necesario para buscarla", async () => {
  const fs = fakeFirestore(), db = makeDb(fs, () => 7777);
  const { recording } = playGame(nim, ["azar", "azar"], { config: nim.modes[0], seed: 4 });
  await saveRecording(db, "nim-1", recording);
  const raw = fs._docs.get("juegos-grabaciones/nim-1");
  assert.deepEqual(JSON.parse(raw.json), recording);
  assert.deepEqual([raw.game, raw.actions, raw.created], ["nim", recording.actions.length, 7777]);
  await assert.rejects(saveRecording(db, "big", { ...recording, meta: { x: "y".repeat(1_000_000) } }), /demasiado grande/);
});

// ---------- Firebase: arranque y sesión ----------

let fb;
beforeEach(() => { delete globalThis.firebase; });

// document de mentira: guarda los <script> que se agregan y deja decidir si cargan o fallan
function fakeDocument() {
  _resetLoaderForTests();
  const scripts = [];
  return { scripts, createElement: () => ({}), head: { appendChild: (s) => scripts.push(s) } };
}

test("sin configuración, initFirebase truena sin cargar nada (el sitio sigue en modo práctica)", async () => {
  globalThis.document = fakeDocument();
  try {
    await assert.rejects(initFirebase(() => {}, {}), /sin config/);
    await assert.rejects(initFirebase(() => {}, undefined), /sin config/);
    assert.equal(document.scripts.length, 0);
  } finally { delete globalThis.document; }
});

test("si el CDN no responde, initFirebase truena (modo práctica) y luego se puede reintentar", async () => {
  globalThis.document = fakeDocument();
  try {
    const p = initFirebase(() => {}, { projectId: "x" });
    document.scripts[1].onerror();
    await assert.rejects(p, /No se pudo cargar firebase-auth-compat\.js/);
    loadFirebaseSdk();
    assert.equal(document.scripts.length, 6, "reintenta");
  } finally { delete globalThis.document; }
});

test("el SDK se carga del CDN después de dibujar: tres scripts en paralelo que corren en orden", async () => {
  globalThis.document = fakeDocument();
  try {
    const p = loadFirebaseSdk(), p2 = loadFirebaseSdk();
    assert.deepEqual(document.scripts.map((x) => x.src.split("/").pop()), ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]);
    assert.ok(document.scripts.every((x) => x.src.startsWith("https://www.gstatic.com/firebasejs/10.12.2/") && x.async === false));
    document.scripts.forEach((x) => x.onload());
    await p; await p2;
    assert.equal(document.scripts.length, 3, "no se carga dos veces");
  } finally { delete globalThis.document; }
});

test("si el SDK cargó pero no dejó `firebase`, initFirebase truena", async () => {
  globalThis.document = fakeDocument();
  try {
    const p = initFirebase(() => {}, { projectId: "x" });
    await Promise.resolve();
    document.scripts.forEach((x) => x.onload());
    await assert.rejects(p, /sin config/);
  } finally { delete globalThis.document; }
});

test("sin sesión, entra como invitado y avisa del usuario una vez como 'primero'", async () => {
  fb = fakeFirebase(); globalThis.firebase = fb.firebase;
  const users = [];
  const fs = await initFirebase((u, first) => users.push([u.uid, u.isAnonymous, first]), { projectId: "demo" });
  assert.equal(fs, fb.fs);
  assert.deepEqual(fb.calls.slice(0, 3), ["initializeApp:demo", "getRedirectResult", "signInAnonymously"]);
  assert.deepEqual(users, [["anon1", true, true]]);
  // después entra con Google: el aviso ya no es el primero
  await signInWithGoogle();
  assert.deepEqual(users[1], ["g1", false, false]);
  assert.ok(fb.calls.includes("prompt:select_account"));
});

test("si ya había sesión, no entra como invitado", async () => {
  fb = fakeFirebase({ user: { uid: "g9", isAnonymous: false } }); globalThis.firebase = fb.firebase;
  const users = [];
  await initFirebase((u, first) => users.push([u.uid, first]), { projectId: "demo" });
  assert.ok(!fb.calls.includes("signInAnonymously"));
  assert.deepEqual(users, [["g9", true]]);
});

test("si falla entrar como invitado, initFirebase termina igual (sin usuario)", async () => {
  fb = fakeFirebase({ anonFails: true }); globalThis.firebase = fb.firebase;
  const warn = console.warn; console.warn = () => {};
  const users = [];
  try { await initFirebase((u) => users.push(u), { projectId: "demo" }); } finally { console.warn = warn; }
  assert.deepEqual(users, []);
});

test("Google: si el navegador bloquea la ventana, entra por redirección", async () => {
  fb = fakeFirebase({ popup: "auth/popup-blocked" }); globalThis.firebase = fb.firebase;
  await signInWithGoogle();
  assert.deepEqual(fb.calls.filter((c) => c.startsWith("signIn")), ["signInWithPopup", "signInWithRedirect"]);
});

test("Google: los demás errores llegan a la interfaz con su código", async () => {
  fb = fakeFirebase({ popup: "auth/unauthorized-domain" }); globalThis.firebase = fb.firebase;
  await assert.rejects(signInWithGoogle(), (e) => e.code === "auth/unauthorized-domain");
  fb = fakeFirebase({ popup: "auth/popup-blocked", redirect: "auth/operation-not-allowed" }); globalThis.firebase = fb.firebase;
  await assert.rejects(signInWithGoogle(), (e) => e.code === "auth/operation-not-allowed");
});

test("salir nunca truena", async () => {
  fb = fakeFirebase({ signOutFails: true }); globalThis.firebase = fb.firebase;
  await assert.doesNotReject(signOut());
});
