// Todos los juegos cumplen el contrato, y el validador detecta módulos incompletos. Se revisa cada carpeta de
// games/ (también un juego que todavía no está en el registro, mientras se construye) y que todo lo registrado
// tenga su carpeta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGame } from "../platform/core/contract.js";
import { GAMES } from "../games/registry.js";
import { playGame } from "../modules/tournament/index.js";
import { replay } from "../modules/recording/index.js";
import { readdirSync, existsSync } from "node:fs";

const GAMES_DIR = new URL("../games/", import.meta.url);
const FOLDERS = readdirSync(GAMES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.js`, GAMES_DIR))).map((d) => d.name);
const ENTRIES = FOLDERS.map((id) => GAMES.find((g) => g.id === id) || { id, load: () => import(`../games/${id}/index.js`) });

test("todo juego registrado tiene su carpeta y su manifiesto coincide", async () => {
  for (const g of GAMES) {
    assert.ok(FOLDERS.includes(g.id), `falta games/${g.id}/`);
    const { default: game } = await g.load();
    assert.deepEqual([game.name, game.players, game.modes], [g.name, g.players, g.modes]);
  }
});

const fn = () => {};
const minimal = {
  id: "demo", name: "Demo", players: { min: 1, max: 2 }, modes: [{ players: 2 }],
  setup: fn, currentSeats: fn, legalActions: fn, apply: fn, view: fn, isOver: fn, result: fn, ui: fn,
};

test("un módulo mínimo cumple el contrato", () => {
  assert.deepEqual(validateGame(minimal), []);
});

test("el validador detecta lo que falta", () => {
  const { apply, ...sinApply } = minimal;
  assert.ok(validateGame(sinApply).some((e) => e.startsWith("apply")));
  assert.ok(validateGame({ ...minimal, id: "Mi Juego" }).some((e) => e.startsWith("id")));
  assert.ok(validateGame({ ...minimal, players: { min: 3, max: 2 } }).some((e) => e.startsWith("players")));
});

for (const entry of ENTRIES) {
  test(`${entry.id} cumple el contrato`, async () => {
    const { default: game } = await entry.load();
    assert.deepEqual(validateGame(game), []);
    assert.equal(game.id, entry.id);
  });

  test(`${entry.id}: la compu juega partidas completas en cada modo, reproducibles con semilla`, async () => {
    const { default: game } = await entry.load();
    if (!game.bots) return;
    const profile = game.bots.profiles[0].id;
    for (const mode of game.modes) {
      const n = mode.n ?? game.players.max;
      const profiles = Array(n).fill(profile);
      const a = playGame(game, profiles, { config: { ...mode, timer: false }, seed: 7 });
      assert.equal(a.stalled, false, `${mode.id || JSON.stringify(mode)}: nadie pudo actuar`);
      assert.ok(game.isOver(a.state), `${mode.id || JSON.stringify(mode)}: no terminó`);
      assert.doesNotThrow(() => JSON.stringify(a.state), "el estado es JSON");
      const b = playGame(game, profiles, { config: { ...mode, timer: false }, seed: 7 });
      assert.deepEqual(b.result, a.result);
      const rec = JSON.parse(JSON.stringify(a.recording));
      assert.deepEqual(replay(game, rec), a.state, "la grabación se repite igual");
    }
  });
}
