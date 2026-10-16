// La votación del descarte de La Pata ahora usa modules/choice (la misma regla que el dominó). Esta prueba compara
// con la función que tenía myPata: con el mismo azar, escoge la misma opción.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vote } from "../../../games/pata/ai/random.js";
import { legacyVote } from "./fixtures/legacy-vote.js";
import { seededRandom } from "../../../modules/random/index.js";

test("con el mismo azar, escoge lo mismo que la versión de myPata", () => {
  const gen = seededRandom("vote");
  let compared = 0, varied = 0;
  for (let k = 0; k < 5000; k++) {
    const n = 1 + Math.floor(gen() * 8);
    const scored = Array.from({ length: n }, (_, i) => ({ id: i, score: Math.round(gen() * 400) / 10 }))
      .sort((a, b) => a.score - b.score || a.id - b.id); // como chooseDiscard: ordenadas, mejor primero
    const slack = [0, 1, 2.5, 6, 15][k % 5], temp = [0, 0.5, 1, 3][k % 4];
    const seed = `v${k}`;
    const a = legacyVote(scored, slack, temp, seededRandom(seed)), b = vote(scored, slack, temp, seededRandom(seed));
    assert.equal(b.id, a.id, JSON.stringify({ scored, slack, temp, seed }));
    compared++; if (a.id !== scored[0].id) varied++;
  }
  assert.ok(varied > 300, "la prueba sí cubre casos donde no gana la mejor");
  assert.equal(compared, 5000);
});

test("sin azar o sin margen, la mejor", () => {
  const scored = [{ id: 0, score: 1 }, { id: 1, score: 1.2 }];
  assert.equal(vote(scored, 5, 1, null).id, 0);
  assert.equal(vote(scored, 0, 1, seededRandom(1)).id, 0);
});
