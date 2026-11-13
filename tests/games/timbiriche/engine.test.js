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
  assert.deepEqual(st.last.skipped, [0]);
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

test("2 a 6 jugadores: el turno va en orden y vuelve al primero", () => {
  for (const n of [3, 4, 6]) {
    let st = fresh({ n });
    assert.equal(st.names.length, n);
    assert.deepEqual(st.scores, Array(n).fill(0));
    const order = [];
    for (let i = 0; i < n + 1; i++) { order.push(st.turn); st = apply(st, st.turn, L(freeLines(st).find((l) => closingLines(st).length === 0 || true))); }
    assert.deepEqual(order, Array.from({ length: n + 1 }, (_, i) => i % n));
  }
  assert.throws(() => newGame({ n: 7, size: 3, secs: 20 }), /no válida/);
  assert.throws(() => newGame({ n: 1, size: 3, secs: 20 }), /no válida/);
});

test("con 3 jugadores quien cierra una caja sigue, y el castigo salta solo a quien lo debe", () => {
  // El 0 cierra y sigue tirando
  let st = withLines(fresh({ n: 3 }), three(0, 0, "v:0:1"), 0);
  st = apply(st, 0, L("v:0:1"));
  assert.equal(st.turn, 0);
  // El 0 traza sin cerrar (ya no hay cajas por cerrar) y le toca al 1, que deja pasar una caja
  st = apply(st, 0, L("h:3:0"));
  assert.equal(st.turn, 1);
  st = withLines({ ...st, boxes: st.boxes.map(() => -1), skip: [false, false, false] }, three(1, 1, "h:2:1"), 1);
  st = apply(st, 1, L("h:3:2"));
  assert.deepEqual(st.skip, [false, true, false]);
  assert.equal(st.turn, 2);
  // El 2 se lleva la caja, vuelve a tirar y pasa sin castigo (ya no hay nada que cerrar)
  st = apply(st, 2, L("h:2:1"));
  assert.equal(st.turn, 2);
  st = apply(st, 2, L("h:3:0"));
  assert.equal(st.turn, 0);
  // El 0 pasa: al 1 se le salta el turno y sigue el 2
  st = apply(st, 0, L("h:3:1"));
  assert.equal(st.turn, 2, "al 1 se le salta el turno");
  assert.deepEqual(st.last.skipped, [1]);
  assert.deepEqual(st.skip, [false, false, false]);
});

test("con 4 jugadores se pueden saltar dos castigos seguidos", () => {
  let st = fresh({ n: 4 });
  st = { ...st, skip: [false, true, true, false], turn: 0 };
  st = apply(st, 0, L("h:0:0"));
  assert.equal(st.turn, 3);
  assert.deepEqual(st.last.skipped, [1, 2]);
  assert.deepEqual(st.skip, [false, false, false, false]);
});

test("gana quien tenga más cajas; los empates de primer lugar se reparten", () => {
  const over = (scores) => {
    const st = fresh({ n: scores.length });
    const total = scores.reduce((a, b) => a + b, 0);
    // Una raya que cierra la última caja: el 0 la toma, así que se le resta una y se le suma al armar el estado
    const lines = allLines(st).filter((l) => l !== "v:2:3");
    const boxes = Array(9).fill(0).map((_, i) => (i === 8 ? -1 : -2));
    let k = 0;
    scores.forEach((v, seat) => { for (let j = 0; j < v - (seat === 0 ? 1 : 0); j++) boxes[k++] = seat; });
    assert.equal(k + 1, total, "9 cajas");
    return apply({ ...st, lines: Object.fromEntries(lines.map((l) => [l, 0])), boxes, scores: scores.map((v, i) => (i === 0 ? v - 1 : v)), turn: 0 }, 0, L("v:2:3"));
  };
  let st = over([4, 3, 2]);
  assert.deepEqual([st.phase, st.winner, st.winners, st.draw], ["over", 0, [0], false]);
  st = over([3, 3, 3]);
  assert.deepEqual([st.winner, st.winners, st.draw], [null, [0, 1, 2], true]);
  assert.deepEqual(game.result(st).champions, [0, 1, 2]);
  st = over([2, 4, 3]);
  assert.deepEqual([st.winner, st.winners, st.draw], [1, [1], false]);
  assert.deepEqual(game.result(st).champions, [1]);
});

test("la mesa acepta 2 a 6 jugadores y se puede jugar en el mismo aparato", () => {
  const st = game.setup({ n: 5, names: ["A", "B", "C", "D", "E"] }, { now: 0 });
  assert.equal(st.config.n, 5);
  assert.equal(st.scores.length, 5);
  assert.equal(game.hotseat, true);
  assert.deepEqual(game.modes.map((m) => m.n), [2, 3, 4, 5, 6]);
  assert.deepEqual(game.currentSeats(st), [0]);
});

test("la compu juega partidas completas de 3, 4 y 6", () => {
  for (const n of [3, 4, 6]) {
    const st = playGame(game, Array(n).fill("normal"), { config: { n, size: "4", timer: false }, seed: n }).state;
    assert.equal(st.phase, "over");
    assert.equal(st.scores.reduce((a, b) => a + b, 0), 16);
    assert.ok(st.winners.length >= 1);
  }
  // la difícil no hace la doble jugada con más de 2
  const st3 = withLines(fresh({ n: 3, penalty: false }), ["h:0:0", "h:0:2", "h:0:1", "v:1:1", "h:2:2", "v:1:3", "h:3:2", "h:3:1", "v:0:0", "v:0:2", "h:2:0", "h:2:1", "v:2:0", "v:2:1", "h:3:0"], 0);
  assert.deepEqual(decide(st3, 0, "dificil"), L("v:2:2"));
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
