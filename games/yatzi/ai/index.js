// La compu de Yatzi. Solo recibe la vista (que en este juego es todo: no hay nada oculto).
//
// Qué apartar se calcula exacto para los tiros que quedan: hay 252 manos posibles de 5 dados (sin importar el orden)
// y 462 grupos de 0 a 5 dados que se pueden apartar. Con eso se arma, de atrás para adelante,
//   V0(mano) = lo que vale anotar esa mano en la mejor casilla,
//   E_k(apartados) = promedio de V_k sobre lo que puede salir con los dados que se tiran,
//   V_{k+1}(mano) = max(V0(mano), lo mejor de E_k sobre lo que se puede apartar de esa mano),
// así que la compu sabe cuándo plantarse antes del tercer tiro.
//
// Lo que vale anotar en una casilla: los puntos, menos lo que esa casilla suele dar en una partida (si gastas el Full
// con 25 no ganas 25: dejas de tener un Full que de todos modos ibas a sacar), más un empujón al bono de arriba.
// Cada estilo cambia qué tan lejos ve y cuánto se equivoca.
import { UPPER, DICE, MAX_ROLLS, RULES, LABELS, options, upperSum, faceOf, greedyCat, openCats } from "../engine/index.js";

export const STYLES = {
  facil: { name: "Fácil", depth: 1, noise: 6, baseline: 0.4 },
  normal: { name: "Normal", depth: 2, noise: 3, baseline: 0.65 },
  experta: { name: "Experta", depth: 2, noise: 0, baseline: 0.85 },
};

// Lo que cada casilla da en promedio jugando bien (aproximado de partidas de la compu experta)
const BASE = { ones: 2.1, twos: 5.3, threes: 8.6, fours: 12.1, fives: 15.7, sixes: 19.2, three: 21.6, four: 13.1, full: 22.6, small: 29.5, large: 32.7, yatzi: 16.9, chance: 22 };

// ---------- Manos sin orden ----------
const key = (c) => c.join(""); // conteos por cara 1..6, p. ej. "200111"
const FACT = [1, 1, 2, 6, 24, 120];
// Todos los conteos de k dados, con su probabilidad
function outcomes(k) {
  const out = [];
  const rec = (f, left, c) => {
    if (f === 6) { if (!left) { let ways = FACT[k]; for (const x of c) ways /= FACT[x]; out.push({ c: c.slice(), p: ways / 6 ** k }); } return; }
    for (let x = 0; x <= left; x++) { c[f] = x; rec(f + 1, left - x, c); }
    c[f] = 0;
  };
  rec(0, k, [0, 0, 0, 0, 0, 0]);
  return out;
}
const OUT = Array.from({ length: DICE + 1 }, (_, k) => outcomes(k));
const ALL_KEPT = OUT.flatMap((o) => o.map((x) => x.c)); // 462 grupos apartables
const HANDS = OUT[DICE].map((x) => x.c); // 252 manos
const toDice = (c) => c.flatMap((x, f) => Array(x).fill(f + 1));
const subs = (c) => { // grupos que se pueden apartar de una mano
  const out = [];
  const rec = (f, cur) => { if (f === 6) { out.push(cur.slice()); return; } for (let x = 0; x <= c[f]; x++) { cur[f] = x; rec(f + 1, cur); } };
  rec(0, [0, 0, 0, 0, 0, 0]);
  return out;
};
const SUBS = new Map(HANDS.map((h) => [key(h), subs(h)]));
const add = (a, b) => a.map((x, i) => x + b[i]);

// ---------- Valor de anotar ----------
// Cuánto vale para esta tarjeta anotar `pts` en `cat` (más el bono de Yatzi extra)
function catValue(card, cat, pts, bonus, base) {
  let v = pts + bonus;
  const f = faceOf(cat);
  if (f) {
    const up = upperSum(card), need = RULES.upperBonusAt - up;
    const left = UPPER.filter((k) => card[k] === null).length;
    if (need > 0) {
      if (pts >= need) v += RULES.upperBonus; // lo completa
      else if (left > 1) v += ((pts - 3 * f) / Math.max(need, 1)) * 12 + (pts >= 3 * f ? 3 : 0); // lleva el ritmo de 3 por número
    }
  }
  // Al final no hay "otra vez": la línea base pesa menos cuando quedan pocas casillas
  const scale = Math.min(1, openCats(card).length / 6);
  return v - BASE[cat] * base * scale;
}

function bestScore(card, dice, base) {
  let best = null;
  for (const o of options(card, dice)) {
    const v = catValue(card, o.cat, o.pts, o.bonus, base);
    if (!best || v > best.v) best = { cat: o.cat, v, pts: o.pts, bonus: o.bonus };
  }
  return best;
}

// Tablas V y E para esta tarjeta. Se calculan una vez por turno (son pocas miles de cuentas) y se guardan para los
// otros tiros del mismo turno.
let memo = { k: "", t: null };
function tables(card, base) {
  const mk = JSON.stringify(card) + base;
  if (memo.k === mk) return memo.t;
  memo = { k: mk, t: buildTables(card, base) };
  return memo.t;
}
function buildTables(card, base) {
  const V0 = new Map(HANDS.map((h) => [key(h), bestScore(card, toDice(h), base).v]));
  const Vs = [V0], Es = [];
  for (let r = 0; r < MAX_ROLLS - 1; r++) {
    const V = Vs[r], E = new Map();
    for (const kept of ALL_KEPT) {
      const k = DICE - kept.reduce((a, b) => a + b, 0);
      let e = 0;
      for (const o of OUT[k]) e += o.p * V.get(key(add(kept, o.c)));
      E.set(key(kept), e);
    }
    Es.push(E);
    const Vn = new Map();
    for (const h of HANDS) {
      let best = V0.get(key(h));
      for (const s of SUBS.get(key(h))) best = Math.max(best, E.get(key(s)));
      Vn.set(key(h), best);
    }
    Vs.push(Vn);
  }
  return { Vs, Es };
}

// Convierte un grupo de dados por cara en cuáles de los 5 dados se apartan
function maskFor(dice, kept) {
  const need = kept.slice();
  return dice.map((d) => { if (need[d - 1] > 0) { need[d - 1]--; return true; } return false; });
}

// Lo que conviene: { action, why, keep?, cat? }
export function plan(v, seat, style = "normal", rnd = () => 0.5) {
  const s = STYLES[style] || STYLES.normal;
  const card = v.cards[seat];
  if (v.rolls === 0) return { action: { type: "roll", keep: [false, false, false, false, false] }, why: "Tira los cinco dados." };
  const dice = v.dice;
  const now = bestScore(card, dice, s.baseline);
  const left = MAX_ROLLS - v.rolls;
  if (left > 0) {
    const { Es } = tables(card, s.baseline);
    const E = Es[Math.min(left, s.depth) - 1];
    const c = [0, 0, 0, 0, 0, 0]; for (const d of dice) c[d - 1]++;
    let best = null;
    for (const kept of SUBS.get(key(c))) {
      if (kept.reduce((a, b) => a + b, 0) === DICE) continue;
      const e = E.get(key(kept)) + (s.noise ? (rnd() - 0.5) * s.noise : 0);
      if (!best || e > best.e) best = { kept, e };
    }
    const stay = now.v + (s.noise ? (rnd() - 0.5) * s.noise : 0);
    if (best && best.e > stay) {
      const keep = maskFor(dice, best.kept);
      const kd = toDice(best.kept);
      return { action: { type: "roll", keep }, keep, why: kd.length ? `Aparta ${kd.join(", ")} y tira ${DICE - kd.length}.` : "Tira los cinco otra vez." };
    }
  }
  const cat = s.noise > 3 && rnd() < 0.25 ? greedyCat(card, dice) : now.cat;
  const opt = options(card, dice).find((o) => o.cat === cat);
  const pts = opt.pts + opt.bonus;
  return { action: { type: "score", cat }, cat, why: pts ? `Anota ${pts} en ${LABELS[cat]}.` : `Tacha ${LABELS[cat]}: es la que menos te cuesta.` };
}

export function decide(v, seat, style = "normal", rnd = () => 0.5) {
  if (v.phase === "over" || v.turn !== seat) return null;
  return plan(v, seat, style, rnd).action;
}

export const advise = (v, seat) => (v.phase === "over" || v.turn !== seat ? null : plan(v, seat, "experta"));

