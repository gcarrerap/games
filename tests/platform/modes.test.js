// Modos del aparato (docs/ARCHITECTURE.md §5): todos los juegos del registro ponen el bloque de modo en su menú
// de la partida (platform/ui/modes.js), también en su dibujo de Monitor si tiene uno aparte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { GAMES } from "../../games/registry.js";

const root = new URL("../../", import.meta.url);
const uiSource = (id) => readdirSync(new URL(`games/${id}/ui/`, root))
  .filter((f) => f.endsWith(".js"))
  .map((f) => readFileSync(new URL(`games/${id}/ui/${f}`, root), "utf8")).join("\n");

for (const g of GAMES) {
  test(`${g.id}: el menú de la partida deja cambiar de modo`, () => {
    const src = uiSource(g.id);
    assert.match(src, /\$\{modeMenu\(ctx\)\}/, "falta modeMenu(ctx) en el menú");
    assert.match(src, /wireModeMenu\(ctx\.modal, ctx\)/, "falta wireModeMenu(ctx.modal, ctx)");
    assert.equal(g.tv, undefined, "tv ya no existe: todos tienen Monitor");
  });
}

test("los juegos con dibujo de Monitor propio tienen el botón del menú ahí también", () => {
  for (const g of GAMES) {
    const src = uiSource(g.id);
    if (!/display === "tv"|\bconst tv = display === "tv"/.test(src)) continue;
    // En su rama de Monitor está el botón del menú (antes no lo había: la tele nadie la toca)
    const tvBranch = src.slice(src.search(/if \((tv|display === "tv")\) \{/));
    assert.match(tvBranch.slice(0, 2500), /id="menu"/, `${g.id}: el Monitor no tiene botón de menú`);
  }
});
