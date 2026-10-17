// Quién va en grande en la vista "solo videos" (modules/call/layout.js): la otra persona en una llamada de dos, quien
// habla si son varios, sin brincar con cada ruidito.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextFeatured, TALK_MS, HOLD_MS } from "../../../modules/call/index.js";

// Corre el reloj de 150 en 150 ms (como el medidor de la interfaz) con quién suena en cada momento
function run(peers, script, until, start = null) {
  let f = start, out = [];
  for (let now = 0; now <= until; now += 150) {
    f = nextFeatured(f, { peers, talking: script(now), now });
    out.push([now, f.id]);
  }
  return { f, out };
}

test("solo: nadie en grande; de dos: siempre la otra persona, hable o no", () => {
  assert.equal(nextFeatured(null, { peers: [], now: 0 }).id, null);
  const { out } = run(["mel"], () => ({ __me: true }), 5000);
  assert.ok(out.every(([, id]) => id === "mel"));
});

test("varios: empieza el primero y pasa a grande quien habla", () => {
  const { f, out } = run(["a", "b", "c"], (t) => (t >= 2500 ? { c: true } : {}), 5000);
  assert.equal(out[0][1], "a");
  assert.equal(f.id, "c");
  const when = out.find(([, id]) => id === "c")[0];
  assert.ok(when >= 2500 + TALK_MS && when < 2500 + TALK_MS + 300, `cambió a los ${when} ms`);
});

test("un ruidito corto no cambia a quien está en grande", () => {
  const { out } = run(["a", "b"].concat("c"), (t) => (t >= 3000 && t < 3000 + TALK_MS - 100 ? { b: true } : {}), 6000);
  assert.ok(out.every(([, id]) => id === "a"));
});

test("quien está en grande se queda HOLD_MS aunque otro hable, y nadie lo quita mientras habla", () => {
  // b toma el lugar; c empieza a hablar enseguida: espera a que pasen HOLD_MS desde que b llegó
  const { out } = run(["a", "b", "c"], (t) => (t < 3000 ? { b: true } : { c: true }), 8000);
  const bAt = out.find(([, id]) => id === "b")[0], cAt = out.find(([, id]) => id === "c")[0];
  assert.ok(cAt - bAt >= HOLD_MS, `b estuvo ${cAt - bAt} ms`);
  // Hablan los dos a la vez: se queda el que ya estaba en grande
  const both = run(["a", "b", "c"], (t) => (t < 3000 ? { b: true } : { b: true, c: true }), 9000);
  assert.ok(both.out.filter(([t]) => t > 3000).every(([, id]) => id === "b"));
});

test("si quien está en grande se va, pasa el siguiente; tú nunca vas en grande con alguien más", () => {
  const f = nextFeatured({ id: "b", at: 0, cand: null, candAt: 0 }, { peers: ["a", "c"], talking: { __me: true }, now: 10000 });
  assert.equal(f.id, "a");
  const { out } = run(["a", "b"], () => ({ __me: true }), 8000);
  assert.ok(out.every(([, id]) => id === "a"));
});
