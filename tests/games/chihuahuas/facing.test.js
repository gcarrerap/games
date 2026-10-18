// Hacia dónde mira cada perro según la casilla (issue #49)
import { test } from "node:test";
import assert from "node:assert/strict";
import { facingAt, facingStep, opposite } from "../../../games/chihuahuas/ui/facing.js";
import { RULES } from "../../../games/chihuahuas/engine/index.js";

test("avanzando, mira hacia donde corre en cada tramo", () => {
  const want = (s) => (s <= 4 ? "right" : s <= 8 ? "up" : s <= 12 ? "left" : "down");
  for (let s = 1; s <= RULES.track; s++) assert.equal(facingAt(s), want(s), `casilla ${s}`);
});

test("al cruzar la meta mira de frente", () => {
  assert.equal(facingAt(RULES.track + 1), "down");
  assert.equal(facingAt(RULES.track + 3), "down");
});

test("hacia atrás (aspiradora) usa la vista contraria", () => {
  assert.equal(facingStep(5, 4), "left");
  assert.equal(facingStep(9, 8), "down");
  assert.equal(facingStep(13, 12), "right");
  assert.equal(facingStep(14, 13), "up");
  assert.equal(facingStep(3, 4), "right");
  assert.equal(facingStep(4, 5), "up");
  for (const f of ["right", "up", "left", "down"]) assert.equal(opposite(opposite(f)), f);
});
