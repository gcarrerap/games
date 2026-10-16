// El dominó a través del contrato: vista privada, acciones válidas, tiempo inyectado y que la compu decide igual
// con su vista que con el estado completo (prueba de que nunca usa fichas ajenas).
import { test } from "node:test";
import assert from "node:assert/strict";
import domino from "../../../games/domino/index.js";
import { seededRandom } from "../../../modules/random/index.js";
import { stepCtx } from "../../../modules/tournament/index.js";
import { withSeed } from "../../../games/domino/ai/tournament.js";
import { openingPlan } from "../../../games/domino/ai/index.js";

const ctx = (i = 0) => stepCtx(42, i, 1_000_000);
const MODE4 = domino.modes.find((m) => m.id === "4x7p");
const MODE2 = domino.modes.find((m) => m.id === "2x7");

// Avanza con la primera acción legal de quien deba actuar
function advance(st, steps) {
  for (let i = 0; i < steps && st.status === "playing"; i++) {
    const seat = domino.currentSeats(st)[0];
    st = domino.apply(st, seat, domino.legalActions(st, seat)[0], ctx(i + 1));
  }
  return st;
}

test("setup reparte con el tiempo y el azar que recibe", () => {
  const a = domino.setup({ ...MODE2, names: ["Ana", "Noe"] }, ctx());
  const b = domino.setup({ ...MODE2, names: ["Ana", "Noe"] }, ctx());
  assert.deepEqual(a, b, "mismo azar y mismo tiempo: misma partida");
  assert.equal(a.hand.since, 1_000_000);
  assert.equal(a.created, 1_000_000);
  assert.equal(a.seats[1].name, "Noe");
  assert.throws(() => domino.setup({ n: 3, per: 14 }, ctx()), /no válida/);
});

test("las jugadas guardan el tiempo que reciben", () => {
  const st = domino.setup(MODE2, ctx());
  const seat = domino.currentSeats(st)[0];
  const s2 = domino.apply(st, seat, domino.legalActions(st, seat)[0], stepCtx(42, 0, 5_000_000));
  assert.equal(s2.hand.history.at(-1).t, 5_000_000);
});

test("la vista oculta fichas ajenas y el pozo, pero conserva cuántas son", () => {
  const st = advance(domino.setup(MODE2, ctx()), 3);
  const v = domino.view(st, 0);
  assert.deepEqual(v.hand.hands[0], st.hand.hands[0]);
  assert.ok(v.hand.hands[1].every((t) => t === "?"));
  assert.equal(v.hand.hands[1].length, st.hand.hands[1].length);
  assert.ok(v.hand.pozo.every((t) => t === "?"));
  assert.equal(v.hand.pozo.length, st.hand.pozo.length);
  assert.equal(v.hand.start, undefined, "el reparto completo no se ve");
  const spect = domino.view(st, -1);
  assert.ok(spect.hand.hands.every((hh) => hh.every((t) => t === "?")));
  assert.deepEqual(st.hand.hands[1], domino.view(st, 1).hand.hands[1]);
});

test("ninguna ficha ajena aparece en la vista mientras se juega", () => {
  let st = domino.setup(MODE4, ctx());
  for (let i = 0; i < 40 && st.status === "playing"; i++) {
    for (let seat = 0; seat < 4; seat++) {
      const v = domino.view(st, seat), seen = new Set([...v.hand.hands[seat], ...v.hand.board.flat().map(String)]);
      const others = st.hand.hands.flatMap((hh, s) => (s === seat ? [] : hh)).concat(st.hand.pozo);
      const vh = JSON.stringify({ hands: v.hand.hands, pozo: v.hand.pozo });
      for (const t of others) assert.ok(!vh.includes(`"${t}"`), `asiento ${seat} ve ${t}`);
      assert.ok(seen.size > 0);
    }
    const seat = domino.currentSeats(st)[0];
    st = domino.apply(st, seat, domino.legalActions(st, seat)[0], ctx(i + 1));
  }
});

test("la compu decide lo mismo con su vista que con el estado completo", () => {
  // Perfiles con memoria, deducción y simulaciones. Si alguno leyera fichas ajenas, las decisiones cambiarían.
  for (const profile of ["b01", "b02", "b03", "b07", "b15"]) {
    let st = domino.setup(MODE4, ctx());
    for (let i = 0; i < 16 && st.status === "playing"; i++) {
      const seat = domino.currentSeats(st)[0];
      const full = withSeed(i, () => domino.bots.decide(st, seat, profile, { rnd: seededRandom(i) }));
      const fromView = withSeed(i, () => domino.bots.decide(domino.view(st, seat), seat, profile, { rnd: seededRandom(i) }));
      assert.deepEqual(fromView, full, `${profile}, paso ${i}`);
      st = domino.apply(st, seat, full, ctx(i + 1));
    }
  }
});

test("apply rechaza lo que no se vale", () => {
  const st = domino.setup(MODE2, ctx());
  const seat = domino.currentSeats(st)[0], other = 1 - seat;
  assert.throws(() => domino.apply(st, other, { type: "play", tile: st.hand.hands[other][0], side: "X" }, ctx()));
  assert.throws(() => domino.apply(st, seat, { type: "next" }, ctx()), /no termina/);
  assert.throws(() => domino.apply(st, seat, { type: "volar" }, ctx()), /desconocida/);
  assert.throws(() => domino.apply(domino.setup({ ...MODE2, timer: false }, ctx()), seat, { type: "timeout" }, ctx()), /reloj/);
  assert.throws(() => domino.apply(st, other, { type: "timeout" }, ctx()), /turno/);
});

test("al vencerse el tiempo el reloj juega por ese asiento y la acción queda marcada", () => {
  const st = domino.setup(MODE2, ctx());
  const seat = domino.currentSeats(st)[0];
  assert.equal(domino.timing.turnMs(st), 20000);
  assert.deepEqual(domino.timing.autoAction(st, seat), { type: "timeout" });
  const s2 = domino.apply(st, seat, { type: "timeout" }, ctx(1));
  assert.equal(s2.hand.history.at(-1).auto, true);
  assert.equal(domino.timing.turnMs(domino.setup({ ...MODE2, timer: false }, ctx())), null);
});

test("entre manos nadie está obligado y cualquiera reparte la siguiente", () => {
  let st = domino.setup(MODE2, ctx());
  for (let i = 0; i < 200 && st.status === "playing"; i++) {
    const seat = domino.currentSeats(st)[0];
    st = domino.apply(st, seat, domino.bots.decide(domino.view(st, seat), seat, "b01", { rnd: seededRandom(i) }), ctx(i + 1));
  }
  assert.equal(st.status, "handover");
  assert.deepEqual(domino.currentSeats(st), []);
  assert.deepEqual(domino.legalActions(st, 1), [{ type: "next" }]);
  const s2 = domino.apply(st, 1, { type: "next" }, ctx(500));
  assert.equal(s2.status, "playing");
  assert.equal(s2.handNo, 2);
  assert.equal(s2.gameId, st.gameId, "misma partida");
});

test("al salir en parejas sale primero quien tiene mejor juego", () => {
  // Una mano en la que sale la pareja 0-2 (como después de que ganaron la anterior)
  const st = domino.setup(MODE4, ctx());
  const opening = { ...st, hand: { ...st.hand, turn: null, board: [], openers: [0, 2], firstReq: null } };
  assert.deepEqual(domino.currentSeats(opening), [0, 2]);
  const w = (s) => domino.bots.thinkMs(domino.view(opening, s), s, opening.hand.since);
  for (const s of [0, 2]) assert.ok(w(s) >= 0 && w(s) <= 14000, "sale antes de que se acabe el tiempo");
  const rating = (s) => openingPlan(opening.hand.hands[s]).rating;
  if (rating(0) !== rating(2)) assert.equal(w(0) < w(2), rating(0) > rating(2), "el de mejor juego espera menos");
  const a = domino.bots.decide(domino.view(opening, 0), 0, "b02", { rnd: seededRandom(1) });
  assert.deepEqual(a, { type: "play", tile: openingPlan(opening.hand.hands[0]).tile, side: "X" });
  assert.doesNotThrow(() => domino.apply(opening, 0, a, ctx(1)));
});
