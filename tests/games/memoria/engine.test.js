// Reglas de Memoria Veloz: abrir hasta 2, regresar, reclamar, el congelado al fallar, los timers y su recarga, el
// final con desempate y lo que ve cada asiento.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, apply, legalActions, view, ranking, nextDeadline, canTimer, RULES } from "../../../games/memoria/engine/index.js";
import { decide, thinkMs } from "../../../games/memoria/ai/index.js";
import game from "../../../games/memoria/index.js";
import { seededRandom } from "../../../modules/random/index.js";

const fresh = (n = 2) => newGame({ n }, ["Ana", "Noe", "Gui", "Bar"].slice(0, n), { rnd: seededRandom(1), now: 0 });
const at = (now) => ({ rnd: seededRandom(2), now });
const act = (st, seat, a, now = st.t) => apply(st, seat, a, at(now));
// Posiciones de un par y de una carta que no es de ese par
function pairOf(st, f = st.cards[0].f) {
  const [x, y] = st.cards.map((c, i) => (c.f === f ? i : -1)).filter((i) => i >= 0);
  return [x, y];
}
const other = (st, f, skip = []) => st.cards.findIndex((c, i) => c.f !== f && !skip.includes(i));

test("el tablero: 18 pares con 1 o 2 jugadores, 24 con 3 o 4; cada cara dos veces", () => {
  for (const [n, p] of [[1, 18], [2, 18], [3, 24], [4, 24]]) {
    const st = fresh(n);
    assert.equal(st.cards.length, p * 2);
    const counts = new Map();
    for (const c of st.cards) counts.set(c.f, (counts.get(c.f) || 0) + 1);
    assert.equal(counts.size, p);
    assert.ok([...counts.values()].every((k) => k === 2));
  }
});

test("abrir: una abierta por otro no se puede tomar, y la tuya no se regresa", () => {
  let st = fresh(2);
  const [x] = pairOf(st);
  st = act(st, 0, { type: "open", i: x });
  assert.equal(st.cards[x].hold, 0);
  assert.throws(() => act(st, 1, { type: "open", i: x }), /otro/);
  assert.throws(() => act(st, 0, { type: "open", i: x }), /ya la tienes/);
  for (const type of ["back", "backAll", "claim"]) assert.throws(() => act(st, 0, { type, i: x }), /no existe/);
  assert.deepEqual([...new Set(legalActions(st, 0).map((a) => a.type))].sort(), ["open", "tick"]);
});

test("si la segunda es pareja, el par es tuyo al instante y sale del juego", () => {
  let st = fresh(2);
  const [x, y] = pairOf(st);
  st = act(st, 1, { type: "open", i: x });
  st = act(st, 1, { type: "open", i: y }, 500);
  assert.deepEqual([st.cards[x].won, st.cards[y].won, st.pairs[1], st.reached[1], st.held[1]], [1, 1, 1, 500, []]);
  assert.deepEqual(st.log.at(-1), { type: "claim", seat: 1, f: st.cards[x].f, cards: [x, y], t: 500 });
  assert.throws(() => act(st, 0, { type: "open", i: x }), /ya se reclamó/);
});

test("si la segunda no es pareja: se regresan solas, congelado 2 s y solo él vio las caras", () => {
  let st = fresh(2);
  const x = 0, z = other(st, st.cards[0].f);
  st = act(st, 0, { type: "open", i: x }, 1000);
  st = act(st, 0, { type: "open", i: z }, 1200);
  assert.deepEqual(st.held[0], []);
  assert.ok(st.cards.every((c) => c.hold === -1));
  assert.equal(st.frozen[0], 1200 + RULES.freezeMs);
  assert.deepEqual(view(st, 0).miss.cards, [x, z]);
  assert.deepEqual(view(st, 0).miss.faces, [st.cards[x].f, st.cards[z].f]);
  assert.equal(view(st, 1).miss, null);
  assert.throws(() => act(st, 0, { type: "open", i: x }, 3000), /congelado/);
  assert.ok(!legalActions(st, 0).some((a) => a.type === "open"));
  // Los demás sí pueden abrirlas mientras tanto, y él vuelve a jugar al pasar los 2 s
  st = act(st, 1, { type: "open", i: x }, 1500);
  st = act(st, 0, { type: "open", i: z }, 3200);
  assert.equal(st.cards[z].hold, 0);
});

test("timer: solo a quien tiene cartas abiertas; al vencer, el tick le regresa las cartas", () => {
  let st = fresh(3);
  const [x] = pairOf(st);
  assert.throws(() => act(st, 0, { type: "timer", seat: 1 }), /no tiene cartas/);
  st = act(st, 1, { type: "open", i: x }, 1000);
  assert.throws(() => act(st, 1, { type: "timer", seat: 1 }), /no le puedes/);
  st = act(st, 0, { type: "timer", seat: 1 }, 2000);
  assert.deepEqual(st.timers[1], { by: 0, end: 2000 + RULES.timerMs });
  assert.equal(nextDeadline(st), 7000);
  assert.equal(game.timing.turnMs(st), 5000);
  assert.throws(() => act(st, 2, { type: "timer", seat: 1 }, 2500), /ya tiene un timer/);
  st = act(st, 1, { type: "tick" }, 6000);
  assert.equal(st.cards[x].hold, 1, "todavía no vence");
  st = act(st, 2, { type: "tick" }, 7100);
  assert.deepEqual([st.cards[x].hold, st.held[1], st.timers[1]], [-1, [], null]);
  assert.equal(st.cool[0], 7000 + RULES.cooldownMs, "se recarga 10 s después de que terminó");
  assert.equal(game.timing.turnMs(st), null);
});

test("timer: si junta su par o falla antes, vence sin acción y la recarga empieza ahí", () => {
  let st = fresh(2);
  const [x, y] = pairOf(st);
  st = act(st, 1, { type: "open", i: x }, 1000);
  st = act(st, 0, { type: "timer", seat: 1 }, 1500);
  st = act(st, 1, { type: "open", i: y }, 3000);
  assert.equal(st.timers[1], null);
  assert.equal(st.cool[0], 3000 + RULES.cooldownMs);
  // No se acumulan: mientras se recarga no puede poner otro
  const a = other(st, st.cards[x].f, [x, y]);
  st = act(st, 1, { type: "open", i: a }, 4000);
  assert.ok(!canTimer(st, 0, 5000));
  assert.throws(() => act(st, 0, { type: "timer", seat: 1 }, 5000), /no se recarga/);
  st = act(st, 0, { type: "timer", seat: 1 }, 13000);
  assert.ok(st.timers[1]);
  const b = st.cards.findIndex((c, i) => c.won < 0 && i !== a && c.f !== st.cards[a].f);
  st = act(st, 1, { type: "open", i: b }, 14000); // falla
  assert.deepEqual([st.timers[1], st.cool[0]], [null, 14000 + RULES.cooldownMs]);
});

test("timer: uno a la vez por jugador, y congelado no se puede poner", () => {
  let st = fresh(3);
  const [x] = pairOf(st);
  const a = other(st, st.cards[x].f), b = st.cards.findIndex((c, i) => i !== a && c.f !== st.cards[a].f && c.f !== st.cards[x].f);
  st = act(st, 1, { type: "open", i: x }, 1000);
  st = act(st, 2, { type: "open", i: a }, 1000);
  st = act(st, 0, { type: "timer", seat: 1 }, 1100);
  assert.throws(() => act(st, 0, { type: "timer", seat: 2 }, 1200), /Ya tienes un timer/);
  // Seat 1 falla y queda congelado: no puede ponerle timer a nadie
  st = act(st, 1, { type: "open", i: b }, 1300);
  assert.ok(st.frozen[1] > 1300);
  assert.throws(() => act(st, 1, { type: "timer", seat: 2 }, 1400), /congelado/);
});

test("al reclamar el último par termina; gana quien tiene más pares y en empate quien llegó antes", () => {
  let st = fresh(2);
  const faces = [...new Set(st.cards.map((c) => c.f))];
  let now = 1000;
  faces.forEach((f, k) => {
    const seat = k % 2;
    const [x, y] = pairOf(st, f);
    st = act(st, seat, { type: "open", i: x }, now++);
    st = act(st, seat, { type: "open", i: y }, now++);
  });
  assert.equal(st.phase, "over");
  assert.deepEqual(st.pairs, [9, 9]);
  assert.equal(st.winner, 0, "los dos tienen 9; el asiento 0 llegó antes a 9");
  assert.deepEqual(ranking(st), [0, 1]);
  assert.deepEqual(game.result(st).champions, [0]);
  assert.throws(() => act(st, 0, { type: "tick" }), /terminó/);
});

test("la vista: tus caras abiertas sí, las de otros no (solo quién la tiene); Monitor no ve caras", () => {
  let st = fresh(2);
  const [x] = pairOf(st);
  const z = other(st, st.cards[x].f);
  st = act(st, 0, { type: "open", i: x });
  st = act(st, 1, { type: "open", i: z });
  const v0 = view(st, 0), v1 = view(st, 1), tv = view(st, -1);
  assert.equal(v0.cards[x].f, st.cards[x].f);
  assert.equal(v0.cards[z].f, null);
  assert.equal(v0.cards[z].hold, 1);
  assert.equal(v1.cards[x].f, null);
  assert.ok(tv.cards.every((c) => c.f === null));
  assert.deepEqual(tv.memory, []);
  assert.deepEqual(v0.memory.map((m) => m.i), [x], "solo recuerda lo que él vio");
  assert.equal(JSON.stringify(v1).includes(`"f":${st.cards[x].f},"hold":0`), false);
});

test("la compu: busca la pareja que recuerda, espera si la tiene otro y espera congelada", () => {
  let st = fresh(2);
  const [x, y] = pairOf(st);
  // Ya vio y (lo abrió con otra y falló); con x abierta va directo por y
  const w = other(st, st.cards[x].f);
  st = act(st, 1, { type: "open", i: y }, 0);
  st = act(st, 1, { type: "open", i: w }, 0);
  st = act(st, 1, { type: "open", i: x }, 3000);
  assert.deepEqual(decide(view(st, 1), 1, "memorion", () => 0), { type: "open", i: y });
  // Si su pareja la tiene abierta otro, espera
  st = act(st, 0, { type: "open", i: y }, 3100);
  assert.deepEqual(decide(view(st, 1), 1, "memorion", () => 0), { type: "tick" });
  // Congelada: espera, y su tiempo de pensar llega hasta que se le quite
  const z = other(st, st.cards[x].f, [x, y]);
  let s2 = act(fresh(2), 0, { type: "open", i: x }, 1000);
  s2 = act(s2, 0, { type: "open", i: z }, 1000);
  assert.deepEqual(decide(view(s2, 0), 0, "normal", () => 0), { type: "tick" });
  assert.ok(thinkMs(view(s2, 0), 0, 1000, "memorion") >= RULES.freezeMs);
});

test("la compu le pone timer a quien lleva rato con cartas abiertas", () => {
  let st = fresh(2);
  st = act(st, 0, { type: "open", i: 0 }, 1000);
  const v = { ...view(st, 1), t: 1000 + 4000 };
  assert.deepEqual(decide(v, 1, "normal", () => 0), { type: "timer", seat: 0 });
});

test("el tablero escoge las columnas que dan las cartas más grandes en el espacio que hay", async () => {
  const { bestLayout } = await import("../../../games/memoria/ui/table.js");
  assert.equal(bestLayout(48, 360, 600).cols, 6, "alto: 6 columnas");
  assert.equal(bestLayout(48, 360, 330).cols, 8, "chaparro: más columnas");
  assert.equal(bestLayout(48, 1600, 800).cols, 12, "tele: muchas columnas");
});
