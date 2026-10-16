import { test } from "node:test";
import assert from "node:assert/strict";
import nim from "../fixtures/nim.js";
import { validateGame } from "../../../platform/core/contract.js";
import { startRecording, initialState, step, replay, nextCtx, actionCtx } from "../../../modules/recording/index.js";

function playSome(seed, moves) {
  let rec = startRecording({ game: nim, config: nim.modes[0], seed, now: 1000, meta: { mesa: "PRUEBA" } });
  let state = initialState(nim, rec);
  for (let i = 0; i < moves && !nim.isOver(state); i++) {
    ({ state, rec } = step(nim, state, rec, state.turn, nim.legalActions(state, state.turn).at(-1), 2000 + i * 500));
  }
  return { state, rec };
}

test("el juego de prueba cumple el contrato", () => {
  assert.deepEqual(validateGame(nim), []);
});

test("repetir una grabación da exactamente el mismo estado, con el azar de en medio", () => {
  const { state, rec } = playSome("s1", 50);
  assert.ok(rec.actions.length > 3);
  assert.deepEqual(replay(nim, rec), state);
  const viaJson = JSON.parse(JSON.stringify(rec));
  assert.deepEqual(replay(nim, viaJson), state, "sobrevive a guardarse como JSON");
});

test("upTo repite solo el principio", () => {
  const { rec } = playSome("s2", 50);
  const partial = playSome("s2", 2);
  assert.deepEqual(replay(nim, rec, { upTo: 2 }), partial.state);
});

test("las horas grabadas son las que reciben las jugadas", () => {
  const { state, rec } = playSome("s3", 3);
  assert.deepEqual(state.log.map((e) => e.t), rec.actions.map((a) => a.t));
  assert.equal(state.started, 1000);
});

test("una acción no válida no cambia la grabación, y una grabación alterada se detecta", () => {
  const { state, rec } = playSome("s4", 2);
  assert.throws(() => step(nim, state, rec, 1 - state.turn, { type: "take", n: 1 }, 9999));
  const bad = { ...rec, actions: rec.actions.map((a, i) => (i === 1 ? { ...a, seat: 1 - a.seat } : a)) };
  assert.throws(() => replay(nim, bad), /Acción 1 no válida/);
  assert.throws(() => replay({ ...nim, id: "otro" }, rec), /es de nim/);
});

test("el contexto de cada acción depende solo de la semilla, el número y la hora", () => {
  const { rec } = playSome("s5", 1);
  const a = nextCtx(rec, 77), b = actionCtx("s5", 1, 77);
  assert.equal(a.now, 77);
  assert.deepEqual([a.rnd(), a.rnd()], [b.rnd(), b.rnd()]);
  assert.throws(() => startRecording({ game: nim, config: {}, now: 0 }), /semilla/);
});
