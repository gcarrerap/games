// Tutorial de Skull: la ronda de ejemplo se juega con las reglas de verdad y los pasos solo usan escenas que existen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, tutorialStates, tutorialScenes, NAMES } from "../../../games/skull/ui/tutorial-script.js";
import { inHand, FLOWER as F, SKULL as S } from "../../../games/skull/engine/index.js";

test("la ronda de ejemplo sigue las reglas: Tú retas con 4, Lupe subió y Beto pasó", () => {
  const st = tutorialStates();
  assert.deepEqual(st.built.stacks, [[F, F], [F, F], [S, F]]);
  assert.equal(st.built.phase, "build");
  assert.deepEqual(st.raised.bid, { n: 3, seat: 1 });
  assert.equal(st.raised.passed[2], true);
  assert.equal(st.challenge.phase, "flip");
  assert.equal(st.challenge.challenger, 0);
  assert.equal(st.challenge.bid.n, 4);
  assert.deepEqual(st.ownFlipped.reveals.map((r) => r.disc), [F, F], "primero los tuyos");
});

test("volteando a Lupe ganas el reto; volteando a Beto te topas con su calavera y pierdes una flor", () => {
  const { won, lost } = tutorialStates();
  assert.equal(won.outcome.success, true);
  assert.equal(won.wins[0], 1);
  assert.equal(lost.outcome.success, false);
  assert.equal(lost.outcome.skullOf, 2);
  assert.equal(lost.outcome.lost, F);
  assert.deepEqual(lost.discs[0], { F: 2, S: 1 });
});

test("las escenas son tu vista: no ves los discos boca abajo de los demás", () => {
  const sc = tutorialScenes();
  assert.deepEqual(sc.built.stacks[2], [null, null]);
  assert.deepEqual(sc.built.stacks[0], [F, F]);
  assert.deepEqual(sc.ownFlipped.stacks[2], [null, null]);
  assert.deepEqual(sc.lost.stacks[2], [S, F], "lo volteado sí se ve");
  assert.deepEqual(inHand(tutorialStates().start, 0), { F: 3, S: 1 });
  assert.equal(NAMES[0], "Tú");
});

test("cada paso usa escenas que existen y cada pregunta tiene una respuesta recomendada", () => {
  const sc = tutorialScenes();
  const ids = new Set();
  for (const s of STEPS) {
    assert.ok(!ids.has(s.id), `paso repetido ${s.id}`); ids.add(s.id);
    if (s.scene) assert.ok(sc[s.scene], `${s.id}: no existe la escena ${s.scene}`);
    if (s.after) assert.ok(sc[s.after], `${s.id}: no existe la escena ${s.after}`);
    assert.ok(s.title && s.text, `${s.id}: sin título o texto`);
    if (s.quiz) {
      assert.ok(s.quiz.options.length >= 2, `${s.id}: la pregunta necesita opciones`);
      assert.ok(s.quiz.options.some((o) => o.kind === "good"), `${s.id}: sin respuesta recomendada`);
      for (const o of s.quiz.options) assert.ok(["good", "ok", "bad"].includes(o.kind) && o.why, `${s.id}: opción ${o.label}`);
    }
  }
});
