// La compu del Continental: encuentra la bajada, decide igual con su vista que con el estado completo, y los niveles
// están en orden (en partidas con semilla).
import { test } from "node:test";
import assert from "node:assert/strict";
import game from "../../../games/continental/index.js";
import { findDown, distance, botMove } from "../../../games/continental/ai/index.js";
import { contractOf, checkDown } from "../../../games/continental/engine/index.js";
import { playGame } from "../../../modules/tournament/index.js";
import { seededRandom } from "../../../modules/random/index.js";

test("encuentra la bajada de cada contrato (usando comodines si hacen falta)", () => {
  assert.ok(findDown(["7H0", "7S0", "7C0", "9D0", "9S0", "XR0", "KC0"], contractOf(1)));
  assert.equal(findDown(["7H0", "7S0", "7C0", "9D0", "8S0", "XR0", "KC0"], contractOf(1)), null);
  const g = findDown(["5H0", "6H0", "2S0", "8H0", "JC0", "JD0", "JS0", "AD0"], contractOf(2));
  assert.ok(g);
  assert.deepEqual(g.map((x) => x.length).sort(), [3, 4]);
  // Dos escaleras del mismo palo con cartas de dos barajas
  assert.ok(findDown(["3S0", "4S0", "5S0", "6S0", "3S1", "4S1", "5S1", "6S1", "KD0"], contractOf(3)));
  // El As arriba
  assert.ok(findDown(["JH0", "QH0", "KH0", "AH0", "7C0", "7D0", "7S0", "9C0"], contractOf(2)));
});

test("distancia al contrato: 0 si ya se baja; cuenta los comodines", () => {
  assert.equal(distance(["7H0", "7S0", "7C0", "9D0", "9S0", "9C0"], contractOf(1)), 0);
  assert.equal(distance(["7H0", "7S0", "7C0", "9D0", "9S0", "KC0"], contractOf(1)), 1);
  assert.equal(distance(["7H0", "7S0", "7C0", "9D0", "9S0", "XB0"], contractOf(1)), 0);
  assert.equal(distance(["AH0", "3S0", "5C0", "7D0", "9H0", "JS0"], contractOf(1)), 4);
});

test("la compu se baja con lo que encontró y la bajada es válida", () => {
  let st = game.setup({ n: 2, timer: false }, { rnd: seededRandom(1), now: 0 });
  const s = st.hand.turn;
  st.hand.hands[s] = ["7H0", "7S0", "7C0", "9D0", "9S0", "XR0"];
  st = game.apply(st, s, { type: "draw" }, { rnd: seededRandom(2), now: 0 });
  const a = botMove(game.view(st, s), s, 2);
  assert.equal(a.type, "down");
  assert.equal(checkDown(st, s, a.groups), null);
});

test("privacidad: los tres niveles deciden lo mismo con su vista que con el estado completo", () => {
  for (const level of ["1", "2", "3"]) {
    let checked = 0;
    playGame(game, [level, level, level, level], {
      config: { n: 4, timer: false }, seed: 11, stopWhen: (st) => st.roundNo > 3,
      decide: (v, seat, profile, ctx, full) => {
        const a = game.bots.decide(v, seat, profile, { rnd: seededRandom(`x${checked}`) });
        const b = game.bots.decide(full, seat, profile, { rnd: seededRandom(`x${checked}`) });
        assert.deepEqual(a, b);
        checked++;
        return a;
      },
    });
    assert.ok(checked > 30);
  }
});

test("niveles: el difícil junta menos puntos que el fácil", () => {
  let hard = 0, easy = 0;
  for (let g = 0; g < 12; g++) {
    const prof = [0, 1, 2, 3].map((i) => ((i + g) % 2 ? "1" : "3"));
    const r = playGame(game, prof, { config: { n: 4, timer: false }, seed: 300 + g });
    r.result.scores.forEach((v, i) => { if (prof[i] === "3") hard += v; else easy += v; });
  }
  assert.ok(hard < easy, `difícil ${hard} contra fácil ${easy}`);
});
