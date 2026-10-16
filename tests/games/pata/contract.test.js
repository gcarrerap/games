// La Pata a través del contrato: vista privada, que la compu decide igual con su vista que con el estado completo
// (prueba de que nunca usa cartas ajenas, ni sus montones sin abrir, ni el mazo), el reloj y la pausa entre rondas.
import { test } from "node:test";
import assert from "node:assert/strict";
import pata from "../../../games/pata/index.js";
import { stepCtx } from "../../../modules/tournament/index.js";

const ctx = (i = 0) => stepCtx("pata", i, 2_000_000);
const mode = (id) => pata.modes.find((m) => m.id === id);

// Juega con la compu (nivel dado) hasta que se cumpla until o pasen max acciones; llama a each(st, seat) antes de cada una
function play(st, { until = () => false, max = 400, level = "2", each = null } = {}) {
  for (let i = 0; i < max && st.status === "playing" && !until(st); i++) {
    const seat = pata.currentSeats(st)[0];
    if (each) each(st, seat, i);
    st = pata.apply(st, seat, pata.bots.decide(pata.view(st, seat), seat, level), ctx(i + 1));
  }
  return st;
}

test("setup reparte 3 montones de 11, con nombres, con el tiempo y el azar que recibe", () => {
  const a = pata.setup({ ...mode("4p"), names: ["Ana", "Beto", "Chuy", "Dora"] }, ctx());
  assert.deepEqual(a, pata.setup({ ...mode("4p"), names: ["Ana", "Beto", "Chuy", "Dora"] }, ctx()));
  assert.equal(a.created, 2_000_000);
  assert.equal(a.seats[3].name, "Dora");
  assert.ok(a.hand.piles.every((p) => p.length === 2 && p.every((x) => x.length === 11)));
  assert.equal(a.config.teams, 2);
  assert.throws(() => pata.setup({ n: 5, teams: false }, ctx()), /no válida/);
});

test("la vista oculta manos ajenas, todos los montones, el mazo y lo que otros robaron", () => {
  const st = play(pata.setup(mode("4p"), ctx()), { max: 9 });
  for (let seat = 0; seat < 4; seat++) {
    const v = pata.view(st, seat), h = st.hand;
    assert.deepEqual(v.hand.hands[seat], h.hands[seat]);
    for (let s = 0; s < 4; s++) if (s !== seat) assert.ok(v.hand.hands[s].every((c) => c === "?") && v.hand.hands[s].length === h.hands[s].length);
    assert.ok(v.hand.piles.flat(2).every((c) => c === "?"), "ni los montones propios se ven");
    assert.ok(v.hand.stock.every((c) => c === "?") && v.hand.stock.length === h.stock.length);
    assert.deepEqual(v.hand.discard, h.discard, "el pozo se ve");
    assert.equal(v.hand.start, undefined);
    for (const e of v.hand.history) {
      if (e.a === "draw" && e.s !== seat) assert.ok(e.cards.every((c) => c === "?"));
      assert.equal(e.reshuffled, undefined);
    }
    // Ninguna carta oculta aparece en la vista (salvo que también esté a la vista: pozo, patas, lo levantado)
    const visible = new Set([...h.hands[seat], ...h.discard, ...h.melds.flat(2).flatMap((m) => m.cards || []),
      ...h.history.flatMap((e) => [...(e.taken || []), ...(e.pair || []), ...(e.card ? [e.card] : []), ...(e.s === seat ? e.cards || [] : [])])]);
    const hidden = [...h.hands.filter((_, s) => s !== seat).flat(), ...h.piles.flat(2), ...h.stock].filter((c) => !visible.has(c));
    const text = JSON.stringify(v.hand);
    for (const c of hidden.slice(0, 200)) assert.ok(!text.includes(`"${c}"`), `asiento ${seat} ve ${c}`);
  }
});

test("la compu decide lo mismo con su vista que con el estado completo", () => {
  for (const level of ["1", "2", "3"]) {
    for (const m of ["4p", "3", "6t"]) {
      let checked = 0;
      play(pata.setup(mode(m), stepCtx(`priv-${level}-${m}`, -1, 0)), {
        level, max: 160,
        each: (st, seat) => {
          const full = pata.bots.decide(st, seat, level), fromView = pata.bots.decide(pata.view(st, seat), seat, level);
          assert.deepEqual(fromView, full, `nivel ${level}, ${m}, turno ${st.hand.turns}`);
          checked++;
        },
      });
      assert.ok(checked > 50);
    }
  }
});

test("el consejo también sale solo de lo que puedes ver", () => {
  let checked = 0;
  play(pata.setup(mode("4p"), stepCtx("advice", -1, 0)), {
    max: 80,
    each: (st, seat) => {
      assert.deepEqual(pata.advise(pata.view(st, seat), seat), pata.advise(st, seat), `turno ${st.hand.turns}`);
      checked++;
    },
  });
  assert.ok(checked > 40);
});

test("entre rondas nadie está obligado y cualquiera reparte la siguiente", () => {
  let st = pata.setup(mode("2"), ctx());
  st = play(st, { max: 5000, until: (s) => s.status !== "playing" });
  assert.equal(st.status, "roundover");
  assert.deepEqual(pata.currentSeats(st), []);
  assert.deepEqual(pata.legalActions(st, 1), [{ type: "next" }]);
  const s2 = pata.apply(st, 1, { type: "next" }, ctx(9000));
  assert.equal(s2.roundNo, 2);
  assert.equal(s2.status, "playing");
  assert.throws(() => pata.apply(s2, 0, { type: "next" }, ctx()), /no termina/);
});

test("el reloj: 60 s por turno; al vencerse roba si hace falta y descarta, marcado como automático", () => {
  const st = pata.setup(mode("2"), ctx()), seat = pata.currentSeats(st)[0];
  assert.equal(pata.timing.turnMs(st), 60000);
  assert.equal(pata.timing.turnMs(pata.setup({ ...mode("2"), timer: false }, ctx())), null);
  const s2 = pata.apply(st, seat, pata.timing.autoAction(st, seat), ctx(1));
  assert.equal(s2.hand.turn, 1 - seat);
  assert.ok(s2.hand.history.slice(-2).every((e) => e.auto));
  assert.throws(() => pata.apply(st, 1 - seat, { type: "timeout" }, ctx()), /turno/);
});

test("equipos por asiento, para la pantalla de asientos", () => {
  assert.deepEqual([0, 1, 2, 3].map((s) => pata.teamOf(mode("4p"), s)), [0, 1, 0, 1]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((s) => pata.teamOf(mode("6p"), s)), [0, 1, 2, 0, 1, 2]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((s) => pata.teamOf(mode("6t"), s)), [0, 1, 0, 1, 0, 1]);
  assert.equal(pata.teamOf(mode("3"), 1), null);
});

test("el resultado: puntos por equipo y quién ganó", () => {
  const r = pata.result({ ...pata.setup(mode("4p"), ctx()), status: "gameover", scores: [3500, 2100] });
  assert.deepEqual([r.scores, r.champions, r.teams], [[3500, 2100], [0], 2]);
});
