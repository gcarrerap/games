// Las reglas de Firestore son solo de este sitio (proyecto gcarrerap-games). Publicar este archivo reemplaza todas
// las reglas del proyecto, así que esta prueba revisa que estén todas las colecciones que usa el código, que no
// queden bloques de otras apps y que todo lo demás esté cerrado.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { TABLES, RECORDINGS, CALLS } from "../../platform/services/index.js";

const rules = fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
const matched = new Set([...rules.matchAll(/match \/([A-Za-z0-9_-]+)\//g)].map((m) => m[1]));
matched.delete("databases");

test("las reglas incluyen las colecciones de Juegos de la Familia", () => {
  for (const c of [TABLES, RECORDINGS, CALLS]) assert.ok(matched.has(c), `falta match /${c}/`);
});

test("las reglas no traen colecciones que este sitio no usa", () => {
  const extra = [...matched].filter((c) => ![TABLES, RECORDINGS, CALLS].includes(c));
  assert.deepEqual(extra, []);
});

test("todo lo demás está cerrado, y es lo último", () => {
  const i = rules.lastIndexOf("match /{document=**}");
  assert.ok(i > 0);
  assert.equal(rules.indexOf("match /", i + 1), -1, "no hay reglas después del cierre general");
  assert.match(rules.slice(i), /allow read, write: if false;/);
});
