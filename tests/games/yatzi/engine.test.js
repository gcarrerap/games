// Reglas de Yatzi: puntos de cada casilla, bonos, comodín, turnos y fin; y que la compu juegue bien.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreFor, options, newGame, apply, check, legalActions, total, emptyCard, autoAction, greedyCat, CATS } from "../../../games/yatzi/engine/index.js";
import { decide, plan } from "../../../games/yatzi/ai/index.js";
import { seededRandom as seeded } from "../../../modules/random/index.js";

const fixed = (vals) => { let i = 0; return () => (vals[i++ % vals.length] - 1) / 6 + 0.01; };

test("puntos de cada casilla", () => {
  assert.equal(scoreFor([3, 3, 3, 2, 5], "threes"), 9);
  assert.equal(scoreFor([3, 3, 3, 2, 5], "three"), 16);
  assert.equal(scoreFor([3, 3, 3, 2, 5], "four"), 0);
  assert.equal(scoreFor([4, 4, 4, 4, 1], "four"), 17);
  assert.equal(scoreFor([2, 2, 5, 5, 5], "full"), 25);
  assert.equal(scoreFor([5, 5, 5, 5, 5], "full"), 0); // sin comodín, un Yatzi no es Full
  assert.equal(scoreFor([1, 3, 2, 4, 6], "small"), 30);
  assert.equal(scoreFor([3, 4, 5, 6, 6], "small"), 30);
  assert.equal(scoreFor([1, 2, 3, 5, 6], "small"), 0);
  assert.equal(scoreFor([2, 3, 4, 5, 6], "large"), 40);
  assert.equal(scoreFor([1, 2, 3, 4, 6], "large"), 0);
  assert.equal(scoreFor([6, 6, 6, 6, 6], "yatzi"), 50);
  assert.equal(scoreFor([1, 2, 3, 4, 6], "chance"), 16);
});

test("bono de arriba y total", () => {
  const c = { ...emptyCard(), ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
  assert.equal(total(c), 63 + 35);
  assert.equal(total({ ...c, sixes: 12 }), 57);
  assert.equal(total({ ...c, yatzi: 50, bonus: 2 }), 63 + 35 + 50 + 200);
});

test("comodín: un Yatzi extra va primero arriba; si no se puede, abajo a valor completo", () => {
  const card = { ...emptyCard(), yatzi: 50 };
  assert.deepEqual(options(card, [4, 4, 4, 4, 4]), [{ cat: "fours", pts: 20, bonus: 100 }]);
  const lowerOnly = options({ ...card, fours: 12 }, [4, 4, 4, 4, 4]);
  assert.ok(lowerOnly.every((o) => !["ones", "twos"].includes(o.cat)));
  assert.equal(lowerOnly.find((o) => o.cat === "large").pts, 40);
  assert.equal(lowerOnly.find((o) => o.cat === "full").pts, 25);
  // Con la casilla de Yatzi tachada no hay 100, pero sí comodín
  assert.equal(options({ ...emptyCard(), yatzi: 0, fours: 8 }, [4, 4, 4, 4, 4]).find((o) => o.cat === "small").bonus, 0);
  // Si abajo ya no hay nada, se tacha una de arriba
  const full = { ...emptyCard(), yatzi: 50, fours: 8, three: 1, four: 1, full: 25, small: 30, large: 40, chance: 20 };
  assert.deepEqual(options(full, [4, 4, 4, 4, 4]).map((o) => o.cat).sort(), ["fives", "ones", "sixes", "threes", "twos"].sort());
});

test("un turno: tres tiros como máximo, los apartados se quedan, anotar pasa el turno", () => {
  let st = newGame({ n: 2 }, ["Ana", "Noe"]);
  assert.match(check(st, 0, { type: "score", cat: "chance" }), /tirar/);
  assert.match(check(st, 1, { type: "roll" }), /turno/);
  st = apply(st, 0, { type: "roll", keep: [false, false, false, false, false] }, { rnd: fixed([6, 6, 2, 3, 1]) });
  assert.deepEqual(st.dice, [6, 6, 2, 3, 1]);
  st = apply(st, 0, { type: "roll", keep: [true, true, false, false, false] }, { rnd: fixed([6, 4, 4]) });
  assert.deepEqual(st.dice, [6, 6, 6, 4, 4]);
  assert.match(check(st, 0, { type: "roll", keep: [true, true, true, true, true] }), /Aparta menos/);
  st = apply(st, 0, { type: "roll", keep: [true, true, true, true, false] }, { rnd: fixed([6]) });
  assert.equal(st.rolls, 3);
  assert.match(check(st, 0, { type: "roll" }), /tres veces/);
  assert.ok(legalActions(st, 0).every((a) => a.type === "score"));
  st = apply(st, 0, { type: "score", cat: "four" }, { rnd: Math.random });
  assert.equal(st.cards[0].four, 28); // 6 6 6 6 4
  assert.equal(st.turn, 1);
  assert.equal(st.rolls, 0);
  assert.equal(st.last.pts, 28);
  assert.match(check(st, 0, { type: "roll" }), /turno/);
});

test("la partida termina al llenar las 13 casillas de todos; empate sin ganador", () => {
  let st = newGame({ n: 2 });
  const rnd = fixed([1, 2, 3, 4, 5]);
  for (let r = 0; r < 13; r++) for (let s = 0; s < 2; s++) {
    st = apply(st, s, { type: "roll" }, { rnd });
    st = apply(st, s, { type: "score", cat: CATS[r] }, { rnd });
  }
  assert.equal(st.phase, "over");
  assert.equal(st.winner, null);
  assert.deepEqual(st.winners, [0, 1]);
});

test("el reloj tira o anota lo que más da", () => {
  let st = newGame({ n: 1 });
  assert.equal(autoAction(st).type, "roll");
  st = apply(st, 0, { type: "roll" }, { rnd: fixed([2, 3, 4, 5, 1]) });
  assert.deepEqual(autoAction(st), { type: "score", cat: "large" });
  assert.equal(greedyCat({ ...emptyCard() }, [1, 1, 2, 3, 6]), "chance");
});

test("la compu aparta lo que conviene y no desperdicia una escalera grande", () => {
  let st = newGame({ n: 1 });
  st = apply(st, 0, { type: "roll" }, { rnd: fixed([6, 6, 6, 2, 1]) });
  const p = plan(st, 0, "experta");
  assert.equal(p.action.type, "roll");
  assert.deepEqual(p.keep, [true, true, true, false, false]);
  st = newGame({ n: 1 });
  st = apply(st, 0, { type: "roll" }, { rnd: fixed([2, 3, 4, 5, 6]) });
  assert.deepEqual(decide(st, 0, "experta"), { type: "score", cat: "large" });
});

test("la compu experta saca en promedio más de 200 y le gana a la fácil", () => {
  const play = (style, seed) => {
    const rnd = seeded(seed);
    let st = newGame({ n: 1 });
    while (st.phase !== "over") st = apply(st, 0, decide(st, 0, style, rnd), { rnd });
    return total(st.cards[0]);
  };
  const avg = (style) => { let s = 0; for (let i = 0; i < 40; i++) s += play(style, `y${i}`); return s / 40; };
  const exp = avg("experta"), easy = avg("facil");
  assert.ok(exp > 200, `experta ${exp}`);
  assert.ok(exp > easy, `experta ${exp} vs fácil ${easy}`);
});
