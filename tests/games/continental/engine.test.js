// Reglas del Continental: rondas y reparto, tercias y escaleras, bajarse, acomodar, cambiar comodines, comprar
// (las tres reglas de la mesa), puntos y la vista de cada asiento.
import { test } from "node:test";
import assert from "node:assert/strict";
import game from "../../../games/continental/index.js";
import { CONTRACTS, RULES, arrange, fitsOf, addTo, swapIn, checkDown, buyers, cardPoints, handPoints, decksFor, fullDeck }
  from "../../../games/continental/engine/index.js";
import { seededRandom } from "../../../modules/random/index.js";
import { playGame } from "../../../modules/tournament/index.js";

const ctx = (seed = 1) => ({ rnd: seededRandom(seed), now: 0 });
const start = (n = 4, extra = {}) => game.setup({ n, timer: false, ...extra }, ctx());
const act = (st, seat, a) => game.apply(st, seat, a, ctx(2));
// Pone cartas en una mano y el descarte de arriba (para armar situaciones)
function rig(st, { hands = {}, top, from = null } = {}) {
  const s = JSON.parse(JSON.stringify(st));
  for (const [seat, cards] of Object.entries(hands)) s.hand.hands[seat] = cards.slice();
  if (top) { s.hand.discard = [top]; s.hand.discardFrom = from; }
  return s;
}
// Todas las cartas de la ronda: manos, mazo, pozo y juegos
const allCards = (st) => [...st.hand.hands.flat(), ...st.hand.stock, ...st.hand.discard, ...st.hand.melds.flatMap((m) => m.cards)];

test("las 7 rondas: contrato y cartas repartidas", () => {
  assert.equal(CONTRACTS.length, 7);
  assert.deepEqual(CONTRACTS.map((k) => k.deal), [6, 7, 8, 9, 10, 11, 12]);
  // Se reparte justo lo que ocupa el contrato
  for (const k of CONTRACTS) assert.equal(k.deal, k.sets * RULES.setMin + k.runs * RULES.runMin);
});

test("reparto: cartas por mano, carta volteada y barajas según jugadores", () => {
  for (const n of [2, 4, 5, 6]) {
    const st = start(n);
    assert.equal(st.status, "playing");
    assert.equal(st.roundNo, 1);
    st.hand.hands.forEach((h) => assert.equal(h.length, 6));
    assert.equal(st.hand.discard.length, 1);
    assert.equal(allCards(st).length, decksFor(n) * 54);
    assert.equal(st.hand.turn, (st.hand.dealer + 1) % n);
  }
  assert.equal(decksFor(4), 2);
  assert.equal(decksFor(5), 3);
  assert.equal(fullDeck(2).length, 108);
});

test("tercias: mismo número, al menos 3, no más comodines que naturales", () => {
  assert.equal(arrange(["7H0", "7S0", "7C1"]).type, "set");
  assert.equal(arrange(["7H0", "7S0", "XR0"]).type, "set");
  assert.ok(arrange(["7H0", "XR0", "2S0"]).error, "1 natural y 2 comodines");
  assert.ok(arrange(["7H0", "7S0"]).error, "solo 2");
  assert.ok(arrange(["7H0", "8S0", "7C0"]).error, "números distintos");
});

test("escaleras: mismo palo, 4 o más, As abajo o arriba, sin dar la vuelta", () => {
  const low = arrange(["AH0", "2H0", "3H0", "4H0"]); // el 2 es comodín, pero cae en su lugar
  assert.equal(low.error, undefined);
  assert.equal(low.lo, 1);
  assert.equal(arrange(["AH0", "3H0", "4H0", "2S0"]).cards[1], "2S0", "el 2 llena el hueco del 2");
  const high = arrange(["JH0", "QH0", "KH0", "AH0"]);
  assert.equal(high.lo, 11);
  assert.ok(arrange(["KH0", "AH0", "3H0", "XR0"]).error, "K-A-2-3 da la vuelta");
  assert.ok(arrange(["5H0", "6H0", "7S0", "8H0"]).error, "otro palo");
  assert.ok(arrange(["5H0", "6H0", "7H0"]).error, "solo 3");
  assert.ok(arrange(["5H0", "XR0", "XB0", "2C0"]).error, "más comodines que naturales");
  // Los comodines que sobran van arriba; si no caben, abajo
  assert.deepEqual(arrange(["QH0", "KH0", "XR0", "XB0"]).lo, 11);
});

test("acomodar en las puntas y cambiar un comodín", () => {
  const run = { id: 1, ...arrange(["5H0", "6H0", "7H0", "XR0"]) }; // 5 6 7 [8]
  assert.deepEqual(fitsOf(run, "9H0"), ["hi"]);
  assert.deepEqual(fitsOf(run, "4H0"), ["lo"]);
  assert.deepEqual(fitsOf(run, "9S0"), []);
  assert.deepEqual(addTo(run, "4H0").meld.lo, 4);
  const sw = swapIn(run, "8H1", "XR0");
  assert.equal(sw.wild, "XR0");
  assert.deepEqual(sw.meld.cards, ["5H0", "6H0", "7H0", "8H1"]);
  assert.ok(swapIn(run, "9H0", "XR0").error, "no es el lugar del comodín");
  // El As va arriba después de la K, pero no dos veces
  const top = { id: 2, ...arrange(["TH0", "JH0", "QH0", "KH0"]) };
  assert.deepEqual(fitsOf(top, "AH1"), ["hi"]);
  const set = { id: 3, ...arrange(["9H0", "9S0", "XR0"]) };
  assert.deepEqual(fitsOf(set, "9D0"), ["set"]);
  assert.equal(swapIn(set, "9C0", "XR0").wild, "XR0");
});

test("bajarse: tiene que ser el contrato de la ronda, todo junto", () => {
  let st = start(2);
  const s = st.hand.turn;
  st = rig(st, { hands: { [s]: ["7H0", "7S0", "7C0", "9D0", "9S0", "XR0", "KC0"] } });
  st = act(st, s, { type: "draw" });
  assert.match(checkDown(st, s, [["7H0", "7S0", "7C0"]]), /2 tercias/);
  assert.ok(checkDown(st, s, [["7H0", "7S0", "7C0"], ["9D0", "9S0", "KC0"]]));
  st = act(st, s, { type: "down", groups: [["7H0", "7S0", "7C0"], ["9D0", "9S0", "XR0"]] });
  assert.equal(st.hand.down[s], true);
  assert.equal(st.hand.melds.length, 2);
  assert.throws(() => act(st, s, { type: "down", groups: [] }), /Ya te bajaste/);
  // Ya bajado puede acomodar
  st = rig(st, { hands: { [s]: ["7D0", ...st.hand.hands[s]] } });
  st = act(st, s, { type: "add", meld: st.hand.melds[0].id, cards: ["7D0"] });
  assert.equal(st.hand.melds[0].cards.length, 4);
});

test("sin bajarse no se acomoda ni se cambian comodines", () => {
  let st = start(2);
  const s = st.hand.turn;
  st = act(st, s, { type: "draw" });
  st.hand.melds.push({ id: 99, owner: 1 - s, ...arrange(["5H0", "6H0", "7H0", "XR0"]) });
  st = rig(st, { hands: { [s]: ["8H1", ...st.hand.hands[s]] } });
  assert.throws(() => act(st, s, { type: "add", meld: 99, cards: ["8H1"] }), /bájate/);
  assert.throws(() => act(st, s, { type: "swap", meld: 99, card: "8H1", wild: "XR0" }), /bájate/);
});

test("cerrar: quien se queda sin cartas gana la ronda; los demás pagan lo de su mano", () => {
  let st = start(2);
  const s = st.hand.turn, o = 1 - s;
  st = rig(st, { hands: { [s]: ["7H0", "7S0", "7C0", "9D0", "9S0", "9C0"], [o]: ["XR0", "AH0", "KD0", "5C0", "2S0", "3H0"] } });
  st = act(st, s, { type: "draw" });
  const drawn = st.hand.hands[s].find((c) => !["7H0", "7S0", "7C0", "9D0", "9S0", "9C0"].includes(c));
  st = act(st, s, { type: "down", groups: [["7H0", "7S0", "7C0"], ["9D0", "9S0", "9C0"]] });
  st = act(st, s, { type: "discard", card: drawn });
  assert.equal(st.status, "roundover");
  assert.equal(st.result.winner, s);
  assert.equal(st.result.pts[s], 0);
  assert.equal(st.result.pts[o], 50 + 20 + 10 + 5 + 20 + 3);
  assert.deepEqual(st.scores, st.result.pts);
  // La siguiente ronda: 7 cartas
  const next = game.apply(st, o, { type: "next" }, ctx(3));
  assert.equal(next.roundNo, 2);
  next.hand.hands.forEach((h) => assert.equal(h.length, 7));
});

test("puntos de cada carta", () => {
  assert.deepEqual(["XR0", "2H0", "AS0", "KD0", "TC0", "9H0", "3S0"].map(cardPoints), [50, 20, 20, 10, 10, 9, 3]);
  assert.equal(handPoints(["XR0", "3S0"]), 53);
});

// ---------- Comprar ----------
test("comprar: quien sigue tiene preferencia; si roba del mazo, se lo lleva el primero que lo pidió", () => {
  let st = start(4);
  const t = st.hand.turn, a = (t + 1) % 4, b = (t + 2) % 4;
  const top = st.hand.discard[0];
  assert.deepEqual(game.currentSeats(st), [t, ...buyers(st)]);
  assert.deepEqual(buyers(st), [a, b, (t + 3) % 4]);
  st = act(st, b, { type: "buy" });
  st = act(st, a, { type: "buy" });
  assert.deepEqual(buyers(st), [(t + 3) % 4], "ya contestaron");
  const before = st.hand.hands[a].length;
  st = act(st, t, { type: "draw" });
  assert.equal(st.hand.hands[a].length, before + 2, "el descarte y una de castigo");
  assert.ok(st.hand.hands[a].includes(top));
  assert.equal(st.hand.buys[a], 1);
  assert.equal(st.hand.buys[b], 0);
  assert.equal(st.hand.lastBuy.seat, a);
  assert.equal(st.hand.offer, null);
});

test("comprar: si quien sigue toma el descarte, nadie lo compra", () => {
  let st = start(3);
  const t = st.hand.turn, a = (t + 1) % 3;
  st = act(st, a, { type: "buy" });
  const n = st.hand.hands[a].length;
  st = act(st, t, { type: "take" });
  assert.equal(st.hand.hands[a].length, n);
  assert.equal(st.hand.buys[a], 0);
  assert.deepEqual(game.currentSeats(st), [t]);
});

test("comprar: no compra quien descartó, ni quien ya se bajó, ni quien llegó al límite", () => {
  let st = start(4);
  const t = st.hand.turn;
  st.hand.discardFrom = (t + 3) % 4;
  st.hand.down[(t + 2) % 4] = true;
  st.hand.buys[(t + 1) % 4] = 3;
  assert.deepEqual(buyers(st), []);
  assert.throws(() => act(st, (t + 2) % 4, { type: "buy" }), /bajaste/);
  // Sin límite, el de 3 compras sí puede
  const free = start(4, { buy: "free" });
  free.hand.buys[(free.hand.turn + 1) % 4] = 3;
  assert.ok(buyers(free).includes((free.hand.turn + 1) % 4));
});

test("comprar: con la regla 'no se compra' nadie compra", () => {
  const st = start(4, { buy: "none" });
  assert.deepEqual(buyers(st), []);
  assert.deepEqual(game.currentSeats(st), [st.hand.turn]);
  assert.throws(() => act(st, (st.hand.turn + 1) % 4, { type: "buy" }));
});

test("la regla de compra por omisión es con castigo hasta 3, y se guarda en la configuración", () => {
  assert.equal(start(4).config.buy, "limit");
  assert.equal(start(4, { buy: "free" }).config.buy, "free");
  assert.equal(start(4, { buy: "otra" }).config.buy, "limit");
});

// ---------- Vista ----------
test("vista: se ocultan manos ajenas, el mazo y lo robado del mazo; se ve el pozo y la compra", () => {
  let st = start(3);
  const t = st.hand.turn, a = (t + 1) % 3;
  st = act(st, a, { type: "buy" });
  st = act(st, t, { type: "draw" });
  const v = game.view(st, a);
  assert.deepEqual(v.hand.hands[a], st.hand.hands[a]);
  assert.ok(v.hand.hands[t].every((c) => c === "?"));
  assert.ok(v.hand.stock.every((c) => c === "?"));
  assert.deepEqual(v.hand.lastDraw.cards, ["?"]);
  assert.equal(v.hand.lastBuy.penalty, st.hand.lastBuy.penalty, "su propio castigo sí lo ve");
  const w = game.view(st, (t + 2) % 3);
  assert.equal(w.hand.lastBuy.card, st.hand.lastBuy.card, "la carta comprada la ven todos");
  assert.equal(w.hand.lastBuy.penalty, "?");
});

test("una partida completa entre la compu: no se pierde ni se duplica ninguna carta", () => {
  for (const buy of ["limit", "free", "none"]) {
    let rounds = 0;
    const r = playGame(game, ["1", "2", "3", "2"], {
      config: { n: 4, buy, timer: false }, seed: 5,
      onStep: ({ state }) => {
        if (state.status !== "playing") return;
        const cards = allCards(state);
        assert.equal(cards.length, 108);
        assert.equal(new Set(cards).size, 108);
        rounds = state.roundNo;
      },
    });
    assert.ok(game.isOver(r.state));
    assert.equal(rounds, 7);
    assert.equal(r.state.rounds.length, 7);
    assert.deepEqual(r.result.scores, r.state.rounds.reduce((acc, x) => acc.map((v, i) => v + x.pts[i]), [0, 0, 0, 0]));
  }
});

test("el reloj: roba y descarta por quien se tardó", () => {
  let st = game.setup({ n: 3, timer: true }, ctx());
  const t = st.hand.turn, n = st.hand.hands[t].length;
  st = game.apply(st, t, game.timing.autoAction(st, t), ctx(4));
  assert.equal(st.hand.turn, (t + 1) % 3);
  assert.equal(st.hand.hands[t].length, n);
  assert.throws(() => game.apply(start(3), start(3).hand.turn, { type: "timeout" }, ctx()), /reloj/);
});
