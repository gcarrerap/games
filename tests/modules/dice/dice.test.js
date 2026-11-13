// Dados en 3D (lo puro): cada lugar del cubo tiene su giro, y los dados caen dentro del paño sin encimarse.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOW, FACE_AT, pickSpots } from "../../../modules/dice/index.js";
import { seededRandom } from "../../../modules/random/index.js";

test("los seis lugares tienen giro y posición, y son distintos", () => {
  assert.deepEqual(Object.keys(SHOW).sort(), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(new Set(Object.values(SHOW).map(String)).size, 6);
  assert.equal(new Set(Object.values(FACE_AT)).size, 6);
});

test("los dados caen dentro de la caja y sin encimarse", () => {
  const box = { x: 10, y: 20, w: 360, h: 220 }, d = 56;
  for (let k = 0; k < 20; k++) {
    const s = pickSpots(5, box, d, seededRandom(`d${k}`));
    assert.equal(s.length, 5);
    for (const p of s) assert.ok(p.x >= box.x && p.y >= box.y && p.x + d <= box.x + box.w && p.y + d <= box.y + box.h);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) assert.ok(Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y) >= d, "encimados");
  }
});
