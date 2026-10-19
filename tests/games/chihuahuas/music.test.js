// Las canciones de fondo de la carrera: archivos .mp3 que existen en games/chihuahuas/music/ y no pesan de más para
// un teléfono con datos (128 kbps: unos 1 MB por minuto). Ver el README del juego.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SONGS } from "../../../games/chihuahuas/music/index.js";

const MAX_MB = 3.5;

test("hay al menos una canción, y cada una existe, es .mp3 y pesa poco", () => {
  assert.ok(SONGS.length >= 1);
  assert.equal(new Set(SONGS).size, SONGS.length, "canción repetida en la lista");
  for (const href of SONGS) {
    const file = fileURLToPath(href);
    assert.ok(file.includes("/games/chihuahuas/music/"), `${file}: las canciones van en games/chihuahuas/music/`);
    assert.ok(/\.mp3$/.test(file), `${file}: solo .mp3`);
    assert.ok(existsSync(file), `no existe ${file}`);
    assert.ok(statSync(file).size <= MAX_MB * 1024 * 1024, `${file}: pesa más de ${MAX_MB} MB`);
  }
});
