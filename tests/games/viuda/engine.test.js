// Reglas de La Viuda: jugadas y desempates con comodines, reparto con corte, la viuda tapada, tocar, fichas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, compareKeys, describe, CAT, wildFor, newGame, apply, legalActions, autoAction, showdown, RULES } from "../../../games/viuda/engine/index.js";
import { decide } from "../../../games/viuda/ai/index.js";
import game from "../../../games/viuda/index.js";
import { seededRandom } from "../../../modules/random/index.js";

const H = (s) => s.split(" ");
const ev = (s, wild = null) => evaluate(H(s), wild);
const beats = (a, b, wild = null) => compareKeys(ev(a, wild).key, ev(b, wild).key) > 0;
const ctx = { rnd: seededRandom(1), now: 0 };
const fresh = (n = 3) => newGame({ n, timer: false }, ["Ana", "Noe", "Gui", "Bar"].slice(0, n), 0, seededRandom(5));
// Un estado con manos y viuda a la medida
const rig = (st, hands, widow, extra = {}) => ({ ...st, hands: hands.map(H), widow: H(widow), ...extra });

test("jugadas sin comodín, de menor a mayor", () => {
  const order = [
    "2S 5H 9D JC KS", "4S 4H 9D JC KS", "4S 4H 9D 9C KS", "4S 4H 4D 9C KS", "5S 6H 7D 8C 9S",
    "2S 5S 9S JS KS", "4S 4H 4D 9C 9S", "4S 4H 4D 4C 9S", "5H 6H 7H 8H 9H", "TS JS QS KS AS",
  ];
  const cats = order.map((h) => ev(h).cat);
  assert.deepEqual(cats, [0, 1, 2, 3, 4, 5, 6, 7, 8, 10]);
  for (let i = 1; i < order.length; i++) assert.ok(beats(order[i], order[i - 1]), `${order[i]} > ${order[i - 1]}`);
});

test("el As vale alto y bajo en corridas", () => {
  assert.equal(ev("AS 2H 3D 4C 5S").cat, CAT.straight);
  assert.equal(describe(ev("AS 2H 3D 4C 5S")), "Corrida al 5");
  assert.equal(ev("TS JH QD KC AS").cat, CAT.straight);
  assert.ok(beats("2S 3H 4D 5C 6S", "AS 2H 3D 4C 5S"));
  assert.equal(ev("QS KH AD 2C 3S").cat, CAT.high, "no da la vuelta");
});

test("la quintilla (con comodín) le gana a la flor corrida y solo pierde contra la flor imperial", () => {
  const q = ev("7S 7H 7D 7C AS", "A");
  assert.equal(q.cat, CAT.quint);
  assert.ok(beats("7S 7H 7D 7C AS", "5H 6H 7H 8H 9H", "A"));
  assert.ok(beats("TS JS QS KS AS", "7S 7H 7D 7C AH", "A"));
});

test("la flor imperial se vale con comodín, pero la limpia le gana", () => {
  assert.equal(ev("TS JS QS KS 2H", "2").cat, CAT.imperial);
  assert.ok(beats("TS JS QS KS AS", "TH JH QH KH 2C", "2"));
});

test("el comodín toma el valor que más conviene", () => {
  assert.equal(describe(ev("KS KH 5D 9C 3S", "3")), "Tercia de K");
  assert.equal(describe(ev("5S 6H 7D 8C 3S", "3")), "Corrida al 9");
  assert.equal(ev("2H 6H 9H JH 3S", "3").cat, CAT.flush, "toma el palo de las demás");
  assert.equal(describe(ev("KS KH KD 9C 9S")), "Full de K con 9");
});

test("desempate: primero las cartas más altas, una por una", () => {
  assert.ok(beats("KS KH 9D 7C 3S", "QS QH AD 7C 3S"), "el par manda antes que la carta suelta");
  assert.ok(beats("KS KH 9D 7C 4S", "KD KC 9H 7S 3D"));
  assert.ok(beats("AS 9H 7D 5C 3S", "KS QH JD 9C 7S"));
});

test("desempate: luego la mano limpia (menos comodines)", () => {
  // Las dos son par de K con lo mismo; la segunda usa un comodín (el 5)
  assert.ok(beats("KS KH 9D 7C 3S", "KD 5C 9H 7S 3D", "5"));
});

test("desempate: al final el palo de la carta más alta (♠ > ♥ > ♦ > ♣)", () => {
  assert.ok(beats("AS 9H 7D 5C 3S", "AH 9S 7C 5D 3H"));
  assert.ok(beats("AH 9C 7C 5C 3C", "AD 9S 7S 5S 3H"));
  assert.ok(beats("KS KC 9D 7C 3S", "KH KD 9C 7D 3H"), "par de K: tiene la K de picas");
});

test("el comodín sube cada mano y da la vuelta", () => {
  assert.equal(wildFor(1), null);
  assert.equal(wildFor(2), "A");
  assert.equal(wildFor(3), "2");
  assert.equal(wildFor(14), "K");
  assert.equal(wildFor(15), "A");
  assert.equal(wildFor(16), "2");
});

test("reparto: 5 cartas a cada quien y 5 a la viuda; reparte, parte y empieza en su lugar", () => {
  const st = fresh(4);
  assert.equal(st.dealer, 0);
  assert.equal(st.cut.seat, 3, "parte el de la izquierda");
  assert.equal(st.turn, 1, "empieza el de la derecha");
  assert.ok(st.hands.every((h) => h.length === 5));
  assert.equal(st.widow.length, 5);
  assert.equal(new Set([...st.hands.flat(), ...st.widow]).size, 25);
  assert.equal(st.wild, null);
  assert.equal(st.phase, "blind");
});

test("si al partir sale el comodín, se lo queda quien partió y solo recibe 4 más", () => {
  // Buscar una semilla donde la carta del corte sea del número comodín de la mano 2 (As)
  for (let seed = 0; seed < 500; seed++) {
    let st = { ...fresh(3), phase: "pause" };
    st = apply(st, 0, { type: "next" }, { rnd: seededRandom(seed), now: 0 });
    if (!st.cut.took) continue;
    assert.equal(st.wild, "A");
    assert.equal(st.cut.card[0], "A");
    assert.ok(st.hands[st.cut.seat].includes(st.cut.card));
    assert.ok(st.hands.every((h) => h.length === 5));
    assert.equal(new Set([...st.hands.flat(), ...st.widow]).size, 20);
    return;
  }
  assert.fail("ninguna semilla dio comodín al partir");
});

test("a ciegas se toma la viuda completa, se pasa o se toca; no se cambia una", () => {
  const st = fresh();
  assert.deepEqual(legalActions(st, st.turn), [{ type: "knock" }, { type: "all" }, { type: "pass" }]);
  assert.throws(() => apply(st, st.turn, { type: "swap", give: st.hands[st.turn][0], take: st.widow[0] }, ctx), /tapada/);
  assert.throws(() => apply(st, (st.turn + 1) % 3, { type: "pass" }, ctx), /turno/);
  assert.equal(game.view(st, 0).widow, null, "la viuda tapada no se ve");
  assert.equal(typeof game.view(st, 0).hands[1], "number", "la mano ajena no se ve");
});

test("tocar con la viuda tapada: los demás solo pueden tomarla a ciegas o pasar; si la toman, se destapa", () => {
  let st = rig(fresh(), ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { turn: 0 });
  st = apply(st, 0, { type: "knock" }, ctx);
  assert.equal(st.phase, "last");
  assert.equal(st.knocker, 0);
  assert.equal(st.widowOpen, false);
  assert.deepEqual(legalActions(st, 1), [{ type: "pass" }, { type: "all" }]);
  assert.equal(game.view(st, 1).widow, null);
  st = apply(st, 1, { type: "all" }, ctx);
  assert.equal(st.widowOpen, true);
  assert.deepEqual(st.hands[1], H("QD JC TD 8H 6C"));
  assert.ok(legalActions(st, 2).some((a) => a.type === "swap"), "el siguiente ya puede cambiar una");
  st = apply(st, 2, { type: "pass" }, ctx);
  assert.equal(st.phase, "pause", "quien tocó no vuelve a jugar");
  assert.equal(st.showdown.knocker, 0);
});

test("tomar la viuda a ciegas la abre: tu mano queda en la mesa", () => {
  const st = rig(fresh(), ["2S 3S 4S 5S 7H", "2H 3H 4H 5H 7D", "2D 3D 4D 5D 7C"], "AS AH AD KS KH", { turn: 1 });
  const s2 = apply(st, 1, { type: "all" }, ctx);
  assert.deepEqual(s2.hands[1], H("AS AH AD KS KH"));
  assert.deepEqual(s2.widow, H("2H 3H 4H 5H 7D"));
  assert.equal(s2.phase, "open");
  assert.equal(s2.turn, 2);
  // Los que siguen ya juegan normal: cambiar una, cambiar todas o tocar; sin pasar
  const types = new Set(legalActions(s2, 2).map((a) => a.type));
  assert.deepEqual([...types].sort(), ["all", "knock", "swap"]);
  assert.throws(() => apply(s2, 2, { type: "pass" }, ctx), /pasar/);
});

test("si todos pasan a ciegas, la mano se acaba con las manos repartidas", () => {
  let st = rig(fresh(), ["2S 3S 4S 5S 7H", "AH AS 4H 5H 7D", "KD KS 4D 5D 7C"], "AD AC QD KH KC", { turn: 1 });
  st = apply(st, 1, { type: "pass" }, ctx);
  st = apply(st, 2, { type: "pass" }, ctx);
  assert.equal(st.phase, "blind");
  st = apply(st, 0, { type: "pass" }, ctx);
  assert.equal(st.phase, "pause");
  assert.equal(st.showdown.reason, "pass");
  assert.deepEqual(st.showdown.losers, [0]);
  assert.deepEqual(st.chips, [RULES.chips - 1, RULES.chips, RULES.chips]);
});

test("al tocar, los demás tienen un último turno (pueden pasar) y luego se muestran las manos", () => {
  let st = rig(fresh(), ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { turn: 0, phase: "open", widowOpen: true });
  st = apply(st, 0, { type: "knock" }, ctx);
  assert.equal(st.phase, "last");
  assert.deepEqual(legalActions(st, 1).slice(0, 2), [{ type: "pass" }, { type: "all" }]);
  assert.throws(() => apply(st, 1, { type: "knock" }, ctx), /tocaron/);
  st = apply(st, 1, { type: "swap", give: "2H", take: "6C" }, ctx);
  assert.equal(st.phase, "last");
  st = apply(st, 2, { type: "pass" }, ctx);
  assert.equal(st.phase, "pause", "no le vuelve a tocar a quien tocó");
  assert.deepEqual(st.showdown.losers, [1]);
  assert.equal(st.showdown.knocker, 0);
});

test("cambiar una: la carta va a la viuda y la de la viuda a tu mano", () => {
  const st = rig(fresh(), ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { turn: 0, phase: "open", widowOpen: true });
  const s2 = apply(st, 0, { type: "swap", give: "5S", take: "QD" }, ctx);
  assert.deepEqual(s2.hands[0], H("AS AH AD QD 7H"));
  assert.deepEqual(s2.widow, H("5S JC TD 8H 6C"));
  assert.throws(() => apply(st, 0, { type: "swap", give: "KS", take: "QD" }, ctx), /No tienes/);
  assert.throws(() => apply(st, 0, { type: "swap", give: "5S", take: "AC" }, ctx), /viuda/);
});

test("fichas: el primero sin fichas recibe la viuda; el siguiente sale; gana el último con fichas", () => {
  const base = { ...fresh(3), phase: "last", knocker: 0 };
  let st = rig(base, ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { chips: [3, 1, 1] });
  st = showdown(st, "knock");
  assert.equal(st.viuda, 1);
  assert.equal(st.chips[1], 1, "recibe la viuda");
  assert.equal(st.showdown.viuda, 1);
  st = rig({ ...st, phase: "last" }, ["AS AH AD 5S 7H", "KD KS 4D 5D 7C", "2H 3C 4H 9H 7D"], "QD JC TD 8H 6C");
  st = showdown(st, "knock");
  assert.deepEqual(st.out, [false, false, true], "la viuda ya se dio: sale");
  assert.equal(st.phase, "pause");
  st = showdown({ ...st, phase: "last", hands: [H("AS AH AD 5S 7H"), H("2H 3C 4H 9H 7D"), []] }, "knock");
  assert.equal(st.phase, "over");
  assert.equal(st.winner, 0);
  assert.deepEqual(game.result(st).champions, [0]);
});

test("solo pierde la peor mano; si empatan del todo, pierden las dos", () => {
  let st = rig({ ...fresh(3), phase: "last" }, ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "2D 3S 4C 9D 7S"], "QD JC TD 8H 6C");
  // 9♥ contra 9♦: pierde la de diamantes
  assert.deepEqual(showdown(st, "knock").showdown.losers, [2]);
});

test("las manos salen de la siguiente mano: rota quien reparte y sube el comodín", () => {
  let st = { ...fresh(3), phase: "pause" };
  st = apply(st, 2, { type: "next" }, ctx);
  assert.equal(st.hand, 2);
  assert.equal(st.dealer, 1);
  assert.equal(st.turn, 2);
  assert.equal(st.wild, "A");
  // Quien salió no reparte ni juega
  st = apply({ ...st, phase: "pause", out: [false, false, true] }, 0, { type: "next" }, ctx);
  assert.equal(st.dealer, 0);
  assert.equal(st.turn, 1);
  assert.equal(st.hands[2].length, 0);
});

test("el reloj pasa a ciegas, toca con la viuda abierta y pasa después de que tocaron", () => {
  const st = fresh();
  assert.deepEqual(autoAction(st), { type: "pass" });
  assert.deepEqual(autoAction({ ...st, phase: "open" }), { type: "knock" });
  assert.deepEqual(autoAction({ ...st, phase: "last" }), { type: "pass" });
});

test("la compu toma la viuda a ciegas con una mano mala y toca con una buena", () => {
  const st = rig(fresh(), ["2S 5H 9D JC 3S", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { turn: 0 });
  assert.deepEqual(decide(game.view(st, 0), 0, "normal"), { type: "all" });
  const good = rig(st, ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { phase: "open", widowOpen: true });
  assert.deepEqual(decide(game.view(good, 0), 0, "normal"), { type: "knock" });
  // Después de que tocaron, solo cambia si mejora
  const last = rig(st, ["AS AH AD 5S 7H", "2H 3C 4H 9H 7D", "KD KS 4D 5D 7C"], "QD JC TD 8H 6C", { phase: "last", turn: 0, widowOpen: true });
  assert.deepEqual(decide(game.view(last, 0), 0, "normal"), { type: "swap", give: "5S", take: "QD" }, "mejora la carta suelta");
  const full = rig(last, ["AS AH AD KS KH", "2H 3C 4H 9H 7D", "KD QS 4D 5D 7C"], "QD JC TD 8H 6C");
  assert.deepEqual(decide(game.view(full, 0), 0, "normal"), { type: "pass" });
  assert.equal(decide(game.view(st, 1), 1, "normal"), null);
});

test("al final se destapa la viuda con su jugada, aunque nadie la haya tomado", () => {
  let st = rig(fresh(), ["2S 3S 4S 5S 7H", "AH AS 4H 5H 7D", "KD KS 4D 5D 7C"], "AD AC QD KH KC", { turn: 1 });
  assert.equal(game.view(st, 1).widow, null);
  for (const s of [1, 2, 0]) st = apply(st, s, { type: "pass" }, ctx);
  assert.equal(st.phase, "pause");
  assert.deepEqual(st.showdown.widow, { cards: H("AD AC QD KH KC"), label: "Dos pares: As y K", wasOpen: false });
  assert.deepEqual(game.view(st, 1).widow, H("AD AC QD KH KC"), "en la mesa también se ve");
});
