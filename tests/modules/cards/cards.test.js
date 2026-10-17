// Baraja francesa (modules/cards): notación, varias barajas, revolver con semilla y sacar cartas. La usan La Pata y
// el Continental; aquí se prueba sola.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fullDeck, shuffle, removeCards, rankOf, suitOf, deckOf, isJoker, isRed, cardName, cardWords } from "../../../modules/cards/index.js";
import { seededRandom } from "../../../modules/random/index.js";

test("barajas: 52 por baraja más sus jokers, todas distintas", () => {
  assert.equal(fullDeck(1).length, 54);
  assert.equal(fullDeck(2).length, 108);
  assert.equal(fullDeck(3, { jokers: 0 }).length, 156);
  const d = fullDeck(6);
  assert.equal(new Set(d).size, d.length);
  assert.equal(d.filter(isJoker).length, 12);
});

test("notación: número, palo, baraja y color", () => {
  assert.deepEqual([rankOf("KH3"), suitOf("KH3"), deckOf("KH3")], ["K", "H", 3]);
  assert.ok(isRed("2D0") && isRed("XR1") && !isRed("AS0") && !isRed("XB0"));
  assert.deepEqual(["TS0", "AH1", "XR0"].map(cardName), ["10♠", "A♥", "Joker"]);
  assert.deepEqual(["TS0", "AH1", "QC0"].map(cardWords), ["10 de espadas", "As de corazones", "Q de tréboles"]);
});

test("revolver: con la misma semilla, el mismo orden; no pierde cartas", () => {
  const d = fullDeck(2);
  const a = shuffle(d, seededRandom(4)), b = shuffle(d, seededRandom(4));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, d);
  assert.deepEqual(a.slice().sort(), d.slice().sort());
});

test("sacar cartas de una lista (con repetidas de otra baraja, una sola vez)", () => {
  assert.deepEqual(removeCards(["AS0", "AS1", "KH0"], ["AS1"]), ["AS0", "KH0"]);
  assert.throws(() => removeCards(["AS0"], ["AS1"]), /No tienes/);
  assert.throws(() => removeCards(["AS0"], ["KD0"], "No está"), /No está/);
});
