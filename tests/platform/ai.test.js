// La compu de la plataforma: el mismo worker sirve a cualquier juego del registro; en Node corre el plan B.
import { test } from "node:test";
import assert from "node:assert/strict";
import domino from "../../games/domino/index.js";
import { FNS } from "../../platform/app/ai-worker.js";
import { botDecide, advise } from "../../platform/app/ai.js";
import { seededRandom } from "../../modules/random/index.js";
import { stepCtx } from "../../modules/tournament/index.js";

const st = domino.setup({ ...domino.modes[0] }, stepCtx("ai", -1));
const seat = domino.currentSeats(st)[0];

test("el worker carga el juego por su id y decide con la semilla", async () => {
  const v = domino.view(st, seat);
  const a = await FNS.decide("domino", v, seat, "b02", "s1");
  assert.deepEqual(a, domino.bots.decide(v, seat, "b02", { rnd: seededRandom("s1") }));
  assert.ok(domino.legalActions(st, seat).some((x) => JSON.stringify(x) === JSON.stringify(a)));
  await assert.rejects(FNS.decide("ajedrez", v, seat, "x", 1), /desconocido/);
});

test("botDecide y advise funcionan sin Worker (plan B) y solo con la vista", async () => {
  const v = domino.view(st, seat);
  const a = await botDecide(domino, v, seat, "b02", 7);
  assert.equal(typeof a.type, "string");
  const adv = await advise(domino, v, seat, 7);
  assert.ok(adv && typeof adv === "object");
  await assert.rejects(botDecide({ id: "x" }, v, seat, "b", 1), /no tiene compu/);
});
