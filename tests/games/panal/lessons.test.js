// El tutorial de Panal: cada lección se puede cumplir con jugadas legales, su solución la cumple, y lo que la lección
// no permite no cuenta. Las lecciones usan las reglas del juego, así que si las reglas cambian, esto avisa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LESSONS, lessonState } from "../../../games/panal/ui/lessons.js";
import { legalActions, apply } from "../../../games/panal/engine/index.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test("las lecciones tienen título y texto, y solo la última es puro texto", () => {
  assert.ok(LESSONS.length >= 8);
  for (const l of LESSONS) assert.ok(l.title && l.text, l.id);
  assert.equal(LESSONS.filter((l) => !l.spec).length, 1);
  assert.ok(!LESSONS[LESSONS.length - 1].spec);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
});

for (const l of LESSONS.filter((x) => x.spec)) {
  test(`lección ${l.id}: la solución es legal, la permite la lección y cumple la tarea`, () => {
    const st = lessonState(l);
    const legal = legalActions(st, 0).filter(l.only);
    assert.ok(legal.some((a) => same(a, l.solution)), `${JSON.stringify(l.solution)} no está entre ${legal.length} jugadas`);
    assert.ok(l.goal(l.solution, apply(st, 0, l.solution)));
    if (l.goalCell) assert.equal(l.solution.to, l.goalCell);
    if (l.tray) assert.ok(legal.some((a) => a.type === "place"));
  });
}

test("lecciones con varias salidas: no todo cuenta", () => {
  const hormiga = LESSONS.find((l) => l.id === "hormiga"), st = lessonState(hormiga);
  const other = legalActions(st, 0).filter(hormiga.only).find((a) => a.to !== hormiga.goalCell);
  assert.ok(other && !hormiga.goal(other, apply(st, 0, other)));
  const caber = LESSONS.find((l) => l.id === "caber"), cs = lessonState(caber);
  assert.ok(!legalActions(cs, 0).some((a) => a.from === "-1,1" && a.to === "0,0"), "la hormiga no cabe en el hueco");
  const colmena = LESSONS.find((l) => l.id === "colmena"), co = lessonState(colmena);
  assert.ok(!legalActions(co, 0).some((a) => a.from === "1,0"), "la hormiga que une dos partes no se mueve");
  const reina4 = LESSONS.find((l) => l.id === "reina4");
  assert.ok(legalActions(lessonState(reina4), 0).every((a) => a.type === "place" && a.kind === "reina"));
});
