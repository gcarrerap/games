// El banco de imágenes de la carrera: solo llaves que la mesa sabe usar (ui/art.js), con archivos que existen en
// games/chihuahuas/assets/ y que no pesan de más para un teléfono. Sin imagen, la mesa usa su respaldo provisional.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BANK } from "../../../games/chihuahuas/assets/bank.js";
import { KEYS } from "../../../games/chihuahuas/ui/art.js";
import manifest from "../../../games/chihuahuas/manifest.js";

// KB máximos por llave: fondos grandes, todo lo demás chico. Las de la tele ("@tv" y "fondo-tele") pesan más, pero
// solo las baja la tele.
const MAX_KB = { fondo: 300, portada: 300, infield: 200, "fondo-tele": 600, "portada@tv": 300 };
const maxKb = (key) => MAX_KB[key] || (/^dog-.*@tv$/.test(key) ? 160 : 80);

test("el banco solo tiene llaves conocidas, con archivos que existen y pesan poco", () => {
  for (const [key, img] of Object.entries(BANK)) {
    assert.ok(KEYS.includes(key), `${key} no es una llave de ui/art.js`);
    assert.ok(img && typeof img.href === "string", `${key}: falta href`);
    assert.ok(typeof img.prompt === "string" && img.prompt, `${key}: falta el prompt con que se hizo`);
    const file = fileURLToPath(img.href);
    assert.ok(file.includes("/games/chihuahuas/assets/"), `${key}: la imagen va en games/chihuahuas/assets/`);
    assert.ok(existsSync(file), `${key}: no existe ${file}`);
    assert.ok(statSync(file).size <= maxKb(key) * 1024, `${key}: pesa más de ${maxKb(key)} KB`);
    assert.ok(/\.(webp|png|jpg)$/.test(file), `${key}: formato no admitido`);
  }
});

test("hay una llave de perro y una de cara por cada chihuahua", () => {
  for (const id of ["chia", "oreo", "chocolate", "gustavo", "catrina"]) {
    assert.ok(KEYS.includes(`dog-${id}`) && KEYS.includes(`face-${id}`), id);
  }
});

test("cada imagen de la tele es la versión en alta de una del teléfono", () => {
  for (const key of Object.keys(BANK).filter((k) => k.endsWith("@tv"))) {
    const base = key.slice(0, -3);
    assert.ok(BANK[base], `${key}: falta ${base} para el teléfono`);
    assert.equal(BANK[key].candidate, BANK[base].candidate, `${key}: sale de otro maestro que ${base}`);
  }
  for (const id of ["chia", "oreo", "chocolate", "gustavo", "catrina"]) {
    assert.ok(BANK[`dog-${id}@tv`] && BANK[`face-${id}@tv`], `${id}: falta su versión de la tele`);
  }
  assert.ok(BANK["fondo-tele"], "falta el fondo de la tele");
});

test("la pantalla de espera de la tele usa la portada en alta", () => {
  assert.equal(manifest.remote, true);
  assert.equal(manifest.tvCover, BANK["portada@tv"].href);
});
