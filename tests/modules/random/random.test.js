import { test } from "node:test";
import assert from "node:assert/strict";
import { seededRandom, hash32, unitFor } from "../../../modules/random/index.js";

test("la misma semilla da la misma sucesión, en [0, 1)", () => {
  const a = seededRandom(42), b = seededRandom(42), c = seededRandom("42-otra");
  const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b), sc = Array.from({ length: 50 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
});

test("hash32 y unitFor son fijos por clave", () => {
  assert.equal(hash32("dominó"), hash32("dominó"));
  assert.notEqual(hash32("a"), hash32("b"));
  const u = unitFor("bot-07:evento-3");
  assert.equal(u, unitFor("bot-07:evento-3"));
  assert.ok(u >= 0 && u < 1);
});
