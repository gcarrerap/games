// Reglas de Piojos: tirar, perder el turno sin piojos, plantarse, los 5 piojos y la meta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, FACES, newGame, apply, legalActions, autoAction, bustChance, rollValue } from "../../../games/piojos/engine/index.js";
import { decide, limitFor } from "../../../games/piojos/ai/index.js";
import game from "../../../games/piojos/index.js";

// Azar que da las caras en el orden pedido
const dice = (...faces) => { let i = 0; return () => (FACES.indexOf(faces[i++ % faces.length]) + 0.5) / FACES.length; };
const ctx = (...faces) => ({ rnd: dice(...faces), now: 0 });
const fresh = (n = 2) => newGame({ n, timer: false }, ["Ana", "Noe", "Gui"].slice(0, n));

test("solo 9, 10 y As valen puntos, sin extras por combinaciones", () => {
  assert.equal(rollValue(["9", "10", "A", "J", "K"]), RULES.values[9] + RULES.values[10] + RULES.values.A);
  assert.equal(rollValue(["A", "A", "A", "A", "A"]), 5 * RULES.values.A);
  assert.equal(rollValue(["J", "Q", "K"]), 0);
  assert.equal(bustChance(1), 0.5);
});

test("al empezar el turno solo se puede tirar, y solo el que tiene el turno", () => {
  const st = fresh();
  assert.deepEqual(legalActions(st, 0), [{ type: "roll" }]);
  assert.deepEqual(legalActions(st, 1), []);
  assert.throws(() => apply(st, 0, { type: "bank" }, ctx("A")), /tirar/);
  assert.throws(() => apply(st, 1, { type: "roll" }, ctx("A")), /turno/);
});

test("los piojos se apartan y se suman; los demás dados se pueden volver a tirar", () => {
  const st = apply(fresh(), 0, { type: "roll" }, ctx("A", "9", "J", "Q", "K"));
  assert.equal(st.phase, "choose");
  assert.equal(st.turnPts, RULES.values.A + RULES.values[9]);
  assert.deepEqual(st.apart, ["A", "9"]);
  assert.equal(st.dice, 3);
  assert.deepEqual(legalActions(st, 0).map((a) => a.type), ["roll", "bank"]);
  const st2 = apply(st, 0, { type: "roll" }, ctx("10", "J", "J"));
  assert.equal(st2.turnPts, st.turnPts + RULES.values[10]);
  assert.equal(st2.dice, 2);
});

test("plantarse pasa lo del turno al marcador y le toca al siguiente", () => {
  let st = apply(fresh(), 0, { type: "roll" }, ctx("A", "A", "J", "Q", "K"));
  st = apply(st, 0, { type: "bank" }, ctx("A"));
  assert.deepEqual(st.scores, [2 * RULES.values.A, 0]);
  assert.equal(st.turn, 1);
  assert.equal(st.phase, "roll");
  assert.equal(st.dice, 5);
  assert.equal(st.turnPts, 0);
  assert.deepEqual(st.last, { seat: 0, roll: ["A", "A", "J", "Q", "K"], kind: "bank", pts: 2 * RULES.values.A });
});

test("sin piojos en el tiro se pierde todo lo del turno y pasa el turno", () => {
  let st = apply(fresh(), 0, { type: "roll" }, ctx("A", "10", "J", "Q", "K"));
  st = apply(st, 0, { type: "roll" }, ctx("J", "Q", "K"));
  assert.deepEqual(st.scores, [0, 0]);
  assert.equal(st.turn, 1);
  assert.equal(st.last.kind, "bust");
  assert.equal(st.last.pts, RULES.values.A + RULES.values[10]);
});

test("si los 5 dados son piojos, se vuelven a tirar los 5 sin perder lo del turno", () => {
  let st = apply(fresh(), 0, { type: "roll" }, ctx("A", "9", "J", "Q", "K"));
  st = apply(st, 0, { type: "roll" }, ctx("10", "9", "A"));
  assert.equal(st.hot, true);
  assert.equal(st.dice, 5);
  assert.deepEqual(st.apart, []);
  const before = st.turnPts;
  st = apply(st, 0, { type: "roll" }, ctx("9", "J", "J", "J", "J"));
  assert.equal(st.turnPts, before + RULES.values[9]);
  assert.equal(st.dice, 4);
});

test("gana quien se planta y llega a la meta", () => {
  let st = { ...fresh(), scores: [RULES.goal - 10, 0] };
  st = apply(st, 0, { type: "roll" }, ctx("A", "J", "J", "J", "J"));
  st = apply(st, 0, { type: "bank" }, ctx("A"));
  assert.equal(st.phase, "over");
  assert.equal(st.winner, 0);
  assert.ok(game.isOver(st));
  assert.deepEqual(game.result(st).champions, [0]);
  assert.deepEqual(legalActions(st, 0), []);
});

test("el reloj tira si no has tirado y te planta si ya tiraste", () => {
  const st = fresh();
  assert.deepEqual(autoAction(st), { type: "roll" });
  assert.deepEqual(autoAction(apply(st, 0, { type: "roll" }, ctx("A", "J", "J", "J", "J"))), { type: "bank" });
});

test("la compu se planta si con eso gana, y sigue tirando con muchos dados y pocos puntos", () => {
  let st = apply(fresh(), 0, { type: "roll" }, ctx("9", "J", "J", "J", "J"));
  assert.deepEqual(decide(st, 0, "normal"), { type: "roll" });
  assert.deepEqual(decide({ ...st, scores: [RULES.goal - 5, 0] }, 0, "normal"), { type: "bank" });
  assert.deepEqual(decide({ ...st, dice: 1, turnPts: Math.ceil(limitFor(1)) + 50 }, 0, "normal"), { type: "bank" });
  assert.equal(decide(st, 1, "normal"), null);
});

test("la prudente se planta antes que la arriesgada", () => {
  const st = { ...apply(fresh(), 0, { type: "roll" }, ctx("A", "A", "J", "Q", "K")), turnPts: Math.round(limitFor(3)) };
  assert.deepEqual(decide(st, 0, "prudente"), { type: "bank" });
  assert.deepEqual(decide(st, 0, "arriesgado"), { type: "roll" });
});
