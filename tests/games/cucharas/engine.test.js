// Reglas de Cucharas: el reparto (pókers, espacios y huecos), soltar antes de tomar, nunca más de 4, las cucharas
// (la primera con o sin póker), las fichas al terminar la ronda, el ritmo y lo que ve cada asiento.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, apply, legalActions, view, isPoker, aliveSeats, nextDeadline, RULES } from "../../../games/cucharas/engine/index.js";
import { decide, target } from "../../../games/cucharas/ai/index.js";
import game from "../../../games/cucharas/index.js";
import { seededRandom } from "../../../modules/random/index.js";
import { rankOf } from "../../../modules/cards/index.js";

const NAMES = ["Ana", "Noe", "Gui", "Bar", "Rod", "Abi", "Fer", "Emi"];
const fresh = (n = 4, pace = "normal", seed = 1) => newGame({ n, pace }, NAMES.slice(0, n), { rnd: seededRandom(seed), now: 0 });
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

test("reparto: vivos + 1 pókers, 4 cartas a cada quien sin póker, 4 en la mesa y max(6, vivos+2) espacios", () => {
  for (let n = 3; n <= 8; n++) {
    const st = fresh(n);
    assert.equal(st.ranks.length, n + 1);
    assert.equal(st.slots.length, Math.max(6, n + 2));
    assert.equal(full(st).length, 4);
    assert.ok(st.hands.every((h) => h.length === 4 && !isPoker(h)));
    const all = [...st.hands.flat(), ...st.slots.filter(Boolean)];
    assert.equal(new Set(all).size, (n + 1) * 4);
  }
});

test("cambiar: primero se suelta en un hueco y luego se toma de otro espacio; nunca más de 4", () => {
  let st = fresh(4);
  const c = st.hands[0][0];
  const [h] = holes(st);
  assert.throws(() => act(st, 0, { type: "take", slot: full(st)[0] }), /más de 4/);
  assert.throws(() => act(st, 0, { type: "discard", c, slot: full(st)[0] }), /no está vacío/);
  st = act(st, 0, { type: "discard", c, slot: h });
  assert.equal(st.hands[0].length, 3);
  assert.equal(st.slots[h], c);
  assert.throws(() => act(st, 0, { type: "discard", c: st.hands[0][0], slot: holes(st)[0] }), /toma una carta/);
  assert.throws(() => act(st, 0, { type: "take", slot: h }), /acabas de soltar/);
  assert.ok(!legalActions(st, 0).some((a) => a.type === "take" && a.slot === h));
  const k = full(st).find((i) => i !== h);
  const got = st.slots[k];
  st = act(st, 0, { type: "take", slot: k });
  assert.equal(st.hands[0].length, 4);
  assert.ok(st.hands[0].includes(got));
  assert.equal(st.slots[k], null);
  assert.equal(full(st).length, 4, "siempre quedan 4 cartas en la mesa");
});

test("otro sí puede tomar la carta que alguien acaba de soltar", () => {
  let st = fresh(4);
  const c = st.hands[0][0], [h] = holes(st);
  st = act(st, 0, { type: "discard", c, slot: h });
  st = act(st, 1, { type: "discard", c: st.hands[1][0], slot: holes(st)[0] });
  st = act(st, 1, { type: "take", slot: h });
  assert.ok(st.hands[1].includes(c));
});

test("cuchara: sin póker y sin que nadie haya tomado, se puede pero cuenta como falso; con póker no hay duda", () => {
  let st = givePoker(fresh(4), 2);
  assert.ok(legalActions(st, 2).some((a) => a.type === "spoon"));
  st = act(st, 2, { type: "spoon" });
  assert.equal(st.firstPoker, true);
  assert.ok(legalActions(st, 0).some((a) => a.type === "spoon"));
  assert.deepEqual(legalActions(st, 2), [], "con cuchara ya no juegas");
  assert.throws(() => act(st, 2, { type: "discard", c: st.hands[2][0], slot: holes(st)[0] }), /Ya tomaste/);
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
  assert.equal(st.slots.length, 6);
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

test("ritmo: si no cambias a tiempo la mesa cambia por ti; con póker no; en Tranquilo nunca", () => {
  let st = fresh(4, "normal");
  const pace = RULES.pace.normal;
  assert.equal(nextDeadline(st), pace.idleMs);
  const before = st.hands[0].slice();
  st = act(st, 0, { type: "tick" }, pace.idleMs - 1);
  assert.deepEqual(st.hands[0], before, "antes de tiempo no pasa nada");
  st = act(st, 0, { type: "tick" }, pace.idleMs);
  assert.ok(st.hands.every((h) => h.length === 4));
  assert.equal(full(st).length, 4);
  assert.notDeepEqual(st.hands[0], before, "la mesa cambió por él");
  // Soltar y no tomar: a los pendMs la mesa toma por ti
  st = act(st, 1, { type: "discard", c: st.hands[1][0], slot: holes(st)[0] }, 7000);
  assert.equal(nextDeadline(st), 7000 + pace.pendMs);
  st = act(st, 0, { type: "tick" }, 7000 + pace.pendMs);
  assert.equal(st.hands[1].length, 4);
  // Con póker nadie cambia por ti
  let pk = givePoker(fresh(4, "normal"), 3);
  const mine = pk.hands[3].slice();
  pk = act(pk, 0, { type: "tick" }, pace.idleMs);
  assert.deepEqual(pk.hands[3], mine);
  assert.equal(nextDeadline(fresh(4, "calm")), null);
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
  assert.deepEqual(decide(view(st, 0), 0, "normal", seededRandom(1)), { type: "spoon" });
  st = fresh(5);
  for (let k = 0; k < 30; k++) {
    const v = view(st, 2);
    const a = decide(v, 2, "atento", seededRandom(k));
    if (a.type === "discard") {
      assert.notEqual(rankOf(a.c), target(v.hand, v.slots), "no suelta del número que junta");
    }
    st = act(st, 2, a, st.t + 500);
    if (st.phase !== "play" || st.spoonBy.length) break;
  }
});
