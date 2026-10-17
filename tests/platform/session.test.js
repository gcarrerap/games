// La sesión de práctica completa, en Node: abrir un juego, practicar contra la compu, el reloj, el consejo,
// cambiar de bot y la revancha. El tiempo y los temporizadores son de mentira (controlados por la prueba).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../../platform/app/session.js";
import { FNS } from "../../platform/app/ai-worker.js";
import { seededRandom } from "../../modules/random/index.js";
import nim from "../modules/fixtures/nim.js";
import domino from "../../games/domino/index.js";
import continental from "../../games/continental/index.js";

function memPrefs() {
  const all = new Map();
  const make = (ns) => ({
    get: (k) => all.get(ns + k) ?? null, set: (k, v) => all.set(ns + k, String(v)),
    getJSON: (k, d = null) => (all.has(ns + k) ? JSON.parse(all.get(ns + k)) : d), setJSON: (k, v) => all.set(ns + k, JSON.stringify(v)),
  });
  return { all, prefs: make("juegos."), gamePrefs: (id) => make(`juegos.${id}.`) };
}

function harness(games = { nim, domino, continental }) {
  let clock = 1_000_000, nextId = 1;
  const timers = new Map();
  const { prefs, gamePrefs, all } = memPrefs();
  const s = createSession({
    now: () => clock,
    schedule: (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: clock + ms }); return id; },
    cancel: (id) => timers.delete(id),
    random: seededRandom("session"),
    loadGame: async (id) => { if (!games[id]) throw new Error("no"); return games[id]; },
    botDecide: (game, view, seat, profile, seed) => (game === nim ? Promise.resolve(nim.bots.decide(view, seat, profile, { rnd: seededRandom(seed) })) : FNS.decide(game.id, view, seat, profile, seed)),
    advise: (game, view, seat, seed) => FNS.advise(game.id, view, seat, seed),
    prefs, gamePrefs,
  });
  // Corre el siguiente temporizador (avanza el reloj hasta su hora) y espera a que termine
  async function runNext() {
    if (!timers.size) return false;
    const [id, t] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    timers.delete(id); clock = Math.max(clock, t.at); await t.fn(); return true;
  }
  return { s, st: s.store.state, a: s.actions, timers, runNext, all, advance: (ms) => { clock += ms; }, get now() { return clock; } };
}

const myTurn = (h) => h.st.table.status === "playing" && h.st.game.currentSeats(h.st.table.state).includes(0);
// Deja jugar a la compu hasta que te toque
async function untilMyTurn(h) {
  for (let i = 0; i < 50 && !myTurn(h); i++) assert.ok(await h.runNext(), "la compu debía tener algo programado");
  assert.ok(myTurn(h));
}

// Juega una práctica hasta el final: tú con la primera acción legal, la compu con sus temporizadores
async function playOut(h, { maxSteps = 3000 } = {}) {
  for (let i = 0; i < maxSteps && h.st.table.status === "playing"; i++) {
    if (myTurn(h)) { h.a.play(h.st.game.legalActions(h.st.table.state, 0)[0]); continue; }
    const g = h.st.game, t = h.st.table;
    if (!g.currentSeats(t.state).length) { h.a.play(g.legalActions(t.state, 0)[0]); continue; } // pausa: tú decides seguir
    assert.ok(await h.runNext(), "la compu debía tener algo programado");
  }
}

test("portal → juego → práctica: tú en el asiento 0 y la compu en los demás", async () => {
  const h = harness();
  assert.equal(h.st.screen, "portal");
  await h.a.openGame("domino");
  assert.deepEqual([h.st.screen, h.st.game, h.st.loading], ["lobby", domino, false]);
  h.a.setName("  Memo  ");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "4x7p", timer: false });
  const t = h.st.table;
  assert.equal(h.st.screen, "table");
  assert.deepEqual(t.seats.map((x) => x.name), ["Memo", "Lupe", "Toño", "Chuy"]);
  assert.ok(t.seats.slice(1).every((x) => x.bot));
  assert.equal(t.status, "playing");
  assert.equal(h.all.get("juegos.name"), "Memo");
});

test("un juego que no existe deja un error y no truena", async () => {
  const h = harness();
  await h.a.openGame("ajedrez");
  assert.match(h.st.err, /No se pudo cargar/);
});

test("nim: una práctica completa contra la compu", async () => {
  const h = harness();
  await h.a.openGame("nim");
  h.a.startPractice({ mode: "normal", bots: ["listo"] });
  await playOut(h);
  assert.equal(h.st.table.status, "over");
  assert.equal(h.st.table.rec.actions.length, h.st.table.turn);
});

test("dominó en parejas: una mano completa, la siguiente, y la compu solo actúa en su turno", async () => {
  const h = harness();
  await h.a.openGame("domino");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "4x7p", timer: false, bots: ["b01", "b01", "b01"] });
  for (let i = 0; i < 400 && h.st.table.state.status === "playing"; i++) {
    if (myTurn(h)) h.a.play(domino.legalActions(h.st.table.state, 0)[0]);
    else assert.ok(await h.runNext());
  }
  assert.equal(h.st.table.state.status, "handover");
  assert.equal(h.timers.size, 0, "entre manos la compu no hace nada");
  h.a.play({ type: "next" });
  assert.equal(h.st.table.state.handNo, 2);
});

test("una jugada tuya que no se vale deja un error y no cambia la mesa", async () => {
  const h = harness();
  await h.a.openGame("nim");
  h.a.startPractice({ mode: "normal", bots: ["listo"] });
  await untilMyTurn(h);
  const before = h.st.table;
  h.a.play({ type: "take", n: 99 });
  assert.match(h.st.err, /No se vale/);
  assert.equal(h.st.table, before);
});

test("el reloj juega por ti cuando se vence tu turno", async () => {
  const h = harness();
  await h.a.openGame("domino");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "2x7", timer: true, bots: ["b01"] });
  await untilMyTurn(h);
  const turn = h.st.table.turn;
  assert.equal(h.a.tick().due, false);
  h.advance(21000);
  h.a.tick();
  assert.ok(h.st.table.turn > turn);
  assert.equal(h.st.table.state.hand.history.at(-1).auto, true);
});

test("si tú juegas antes que la compu termine de pensar, su jugada se descarta", async () => {
  const h = harness();
  await h.a.openGame("domino");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "4x7p", timer: false, bots: ["b01", "b01", "b01"] });
  // Forzamos que la compu y tú puedan actuar a la vez: salida de la pareja 0-2
  const t = h.st.table;
  h.st.table = { ...t, state: { ...t.state, hand: { ...t.state.hand, turn: null, board: [], openers: [0, 2], firstReq: null } } };
  h.s.store.notify();
  h.a.play({ type: "play", tile: h.st.table.state.hand.hands[0][0], side: "X" });
  const turnAfterMine = h.st.table.turn;
  while (h.timers.size && h.st.table.turn === turnAfterMine) await h.runNext();
  assert.ok(h.st.table.state.hand.board.length >= 1);
  assert.equal(h.st.table.state.hand.history[0].s, 0, "salió quien tiró primero");
});

test("consejo: se calcula con tu vista y se descarta si cambia el turno", async () => {
  const h = harness();
  await h.a.openGame("domino");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "2x7", timer: false, bots: ["b01"] });
  await untilMyTurn(h);
  h.a.askAdvice();
  assert.deepEqual(h.st.advice.data, null);
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(h.st.advice.data && !h.st.advice.data.error);
  h.a.play(domino.legalActions(h.st.table.state, 0)[0]);
  assert.equal(h.st.advice, null, "al jugar se cierra");
});

test("cambiar el bot de un asiento se recuerda para la siguiente práctica", async () => {
  const h = harness();
  await h.a.openGame("domino");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "2x7" });
  h.a.setSeatBot(1, "b07");
  assert.equal(h.st.table.seats[1].profile, "b07");
  assert.equal(h.a.practiceSettings().bots[0], "b07");
  assert.equal(h.a.practiceSettings().mode, "2x7");
});

test("revancha: otra partida en la misma mesa; salir regresa al lobby y detiene a la compu", async () => {
  const h = harness();
  await h.a.openGame("nim");
  h.a.startPractice({ mode: "normal", bots: ["listo"] });
  await playOut(h);
  h.a.again();
  assert.deepEqual([h.st.table.status, h.st.table.round], ["playing", 2]);
  h.a.leave();
  assert.deepEqual([h.st.screen, h.st.table, h.timers.size], ["lobby", null, 0]);
  h.a.goPortal();
  assert.equal(h.st.screen, "portal");
});

test("opciones del juego (game.options): se escogen en el lobby, llegan a la partida y se recuerdan", async () => {
  const h = harness();
  await h.a.openGame("continental");
  assert.deepEqual(h.a.practiceSettings().options, { buy: "limit" }, "sin escoger: el default");
  h.a.savePractice({ options: { buy: "none" } });
  assert.deepEqual(h.a.practiceSettings().options, { buy: "none" });
  h.a.savePractice({ options: { buy: "no-existe" } });
  assert.deepEqual(h.a.practiceSettings().options, { buy: "limit" }, "un valor que no existe vuelve al default");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "4", timer: false, options: { buy: "free" } });
  assert.equal(h.st.table.config.buy, "free");
  assert.equal(h.st.table.state.config.buy, "free");
  assert.deepEqual(h.a.practiceSettings().options, { buy: "free" });
  // Un juego sin opciones no recibe nada de más
  await h.a.openGame("domino");
  assert.deepEqual(h.a.practiceSettings().options, {});
});

test("continental: la compu compra y juega; te preguntan si compras cuando te toca", async () => {
  const h = harness();
  await h.a.openGame("continental");
  h.a.startPractice({ ...h.a.practiceSettings(), mode: "3", timer: false, options: { buy: "limit" } });
  let bought = false;
  for (let i = 0; i < 600 && h.st.table.status === "playing" && h.st.table.state.roundNo < 3; i++) {
    const g = h.st.game, t = h.st.table;
    if (g.currentSeats(t.state).includes(0)) {
      const la = g.legalActions(t.state, 0);
      if (la[0].type === "buy") bought = true;
      h.a.play(la[0]); continue;
    }
    if (!g.currentSeats(t.state).length) { h.a.play(g.legalActions(t.state, 0)[0]); continue; }
    assert.ok(await h.runNext(), "la compu debía tener algo programado");
  }
  assert.equal(h.st.err, "");
  assert.ok(bought, "te tocó pedir el descarte alguna vez");
  assert.ok(h.st.table.state.roundNo >= 2);
});
