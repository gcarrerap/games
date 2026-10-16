// Reloj de turno genérico, con el dominó (que sí tiene reloj).
import { test } from "node:test";
import assert from "node:assert/strict";
import domino from "../../games/domino/index.js";
import nim from "../modules/fixtures/nim.js";
import { newTable, sit, addBot, start, act } from "../../platform/app/table.js";
import { clockStatus, timeoutAction, GRACE_MS } from "../../platform/app/clock.js";

function table(options = {}) {
  let t = newTable(domino, { code: "R", mode: "2x7", options, seed: "r", now: 0 });
  return start(domino, sit(sit(t, 0, { id: "a", name: "Ana" }), 1, { id: "b", name: "Beto" }), 1000);
}

test("cuenta desde que este teléfono vio el turno", () => {
  const t = table(), seat = domino.currentSeats(t.state)[0];
  const c = clockStatus(domino, t, { seenAt: 5000, now: 10000, me: seat });
  assert.deepEqual([c.seat, c.limitMs, c.secs, Math.round(c.pct), c.due], [seat, 20000, 15, 75, false]);
});

test("quien tiene el turno lo resuelve al llegar a 0; los demás esperan un poco más; quien mira, nunca", () => {
  const t = table(), seat = domino.currentSeats(t.state)[0], other = 1 - seat;
  const at = (now, me) => clockStatus(domino, t, { seenAt: 0, now, me }).due;
  assert.equal(at(20000, seat), true);
  assert.equal(at(20000, other), false);
  assert.equal(at(20000 + GRACE_MS, other), true);
  assert.equal(at(99999, -1), false);
  assert.equal(clockStatus(domino, t, { seenAt: 0, now: 20000, me: -1, practice: true }).due, true);
});

test("la acción que resuelve el turno es la del juego, y se aplica como cualquier otra", () => {
  let t = table();
  const c = clockStatus(domino, t, { seenAt: 0, now: 20000, me: 0 });
  t = act(domino, t, c.seat, timeoutAction(domino, t, c.seat), 20000);
  assert.equal(t.turn, 1);
  assert.equal(t.state.hand.history.at(-1).auto, true);
});

test("sin reloj: mesa sin tiempo, juego sin reloj, o sin partida", () => {
  assert.equal(clockStatus(domino, table({ timer: false }), { seenAt: 0, now: 1, me: 0 }), null);
  const n = start(nim, addBot(sit(newTable(nim, { code: "N", mode: "normal", seed: 1, now: 0 }), 0, { id: "a", name: "A" }), 1, { profile: "azar", name: "L" }), 0);
  assert.equal(clockStatus(nim, n, { seenAt: 0, now: 1, me: 0 }), null);
  assert.equal(clockStatus(domino, newTable(domino, { code: "L", mode: "2x7", seed: 1, now: 0 }), { seenAt: 0, now: 1 }), null);
});
