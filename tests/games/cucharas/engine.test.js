// Reglas de Cucharas: el reparto (pókers de sobra según cuántos juegan, sin huecos), el cambio en su lugar, las
// cucharas (cada una en su lugar, repartidas; la primera con o sin póker), las fichas al terminar la ronda, la mesa
// abierta o tapada y lo que ve cada asiento.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, apply, legalActions, view, isPoker, aliveSeats, HIDDEN, RULES, spreadSpots, validConfig } from "../../../games/cucharas/engine/index.js";
import { decide, target } from "../../../games/cucharas/ai/index.js";
import game from "../../../games/cucharas/index.js";
import { seededRandom } from "../../../modules/random/index.js";
import { rankOf } from "../../../modules/cards/index.js";

const NAMES = ["Ana", "Noe", "Gui", "Bar", "Rod", "Abi", "Fer", "Emi"];
const fresh = (n = 4, table = "open", seed = 1) => newGame({ n, table }, NAMES.slice(0, n), { rnd: seededRandom(seed), now: 0 });
const act = (st, seat, a, now = st.t) => apply(st, seat, a, { rnd: seededRandom(`${st.seq}`), now });
const holes = (st) => st.slots.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
const full = (st) => st.slots.map((c, i) => (c !== null ? i : -1)).filter((i) => i >= 0);

// Le arma un póker al asiento `seat` cambiando cartas a mano (sin pasar por la mesa)
function givePoker(st, seat) {
  const r = rankOf(st.hands[seat][0]);
  const all = [...st.hands.flat(), ...st.slots.filter(Boolean)].filter((c) => rankOf(c) === r);
  const others = st.hands[seat].filter((c) => rankOf(c) !== r);
  const s2 = JSON.parse(JSON.stringify(st));
  // Intercambia: las cartas de ese número que tenga cualquiera van a `seat`, y las sobrantes de `seat` a su lugar
  for (const c of all) {
    if (s2.hands[seat].includes(c)) continue;
    const give = others.shift();
    for (const h of s2.hands) { const k = h.indexOf(c); if (k >= 0) h[k] = give; }
    const k = s2.slots.indexOf(c); if (k >= 0) s2.slots[k] = give;
    s2.hands[seat][s2.hands[seat].indexOf(give)] = c;
  }
  assert.ok(isPoker(s2.hands[seat]));
  return s2;
}

test("reparto: pókers de sobra 1 (2–4), 2 (5–8), 3 (9–10); la mesa llena, sin huecos", () => {
  const extra = { 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3 };
  for (let n = 2; n <= 10; n++) {
    const st = fresh(n);
    assert.equal(st.ranks.length, n + extra[n], `${n} jugadores`);
    assert.equal(st.slots.length, 4 * extra[n]);
    assert.ok(st.slots.every((c) => c !== null), "sin huecos");
    assert.ok(st.hands.every((h) => h.length === 4 && !isPoker(h)));
    assert.equal(new Set([...st.hands.flat(), ...st.slots]).size, (n + extra[n]) * 4);
  }
  assert.ok(!validConfig({ n: 11, table: "open" }), "con 11 harían falta 14 números y la baraja tiene 13");
  assert.ok(validConfig({ n: 2, table: "open" }));
});

test("cambiar: se intercambian en su lugar; ni la mano ni la mesa se reordenan", () => {
  let st = fresh(4);
  const hand = st.hands[0].slice(), slots = st.slots.slice();
  st = act(st, 0, { type: "swap", c: hand[2], slot: 3 });
  assert.deepEqual(st.hands[0], [hand[0], hand[1], slots[3], hand[3]], "la nueva queda donde estaba la tuya");
  assert.deepEqual(st.slots, [slots[0], slots[1], slots[2], hand[2]], "la tuya queda donde estaba la de la mesa");
  assert.throws(() => act(st, 0, { type: "swap", c: hand[2], slot: 0 }), /no la tienes/);
  assert.throws(() => act(st, 0, { type: "swap", c: st.hands[0][0], slot: 9 }), /no existe/);
});

test("otro puede tomar la carta que alguien acaba de soltar", () => {
  let st = fresh(4);
  const c = st.hands[0][0];
  st = act(st, 0, { type: "swap", c, slot: 0 });
  st = act(st, 1, { type: "swap", c: st.hands[1][0], slot: 0 });
  assert.ok(st.hands[1].includes(c));
});

test("mesa tapada: la vista solo dice dónde hay carta; el cambio funciona igual", () => {
  let st = fresh(4, "closed");
  const v = view(st, 0);
  assert.ok(v.slots.every((c) => c === HIDDEN));
  assert.equal(v.slots.length, 4);
  assert.deepEqual(v.hand, st.hands[0], "tu mano sí la ves");
  const got = st.slots[1];
  st = act(st, 0, { type: "swap", c: st.hands[0][0], slot: 1 });
  assert.equal(st.hands[0][0], got);
  assert.ok(view(fresh(4, "open"), 0).slots.every((c) => c !== HIDDEN));
});

test("cuchara: sin póker y sin que nadie haya tomado, se puede pero cuenta como falso; con póker no hay duda", () => {
  let st = givePoker(fresh(4), 2);
  assert.ok(legalActions(st, 2).some((a) => a.type === "spoon"));
  st = act(st, 2, { type: "spoon" });
  assert.equal(st.firstPoker, true);
  assert.ok(legalActions(st, 0).some((a) => a.type === "spoon"));
  assert.deepEqual(legalActions(st, 2), [], "con cuchara ya no juegas");
  assert.throws(() => act(st, 2, { type: "swap", c: st.hands[2][0], slot: full(st)[0] }), /Ya tomaste/);
});

test("fin de ronda: el primero con póker gana ficha (sin pasar de 3) y el que se queda sin cuchara pierde", () => {
  let st = givePoker(fresh(4), 1);
  st.chips = [3, 2, 3, 3];
  st = act(st, 1, { type: "spoon" });
  st = act(st, 3, { type: "spoon" });
  assert.equal(st.phase, "play");
  st = act(st, 0, { type: "spoon" });
  assert.equal(st.phase, "between");
  assert.deepEqual(st.chips, [3, 3, 2, 3]);
  assert.deepEqual([st.last.first, st.last.firstPoker, st.last.loser], [1, true, 2]);
  assert.deepEqual(st.last.delta, [0, 1, -1, 0]);
  assert.equal(st.last.hands[1].length, 4, "las manos se revelan");
  let capped = givePoker(fresh(3), 0);
  capped = act(capped, 0, { type: "spoon" });
  capped = act(capped, 1, { type: "spoon" });
  assert.deepEqual(capped.chips, [3, 3, 2]);
});

test("el primero sin póker pierde ficha (además del que se queda sin cuchara)", () => {
  let st = fresh(3);
  st = act(st, 0, { type: "spoon" });
  st = act(st, 2, { type: "spoon" });
  assert.equal(st.last.firstPoker, false);
  assert.deepEqual(st.chips, [2, 2, 3]);
});

test("con 0 fichas quedas fuera; la siguiente ronda se reparte con menos; gana el último", () => {
  let st = fresh(3);
  st.chips = [1, 1, 3];
  st = act(st, 2, { type: "spoon" }); // falso: 3 → 2
  st = act(st, 1, { type: "spoon" }); // el 0 se queda sin cuchara: 1 → 0
  assert.deepEqual(st.chips, [0, 1, 2]);
  assert.deepEqual(st.last.out, [0]);
  assert.deepEqual(legalActions(st, 0), [], "fuera no reparte");
  st = act(st, 1, { type: "next" });
  assert.equal(st.phase, "play");
  assert.deepEqual(aliveSeats(st), [1, 2]);
  assert.equal(st.ranks.length, 3);
  assert.equal(st.slots.length, 4);
  assert.equal(st.spots.length, 1, "con dos, una cuchara");
  assert.deepEqual(st.hands[0], []);
  assert.deepEqual(game.currentSeats(st), [1, 2]);
  st = act(st, 1, { type: "spoon" }); // con dos, una cuchara: se acaba de inmediato. 1 falso → 0, 2 sin cuchara → 1
  assert.equal(st.phase, "over");
  assert.equal(st.winner, 2);
});

test("si nadie quedara con fichas, los dos siguen con 1", () => {
  let st = fresh(3);
  st.chips = [0, 1, 1];
  st.hands[0] = [];
  st = act(st, 1, { type: "spoon" }); // con dos vivos hay una cuchara: falso → 0, y el otro sin cuchara → 0
  assert.deepEqual(st.chips, [0, 1, 1]);
  assert.equal(st.phase, "between");
});

test("lo que ve cada asiento: su mano, la mesa; nada de manos ajenas ni de quién tomó cuchara", () => {
  let st = givePoker(fresh(4), 1);
  st = act(st, 1, { type: "spoon" });
  const v0 = view(st, 0), v1 = view(st, 1), tv = view(st, -1);
  assert.deepEqual(v0.hand, st.hands[0]);
  assert.deepEqual(tv.hand, []);
  assert.deepEqual([v0.spoons, v0.spoonsLeft, v0.mySpoon, v1.mySpoon], [3, 2, false, true]);
  for (const v of [v0, tv]) {
    const s = JSON.stringify(v);
    assert.ok(!("hands" in v) && !("spoonBy" in v) && !("firstPoker" in v));
    for (const c of st.hands[1]) assert.ok(!s.includes(`"${c}"`) || st.slots.includes(c), "no se ve la mano ajena");
  }
});

test("la compu: con póker toma cuchara; junta el número que más tiene; nunca suelta de ese número", () => {
  let st = givePoker(fresh(4), 0);
  const a0 = decide(view(st, 0), 0, "normal", seededRandom(1));
  assert.equal(a0.type, "spoon");
  assert.ok(view(st, 0).spots[a0.i].free, "toma una que sigue en la mesa");
  st = fresh(5);
  for (let k = 0; k < 30; k++) {
    const v = view(st, 2);
    const a = decide(v, 2, "atento", seededRandom(k));
    if (a.type === "swap") assert.notEqual(rankOf(a.c), target(v.hand, v.slots), "no suelta del número que junta");
    st = act(st, 2, a, st.t + 500);
    if (st.phase !== "play" || st.spoonBy.length) break;
  }
});

test("la compu con la mesa tapada cambia a ciegas y nunca suelta del número que junta", () => {
  const st = fresh(5, "closed");
  for (let k = 0; k < 20; k++) {
    const v = view(st, 1);
    const a = decide(v, 1, "normal", seededRandom(k));
    assert.equal(a.type, "swap");
    assert.notEqual(rankOf(a.c), target(v.hand, v.slots));
    assert.notEqual(v.slots[a.slot], null);
  }
});

test("no hay límite de tiempo: el juego no declara reloj ni opción de ritmo", () => {
  assert.equal(game.timing, undefined);
  assert.deepEqual(game.options.map((o) => o.id), ["table"]);
});

test("cucharas: cada una en su lugar, repartidas por la orilla; la que se toma deja su lugar vacío", () => {
  for (let m = 1; m <= 9; m++) for (let seed = 1; seed <= 20; seed++) {
    const spots = spreadSpots(m, seededRandom(seed));
    assert.equal(new Set(spots).size, m, "nunca dos en el mismo lugar");
    assert.ok(spots.every((p) => p >= 0 && p < RULES.ring));
    // Repartidas: entre dos vecinas nunca hay más de dos tramos
    const sorted = spots.slice().sort((a, b) => a - b);
    const gaps = sorted.map((p, k) => (k ? p - sorted[k - 1] : p + RULES.ring - sorted[m - 1]));
    if (m > 1) assert.ok(Math.max(...gaps) < (2 * RULES.ring) / m + 1, `m=${m} huecos ${gaps}`);
  }
  let st = fresh(5);
  assert.equal(st.spots.length, 4);
  st = act(st, 3, { type: "spoon", i: 2 });
  const v = view(st, 0);
  assert.deepEqual(v.spots.map((x) => x.free), [true, true, false, true]);
  assert.ok(!legalActions(st, 0).some((a) => a.type === "spoon" && a.i === 2));
  assert.throws(() => act(st, 0, { type: "spoon", i: 2 }), /ya la tomaron/);
  st = act(st, 0, { type: "spoon", i: 0 });
  assert.deepEqual(st.spoonAt, [2, 0]);
  const next = act(act(st, 1, { type: "spoon", i: 1 }), 2, { type: "spoon", i: 3 });
  assert.equal(next.phase, "between");
  assert.ok(!("spoonAt" in view(st, 0)), "la vista no dice quién tomó cuál");
});
