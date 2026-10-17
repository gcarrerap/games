// Reglas de Skull: poner a la vez, apostar y pasar, voltear los tuyos primero, ganar retos, perder discos y la vista.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, apply, legalActions, currentSeats, view, autoAction, inHand, onMat, FLOWER as F, SKULL as S } from "../../../games/skull/engine/index.js";
import { decide, safeOwn } from "../../../games/skull/ai/index.js";
import game from "../../../games/skull/index.js";
import { seededRandom } from "../../../modules/random/index.js";

const ctx = { rnd: seededRandom(1), now: 0 };
const fresh = (n = 3) => newGame({ n, timer: false }, ["Ana", "Noe", "Gui", "Bar", "Rod", "Gil"].slice(0, n), 0);
const act = (st, seat, a, c = ctx) => apply(st, seat, a, c);
// Una ronda ya armada: tapetes a la medida (de abajo hacia arriba) y turno de `turn` en la fase build
const rig = (st, stacks, turn = 0) => ({ ...st, stacks, phase: "build", turn });

test("al empezar, todos ponen su primer disco a la vez y luego abre quien empieza", () => {
  let st = fresh(3);
  assert.deepEqual(currentSeats(st), [0, 1, 2]);
  assert.deepEqual(legalActions(st, 1), [{ type: "place", disc: F }, { type: "place", disc: S }]);
  st = act(st, 2, { type: "place", disc: S });
  assert.deepEqual(currentSeats(st), [0, 1]);
  assert.deepEqual(legalActions(st, 2), [], "ya puso: espera");
  assert.throws(() => act(st, 2, { type: "place", disc: F }), /espera/);
  st = act(st, 0, { type: "place", disc: F });
  st = act(st, 1, { type: "place", disc: F });
  assert.equal(st.phase, "build");
  assert.equal(st.turn, 0);
  assert.deepEqual(currentSeats(st), [0]);
});

test("en tu turno pones otro disco o abres la apuesta, hasta los discos que hay en la mesa", () => {
  let st = rig(fresh(3), [[F], [F], [S]]);
  const la = legalActions(st, 0);
  assert.ok(la.some((a) => a.type === "place" && a.disc === S));
  assert.deepEqual(la.filter((a) => a.type === "bid").map((a) => a.n), [1, 2, 3]);
  st = act(st, 0, { type: "place", disc: F });
  assert.equal(st.turn, 1);
  assert.deepEqual(inHand(st, 0), { F: 1, S: 1 });
  assert.throws(() => act(st, 1, { type: "bid", n: 5 }), /Solo hay 4/);
});

test("sin discos en la mano solo queda apostar", () => {
  const st = rig(fresh(3), [[F, F, F, S], [F], [F]]);
  assert.ok(legalActions(st, 0).every((a) => a.type === "bid"));
});

test("apuesta: se sube o se pasa; quien pasa ya no vuelve; cuando todos pasan, el más alto es el retador", () => {
  let st = rig(fresh(4), [[F], [F], [F, F], [S]]);
  st = act(st, 0, { type: "bid", n: 2 });
  assert.equal(st.phase, "bid"); assert.equal(st.turn, 1);
  assert.throws(() => act(st, 1, { type: "bid", n: 2 }), /3 o más/);
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "bid", n: 3 });
  st = act(st, 3, { type: "pass" });
  assert.equal(st.turn, 0, "se salta a quien pasó");
  st = act(st, 0, { type: "pass" });
  assert.equal(st.phase, "flip"); assert.equal(st.challenger, 2); assert.equal(st.turn, 2);
  assert.deepEqual(st.bidders, [true, false, true, false]);
});

test("apostar todos los discos de la mesa empieza el reto de inmediato", () => {
  let st = rig(fresh(3), [[F], [F], [F]]);
  st = act(st, 0, { type: "bid", n: 3 });
  assert.equal(st.phase, "flip"); assert.equal(st.challenger, 0);
});

test("el retador voltea primero los suyos, de arriba hacia abajo, y gana con puras flores", () => {
  let st = rig(fresh(3), [[S, F, F], [F], [F, F]]);
  st = act(st, 0, { type: "bid", n: 3 });
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "pass" });
  assert.deepEqual(legalActions(st, 0), [{ type: "flip", seat: 0 }], "primero los suyos");
  // Apostó 3 y tiene 3: voltea arriba hacia abajo y se topa con su calavera hasta el fondo
  st = act(st, 0, { type: "flip", seat: 0 });
  assert.equal(st.phase, "discard");
  assert.deepEqual(st.reveals.map((r) => r.disc), [F, F, S]);
});

test("si la apuesta es menor que su tapete, solo voltea lo necesario y no toca su calavera", () => {
  let st = rig(fresh(3), [[S, F, F], [F], [F]]);
  st = act(st, 0, { type: "bid", n: 2 });
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "pass" });
  st = act(st, 0, { type: "flip", seat: 0 });
  assert.equal(st.phase, "pause");
  assert.deepEqual(st.wins, [1, 0, 0]);
  assert.equal(st.outcome.success, true);
  assert.equal(st.outcome.nextStarter, 0);
});

test("en tapetes ajenos se voltea uno a la vez y se escoge cuál", () => {
  let st = rig(fresh(3), [[F], [F, F], [S]]);
  st = act(st, 0, { type: "bid", n: 3 });
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "pass" });
  st = act(st, 0, { type: "flip", seat: 0 });
  assert.deepEqual(legalActions(st, 0).map((a) => a.seat), [1, 2]);
  st = act(st, 0, { type: "flip", seat: 1 });
  assert.equal(st.phase, "flip");
  assert.equal(st.flipped[1], 1);
  st = act(st, 0, { type: "flip", seat: 1 });
  assert.equal(st.phase, "pause"); assert.equal(st.wins[0], 1);
});

test("dos retos ganados ganan la partida", () => {
  let st = { ...rig(fresh(3), [[F], [F], [F]]), wins: [1, 0, 0] };
  st = act(st, 0, { type: "bid", n: 3 });
  for (const s of [0, 1, 2]) st = act(st, 0, { type: "flip", seat: s });
  assert.equal(st.phase, "over"); assert.equal(st.winner, 0);
  assert.deepEqual(game.result(st).champions, [0]);
});

test("calavera ajena: el retador pierde un disco al azar y nadie más sabe cuál", () => {
  let st = rig(fresh(3), [[F], [S], [F]]);
  st = act(st, 0, { type: "bid", n: 2 });
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "pass" });
  st = act(st, 0, { type: "flip", seat: 0 });
  st = act(st, 0, { type: "flip", seat: 1 }, { rnd: () => 0.99, now: 0 }); // 0.99 → flor
  assert.equal(st.phase, "pause");
  assert.deepEqual(st.discs[0], { F: 2, S: 1 });
  assert.equal(st.outcome.skullOf, 1);
  assert.equal(view(st, 0).outcome.lost, F, "el retador sabe qué perdió");
  assert.equal(view(st, 1).outcome.lost, null, "los demás no");
  assert.equal(view(st, 1).discs[0], null);
  assert.equal(view(st, 1).discTotals[0], 3);
  assert.ok(!st.log.some((l) => /flor|calavera/.test(l) && /quita/.test(l)), "el registro no dice qué disco fue");
  // Con 0.0 pierde la calavera
  let st2 = rig(fresh(3), [[F], [S], [F]]);
  st2 = act(st2, 0, { type: "bid", n: 3 });
  st2 = act(st2, 0, { type: "flip", seat: 0 });
  st2 = act(st2, 0, { type: "flip", seat: 1 }, { rnd: () => 0, now: 0 });
  assert.deepEqual(st2.discs[0], { F: 3, S: 0 });
});

test("calavera propia: el retador escoge qué disco pierde", () => {
  let st = rig(fresh(3), [[S], [F], [F]]);
  st = act(st, 0, { type: "bid", n: 1 });
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "pass" });
  st = act(st, 0, { type: "flip", seat: 0 });
  assert.equal(st.phase, "discard");
  assert.deepEqual(legalActions(st, 0), [{ type: "discard", disc: F }, { type: "discard", disc: S }]);
  assert.deepEqual(legalActions(st, 1), []);
  st = act(st, 0, { type: "discard", disc: S });
  assert.deepEqual(st.discs[0], { F: 3, S: 0 });
  assert.equal(st.phase, "pause");
});

test("quien se queda sin discos sale; abre el siguiente; el último en pie gana", () => {
  let st = { ...rig(fresh(3), [[F], [S], [F]]), discs: [{ F: 1, S: 0 }, { F: 3, S: 1 }, { F: 3, S: 1 }] };
  st = act(st, 0, { type: "bid", n: 3 });
  st = act(st, 0, { type: "flip", seat: 0 });
  st = act(st, 0, { type: "flip", seat: 1 });
  assert.equal(st.out[0], true);
  assert.equal(st.outcome.eliminated, true);
  assert.equal(st.outcome.nextStarter, 1);
  st = act(st, 2, { type: "next" });
  assert.equal(st.round, 2); assert.equal(st.phase, "place");
  assert.deepEqual(currentSeats(st), [1, 2], "quien salió ya no pone");
  assert.equal(st.starter, 1);

  // Dos jugadores: se elimina uno y gana el otro
  let end = { ...rig(fresh(3), [[], [S], [F]], 2), out: [true, false, false], discs: [{ F: 0, S: 0 }, { F: 3, S: 1 }, { F: 0, S: 1 }] };
  end = { ...end, stacks: [[], [S], [S]] };
  end = act(end, 2, { type: "bid", n: 1 });
  end = act(end, 1, { type: "pass" });
  end = act(end, 2, { type: "flip", seat: 2 });
  end = act(end, 2, { type: "discard", disc: S });
  assert.equal(end.phase, "over"); assert.equal(end.winner, 1);
});

test("la vista oculta los discos boca abajo ajenos y muestra los volteados", () => {
  let st = rig(fresh(3), [[F, F], [S, F], [F]]);
  const v = view(st, 0);
  assert.deepEqual(v.stacks[0], [F, F]);
  assert.deepEqual(v.stacks[1], [null, null]);
  st = act(st, 0, { type: "bid", n: 3 });
  st = act(st, 1, { type: "pass" });
  st = act(st, 2, { type: "pass" });
  st = act(st, 0, { type: "flip", seat: 0 });
  st = act(st, 0, { type: "flip", seat: 1 });
  assert.deepEqual(view(st, 2).stacks[1], [null, F], "solo el de arriba, ya volteado");
  assert.equal(onMat(st), 5);
});

test("al vencerse el reloj: pone una flor, pasa, voltea o pierde una flor", () => {
  const st = fresh(3);
  assert.deepEqual(autoAction(st, 1), { type: "place", disc: F });
  const b = act(rig(fresh(3), [[F], [F], [F]]), 0, { type: "bid", n: 1 });
  assert.deepEqual(autoAction(b, b.turn), { type: "pass" });
  assert.deepEqual(autoAction({ ...rig(fresh(3), [[F, F, F, S], [F], [F]]) }, 0), { type: "bid", n: 1 });
});

test("la compu solo usa su vista y juega acciones válidas", () => {
  assert.equal(safeOwn([F, S, F, F]), 2);
  assert.equal(safeOwn([F, F]), 2);
  let st = fresh(4);
  const rnd = seededRandom(9);
  for (let i = 0; i < 400 && st.phase !== "over"; i++) {
    const seats = currentSeats(st);
    const seat = seats.length ? seats[0] : 0;
    const a = decide(view(st, seat), seat, ["prudente", "normal", "atrevido"][i % 3], rnd);
    assert.ok(a, "decidió algo");
    st = apply(st, seat, a, { rnd, now: i });
  }
  assert.equal(st.phase, "over");
});
