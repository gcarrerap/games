// Reglas del Láser: acomodo, el recorrido del láser (espejos, escudo del anubis, esfinge), mover, girar, el
// escarabajo que intercambia, las casillas reservadas, ganar, el empate por repetición y la compu.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame, apply, legalActions, movesFor, moveBoard, traceBeam, interact, boardFor, piece, idx, sq, reservedFor, canStand,
  autoAction, posKey, typeOf, ownerOf, orientOf, SPHINX_AT, PYRAMID, SCARAB, ANUBIS, PHARAOH, SPHINX, N, SETUPS, RULES,
} from "../../../games/khet/engine/index.js";
import { decide, advise, evaluate } from "../../../games/khet/ai/index.js";
import game from "../../../games/khet/index.js";
import { playGame } from "../../../modules/tournament/index.js";

const fresh = (o = {}) => newGame({ n: 2, ...o }, ["Plata", "Rojo"]);
const at = (name) => idx(8 - Number(name.slice(1)), "ABCDEFGHIJ".indexOf(name[0]));
// Un tablero vacío con las dos esfinges y los dos faraones en su lugar, más lo que se ponga
function bare(extra = {}) {
  const b = Array(N).fill(0);
  b[SPHINX_AT[0]] = piece(SPHINX, 0, 0);
  b[SPHINX_AT[1]] = piece(SPHINX, 1, 2);
  b[at("E1")] = piece(PHARAOH, 0);
  b[at("F8")] = piece(PHARAOH, 1);
  for (const [k, v] of Object.entries(extra)) b[at(k)] = v;
  return b;
}
const withBoard = (board, turn = 0) => ({ ...fresh(), board, turn, seen: {} });

test("acomodos: 13 piezas por color, simétricos y sin piezas en casillas del otro color", () => {
  for (const s of Object.keys(SETUPS)) {
    const b = boardFor(s);
    for (const owner of [0, 1]) assert.equal(b.filter((p) => p && ownerOf(p) === owner).length, 13, s);
    b.forEach((p, i) => {
      if (!p) return;
      assert.ok(canStand(p, i), `${s}: ${sq(i)}`);
      const q = b[N - 1 - i];
      assert.equal(typeOf(q), typeOf(p));
      assert.equal(ownerOf(q), 1 - ownerOf(p));
      assert.equal(orientOf(q), (orientOf(p) + 2) & 3);
    });
    // Al empezar, ningún láser destruye nada
    for (const seat of [0, 1]) assert.equal(traceBeam(b, seat).end, "off", `${s}: láser ${seat}`);
  }
});

test("casillas reservadas: columna izquierda + I1, I8 de Rojo; columna derecha + B1, B8 de Plata", () => {
  assert.equal(reservedFor(at("A4")), 1);
  assert.equal(reservedFor(at("I1")), 1);
  assert.equal(reservedFor(at("I8")), 1);
  assert.equal(reservedFor(at("J5")), 0);
  assert.equal(reservedFor(at("B1")), 0);
  assert.equal(reservedFor(at("B8")), 0);
  assert.equal(reservedFor(at("E4")), -1);
  // Una pirámide de Plata no puede entrar a la columna A
  const st = withBoard(bare({ B4: piece(PYRAMID, 0, 0) }));
  assert.throws(() => apply(st, 0, { type: "move", from: at("B4"), to: at("A4") }), /otro color/);
  assert.ok(!legalActions(st, 0).some((a) => a.type === "move" && a.to === at("A4")));
});

test("pirámide: rebota por los dos lados del espejo y se rompe por los otros dos", () => {
  const p = piece(PYRAMID, 0, 0); // espejo al noreste
  assert.deepEqual(interact(p, 2), { out: 1 }); // baja (llega del norte) → sale al este
  assert.deepEqual(interact(p, 3), { out: 0 }); // va al oeste (llega del este) → sale al norte
  assert.deepEqual(interact(p, 0), { stop: "kill" });
  assert.deepEqual(interact(p, 1), { stop: "kill" });
});

test("escarabajo: espejo de dos caras, nunca se rompe", () => {
  for (const o of [0, 1, 2, 3]) for (const d of [0, 1, 2, 3]) assert.ok(interact(piece(SCARAB, 1, o), d).out !== undefined);
  assert.deepEqual(interact(piece(SCARAB, 0, 0), 0), { out: 3 }); // sube, llega del sur → la cara suroeste lo manda al oeste
});

test("anubis: el escudo de frente detiene; por un lado lo destruye", () => {
  const a = piece(ANUBIS, 1, 0); // mira al norte
  assert.deepEqual(interact(a, 2), { stop: "block" }); // baja: le pega de frente
  assert.deepEqual(interact(a, 0), { stop: "kill" });
  assert.deepEqual(interact(a, 1), { stop: "kill" });
});

test("el láser de Plata sube por la columna J; con una pirámide rebota y destruye lo que encuentre", () => {
  // Pirámide en J5 que manda el rayo al oeste; anubis rojo de lado en E5
  const b = bare({ J5: piece(PYRAMID, 0, 2), E5: piece(ANUBIS, 1, 2) });
  const beam = traceBeam(b, 0);
  assert.equal(beam.end, "kill");
  assert.equal(beam.at, at("E5"));
  assert.deepEqual(beam.path[0], [9.5, 7.5]);
  assert.deepEqual(beam.path[1], [9.5, 3.5]);
});

test("mover, girar y disparar: destruir una pieza la manda a las perdidas", () => {
  // Plata gira su pirámide de J5 para mandar el rayo a la fila 5, donde hay una pirámide roja de espaldas
  let st = withBoard(bare({ J5: piece(PYRAMID, 0, 0), C5: piece(PYRAMID, 1, 3) }));
  st = apply(st, 0, { type: "rotate", at: at("J5"), dir: 1 }); // 0 → 1? no: necesitamos oeste
  // Con espejo SE (1) el rayo que sube rebota al este y se va del tablero
  assert.equal(st.last.beam.end, "off");
  assert.equal(st.turn, 1);
  st = apply(st, 1, { type: "move", from: at("F8"), to: at("G8") });
  st = apply(st, 0, { type: "rotate", at: at("J5"), dir: 1 }); // ahora SW: rebota al oeste
  assert.equal(st.last.beam.end, "kill");
  assert.equal(st.board[at("C5")], 0);
  assert.equal(st.lost[1].length, 1);
  assert.equal(st.seq, 3);
});

test("darle al faraón gana; darle al tuyo pierde", () => {
  let st = withBoard(bare({ J8: piece(PYRAMID, 0, 2), F8: 0, G8: piece(PHARAOH, 1) }));
  // El rayo sube por J, en J8 rebota al oeste y pega en el faraón rojo de G8
  st = apply(st, 0, { type: "move", from: at("E1"), to: at("E2") });
  assert.equal(st.phase, "over");
  assert.equal(st.winner, 0);
  assert.equal(st.lost[1].length, 1);
  // Fuego amigo: el faraón de Plata en la fila del rebote
  let st2 = withBoard(bare({ J8: piece(PYRAMID, 0, 1), F8: 0, G8: piece(PHARAOH, 0), E1: 0, E5: piece(PHARAOH, 1) }));
  st2 = apply(st2, 0, { type: "rotate", at: at("J8"), dir: 1 });
  assert.equal(st2.phase, "over");
  assert.equal(st2.winner, 1, "su propio láser lo destruyó");
});

test("escarabajo: intercambia con pirámide o anubis (de cualquier color), no con faraón ni escarabajo", () => {
  const b = bare({ E4: piece(SCARAB, 0, 0), E5: piece(PYRAMID, 1, 2), D4: piece(ANUBIS, 0, 0), F4: piece(SCARAB, 0, 1), E3: 0 });
  b[at("E3")] = piece(PHARAOH, 0); b[at("E1")] = 0;
  const moves = movesFor(b, 0).filter((a) => a.type === "move" && a.from === at("E4"));
  const tos = moves.map((a) => sq(a.to));
  assert.ok(tos.includes("E5"));
  assert.ok(tos.includes("D4"));
  assert.ok(!tos.includes("F4"));
  assert.ok(!tos.includes("E3"));
  const nb = moveBoard(b, 0, { type: "move", from: at("E4"), to: at("E5") });
  assert.equal(typeOf(nb[at("E5")]), SCARAB);
  assert.equal(typeOf(nb[at("E4")]), PYRAMID);
  assert.equal(ownerOf(nb[at("E4")]), 1);
  assert.throws(() => moveBoard(b, 0, { type: "move", from: at("D4"), to: at("E5") }), /ocupada/);
});

test("el intercambio tampoco manda una pieza a casilla del otro color", () => {
  // Escarabajo de Plata en B4 con una pirámide roja en A4: la pirámide roja puede ir a B4, pero el escarabajo no a A4
  const b = bare({ B4: piece(SCARAB, 0, 0), A4: piece(PYRAMID, 1, 1) });
  assert.ok(!movesFor(b, 0).some((a) => a.type === "move" && a.to === at("A4")));
});

test("la esfinge no se mueve: solo gira entre sus dos direcciones; el faraón no gira", () => {
  const st = fresh();
  const mine = legalActions(st, 0).filter((a) => a.at === SPHINX_AT[0] || a.from === SPHINX_AT[0]);
  assert.deepEqual(mine, [{ type: "rotate", at: SPHINX_AT[0], dir: 1 }]);
  const nb = moveBoard(st.board, 0, mine[0]);
  assert.equal(orientOf(nb[SPHINX_AT[0]]), 3); // ahora al oeste
  assert.equal(orientOf(moveBoard(nb, 0, { type: "rotate", at: SPHINX_AT[0], dir: -1 })[SPHINX_AT[0]]), 0);
  assert.throws(() => moveBoard(st.board, 0, { type: "move", from: SPHINX_AT[0], to: SPHINX_AT[0] - 1 }), /no se mueve/);
  assert.throws(() => moveBoard(st.board, 0, { type: "rotate", at: at("E1"), dir: 1 }), /no se gira/);
  assert.throws(() => apply(st, 1, legalActions(st, 0)[0]), /No es tu turno/);
  assert.deepEqual(legalActions(st, 1), []);
});

test("la misma posición tres veces es empate", () => {
  const b = bare({ G4: piece(PYRAMID, 0, 0), D5: piece(PYRAMID, 1, 2) });
  let st = { ...withBoard(b), seen: { [posKey(b, 0)]: 1 } };
  const go = (seat, a) => { st = apply(st, seat, a); };
  const mv = (f, t) => ({ type: "move", from: at(f), to: at(t) });
  for (let k = 0; k < 2; k++) { go(0, mv("G4", "G3")); go(1, mv("D5", "D6")); go(0, mv("G3", "G4")); if (st.phase === "play") go(1, mv("D6", "D5")); }
  assert.equal(st.phase, "over");
  assert.equal(st.draw, true);
});

test("el reloj juega algo que no pierde", () => {
  const st = fresh();
  const a = autoAction(st);
  assert.ok(a);
  assert.notEqual(apply(st, 0, a).winner, 1);
  const r = game.timing.autoAction(st);
  assert.ok(legalActions(st, 0).some((x) => JSON.stringify(x) === JSON.stringify(r)));
});

test("la compu remata al faraón cuando puede y no se suicida", () => {
  // Plata puede ganar girando su pirámide de J8 (con el faraón rojo en G8)
  const st = withBoard(bare({ J8: piece(PYRAMID, 0, 1), F8: 0, G8: piece(PHARAOH, 1) }));
  for (const p of ["facil", "normal", "dificil"]) {
    const a = decide(st, 0, p, () => 0.99);
    assert.equal(apply(st, 0, a).winner, 0, p);
  }
  assert.match(advise(st, 0).why, /faraón/);
  // Evaluación simétrica: el tablero inicial vale lo mismo para los dos
  const b = boardFor("clasico");
  assert.equal(evaluate(b, 0), evaluate(b, 1));
});

test("la compu difícil le gana a la fácil", () => {
  let wins = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const seats = seed % 2 ? ["dificil", "facil"] : ["facil", "dificil"];
    const g = playGame(game, seats, { config: { n: 2, timer: false }, seed });
    if (g.result.winner === seats.indexOf("dificil")) wins++;
  }
  assert.ok(wins >= 3, `ganó ${wins} de 4`);
});

test("contrato: setup lee las opciones y RULES las limita", () => {
  const st = game.setup({ n: 2, setup: "asalto", secs: "40", names: ["Ana", "Noe"] }, { now: 5 });
  assert.equal(st.config.setup, "asalto");
  assert.equal(st.config.secs, 40);
  assert.deepEqual(st.names, ["Ana", "Noe"]);
  assert.equal(game.timing.turnMs(st), 40000);
  assert.throws(() => game.setup({ n: 2, secs: "7" }, { now: 0 }), /no válida/);
  assert.ok(RULES.secs.includes(60));
});
