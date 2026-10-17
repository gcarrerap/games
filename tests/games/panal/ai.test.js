// La compu de Panal: gana cuando puede, evita perder en una jugada, y la difícil le gana a la fácil.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, advise, evaluate } from "../../../games/panal/ai/index.js";
import { newGame, apply, PIECES } from "../../../games/panal/engine/index.js";
import { playGame } from "../../../modules/tournament/index.js";
import game from "../../../games/panal/index.js";

function board(spec, turn = 0) {
  const cells = {};
  for (const [k, v] of Object.entries(spec)) cells[k] = [].concat(v).map((s) => ({ p: Number(s[0]), k: s.slice(1) }));
  const hand = [0, 1].map((p) => { const h = { ...PIECES }; for (const s of Object.values(cells).flat()) if (s.p === p) h[s.k]--; return h; });
  const placed = [0, 1].map((p) => Object.values(cells).flat().filter((x) => x.p === p).length);
  return { ...newGame({ n: 2, timer: false }, ["A", "B"]), cells, hand, placed, turn };
}

// La reina oscura tiene cinco lados ocupados; la hormiga clara puede cerrar el sexto
const nearWin = () => board({ "0,0": "1reina", "1,0": "0hormiga", "1,-1": "0arana", "0,-1": "1arana", "-1,0": "1hormiga", "-1,1": "1chapulin", "2,0": "0reina", "2,1": "0hormiga" });

test("todos los estilos cierran la jugada que gana", () => {
  for (const style of ["facil", "normal", "dificil"]) {
    const a = decide(nearWin(), 0, style, () => 0.99);
    assert.equal(apply(nearWin(), 0, a).winner, 0, style);
  }
  assert.equal(apply(nearWin(), 0, advise(nearWin(), 0).action).winner, 0);
});

test("la posición se califica desde cada lado", () => {
  const st = nearWin();
  assert.ok(evaluate(st, 0) > 0 && evaluate(st, 1) < 0);
  assert.equal(decide(st, 1, "normal"), null, "no es su turno");
});

test("la compu difícil le gana a la fácil", () => {
  let wins = 0, losses = 0;
  for (let seed = 0; seed < 4; seed++) {
    const profiles = seed % 2 ? ["facil", "dificil"] : ["dificil", "facil"], strong = seed % 2;
    const r = playGame(game, profiles, { config: { n: 2, timer: false }, seed }).state;
    if (r.winner === strong) wins++; else if (r.winner === 1 - strong) losses++;
  }
  assert.ok(wins >= 3 && losses === 0, `ganó ${wins}, perdió ${losses}`);
});
