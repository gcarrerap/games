// Reglas del timbiriche: rayas, cerrar cajas y volver a tirar, el castigo por dejar pasar una caja, el reloj
// configurable, el final y la compu.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame, apply, legalActions, allLines, closingLines, safeLines, freeLines, greedyCapture, autoAction, sidesOf,
} from "../../../games/timbiriche/engine/index.js";
import { decide, doubleDeal, advise } from "../../../games/timbiriche/ai/index.js";
import game from "../../../games/timbiriche/index.js";
import { playGame } from "../../../modules/tournament/index.js";

const fresh = (o = {}) => newGame({ n: 2, size: 3, secs: 20, penalty: true, ...o }, ["Ana", "Noe"]);
const L = (line) => ({ type: "line", line });
// Pone rayas sin pasar por los turnos (para armar posiciones): { "h:0:0": 0, … }
const withLines = (st, ids, turn = st.turn) => ({ ...st, lines: Object.fromEntries(ids.map((id) => [id, 0])), turn });
// Una caja con tres lados (le falta `missing`)
const three = (r, c, missing) => sidesOf(r, c).filter((l) => l !== missing);

test("el tablero tiene (n+1)·n·2 rayas y n·n cajas", () => {
  for (const n of [3, 4, 5, 6]) {
    const st = fresh({ size: n });
    assert.equal(allLines(st).length, 2 * n * (n + 1));
    assert.equal(st.boxes.length, n * n);
    assert.equal(legalActions(st, 0).length, 2 * n * (n + 1));
    assert.deepEqual(legalActions(st, 1), []);
  }
});

test("una raya que no cierra pasa el turno; una trazada no se puede repetir", () => {
  let st = fresh();
  st = apply(st, 0, L("h:0:0"));
  assert.equal(st.turn, 1);
  assert.equal(st.lines["h:0:0"], 0);
  assert.throws(() => apply(st, 1, L("h:0:0")), /ya está trazada/);
  assert.throws(() => apply(st, 0, L("h:1:1")), /No es tu turno/);
  assert.throws(() => apply(st, 1, L("h:9:9")), /no existe/);
});

test("cerrar una caja la gana y vuelve a tirar; una raya puede cerrar dos", () => {
  let st = withLines(fresh(), three(0, 0, "v:0:1"), 0);
  st = apply(st, 0, L("v:0:1"));
  assert.equal(st.boxes[0], 0);
  assert.equal(st.scores[0], 1);
  assert.equal(st.turn, 0, "vuelve a tirar");
  // Dos cajas vecinas con tres lados que comparten la raya que falta
  st = withLines(fresh(), [...three(1, 0, "v:1:1"), ...three(1, 1, "v:1:1")], 1);
  st = apply(st, 1, L("v:1:1"));
  assert.equal(st.scores[1], 2);
  assert.deepEqual(st.last.closed.sort(), [3, 4]);
  assert.equal(st.turn, 1);
});

test("castigo: si podías cerrar y no cerraste, pierdes tu siguiente turno", () => {
  let st = withLines(fresh(), three(0, 0, "v:0:1"), 0);
  st = apply(st, 0, L("h:3:2")); // Ana deja pasar la caja
  assert.equal(st.last.penalized, true);
  assert.deepEqual(st.skip, [true, false]);
  assert.deepEqual(st.penalties, [1, 0]);
  assert.equal(st.turn, 1);
  // Noe se lleva la caja y sigue; luego traza una raya sin cerrar: como Ana pierde su turno, Noe vuelve a tirar
  st = apply(st, 1, L("v:0:1"));
  assert.equal(st.turn, 1);
  st = apply(st, 1, L("h:3:0"));
  assert.equal(st.turn, 1, "Ana perdió este turno");
  assert.equal(st.last.skipped, 0);
  assert.deepEqual(st.skip, [false, false], "el castigo se consume");
  st = apply(st, 1, L("h:3:1"));
  assert.equal(st.turn, 0, "después todo sigue normal");
});

test("castigo: si no había caja para cerrar, no hay castigo", () => {
  const st = apply(fresh(), 0, L("h:0:0"));
  assert.equal(st.last.penalized, false);
  assert.deepEqual(st.skip, [false, false]);
});

test("castigo: sin la opción no se castiga; si los dos lo deben, se cancela", () => {
  let st = withLines(fresh({ penalty: false }), three(0, 0, "v:0:1"), 0);
  st = apply(st, 0, L("h:3:2"));
  assert.equal(st.last.penalized, false);
  assert.equal(st.turn, 1);
  // Ana deja pasar, y luego Noe también: los dos castigos se cancelan y le toca a Ana como siempre
  st = withLines(fresh(), three(0, 0, "v:0:1"), 0);
  st = apply(st, 0, L("h:3:2"));
  st = apply(st, 1, L("h:3:1"));
  assert.equal(st.last.penalized, true);
  assert.equal(st.turn, 0);
  assert.deepEqual(st.skip, [false, false]);
  assert.deepEqual(st.penalties, [1, 1]);
});

test("la mesa escoge el tamaño, los segundos por raya y el castigo", () => {
  const st = game.setup({ n: 2, size: "6", secs: "60", penalty: "off", names: ["A", "B"] }, { now: 0 });
  assert.equal(st.w, 6);
  assert.equal(st.config.secs, 60);
  assert.equal(st.config.penalty, false);
  assert.equal(game.timing.turnMs(st), 60000);
  assert.equal(game.timing.turnMs({ ...st, config: { ...st.config, timer: false } }), null, "Sin límite");
  // Sin opciones (pruebas, mesas viejas): los defaults
  const d = game.setup({ n: 2 }, { now: 0 });
  assert.deepEqual([d.w, d.config.secs, d.config.penalty, game.timing.turnMs(d)], [4, 20, true, 20000]);
  assert.throws(() => game.setup({ n: 2, size: "9" }, { now: 0 }));
  assert.throws(() => game.setup({ n: 2, secs: "7" }, { now: 0 }));
});

test("al vencerse el reloj se cierra la caja que haya (el reloj nunca castiga)", () => {
  let st = withLines(fresh(), three(2, 2, "h:3:2"), 0);
  assert.deepEqual(autoAction(st), L("h:3:2"));
  st = apply(st, 0, autoAction(st));
  assert.equal(st.scores[0], 1);
  // Sin cajas para cerrar, una raya que no regala nada
  const a = autoAction(fresh());
  assert.ok(safeLines(fresh()).includes(a.line));
});

test("la partida termina cuando se cierran todas las cajas; gana quien tiene más", () => {
  const st = playGame(game, ["normal", "normal"], { config: { n: 2, size: "3", timer: false }, seed: 3 }).state;
  assert.equal(st.phase, "over");
  assert.equal(st.scores[0] + st.scores[1], 9);
  assert.equal(freeLines(st).length, 0);
  assert.equal(st.winner, st.scores[0] > st.scores[1] ? 0 : 1);
  assert.equal(game.result(st).champions[0], st.winner);
});

test("cuántas cajas regala una raya: se cuenta toda la cadena", () => {
  // Fila de arriba de 3×3 como un pasillo abierto por las dos puntas: tapas de arriba y de abajo trazadas
  const ids = ["h:0:0", "h:0:1", "h:0:2", "h:1:0", "h:1:1", "h:1:2"];
  const st = withLines(fresh(), ids, 0);
  assert.equal(greedyCapture(st, { ...st.lines, "v:0:3": 1 }).taken, 3, "cerrar la otra punta regala las tres");
  assert.equal(closingLines(st).length, 0);
});

test("la compu cierra cajas, evita regalar y regala lo menos posible", () => {
  let st = withLines(fresh(), three(1, 1, "h:1:1"), 0);
  assert.deepEqual(decide(st, 0, "normal"), L("h:1:1"));
  const safe = decide(fresh(), 0, "normal", () => 0.4);
  assert.ok(safeLines(fresh()).includes(safe.line));
  assert.equal(decide(fresh(), 1, "normal"), null, "no le toca");
  assert.equal(advise(st, 0).action.line, "h:1:1");
});

test("la difícil hace la doble jugada solo sin castigo", () => {
  // Una posición de 3×3 a la que se llegó jugando (compu normal): la cadena (2,1)-(2,2) se puede llevar, (2,1) con
  // tres lados, y fuera de ella todas las rayas regalan algo.
  const ids = ["h:0:0", "h:0:2", "h:0:1", "v:1:1", "h:2:2", "v:1:3", "h:3:2", "h:3:1", "v:0:0", "v:0:2", "h:2:0", "h:2:1", "v:2:0", "v:2:1", "h:3:0"];
  const base = fresh({ penalty: false });
  const st = withLines(base, ids, 0);
  // Revisa el armado: solo (0,0) se puede cerrar y no hay rayas seguras
  assert.deepEqual(closingLines(st), ["v:2:2"]);
  assert.equal(safeLines(st).length, 0);
  assert.equal(greedyCapture(st).taken, 2);
  const dd = doubleDeal(st);
  assert.equal(dd, "v:2:3", "traza el lado lejano: deja las dos cajas juntas");
  assert.deepEqual(decide(st, 0, "dificil"), L("v:2:3"));
  assert.deepEqual(decide(st, 0, "normal"), L("v:2:2"), "la normal se las lleva");
  // Con castigo la difícil se lleva la caja
  const withPen = withLines(fresh({ penalty: true }), ids, 0);
  assert.deepEqual(decide(withPen, 0, "dificil"), L("v:2:2"));
});

test("sin castigo la difícil le gana casi siempre a la normal", () => {
  let wins = 0;
  for (let s = 1; s <= 30; s++) {
    const a = playGame(game, ["dificil", "normal"], { config: { n: 2, size: "5", penalty: "off", timer: false }, seed: s }).state;
    const b = playGame(game, ["normal", "dificil"], { config: { n: 2, size: "5", penalty: "off", timer: false }, seed: s }).state;
    wins += (a.winner === 0) + (b.winner === 1);
  }
  assert.ok(wins >= 40, `ganó ${wins} de 60`);
});
