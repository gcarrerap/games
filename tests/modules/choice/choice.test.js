import { test } from "node:test";
import assert from "node:assert/strict";
import { bestIndex, choiceProbs, chooseIndex } from "../../../modules/choice/index.js";
import { seededRandom } from "../../../modules/random/index.js";

const azar = { ventana: 1, temperatura: 0.5, escala: 5 };

test("sin azar siempre la mejor", () => {
  assert.equal(bestIndex([1, 9, 9, 3]), 1);
  assert.deepEqual(choiceProbs([1, 9, 3], null), [0, 1, 0]);
});

test("una opción claramente mejor se escoge siempre", () => {
  assert.deepEqual(choiceProbs([20, 0, 1], azar), [1, 0, 0]);
});

test("entre opciones cercanas se reparte, con más peso para la mejor", () => {
  const p = choiceProbs([10, 8, -50], azar);
  assert.ok(p[0] > p[1] && p[1] > 0);
  assert.equal(p[2], 0);
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test("chooseIndex sigue esas probabilidades", () => {
  const rnd = seededRandom(1), n = 4000, count = [0, 0, 0];
  for (let i = 0; i < n; i++) count[chooseIndex([10, 8, -50], azar, rnd)]++;
  const p = choiceProbs([10, 8, -50], azar);
  assert.equal(count[2], 0);
  assert.ok(Math.abs(count[0] / n - p[0]) < 0.03);
});
