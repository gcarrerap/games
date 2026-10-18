// El banco de imágenes de la carrera: solo llaves que la mesa sabe usar (ui/art.js), con archivos que existen en
// games/chihuahuas/assets/ y que no pesan de más para un teléfono. Sin imagen, la mesa usa su respaldo provisional.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BANK } from "../../../games/chihuahuas/assets/bank.js";
import { KEYS } from "../../../games/chihuahuas/ui/art.js";

// KB máximos por llave: fondos grandes, todo lo demás chico
const MAX_KB = { fondo: 300, portada: 300, infield: 200 };

test("el banco solo tiene llaves conocidas, con archivos que existen y pesan poco", () => {
  for (const [key, img] of Object.entries(BANK)) {
    assert.ok(KEYS.includes(key), `${key} no es una llave de ui/art.js`);
    assert.ok(img && typeof img.href === "string", `${key}: falta href`);
    assert.ok(typeof img.prompt === "string" && img.prompt, `${key}: falta el prompt con que se hizo`);
    const file = fileURLToPath(img.href);
    assert.ok(file.includes("/games/chihuahuas/assets/"), `${key}: la imagen va en games/chihuahuas/assets/`);
    assert.ok(existsSync(file), `${key}: no existe ${file}`);
    assert.ok(statSync(file).size <= (MAX_KB[key] || 80) * 1024, `${key}: pesa más de ${MAX_KB[key] || 80} KB`);
    assert.ok(/\.(webp|png|jpg)$/.test(file), `${key}: formato no admitido`);
  }
});

test("hay una llave de perro y una de cara por cada chihuahua", () => {
  for (const id of ["canela", "panda", "chocolate", "nacho", "frijol"]) {
    assert.ok(KEYS.includes(`dog-${id}`) && KEYS.includes(`face-${id}`), id);
  }
});
