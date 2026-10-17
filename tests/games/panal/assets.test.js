// El banco de imágenes de Panal: cada entrada es de un bicho del juego y apunta a un archivo que existe en
// games/panal/assets/; los bichos sin imagen usan su dibujo SVG (ui/art.js no se prueba aquí: usa el DOM solo al dibujar).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BANK } from "../../../games/panal/assets/bank.js";
import { KINDS } from "../../../games/panal/engine/index.js";

test("el banco solo tiene bichos del juego, con archivos que existen y pesan poco", () => {
  for (const [kind, img] of Object.entries(BANK)) {
    assert.ok(KINDS.includes(kind), `${kind} no es un bicho de Panal`);
    assert.ok(img && typeof img.href === "string", `${kind}: falta href`);
    const file = fileURLToPath(img.href);
    assert.ok(file.includes("/games/panal/assets/"), `${kind}: la imagen va en games/panal/assets/`);
    assert.ok(existsSync(file), `${kind}: no existe ${file}`);
    assert.ok(statSync(file).size <= 60 * 1024, `${kind}: pesa más de 60 KB`);
    assert.ok(/\.(webp|png|svg)$/.test(file), `${kind}: formato no admitido`);
  }
});
