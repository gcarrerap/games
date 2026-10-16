// Todos los juegos del registro cumplen el contrato, y el validador detecta módulos incompletos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGame } from "../platform/core/contract.js";
import { GAMES } from "../games/registry.js";

const fn = () => {};
const minimal = {
  id: "demo", name: "Demo", players: { min: 1, max: 2 }, modes: [{ players: 2 }],
  setup: fn, currentSeats: fn, legalActions: fn, apply: fn, view: fn, isOver: fn, result: fn, ui: fn,
};

test("un módulo mínimo cumple el contrato", () => {
  assert.deepEqual(validateGame(minimal), []);
});

test("el validador detecta lo que falta", () => {
  const { apply, ...sinApply } = minimal;
  assert.ok(validateGame(sinApply).some((e) => e.startsWith("apply")));
  assert.ok(validateGame({ ...minimal, id: "Mi Juego" }).some((e) => e.startsWith("id")));
  assert.ok(validateGame({ ...minimal, players: { min: 3, max: 2 } }).some((e) => e.startsWith("players")));
});

for (const entry of GAMES) {
  test(`${entry.id} cumple el contrato`, async () => {
    const { default: game } = await entry.load();
    assert.deepEqual(validateGame(game), []);
    assert.equal(game.id, entry.id);
  });
}
