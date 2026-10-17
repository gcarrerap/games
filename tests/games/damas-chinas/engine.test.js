// Reglas de las damas chinas: el tablero, pasos y saltos, puntas ajenas, la meta, ganar, el bloqueo y la compu.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELLS, CORNERS, CORNER_OF, APEX, STEP, SEAT_CORNERS, cellAt, opposite,
  newGame, apply, legalActions, destinations, finished, autoAction, arrived, RULES,
} from "../../../games/damas-chinas/engine/index.js";
import { decide } from "../../../games/damas-chinas/ai/index.js";
import game from "../../../games/damas-chinas/index.js";

const C = (x, z) => { const i = cellAt(x, z); assert.ok(i >= 0, `no hay hoyo en ${x},${z}`); return i; };
const fresh = (n = 2) => newGame({ n, timer: false }, ["Ana", "Noe", "Gui", "Bar", "Ro", "Tú"].slice(0, n));
// Un tablero vacío con canicas donde se pida: { hoyo: asiento }
const withBoard = (st, pieces) => { const board = Array(CELLS.length).fill(-1); for (const [i, s] of Object.entries(pieces)) board[i] = s; return { ...st, board }; };
const dests = (st, seat, from) => Object.keys(destinations(st, seat, from)).map(Number).sort((a, b) => a - b);

test("el tablero es una estrella de 121 hoyos con seis puntas de 10", () => {
  assert.equal(CELLS.length, 121);
  assert.deepEqual(CORNERS.map((c) => c.length), [10, 10, 10, 10, 10, 10]);
  assert.equal(CORNER_OF.filter((k) => k === -1).length, 61);
  for (let k = 0; k < 6; k++) assert.equal(CORNER_OF[APEX[k]], k);
  // Un hoyo del centro tiene seis vecinos; el vértice de una punta, dos
  assert.equal(STEP[C(0, 0)].filter((i) => i >= 0).length, 6);
  assert.equal(STEP[APEX[0]].filter((i) => i >= 0).length, 2);
});

test("cada quien empieza en su punta y va a la de enfrente", () => {
  for (const n of [2, 3, 4, 6]) {
    const st = fresh(n);
    assert.deepEqual(st.homes, SEAT_CORNERS[n]);
    st.homes.forEach((k, s) => {
      assert.ok(CORNERS[k].every((i) => st.board[i] === s));
      assert.equal(st.targets[s], opposite(k));
    });
    assert.equal(st.board.filter((s) => s >= 0).length, RULES.pieces * n);
  }
  // Con 3, las metas están vacías
  const st = fresh(3);
  for (const k of st.targets) assert.ok(CORNERS[k].every((i) => st.board[i] === -1));
});

test("un paso va a un vecino vacío", () => {
  const st = withBoard(fresh(), { [C(0, 0)]: 0 });
  assert.deepEqual(dests(st, 0, C(0, 0)), STEP[C(0, 0)].filter((i) => i >= 0).sort((a, b) => a - b));
});

test("se salta sobre una canica de quien sea a un hoyo vacío, y los saltos se encadenan", () => {
  // 0 en (0,0); otras canicas en (1,0) y (3,0): salta a (2,0) y de ahí a (4,0)
  const st = withBoard(fresh(), { [C(0, 0)]: 0, [C(1, 0)]: 1, [C(3, 0)]: 0 });
  const d = destinations(st, 0, C(0, 0));
  assert.deepEqual(d[C(2, 0)], [C(0, 0), C(2, 0)]);
  assert.deepEqual(d[C(4, 0)], [C(0, 0), C(2, 0), C(4, 0)]);
  // No salta dos canicas juntas ni sobre un hoyo vacío
  const st2 = withBoard(fresh(), { [C(0, 0)]: 0, [C(1, 0)]: 1, [C(2, 0)]: 1 });
  assert.ok(!(C(3, 0) in destinations(st2, 0, C(0, 0))));
  assert.ok(!(C(2, 0) in destinations(withBoard(fresh(), { [C(0, 0)]: 0 }), 0, C(0, 0))));
});

test("una jugada puede volver a pasar por donde salió, pero no termina ahí", () => {
  // Un rombo de canicas alrededor: puede saltar en círculo, y el origen no es destino
  const st = withBoard(fresh(), { [C(0, 0)]: 0, [C(1, 0)]: 1, [C(2, -1)]: 1, [C(1, -2)]: 1 });
  const d = destinations(st, 0, C(0, 0));
  assert.ok(!(C(0, 0) in d));
  assert.ok(C(2, 0) in d);
});

test("no se termina en una punta ajena, pero sí se pasa saltando por ella", () => {
  const st = fresh(2); // asiento 0: punta 0 → 3. Punta 1 (z < -4) es ajena
  const inner = C(1, -4), into = C(2, -5); // de un hoyo del centro a uno de la punta 1
  assert.equal(CORNER_OF[into], 1);
  const s1 = withBoard(st, { [inner]: 0 });
  assert.ok(!(into in destinations(s1, 0, inner)));
  // Saltar a la punta 1 y de ahí salir de nuevo al centro sí se vale
  const land = C(3, -6);
  assert.equal(CORNER_OF[land], 1);
  const s2 = withBoard(st, { [inner]: 0, [into]: 1, [C(3, -5)]: 1 });
  const d = destinations(s2, 0, inner);
  assert.ok(!(land in d));
  // De (3,-6), en la punta 1, salta sobre (3,-5) a (3,-4), que ya es centro: la jugada termina ahí
  assert.equal(CORNER_OF[C(3, -4)], -1);
  assert.deepEqual(d[C(3, -4)], [inner, land, C(3, -4)]);
});

test("una canica que llegó a su meta ya no sale", () => {
  const st = fresh(2);
  const tgt = CORNERS[st.targets[0]];
  const front = tgt.find((i) => STEP[i].some((j) => j >= 0 && CORNER_OF[j] === -1));
  const s = withBoard(st, { [front]: 0 });
  const d = dests(s, 0, front);
  assert.ok(d.length > 0);
  assert.ok(d.every((i) => CORNER_OF[i] === st.targets[0]));
});

test("solo juega quien tiene el turno, y solo por caminos válidos", () => {
  const st = fresh(2);
  assert.deepEqual(legalActions(st, 1), []);
  const a = legalActions(st, 0)[0];
  assert.throws(() => apply(st, 1, a), /turno/);
  assert.throws(() => apply(st, 0, { type: "move", path: [a.path[0], C(0, 0)] }), /no puede llegar/);
  assert.throws(() => apply(st, 0, { type: "move", path: [CORNERS[3][0], C(0, 0)] }), /no es tuya/);
  assert.throws(() => apply(st, 0, { type: "pass" }), /pasar/);
  const st2 = apply(st, 0, a);
  assert.equal(st2.turn, 1);
  assert.equal(st2.board[a.path[0]], -1);
  assert.equal(st2.board[a.path[a.path.length - 1]], 0);
  assert.deepEqual(st2.last, { seat: 0, path: a.path });
});

test("gana quien mete sus 10 canicas en la meta", () => {
  const st = fresh(2);
  const tgt = CORNERS[st.targets[0]];
  // Nueve en la meta y la décima a un paso del hoyo libre
  const hole = tgt.find((i) => STEP[i].some((j) => j >= 0 && CORNER_OF[j] === -1));
  const outside = STEP[hole].find((j) => j >= 0 && CORNER_OF[j] === -1);
  const pieces = Object.fromEntries(tgt.filter((i) => i !== hole).map((i) => [i, 0]));
  pieces[outside] = 0;
  pieces[C(0, 0)] = 1;
  const s = withBoard(st, pieces);
  assert.equal(finished(s, 0), false);
  const end = apply(s, 0, { type: "move", path: [outside, hole] });
  assert.equal(end.phase, "over");
  assert.equal(end.winner, 0);
  assert.ok(game.isOver(end));
  assert.deepEqual(game.result(end).champions, [0]);
  assert.equal(arrived(end, 0), 10);
  assert.deepEqual(legalActions(end, 1), []);
});

test("contra el bloqueo: si en tu meta hay canicas ajenas que no se pueden mover y lo demás es tuyo, ganas", () => {
  const st = fresh(2);
  const tgt = CORNERS[st.targets[0]];
  const apex = APEX[st.targets[0]];
  // El rival se quedó en el vértice de su casa (mi meta), encerrado por mis nueve canicas
  const pieces = Object.fromEntries(tgt.filter((i) => i !== apex).map((i) => [i, 0]));
  pieces[apex] = 1;
  assert.equal(finished(withBoard(st, pieces), 0), true);
  // Si el rival se puede mover (hay un hueco), todavía no
  const front = tgt.find((i) => STEP[i].some((j) => j >= 0 && CORNER_OF[j] === -1));
  const p2 = { ...pieces }; delete p2[front];
  p2[C(0, 0)] = 0;
  assert.equal(finished(withBoard(st, p2), 0), false);
});

test("si no hay ninguna jugada, se pasa", () => {
  const st = fresh(2);
  // Canica del asiento 0 en el vértice de su casa, rodeada y sin hoyo para saltar
  const apex = APEX[st.homes[0]];
  const pieces = { [apex]: 0 };
  for (const i of CORNERS[st.homes[0]]) if (i !== apex) pieces[i] = 1;
  const s = withBoard(st, pieces);
  assert.deepEqual(legalActions(s, 0), [{ type: "pass" }]);
  const s2 = apply(s, 0, { type: "pass" });
  assert.equal(s2.turn, 1);
  assert.deepEqual(decide(s, 0, "normal"), { type: "pass" });
});

test("el reloj juega la canica que más avanza", () => {
  const st = fresh(2);
  const a = autoAction(st);
  assert.equal(a.type, "move");
  assert.equal(apply(st, 0, a).turn, 1);
});

test("la compu prefiere el salto más largo y no deshace su jugada", () => {
  const st = fresh(2);
  // 0 en el centro con una cadena de saltos hacia su meta (punta 3, x < -4) y una opción de un paso
  const s = withBoard(st, { [C(2, 0)]: 0, [C(1, 0)]: 1, [C(-1, 0)]: 1, [C(4, 0)]: 0 });
  const a = decide(s, 0, "dificil", () => 0.5);
  assert.deepEqual(a.path, [C(2, 0), C(0, 0), C(-2, 0)]);
  assert.equal(decide(s, 1, "normal"), null);
});

test("partidas entre la compu terminan llenando la meta, sin llegar al tope", async () => {
  const { playGame } = await import("../../../modules/tournament/index.js");
  for (const n of [2, 3, 4, 6]) {
    const r = playGame(game, Array(n).fill("normal"), { config: { n, timer: false }, seed: 3 });
    assert.equal(r.state.capped, false, `${n} jugadores`);
    assert.ok(finished(r.state, r.state.winner));
  }
});
