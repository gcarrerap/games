// Reglas de Vikingos: la geometría de las lentes, cuándo se puede girar una pieza, los barcos que giran con ella,
// juntar giros, deshacer y reiniciar, los 60 retos (bien armados y con su mínimo) y la compu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lensOf, sidesOf, ALL_LENSES, notches, whyNot, rotate, isOpen, blockers } from "../../../games/vikingos/engine/board.js";
import { newGame, apply, legalActions, CHALLENGES, LEVELS, challenge, boardOf, boardOfState, checkChallenge } from "../../../games/vikingos/engine/index.js";
import { solve, decide, advise } from "../../../games/vikingos/ai/index.js";
import { boardSVG, piecePath } from "../../../games/vikingos/ui/board.js";
import game from "../../../games/vikingos/index.js";

const play = (n) => newGame({ reto: n }, ["Noe"]);
const rot = (piece, turns = 1) => ({ type: "rotate", piece, turns });

test("24 lentes: cada lado de cada pieza tiene la suya y la lente sabe qué piezas la tocan", () => {
  assert.equal(ALL_LENSES.length, 24);
  assert.equal(new Set(ALL_LENSES).size, 24);
  for (let i = 0; i < 9; i++) for (let d = 0; d < 4; d++) {
    const L = lensOf(i, d);
    assert.ok(ALL_LENSES.includes(L), L);
    assert.ok(sidesOf(L).some(([p, s]) => p === i && s === d), `${L} no regresa a ${i}/${d}`);
  }
  assert.deepEqual(sidesOf("h21"), [[7, 1], [8, 3]]);
  assert.deepEqual(sidesOf("v02"), [[2, 2], [5, 0]]);
  assert.deepEqual(sidesOf("S0"), [[6, 2]]);
  assert.deepEqual(notches("C", 0), [0, 1]);
  assert.deepEqual(notches("C", 3), [3, 0]);
  assert.deepEqual(notches("X", 1), [1, 3]);
});

test("los 60 retos están bien armados: cuatro niveles de 15, tres corrientes y seis remolinos", () => {
  assert.equal(CHALLENGES.length, 60);
  assert.deepEqual(CHALLENGES.map((c) => c.n), Array.from({ length: 60 }, (_, i) => i + 1));
  assert.deepEqual(LEVELS.map((l) => [l.from, l.to]), [[1, 15], [16, 30], [31, 45], [46, 60]]);
  for (const c of CHALLENGES) {
    assert.deepEqual(checkChallenge(c), [], `reto ${c.n}`);
    const kinds = c.pieces.split(" ").map((p) => p[0]);
    assert.equal(kinds.filter((k) => k === "X").length, 3, `reto ${c.n}`);
  }
});

test("cada reto tiene solución y su mínimo es el de la búsqueda; jugarla en el motor lo termina", () => {
  for (const c of CHALLENGES) {
    const path = solve(boardOf(c));
    assert.ok(path, `reto ${c.n} sin solución`);
    assert.equal(path.length, c.min, `reto ${c.n}`);
    let st = play(c.n);
    for (const m of path) st = apply(st, 0, rot(m.piece, m.turns));
    assert.equal(st.phase, "over", `reto ${c.n}`);
    assert.equal(st.history.length, c.min);
  }
  // Los niveles van de menos a más
  const avg = (l) => CHALLENGES.filter((c) => c.n >= l.from && c.n <= l.to).reduce((s, c) => s + c.min, 0) / 15;
  assert.ok(avg(LEVELS[0]) < avg(LEVELS[1]) && avg(LEVELS[1]) <= avg(LEVELS[3]));
});

test("el reto 1 a mano: la vuelta del barco rojo hasta su flecha", () => {
  let st = play(1);
  assert.equal(st.boats.R, "h21");
  // La pieza de abajo al centro está trabada por la del centro; la de abajo a la derecha sí gira con el barco
  assert.match(whyNot(boardOfState(st), 7), /trabada/);
  assert.deepEqual(blockers(boardOfState(st), 7), [4]);
  st = apply(st, 0, rot(8, 1)); assert.equal(st.boats.R, "v12");
  st = apply(st, 0, rot(5, 1)); assert.equal(st.boats.R, "h11");
  st = apply(st, 0, rot(4, 1)); assert.equal(st.boats.R, "v11");
  st = apply(st, 0, rot(7, 3)); assert.equal(st.boats.R, "h20");
  assert.equal(st.phase, "play");
  st = apply(st, 0, rot(6, 1)); assert.equal(st.boats.R, "S0");
  assert.equal(st.phase, "over");
  assert.deepEqual(game.result(st), { winner: 0, champions: [0], reto: 1, moves: 5, min: 5 });
  assert.throws(() => apply(st, 0, { type: "undo" }), /resuelto/);
});

test("solo se gira una pieza con barco, y no si una vecina la traba", () => {
  const st = play(1);
  assert.throws(() => apply(st, 0, rot(0)), /barco/);
  assert.throws(() => apply(st, 0, rot(7)), /trabada/);
  assert.throws(() => apply(st, 0, rot(8, 4)), /cuarto/);
  assert.throws(() => apply(st, 0, rot(9)), /no existe/);
  assert.throws(() => apply(st, 1, rot(8)), /un solo jugador/);
  const acts = legalActions(st).filter((a) => a.type === "rotate");
  assert.deepEqual([...new Set(acts.map((a) => a.piece))], [8]);
  assert.ok(legalActions(st).some((a) => a.type === "pick" && a.n === 60));
});

test("girar mueve la muesca y su barco; una lente con barco siempre está abierta", () => {
  const b = boardOf(challenge(12));
  assert.ok(Object.values(b.boats).every((L) => isOpen(b, L)));
  // En el reto 12 la pieza del centro a la derecha (5) lleva dos barcos: rojo y amarillo
  const nb = rotate(b, 5, 2);
  assert.equal(nb.rots[5], (b.rots[5] + 2) % 4);
  assert.notEqual(nb.boats.R, b.boats.R);
  assert.notEqual(nb.boats.Y, b.boats.Y);
  assert.equal(nb.boats.G, b.boats.G);
  assert.ok(Object.values(nb.boats).every((L) => isOpen({ ...b, ...nb }, L)));
});

test("girar la misma pieza dos veces seguidas cuenta como un movimiento; deshacer y reiniciar", () => {
  let st = play(1);
  st = apply(st, 0, rot(8, 1));
  st = apply(st, 0, rot(8, 1));
  assert.deepEqual(st.history, [{ piece: 8, turns: 2 }]);
  assert.equal(st.last.type, "rotate");
  st = apply(st, 0, rot(8, 2)); // regresa a como estaba: no cuenta
  assert.deepEqual(st.history, []);
  assert.equal(st.boats.R, "h21");
  st = apply(st, 0, rot(8, 1));
  st = apply(st, 0, rot(5, 1));
  const before = { rots: st.rots, boats: st.boats };
  st = apply(st, 0, rot(4, 1));
  st = apply(st, 0, { type: "undo" });
  assert.deepEqual({ rots: st.rots, boats: st.boats }, before);
  assert.deepEqual(st.last, { type: "undo", piece: 4, turns: 3, boats: ["R"] });
  st = apply(st, 0, { type: "reset" });
  assert.deepEqual({ rots: st.rots, boats: st.boats }, { rots: boardOf(challenge(1)).rots, boats: { R: "h21" } });
  assert.equal(st.history.length, 0);
  assert.throws(() => apply(st, 0, { type: "undo" }), /deshacer/);
});

test("escoger reto: al empezar, a media partida y regresar al selector", () => {
  let st = newGame({}, ["Ana"]);
  assert.equal(st.phase, "pick");
  assert.throws(() => apply(st, 0, rot(0)), /escoge/);
  assert.throws(() => apply(st, 0, { type: "pick", n: 61 }), /no existe/);
  st = apply(st, 0, { type: "pick", n: 30 });
  assert.equal(st.reto, 30);
  assert.equal(st.min, challenge(30).min);
  st = apply(st, 0, { type: "pick", n: 2 });
  assert.equal(st.reto, 2);
  st = apply(st, 0, { type: "choose" });
  assert.equal(st.phase, "pick");
  assert.equal(st.kinds, null);
  assert.deepEqual(game.currentSeats(st), [0]);
  assert.equal(game.setup({ reto: 5, names: ["Noe"] }, {}).reto, 5);
});

test("la compu escoge un reto Inicial y lo resuelve en el mínimo; el consejo acerca a la meta", () => {
  let st = newGame({}, []);
  const a = decide(st, 0, "vikinga", () => 0.99);
  assert.equal(a.type, "pick");
  assert.ok(a.n >= 1 && a.n <= 15);
  st = apply(st, 0, a);
  while (st.phase === "play") st = apply(st, 0, decide(st, 0, "vikinga"));
  assert.equal(st.history.length, st.min);

  st = apply(play(9), 0, rot(1, 1)); // un paso que no es el mejor
  const adv = advise(st, 0);
  assert.ok(adv && adv.action.type === "rotate");
  assert.match(adv.why, /Gira la pieza/);
  const left = solve(boardOfState(st)).length;
  assert.equal(adv.left, left);
  assert.equal(solve(boardOfState(apply(st, 0, adv.action))).length, left - 1);
  assert.equal(advise(newGame({}, []), 0), null);
});

test("el tablero se dibuja para cada reto; la pieza que gira lleva su animación y sus barcos", () => {
  for (const c of CHALLENGES) {
    const b = boardOf(c);
    assert.match(boardSVG(b, { mini: true }), /^<svg[\s\S]*<\/svg>$/);
  }
  let st = apply(play(12), 0, rot(5, 1));
  const svg = boardSVG(st, { fresh: st.last, sel: 5, can: [5] });
  assert.match(svg, /animateTransform/);
  assert.equal((svg.match(/class="boat /g) || []).length, 4);
  assert.doesNotMatch(boardSVG(st, { fresh: st.last, still: true }), /animateTransform/);
  assert.match(piecePath([0, 1]), /^M [\d. -]+( A [\d. -]+){8} Z$/);
});
