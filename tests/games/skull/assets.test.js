// El banco de imágenes de Skull: cada entrada es de una cara del disco y apunta a un archivo que existe en
// games/skull/assets/; las caras sin imagen usan su dibujo SVG (ui/disc.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BANK } from "../../../games/skull/assets/bank.js";

const FACES = ["flower", "skull", "back"];

test("el banco solo tiene caras del disco, con archivos que existen y pesan poco", () => {
  for (const [key, img] of Object.entries(BANK)) {
    assert.ok(FACES.includes(key), `${key} no es una cara del disco`);
    assert.ok(img && typeof img.href === "string", `${key}: falta href`);
    const file = fileURLToPath(img.href);
    assert.ok(file.includes("/games/skull/assets/"), `${key}: la imagen va en games/skull/assets/`);
    assert.ok(existsSync(file), `${key}: no existe ${file}`);
    assert.ok(statSync(file).size <= 60 * 1024, `${key}: pesa más de 60 KB`);
    assert.ok(/\.(webp|png|svg)$/.test(file), `${key}: formato no admitido`);
  }
});
