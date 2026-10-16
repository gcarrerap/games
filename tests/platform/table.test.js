// La mesa genérica: asientos, la compu, empezar, jugar y repetir, con el dominó y con un juego de juguete.
import { test } from "node:test";
import assert from "node:assert/strict";
import nim from "../modules/fixtures/nim.js";
import domino from "../../games/domino/index.js";
import { replay } from "../../modules/recording/index.js";
import {
  newTable, sit, leaveSeat, addBot, removeBot, setBotProfile, canStart, start, act, turnKey, mySeat, humanSeats, botSeats, isEmptyTable, seatCount,
} from "../../platform/app/table.js";

const ana = { id: "a", name: "Ana" }, beto = { id: "b", name: "Beto" };
const nimT = () => newTable(nim, { code: "N", mode: "normal", seed: "x", now: 10 });

test("una mesa nueva tiene un asiento por jugador del modo, sin partida", () => {
  const t = newTable(domino, { code: "ABCD", mode: domino.modes.find((m) => m.id === "4x7p"), options: { timer: false }, host: "a", seed: 9, now: 5, version: "v1" });
  assert.equal(t.seats.length, 4);
  assert.deepEqual([t.game, t.mode, t.status, t.state, t.turn, t.round, t.seed], ["domino", "4x7p", "lobby", null, 0, 0, "9"]);
  assert.equal(t.config.timer, false);
  assert.equal(newTable(domino, { code: "X", mode: "3x9", seed: 1, now: 0 }).seats.length, 3, "también por id");
  assert.equal(seatCount(nim, nim.modes[0]), 2);
  assert.throws(() => newTable(domino, { code: "X", mode: "5x5", seed: 1, now: 0 }), /Modo/);
  assert.throws(() => newTable(domino, { code: "X", mode: "2x7", now: 0 }), /semilla/);
});

test("sentarse, cambiarse de asiento, levantarse y la compu", () => {
  let t = sit(nimT(), 0, ana);
  assert.throws(() => sit(t, 0, beto), /ya lo tomaron/);
  t = sit(t, 1, ana);
  assert.deepEqual(t.seats.map((s) => s && s.id), [null, "a"], "se cambió");
  t = leaveSeat(t, "a");
  assert.ok(isEmptyTable(t));
  t = addBot(sit(t, 0, ana), 1, { profile: "azar", name: "Lupe" });
  assert.equal(isEmptyTable(t), false);
  assert.deepEqual([humanSeats(t), botSeats(t), mySeat(t, "a"), mySeat(t, "zz")], [[0], [1], 0, -1]);
  t = setBotProfile(t, 1, "listo");
  assert.equal(t.seats[1].profile, "listo");
  assert.throws(() => removeBot(t, 0), /no está la compu/);
  assert.equal(removeBot(t, 1).seats[1], null);
  assert.throws(() => sit(t, 7, beto), /no existe/);
});

test("las funciones no cambian la mesa que reciben", () => {
  const t = nimT(), before = JSON.stringify(t);
  sit(t, 0, ana); addBot(t, 1, { profile: "azar", name: "L" });
  assert.equal(JSON.stringify(t), before);
});

test("empezar: hacen falta todos los asientos; reparte con nombres y graba", () => {
  let t = sit(nimT(), 0, ana);
  assert.equal(canStart(t), false);
  assert.throws(() => start(nim, t, 20), /Faltan/);
  t = start(nim, addBot(t, 1, { profile: "listo", name: "Lupe" }), 20);
  assert.deepEqual([t.status, t.round, t.turn, t.state.started], ["playing", 1, 0, 20]);
  assert.equal(t.rec.seed, "x:1");
  assert.deepEqual(t.rec.meta.players, [{ id: "a", name: "Ana" }, { bot: true, profile: "listo", name: "Lupe" }]);
  assert.throws(() => sit(t, 0, beto), /ya empezó/);
  assert.throws(() => start(nim, t, 30), /ya empezó/);
});

test("jugar: cada acción cuenta un turno, se graba y la mesa se repite igual", () => {
  let t = start(nim, addBot(sit(nimT(), 0, ana), 1, { profile: "listo", name: "L" }), 20);
  const keys = new Set([turnKey(t)]);
  for (let i = 0; t.status === "playing"; i++) {
    const seat = nim.currentSeats(t.state)[0];
    t = act(nim, t, seat, nim.legalActions(t.state, seat)[0], 100 + i);
    keys.add(turnKey(t));
  }
  assert.equal(t.status, "over");
  assert.equal(turnKey(t), null);
  assert.equal(keys.size, t.turn + 1, "un turnKey distinto por acción");
  assert.deepEqual(replay(nim, JSON.parse(JSON.stringify(t.rec))), t.state);
  assert.throws(() => act(nim, t, 0, { type: "take", n: 1 }, 999), /No hay partida/);
});

test("una acción inválida no cambia nada", () => {
  const t = start(nim, addBot(sit(nimT(), 0, ana), 1, { profile: "listo", name: "L" }), 20);
  const other = 1 - nim.currentSeats(t.state)[0];
  assert.throws(() => act(nim, t, other, { type: "take", n: 1 }, 30));
  assert.equal(t.turn, 0);
  assert.equal(t.rec.actions.length, 0);
});

test("otra partida en la misma mesa: nueva semilla, mismos asientos", () => {
  let t = start(nim, addBot(sit(nimT(), 0, ana), 1, { profile: "listo", name: "L" }), 20);
  while (t.status === "playing") { const s = nim.currentSeats(t.state)[0]; t = act(nim, t, s, nim.legalActions(t.state, s)[0], 50); }
  const t2 = start(nim, t, 60);
  assert.deepEqual([t2.round, t2.turn, t2.status, t2.rec.seed, t2.rec.actions.length], [2, 0, "playing", "x:2", 0]);
  assert.deepEqual(t2.seats, t.seats);
});

test("dominó en una mesa: con nombres, la compu y el reloj de la mesa", () => {
  let t = newTable(domino, { code: "D", mode: "2x7", seed: "d", now: 0 });
  t = start(domino, addBot(sit(t, 0, ana), 1, { profile: "b02", name: "Lupe" }), 1000);
  assert.deepEqual(t.state.seats.map((s) => s.name), ["Ana", "Lupe"]);
  assert.equal(t.state.config.timer, true);
  const seat = domino.currentSeats(t.state)[0];
  const a = domino.bots.decide(domino.view(t.state, seat), seat, "b02", { rnd: () => 0.5 });
  t = act(domino, t, seat, a, 2000);
  assert.equal(t.turn, 1);
  assert.deepEqual(replay(domino, JSON.parse(JSON.stringify(t.rec))), t.state);
});
