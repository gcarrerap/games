// El detector de agitado: empieza con varias sacudidas seguidas, termina con silencio, y solo cuenta como tiro si
// duró lo suficiente. Las lecturas quietas (solo gravedad) o un golpe suelto no hacen nada.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createShakeDetector } from "../../../modules/shake/index.js";

const still = (t) => ({ x: 0, y: 0, z: 9.8, t });
const jolt = (t, k) => ({ x: (k % 2 ? 1 : -1) * 25, y: 0, z: 9.8, t });

function run(samples) {
  const d = createShakeDetector();
  return samples.map((s) => d.feed(s)).filter(Boolean);
}

test("quieto o con un golpe suelto no pasa nada", () => {
  const s = []; for (let t = 0; t < 2000; t += 20) s.push(still(t));
  assert.deepEqual(run(s), []);
  s.splice(20, 1, jolt(400, 1));
  assert.deepEqual(run(s), []);
});

test("agitar un rato: empieza, sigue y termina como tiro con su fuerza", () => {
  const s = []; let t = 0;
  for (; t < 200; t += 20) s.push(still(t));
  for (let k = 0; t < 900; t += 20, k++) s.push(jolt(t, k));
  for (; t < 1600; t += 20) s.push(still(t));
  const ev = run(s);
  assert.equal(ev[0].type, "start");
  assert.ok(ev.some((e) => e.type === "shake"));
  const end = ev.find((e) => e.type === "end");
  assert.equal(end.throw, true);
  assert.ok(end.power > 0.3 && end.power <= 1);
  assert.equal(ev.filter((e) => e.type === "start").length, 1);
});

test("una sacudida muy corta termina sin tiro", () => {
  const s = []; let t = 0;
  for (; t < 200; t += 20) s.push(still(t));
  for (let k = 0; k < 4; t += 20, k++) s.push(jolt(t, k));
  for (; t < 1200; t += 20) s.push(still(t));
  const end = run(s).find((e) => e.type === "end");
  assert.equal(end.throw, false);
});
