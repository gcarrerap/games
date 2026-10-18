// Reglas de la Carrera de Chihuahuas: salida, apilarse y cargar a los de encima, tapetes, boletos, fin de etapa,
// apuestas finales y la vista. También que la compu calcule bien las probabilidades de la etapa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, apply, legalActions, currentSeats, view, autoAction, moveDog, ranking, tileSpaces, positions, RULES, ND, SHOW, showMs, rollSteps } from "../../../games/chihuahuas/engine/index.js";
import { legOdds, fastMove, toFast, decide, advise, scoreActions } from "../../../games/chihuahuas/ai/index.js";
import game from "../../../games/chihuahuas/index.js";
import { seededRandom } from "../../../modules/random/index.js";

const C = 0, P = 1, CH = 2, N = 3, F = 4; // chia, oreo, chocolate, nacho, frijol
const ctx = { rnd: seededRandom(1), now: 0 };
const fresh = (n = 3, seed = 1) => newGame({ n, timer: false }, ["Ana", "Noe", "Gui", "Bar"].slice(0, n), 0, seededRandom(seed));
const empty = () => Array.from({ length: 21 }, () => []);
// Una pista armada: { casilla: [de abajo hacia arriba] }
const track = (o) => { const sp = empty(); for (const [s, dogs] of Object.entries(o)) sp[s] = dogs.slice(); return sp; };
// rnd que devuelve los valores dados en orden (para escoger dado y número)
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("salida: los cinco perros entre las casillas 1 y 3, los dados en el tazón y 3 croquetas", () => {
  const st = fresh(4);
  const pos = positions(st.spaces);
  assert.equal(pos.filter(Boolean).length, ND);
  assert.ok(pos.every((p) => p.space >= 1 && p.space <= 3));
  assert.deepEqual(st.dice, [0, 1, 2, 3, 4]);
  assert.deepEqual(st.coins, [3, 3, 3, 3]);
  assert.deepEqual(st.tickets[0], RULES.tickets);
  assert.deepEqual(currentSeats(st), [0]);
});

test("un perro se lleva a cuestas a los de encima y cae arriba de los que ya están", () => {
  const sp = track({ 2: [C, P, CH], 4: [N] });
  const mv = moveDog(sp, P, 2);
  assert.deepEqual(mv.spaces[2], [C]);
  assert.deepEqual(mv.spaces[4], [N, P, CH]);
  assert.deepEqual(mv.carried, [CH]);
  assert.deepEqual(ranking(mv.spaces).slice(0, 3), [CH, P, N]);
});

test("hueso: una casilla más y queda encima; aspiradora: una menos y queda debajo", () => {
  const sp = track({ 1: [C], 4: [N], 2: [F] });
  const hueso = moveDog(sp, C, 2, [{ seat: 0, space: 3, kind: "hueso" }]);
  assert.equal(hueso.to, 4); assert.deepEqual(hueso.spaces[4], [N, C]);
  const asp = moveDog(sp, C, 2, [{ seat: 0, space: 3, kind: "aspiradora" }]);
  assert.equal(asp.to, 2); assert.deepEqual(asp.spaces[2], [C, F]);
  // La aspiradora puede regresarlo a donde salió: queda debajo de los que se quedaron
  const back = moveDog(track({ 2: [P, C] }), C, 1, [{ seat: 0, space: 3, kind: "aspiradora" }]);
  assert.deepEqual(back.spaces[2], [C, P]);
});

test("sacudir el tazón: un perro corre, da 1 croqueta y su dado ya no regresa en la etapa", () => {
  let st = { ...fresh(3), spaces: track({ 1: [C, P], 2: [CH], 3: [N, F] }) };
  st = apply(st, 0, { type: "roll" }, { rnd: seq(0.1, 0.99), now: 0 }); // dado 0 (Chia), número 3
  assert.equal(st.last.dog, C); assert.equal(st.last.n, 3);
  assert.deepEqual(st.spaces[4], [C, P]);
  assert.equal(st.coins[0], 4);
  assert.deepEqual(st.dice, [P, CH, N, F]);
  assert.equal(st.turn, 1);
  assert.equal(st.shakes[0], 1);
});

test("tapete: quien lo puso gana 1 croqueta cuando alguien cae; no junto a otro, ni en la 1, ni con perros", () => {
  let st = { ...fresh(3), spaces: track({ 1: [C], 2: [P], 3: [CH, N, F] }) };
  assert.ok(!tileSpaces(st, 0).includes(1) && !tileSpaces(st, 0).includes(3));
  st = apply(st, 0, { type: "tile", space: 5, kind: "hueso" }, ctx);
  assert.ok(!tileSpaces(st, 1).includes(4) && !tileSpaces(st, 1).includes(6), "junto a otro tapete no");
  assert.ok(tileSpaces(st, 0).includes(4), "el tuyo lo puedes mover al lado");
  assert.throws(() => apply(st, 1, { type: "tile", space: 6, kind: "aspiradora" }, ctx), /no se puede/);
  st = apply(st, 1, { type: "tile", space: 7, kind: "aspiradora" }, ctx);
  st = apply(st, 2, { type: "roll" }, { rnd: seq(0.55, 0.4), now: 0 }); // dado de Chocolate (índice 2 de 5), corre 2
  assert.equal(st.last.dog, CH);
  assert.equal(st.last.to, 6, "cayó en el hueso de la 5 y corrió a la 6");
  assert.deepEqual(st.spaces[6], [CH, N, F]);
  assert.equal(st.coins[0], 4, "Ana gana por su hueso");
  assert.equal(st.coins[2], 4, "Gui gana por sacudir");
});

test("boletos de etapa: 5, 3, 2 y luego se acaban", () => {
  let st = fresh(3);
  st = apply(st, 0, { type: "ticket", dog: N }, ctx);
  st = apply(st, 1, { type: "ticket", dog: N }, ctx);
  st = apply(st, 2, { type: "ticket", dog: N }, ctx);
  assert.deepEqual(st.bets.map((b) => b.value), [5, 3, 2]);
  assert.ok(!legalActions(st, 0).some((a) => a.type === "ticket" && a.dog === N));
  assert.throws(() => apply(st, 0, { type: "ticket", dog: N }, ctx), /no quedan/);
});

test("fin de etapa: el boleto del primero paga su valor, el del segundo 1, los demás pierden 1 (sin bajar de 0)", () => {
  let st = { ...fresh(3), spaces: track({ 5: [C], 6: [P], 7: [CH], 8: [N], 9: [F] }), dice: [C], coins: [3, 3, 0] };
  st = apply(st, 0, { type: "ticket", dog: F }, ctx); // 5 por Frijol
  st = apply(st, 1, { type: "ticket", dog: N }, ctx); // 5 por Nacho
  st = apply(st, 2, { type: "ticket", dog: C }, ctx); // 5 por Chia
  st = apply(st, 0, { type: "roll" }, { rnd: seq(0, 0), now: 0 }); // Chia corre 1: sigue al último
  assert.equal(st.phase, "leg");
  assert.deepEqual(currentSeats(st), []);
  assert.deepEqual(legalActions(st, 2), [{ type: "next" }]);
  assert.deepEqual(st.coins, [3 + 5 + 1, 3 + 1, 0]);
  assert.deepEqual(st.summary.bets.map((b) => b.got), [5, 1, -1]);
  assert.equal(st.summary.delta[2], 0, "no baja de 0");
  st = apply(st, 2, { type: "next" }, ctx);
  assert.equal(st.phase, "play"); assert.equal(st.leg, 2);
  assert.deepEqual(st.dice, [0, 1, 2, 3, 4]);
  assert.deepEqual(st.bets, []); assert.deepEqual(st.tiles, []);
  assert.equal(st.turn, 1, "sigue el que seguía");
});

test("cruzar la meta termina la carrera: se cobran la etapa y las apuestas finales por orden de llegada", () => {
  let st = { ...fresh(3), spaces: track({ 15: [C], 16: [P], 10: [CH], 3: [N, F] }), dice: [C, P] };
  st = apply(st, 0, { type: "final", which: "winner", dog: C }, ctx);
  st = apply(st, 1, { type: "final", which: "winner", dog: C }, ctx);
  st = apply(st, 2, { type: "final", which: "winner", dog: P }, ctx);
  st = apply(st, 0, { type: "final", which: "loser", dog: N }, ctx);
  st = apply(st, 1, { type: "final", which: "loser", dog: F }, ctx);
  assert.throws(() => apply(st, 2, { type: "final", which: "loser", dog: P }, ctx), /Ya usaste/);
  st = apply(st, 2, { type: "roll" }, { rnd: seq(0, 0.99), now: 0 }); // Chia corre 3: 18, cruza la meta
  assert.equal(st.phase, "over");
  assert.deepEqual(st.final.rank, [C, P, CH, F, N]);
  assert.deepEqual(st.final.winner.map((b) => b.got), [8, 5, -1]);
  assert.deepEqual(st.final.loser.map((b) => b.got), [8, -1]);
  // Ana: 3 + 8 + 8 · Noe: 3 + 5 − 1 · Gui: 3 + 1 (tazón) − 1
  assert.deepEqual(st.coins, [19, 7, 3]);
  assert.deepEqual(st.final.champions, [0]);
  assert.ok(game.isOver(st));
});

test("la vista esconde a qué perro apostaron los demás al final, y al terminar lo enseña", () => {
  let st = fresh(3);
  st = apply(st, 0, { type: "final", which: "winner", dog: P }, ctx);
  const v1 = view(st, 1), v0 = view(st, 0);
  assert.deepEqual(v1.winnerBets, [{ seat: 0, dog: null }]);
  assert.equal(v1.cards[0], null);
  assert.equal(v1.cardCounts[0], 4);
  assert.deepEqual(v0.winnerBets, [{ seat: 0, dog: P }]);
  assert.ok(!JSON.stringify(view(st, -1).winnerBets).includes(`"dog":${P}`));
  assert.deepEqual(view({ ...st, phase: "over" }, 1).winnerBets, [{ seat: 0, dog: P }]);
});

test("solo juega quien tiene el turno; al vencerse el reloj se sacude el tazón", () => {
  const st = fresh(3);
  assert.throws(() => apply(st, 1, { type: "roll" }, ctx), /turno/);
  assert.deepEqual(autoAction(st), { type: "roll" });
  assert.deepEqual(legalActions(st, 1), []);
});

test("la simulación rápida de la compu mueve igual que las reglas", () => {
  const rnd = seededRandom(9);
  for (let k = 0; k < 300; k++) {
    const st = newGame({ n: 2 }, [], 0, rnd);
    let sp = st.spaces;
    const tiles = [{ seat: 0, space: 4 + Math.floor(rnd() * 3), kind: rnd() < 0.5 ? "hueso" : "aspiradora" }];
    const tm = { [tiles[0].space]: tiles[0].kind };
    let f = toFast(sp);
    for (let i = 0; i < 6; i++) {
      const d = Math.floor(rnd() * ND), n = 1 + Math.floor(rnd() * 3);
      sp = moveDog(sp, d, n, tiles).spaces;
      f = fastMove(f, d, n, tm);
      assert.deepEqual(toFast(sp), { sp: f.sp, ht: f.ht });
    }
  }
});

test("probabilidades de la etapa: suman 1 y son exactas en un caso a mano", () => {
  // Solo queda el dado de Chia, sola en la 1; Oreo en la 4. Chia es primera solo si saca 3 (cae encima de Oreo)
  const sp = track({ 1: [C], 4: [P], 2: [CH, N, F] });
  const o = legOdds(sp, [C]);
  assert.ok(Math.abs(o.first[C] - 1 / 3) < 1e-9);
  assert.ok(Math.abs(o.first[P] - 2 / 3) < 1e-9);
  const all = legOdds(fresh(3).spaces, [0, 1, 2, 3, 4]);
  assert.ok(Math.abs(all.first.reduce((a, b) => a + b) - 1) < 1e-9);
  assert.ok(Math.abs(all.second.reduce((a, b) => a + b) - 1) < 1e-9);
});

test("la compu toma el boleto de 5 cuando un perro es casi seguro primero, y su consejo lo dice", () => {
  // Frijol muy adelante; solo falta el dado de Chia, que no lo alcanza
  const st = { ...fresh(3), spaces: track({ 1: [C], 2: [P, CH, N], 8: [F] }), dice: [C] };
  const v = view(st, 0);
  const opts = scoreActions(v, 0, "normal");
  const best = opts.slice().sort((a, b) => b.ev - a.ev)[0];
  assert.deepEqual(best.action, { type: "ticket", dog: F });
  assert.deepEqual(decide(v, 0, "prudente", seededRandom(2)), { type: "ticket", dog: F });
  assert.deepEqual(advise(v, 0).best.action, { type: "ticket", dog: F });
  assert.equal(decide(v, 1, "normal"), null, "no le toca");
});

test("historial: la salida, cada jugada con su etapa y el fin de etapa; la vista esconde las apuestas secretas ajenas", () => {
  let st = fresh(3);
  assert.equal(st.hist[0].kind, "start");
  assert.equal(st.hist[0].start.length, ND);
  assert.ok(st.hist[0].start.every((o) => positions(st.spaces)[o.dog].space === o.n), "cada perro arrancó donde dice su tirada");
  st = { ...st, spaces: track({ 5: [C], 6: [P], 7: [CH], 8: [N], 9: [F] }), dice: [C] };
  st = apply(st, 0, { type: "final", which: "winner", dog: F }, ctx);
  st = apply(st, 1, { type: "tile", space: 3, kind: "hueso" }, ctx);
  st = apply(st, 2, { type: "roll" }, { rnd: seq(0, 0.5), now: 0 });
  assert.deepEqual(st.hist.map((h) => h.kind), ["start", "final", "tile", "roll", "legEnd"]);
  assert.ok(st.hist.every((h) => h.leg === 1));
  const roll = st.hist[3];
  assert.deepEqual([roll.dog, roll.n, roll.from, roll.to, roll.fromLevel], [C, 2, 5, 7, 0]);
  assert.equal(view(st, 1).hist[1].dog, null, "Noe no sabe a quién le apostó Ana");
  assert.equal(view(st, 0).hist[1].dog, F);
  st = apply(st, 0, { type: "next" }, ctx);
  st = apply(st, 0, { type: "ticket", dog: N }, ctx);
  assert.equal(st.hist.at(-1).leg, 2);
});

test("lo que tarda en verse una tirada: sale el dado y el perro avanza casilla por casilla", () => {
  assert.equal(showMs(null), 0);
  assert.equal(showMs({ kind: "ticket" }), 0);
  const plain = { kind: "roll", from: 3, landed: 5, tile: null };
  assert.equal(rollSteps(plain), 2);
  assert.equal(rollSteps({ ...plain, tile: { kind: "hueso" } }), 3);
  assert.equal(rollSteps({ kind: "roll", from: 15, landed: 18, tile: null }), 2, "hasta la meta");
  assert.equal(showMs(plain), SHOW.reveal + 2 * SHOW.step + SHOW.settle);
  assert.equal(game.bots.thinkMs({ last: plain }), 1700 + showMs(plain), "la compu espera a que se vea");
});
