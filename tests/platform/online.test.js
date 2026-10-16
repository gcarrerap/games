// Mesas en línea con varios "teléfonos" sobre el mismo Firestore de mentira: crear, ver la mesa en el lobby,
// sentarse, la compu (la mueve el asiento más bajo; los demás son respaldo), jugar, el reloj, mirar sin jugar,
// salir, la grabación al terminar y que nunca cuenten dos jugadas para un turno.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, BACKUP_MS } from "../../platform/app/session.js";
import { FNS } from "../../platform/app/ai-worker.js";
import { makeDb, TABLES, RECORDINGS } from "../../platform/services/index.js";
import { turnKey } from "../../platform/app/table.js";
import { fakeFirestore } from "../fakes/firebase.js";
import { seededRandom } from "../../modules/random/index.js";
import nim from "../modules/fixtures/nim.js";
import domino from "../../games/domino/index.js";

const GAMES = { nim, domino };

// Un mundo: un Firestore, un reloj y una cola de temporizadores compartidos por todos los teléfonos
function world() {
  const fs = fakeFirestore();
  let clock = 1_000_000, nextId = 1;
  const timers = new Map();
  const w = { fs, timers, get now() { return clock; }, advance: (ms) => { clock += ms; } };
  w.phone = (name, uid = name) => {
    const all = new Map();
    const make = (ns) => ({
      get: (k) => all.get(ns + k) ?? null, set: (k, v) => all.set(ns + k, String(v)),
      getJSON: (k, d = null) => (all.has(ns + k) ? JSON.parse(all.get(ns + k)) : d), setJSON: (k, v) => all.set(ns + k, JSON.stringify(v)),
    });
    const sess = createSession({
      now: () => clock,
      schedule: (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: clock + ms, phone: name }); return id; },
      cancel: (id) => timers.delete(id),
      random: seededRandom(name),
      loadGame: async (id) => GAMES[id],
      botDecide: (game, view, seat, profile, seed) => (game === nim ? Promise.resolve(nim.bots.decide(view, seat, profile, { rnd: seededRandom(seed) })) : FNS.decide(game.id, view, seat, profile, seed)),
      advise: (game, view, seat, seed) => FNS.advise(game.id, view, seat, seed),
      prefs: make("juegos."), gamePrefs: (id) => make(`juegos.${id}.`),
      version: "test",
      auth: { connect: async (onUser) => { onUser({ uid, isAnonymous: true }); return makeDb(fs, () => clock); }, signIn: async () => {}, signOut: async () => {} },
    });
    const p = { name, s: sess, a: sess.actions, st: sess.store.state };
    p.seat = () => p.a.mySeat();
    p.myTurn = () => p.st.table && p.st.table.status === "playing" && p.st.game.currentSeats(p.st.table.state).includes(p.seat());
    return p;
  };
  // Corre el siguiente temporizador de cualquier teléfono (avanza el reloj hasta su hora)
  w.runNext = async () => {
    if (!timers.size) return null;
    const [id, t] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
    timers.delete(id); clock = Math.max(clock, t.at); await t.fn(); return t.phone;
  };
  return w;
}

async function ready(p, gameId, name) {
  await p.a.connect();
  await p.a.openGame(gameId);
  if (name) p.a.setName(name);
}

// Juega hasta que se cumpla until(): cada persona tira su primera acción legal; la compu, con sus temporizadores.
// Devuelve qué teléfono movió a la compu cada vez.
async function playUntil(w, phones, until, max = 2000) {
  const movers = [];
  for (let i = 0; i < max && !until(); i++) {
    const p = phones.find((x) => x.myTurn());
    if (p) { await p.a.play(p.st.game.legalActions(p.st.table.state, p.seat())[0]); continue; }
    const t = phones[0].st.table, g = phones[0].st.game;
    if (t.status === "playing" && !g.currentSeats(t.state).length) { const q = phones.find((x) => x.seat() >= 0); await q.a.play(g.legalActions(t.state, q.seat())[0]); continue; }
    const who = await w.runNext();
    assert.ok(who, "nadie tenía nada que hacer");
    movers.push(who);
  }
  return movers;
}

test("crear una mesa: aparece en el lobby de otro teléfono, solo en el de ese juego", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B"), C = w.phone("C");
  await ready(A, "domino", "Ana"); await ready(B, "domino"); await ready(C, "nim");
  const code = await A.a.createTable({ ...A.a.practiceSettings(), mode: "4x7p", timer: false });
  assert.match(code, /^[A-Z]{4}$/);
  const doc = JSON.parse(w.fs._docs.get(`${TABLES}/${code}`).json);
  assert.deepEqual([doc.game, doc.mode, doc.status, doc.seats[0].name, doc.config.timer], ["domino", "4x7p", "lobby", "Ana", false]);
  assert.deepEqual(B.st.tables.map((t) => t.code), [code]);
  assert.deepEqual(C.st.tables, []);
});

test("sin nombre no se crea mesa ni se sienta nadie", async () => {
  const w = world(), A = w.phone("A");
  await ready(A, "domino");
  assert.equal(await A.a.createTable(), null);
  assert.match(A.st.err, /nombre/);
});

test("dos personas y dos compus: una mano completa; la compu la mueve el asiento más bajo y todos ven lo mismo", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "domino", "Ana"); await ready(B, "domino", "Beto");
  const code = await A.a.createTable({ ...A.a.practiceSettings(), mode: "4x7p", timer: false });
  A.a.openTable(code); B.a.openTable(code);
  await B.a.sitAt(1);
  await A.a.addBotAt(2, "b01"); await A.a.addBotAt(3, "b01");
  assert.deepEqual(B.st.table.seats.map((x) => x.name), ["Ana", "Beto", "Lupe", "Toño"]);
  await B.a.startGame();
  assert.equal(A.st.table.status, "playing");
  const movers = await playUntil(w, [A, B], () => A.st.table.state.status !== "playing");
  assert.equal(A.st.table.state.status, "handover");
  assert.ok(movers.length > 0 && movers.every((m) => m === "A"), "la compu la movió A (asiento 1)");
  assert.deepEqual(B.st.table, A.st.table);
  // La vista de B no tiene las fichas de A
  const vb = domino.view(B.st.table.state, 1);
  assert.ok(vb.hand.hands[0].every((t) => t === "?"));
  // Siguiente mano: cualquiera
  await B.a.play({ type: "next" });
  assert.equal(A.st.table.state.handNo, 2);
});

test("si el teléfono principal se va, el de respaldo mueve a la compu (con espera) y resuelve el turno del ausente", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "domino", "Ana"); await ready(B, "domino", "Beto");
  const code = await A.a.createTable({ ...A.a.practiceSettings(), mode: "4x7p", timer: true });
  A.a.openTable(code); B.a.openTable(code);
  await B.a.sitAt(2); await A.a.addBotAt(1, "b01"); await A.a.addBotAt(3, "b01");
  await A.a.startGame();
  A.a.goPortal(); // Ana cierra la mesa (sigue sentada en el asiento 1, el más bajo)
  const moved = [], waits = [];
  let timeouts = 0;
  for (let i = 0; i < 300 && B.st.table.turn < 12 && B.st.table.state.status === "playing"; i++) {
    const g = B.st.game, t = B.st.table;
    if (B.myTurn()) { await B.a.play(g.legalActions(t.state, 2)[0]); continue; }
    if (g.currentSeats(t.state).includes(0) && !w.timers.size) {
      // Turno de Ana, que no está: el reloj de Beto lo resuelve cuando pasa el tiempo (y la espera de cortesía)
      w.advance(24_000); B.a.tick(); await new Promise((r) => setTimeout(r, 5)); timeouts++; continue;
    }
    const t0 = w.now, who = await w.runNext();
    assert.ok(who, "nadie tenía nada que hacer");
    moved.push(who); waits.push(w.now - t0);
  }
  assert.ok(B.st.table.turn >= 6);
  assert.ok(moved.length > 0 && moved.every((m) => m === "B"), "la compu la movió B");
  assert.ok(waits.some((ms) => ms >= BACKUP_MS), "B esperó su turno de respaldo");
  assert.ok(timeouts > 0 || !B.st.table.state.hand.history.some((h) => h.s === 0), "el turno de Ana se resolvió solo");
});

test("dos jugadas para el mismo turno: solo cuenta la primera", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "nim", "Ana"); await ready(B, "nim", "Beto");
  const code = await A.a.createTable({ mode: "normal", bots: [] });
  A.a.openTable(code); B.a.openTable(code);
  await B.a.sitAt(1); await A.a.startGame();
  const p = [A, B].find((x) => x.myTurn());
  const key = turnKey(p.st.table);
  // El mismo teléfono toca dos veces muy rápido: las dos se piden sobre el mismo turno
  await Promise.all([p.a.play({ type: "take", n: 1 }), p.a.play({ type: "take", n: 1 })]);
  assert.equal(A.st.table.turn, 1);
  assert.notEqual(turnKey(A.st.table), key);
});

test("quien solo mira no puede jugar, no mueve a la compu y no ve manos", async () => {
  const w = world(), A = w.phone("A"), C = w.phone("C");
  await ready(A, "domino", "Ana"); await ready(C, "domino", "Chuy");
  const code = await A.a.createTable({ ...A.a.practiceSettings(), mode: "2x7", timer: false });
  A.a.openTable(code); await A.a.addBotAt(1, "b01"); await A.a.startGame();
  C.a.openTable(code);
  assert.equal(C.seat(), -1);
  const t = C.st.table;
  await C.a.play(domino.legalActions(t.state, 0)[0] || { type: "pass" });
  assert.equal(C.st.table.turn, t.turn);
  assert.ok([...w.timers.values()].every((x) => x.phone !== "C"));
  assert.ok(domino.view(C.st.table.state, -1).hand.hands.every((h) => h.every((x) => x === "?")));
});

test("el reloj en línea: quien tiene el turno lo resuelve al llegar a 0; los demás esperan un poco más", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "domino", "Ana"); await ready(B, "domino", "Beto");
  const code = await A.a.createTable({ ...A.a.practiceSettings(), mode: "2x7", timer: true });
  A.a.openTable(code); B.a.openTable(code);
  await B.a.sitAt(1); await A.a.startGame();
  const owner = [A, B].find((x) => x.myTurn()), other = owner === A ? B : A;
  const turn = A.st.table.turn;
  w.advance(20_500);
  other.a.tick(); await Promise.resolve();
  assert.equal(A.st.table.turn, turn, "el otro todavía espera");
  owner.a.tick(); await new Promise((r) => setTimeout(r, 5));
  assert.ok(A.st.table.turn > turn);
  assert.equal(A.st.table.state.hand.history.at(-1).auto, true);
});

test("salir al lobby te deja sentado; levantarte libera tu asiento; una mesa borrada avisa", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "nim", "Ana"); await ready(B, "nim", "Beto");
  const code = await A.a.createTable({ mode: "normal", bots: [] });
  A.a.openTable(code); B.a.openTable(code);
  await B.a.sitAt(1);
  B.a.leave(); await new Promise((r) => setTimeout(r, 5));
  assert.equal(B.st.screen, "lobby");
  assert.equal(A.st.table.seats[1].name, "Beto", "sigue sentado");
  B.a.openTable(code);
  await B.a.standUp();
  assert.equal(A.st.table.seats[1], null);
  await w.fs.doc(`${TABLES}/${code}`).delete();
  assert.match(A.st.err, /ya no existe/);
});

test("al terminar, la partida se graba una sola vez y se puede repetir", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "nim", "Ana"); await ready(B, "nim", "Beto");
  const code = await A.a.createTable({ mode: "normal", bots: [] });
  A.a.openTable(code); B.a.openTable(code);
  await B.a.sitAt(1); await A.a.startGame();
  await playUntil(w, [A, B], () => A.st.table.status === "over");
  await new Promise((r) => setTimeout(r, 5));
  const recs = [...w.fs._docs.keys()].filter((k) => k.startsWith(RECORDINGS + "/"));
  assert.equal(recs.length, 1);
  const rec = JSON.parse(w.fs._docs.get(recs[0]).json);
  assert.equal(rec.meta.mode, "online");
  assert.deepEqual(rec.meta.players.map((p) => p.name), ["Ana", "Beto"]);
  const { replay } = await import("../../modules/recording/index.js");
  assert.deepEqual(replay(nim, rec), A.st.table.state);
  // Revancha
  await B.a.again();
  assert.deepEqual([A.st.table.status, A.st.table.round], ["playing", 2]);
});

test("una mesa de otro juego no se abre como si fuera de este", async () => {
  const w = world(), A = w.phone("A"), B = w.phone("B");
  await ready(A, "nim", "Ana"); await ready(B, "domino", "Beto");
  const code = await A.a.createTable({ mode: "normal", bots: [] });
  B.a.openTable(code);
  assert.equal(B.st.table, null);
  assert.match(B.st.err, /otro juego/);
});
