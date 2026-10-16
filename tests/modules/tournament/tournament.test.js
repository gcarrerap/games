import { test } from "node:test";
import assert from "node:assert/strict";
import nim from "../fixtures/nim.js";
import { playGame, match, ci95 } from "../../../modules/tournament/index.js";
import { replay } from "../../../modules/recording/index.js";

const config = nim.modes[0];

test("una partida termina, es reproducible y su grabación se repite igual", () => {
  const a = playGame(nim, ["azar", "azar"], { config, seed: 3 });
  const b = playGame(nim, ["azar", "azar"], { config, seed: 3 });
  assert.equal(a.stalled, false);
  assert.ok(nim.isOver(a.state));
  assert.deepEqual(a.state, b.state);
  assert.deepEqual(replay(nim, a.recording), a.state);
  assert.equal(a.recording.actions.length, a.steps);
});

test("la compu solo recibe la vista de su asiento", () => {
  const seen = [];
  const spy = { ...nim, view: (s, seat) => ({ ...s, viewer: seat }) };
  playGame(spy, ["azar", "azar"], { config, seed: 1, decide: (v, seat, p, ctx) => { seen.push([v.viewer, seat]); return nim.bots.decide(v, seat, p, ctx); } });
  assert.ok(seen.length > 0 && seen.every(([viewer, seat]) => viewer === seat));
});

test("stopWhen corta antes y onStep ve cada acción", () => {
  let n = 0;
  const r = playGame(nim, ["azar", "azar"], { config, seed: 2, stopWhen: (s) => s.log.length >= 2, onStep: () => n++ });
  assert.equal(r.steps, 2); assert.equal(n, 2);
});

test("si nadie puede actuar sin terminar, la partida queda atorada", () => {
  const stuck = { ...nim, currentSeats: () => [], legalActions: () => [] };
  assert.equal(playGame(stuck, ["azar", "azar"], { config, seed: 1 }).stalled, true);
});

test("match: el bot listo le gana al de azar casi siempre", () => {
  const r = match(nim, { config, games: 40, seed: 1, lineup: (g) => (g % 2 ? ["azar", "listo"] : ["listo", "azar"]), won: (res, g) => res.winner === (g % 2 ? 1 : 0) });
  assert.equal(r.games, 40);
  assert.ok(r.winRate > 0.7, `ganó ${r.winRate}`);
  assert.ok(r.ci95[0] <= r.winRate && r.winRate <= r.ci95[1]);
  assert.deepEqual(ci95(0, 0), [0, ci95(0, 0)[1]]);
});
