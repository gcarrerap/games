// Reglas de Panal: poner, la reina obligatoria, colmena única, caber por la puerta, cada bicho, ganar y empatar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, apply, legalActions, destinations, placeTargets, queenPressure, RULES, PIECES } from "../../../games/panal/engine/index.js";
import { cutCells } from "../../../games/panal/engine/hex.js";
import game from "../../../games/panal/index.js";

const fresh = () => newGame({ n: 2, timer: false }, ["Ana", "Noe"]);
// Un estado con la colmena dada: { "q,r": "0reina" | ["0reina", "1mayate"] } y las reinas ya puestas
function board(spec, turn = 0) {
  const cells = {};
  for (const [k, v] of Object.entries(spec)) cells[k] = [].concat(v).map((s) => ({ p: Number(s[0]), k: s.slice(1) }));
  const hand = [0, 1].map((p) => {
    const h = { ...PIECES };
    for (const s of Object.values(cells).flat()) if (s.p === p) h[s.k]--;
    return h;
  });
  const placed = [0, 1].map((p) => Object.values(cells).flat().filter((x) => x.p === p).length);
  return { ...fresh(), cells, hand, placed, turn };
}
const sorted = (xs) => xs.slice().sort();
const play = (st, ...actions) => actions.reduce((s, a) => apply(s, s.turn, a), st);

test("la primera ficha va al centro, la segunda junto a ella", () => {
  const st = fresh();
  assert.deepEqual(placeTargets(st, 0), ["0,0"]);
  const st1 = apply(st, 0, { type: "place", kind: "hormiga", to: "0,0" });
  assert.equal(placeTargets(st1, 1).length, 6);
  assert.equal(legalActions(st1, 0).length, 0, "no es su turno");
  assert.throws(() => apply(st1, 1, { type: "place", kind: "hormiga", to: "5,5" }), /tocar|toca/);
});

test("una ficha nueva solo toca fichas de tu color", () => {
  const st = play(fresh(), { type: "place", kind: "arana", to: "0,0" }, { type: "place", kind: "arana", to: "1,0" });
  const t = sorted(placeTargets(st, 0));
  assert.deepEqual(t, sorted(["-1,0", "-1,1", "0,-1"]));
  assert.ok(!t.includes("0,1") && !t.includes("1,-1"), "esas tocan la ficha del rival");
});

test("la reina es obligatoria en la cuarta ficha, y sin reina no se mueve nada", () => {
  let st = play(fresh(),
    { type: "place", kind: "hormiga", to: "0,0" }, { type: "place", kind: "hormiga", to: "1,0" },
    { type: "place", kind: "arana", to: "-1,0" }, { type: "place", kind: "arana", to: "2,0" },
    { type: "place", kind: "chapulin", to: "-2,0" }, { type: "place", kind: "chapulin", to: "3,0" });
  assert.equal(st.placed[0], 3);
  const acts = legalActions(st, 0);
  assert.ok(acts.length > 0 && acts.every((a) => a.type === "place" && a.kind === "reina"));
  assert.throws(() => apply(st, 0, { type: "place", kind: "hormiga", to: "-3,0" }), /reina/);
  assert.throws(() => apply(st, 0, { type: "move", from: "-2,0", to: "-1,-1" }), /reina/);
});

test("colmena única: la ficha que une dos partes no se puede mover", () => {
  const st = board({ "0,0": "0reina", "1,0": "0hormiga", "2,0": "1reina" });
  assert.deepEqual(destinations(st.cells, "1,0"), []);
  assert.deepEqual([...cutCells(new Set(Object.keys(st.cells)))], ["1,0"]);
  assert.throws(() => apply(st, 0, { type: "move", from: "1,0", to: "1,1" }), /parte/);
});

test("la reina da un paso por la orilla", () => {
  const st = board({ "0,0": "0reina", "1,0": "1reina" });
  assert.deepEqual(sorted(destinations(st.cells, "0,0")), sorted(["1,-1", "0,1"]));
});

test("no se pasa por un hueco cerrado (no cabe)", () => {
  // Un anillo con un hueco adentro: la hormiga no entra al hueco de en medio
  const ring = { "1,0": "0reina", "1,-1": "1reina", "0,-1": "0arana", "-1,0": "1arana", "-1,1": "0chapulin", "0,1": "1chapulin", "2,0": "0hormiga" };
  const st = board(ring);
  assert.ok(!destinations(st.cells, "2,0").includes("0,0"), "la hormiga no entra al hueco");
  assert.ok(destinations(st.cells, "2,0").length > 5);
});

test("el chapulín salta en línea recta hasta el primer hueco", () => {
  const st = board({ "0,0": "0chapulin", "1,0": "0reina", "2,0": "1reina", "3,0": "1hormiga" });
  assert.deepEqual(destinations(st.cells, "0,0"), ["4,0"]);
});

test("la araña da exactamente tres pasos", () => {
  const st = board({ "0,0": "0reina", "1,0": "1reina", "-1,0": "0arana" });
  const d = destinations(st.cells, "-1,0");
  assert.ok(d.length > 0);
  for (const to of d) assert.notEqual(to, "-1,0");
  // Alrededor de dos fichas en línea, tres pasos llevan justo al lado opuesto de la orilla
  assert.ok(!d.includes("-1,1") && !d.includes("0,-1"), "a un paso no llega");
});

test("el mayate se sube a la colmena y tapa lo que pisa", () => {
  let st = board({ "0,0": "0mayate", "1,0": "1reina", "-1,0": "0reina", "-1,1": "0hormiga", "0,1": "1hormiga" });
  assert.ok(destinations(st.cells, "0,0").includes("1,0"));
  st = apply(st, 0, { type: "move", from: "0,0", to: "1,0" });
  assert.equal(st.cells["1,0"].length, 2);
  // La reina de abajo ya no se mueve; arriba manda el mayate
  assert.equal(legalActions(st, 1).filter((a) => a.from === "1,0").length, 0);
  // Desde arriba puede bajar a cualquier lado
  assert.ok(destinations(st.cells, "1,0").length >= 5);
});

test("rodear a la reina termina la partida", () => {
  const st = board({ "0,0": "1reina", "1,0": "0hormiga", "1,-1": "0arana", "0,-1": "1arana", "-1,0": "1hormiga", "-1,1": "1chapulin", "2,0": "0reina", "2,1": "0hormiga" });
  const win = legalActions(st, 0).find((a) => a.type === "move" && a.to === "0,1");
  assert.ok(win, "la hormiga puede cerrar el último lado");
  const end = apply(st, 0, win);
  assert.equal(end.phase, "over");
  assert.equal(end.winner, 0);
  assert.deepEqual(game.result(end).champions, [0]);
});

test("al llegar al límite de jugadas es empate", () => {
  const tie = apply({ ...board({ "0,0": "0reina", "1,0": "1reina" }), plies: RULES.maxPlies - 1 }, 0, { type: "move", from: "0,0", to: "0,1" });
  assert.equal(tie.phase, "over");
  assert.equal(tie.draw, true);
  assert.deepEqual(game.result(tie).champions, []);
});

test("pasar solo se vale si no hay nada más", () => {
  const st = board({ "0,0": "0reina", "1,0": "1reina" });
  assert.throws(() => apply(st, 0, { type: "pass" }), /pasar/);
  // Sin reserva y con la reina atrapada: solo queda pasar
  const trapped = { ...board({ "0,0": "0reina", "1,0": "1hormiga", "1,-1": "1arana", "0,-1": "1reina", "-1,0": "1chapulin", "-1,1": "1mayate" }), hand: [{ reina: 0, mayate: 0, chapulin: 0, hormiga: 0, arana: 0 }, { ...PIECES }] };
  assert.deepEqual(legalActions(trapped, 0), [{ type: "pass" }]);
  assert.equal(apply(trapped, 0, { type: "pass" }).turn, 1);
});
