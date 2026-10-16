// Las reglas de Firestore se comparten con Noli, La Pata y myDomino (mismo proyecto, un solo archivo de reglas).
// Publicar este archivo reemplaza todas las reglas: si le faltara el bloque de otra app, esa app se quedaría sin
// acceso. Esta prueba revisa que estén las colecciones de las cuatro apps, con los nombres que usa su código.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { TABLES, RECORDINGS } from "../../platform/services/index.js";

const rules = fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
const matched = new Set([...rules.matchAll(/match \/([A-Za-z0-9_-]+)\//g)].map((m) => m[1]));

const APPS = {
  "Juegos de la Familia": [TABLES, RECORDINGS],
  "Noli (gcarrerap/noli)": ["noli_perfiles", "juegos", "noli_vinculos", "noli_salas", "senales", "acciones"],
  "La Pata (gcarrerap/myPata)": ["pata_mesas", "pata_rondas", "pata_llamadas"],
  "myDomino": ["mesas", "manos"],
};

for (const [app, cols] of Object.entries(APPS)) {
  test(`las reglas incluyen las colecciones de ${app}`, () => {
    for (const c of cols) assert.ok(matched.has(c), `falta match /${c}/`);
  });
}

test("el control remoto de Noli puede mandar todas sus acciones, incluida 'brincar'", () => {
  for (const a of ["arriba", "abajo", "izquierda", "derecha", "ok", "atras", "brincar"]) assert.ok(rules.includes(`'${a}'`), a);
});

test("todo lo demás está cerrado, y es lo último", () => {
  const i = rules.lastIndexOf("match /{document=**}");
  assert.ok(i > 0);
  assert.equal(rules.indexOf("match /", i + 1), -1, "no hay reglas después del cierre general");
  assert.match(rules.slice(i), /allow read, write: if false;/);
});
