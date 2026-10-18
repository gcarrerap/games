// La compu de la Carrera de Chihuahuas. Solo recibe la vista: ve toda la pista, los boletos y los tapetes; de las
// apuestas finales ajenas solo sabe cuántas hay, no a qué perro.
//
// Calcula cuánto vale en croquetas cada jugada y escoge con un poco de duda (modules/choice):
//   - Etapa: recorre TODAS las formas en que pueden salir los dados que quedan en el tazón (orden y número, con los
//     tapetes puestos) y saca la probabilidad de que cada perro acabe primero o segundo, y cuántas veces se cae en
//     cada casilla vacía.
//       boleto  = valor × P(1º) + 1 × P(2º) − 1 × P(ni 1º ni 2º)
//       tapete  = veces que se cae en esa casilla en lo que queda de la etapa (cada vez es 1 croqueta)
//       tazón   = 1 croqueta segura
//   - Carrera: simula carreras completas al azar para la probabilidad de que cada perro gane o llegue al último.
//       apuesta = pago esperado según cuántas apuestas ya hay × P − 1 × (1 − P)
// Los estilos cambian cuánto duda, cuánto le gusta arriesgar en las apuestas finales y desde cuándo las considera.
import { DOGS, ND, RULES, tileSpaces, positions } from "../engine/index.js";
import { chooseIndex } from "../../../modules/choice/index.js";

export const STYLES = {
  prudente: { name: "Prudente", azar: { ventana: 0.3, temperatura: 0.15, escala: 1 }, finalBias: -0.6, sims: 300 },
  normal: { name: "Normal", azar: { ventana: 0.5, temperatura: 0.25, escala: 1 }, finalBias: -0.2, sims: 300 },
  atrevido: { name: "Atrevido", azar: { ventana: 0.9, temperatura: 0.4, escala: 1 }, finalBias: 0.15, sims: 200 },
};

// Para simular rápido, la pista se guarda como casilla y altura de cada perro (cinco números cada una) en vez de las
// pilas del estado. fastMove hace lo mismo que moveDog de engine/ (una prueba lo compara).
export function toFast(spaces) {
  const sp = Array(ND).fill(0), ht = Array(ND).fill(0);
  spaces.forEach((stack, s) => stack.forEach((d, i) => { sp[d] = s; ht[d] = i; }));
  return { sp, ht };
}

// tileAt[casilla] = "hueso" | "aspiradora" | undefined. Devuelve { sp, ht, landed, tile }
export function fastMove(f, d, n, tileAt) {
  const sp = f.sp.slice(), ht = f.ht.slice();
  const s = sp[d], h = ht[d];
  const inUnit = sp.map((x, e) => x === s && ht[e] >= h);
  const len = inUnit.filter(Boolean).length;
  const landed = s + n;
  const tile = landed <= RULES.track ? tileAt[landed] : undefined;
  if (tile === "aspiradora") {
    const to = landed - 1;
    for (let e = 0; e < ND; e++) if (!inUnit[e] && sp[e] === to) ht[e] += len;
    for (let e = 0; e < ND; e++) if (inUnit[e]) { sp[e] = to; ht[e] -= h; }
  } else {
    const to = tile === "hueso" ? landed + 1 : landed;
    let base = 0;
    for (let e = 0; e < ND; e++) if (!inUnit[e] && sp[e] === to) base += 1;
    for (let e = 0; e < ND; e++) if (inUnit[e]) { sp[e] = to; ht[e] = base + ht[e] - h; }
  }
  return { sp, ht, landed, tile };
}

const fastDone = (f) => f.sp.some((s) => s > RULES.track);
// El primero, el segundo y el último
function fastRank(f) {
  const order = Array.from({ length: ND }, (_, d) => d).sort((a, b) => f.sp[b] - f.sp[a] || f.ht[b] - f.ht[a]);
  return order;
}
const tileMap = (tiles) => { const m = {}; for (const t of tiles || []) m[t.space] = t.kind; return m; };

// Todas las formas de terminar la etapa. Devuelve P(1º), P(2º) por perro y las veces esperadas que alguien cae en
// cada casilla (sin contar las que ya tienen tapete).
export function legOdds(spaces, dice, tiles = []) {
  const first = Array(ND).fill(0), second = Array(ND).fill(0);
  const lands = Array(spaces.length).fill(0);
  const tm = tileMap(tiles);
  function walk(f, left, w) {
    if (!left.length || fastDone(f)) {
      const r = fastRank(f);
      first[r[0]] += w; second[r[1]] += w;
      return;
    }
    const wn = w / (left.length * 3);
    for (const d of left) {
      const rest = left.filter((x) => x !== d);
      for (let n = 1; n <= 3; n++) {
        const mv = fastMove(f, d, n, tm);
        if (!mv.tile && mv.landed <= RULES.track) lands[mv.landed] += wn;
        walk(mv, rest, wn);
      }
    }
  }
  walk(toFast(spaces), dice, 1);
  return { first, second, lands };
}

// Carreras simuladas al azar desde aquí (la etapa en curso con sus tapetes; las siguientes sin tapetes): P(gana) y
// P(llega al último) de cada perro
export function raceOdds(spaces, dice, tiles, rnd, sims = 300) {
  const win = Array(ND).fill(0), lose = Array(ND).fill(0);
  const tm0 = tileMap(tiles);
  const start = toFast(spaces);
  for (let k = 0; k < sims; k++) {
    let f = start, left = dice.slice(), tm = tm0;
    for (let guard = 0; guard < 200 && !fastDone(f); guard++) {
      if (!left.length) { left = DOGS.map((_, d) => d); tm = {}; }
      const i = Math.floor(rnd() * left.length);
      const d = left[i]; left.splice(i, 1);
      f = fastMove(f, d, 1 + Math.floor(rnd() * 3), tm);
    }
    const r = fastRank(f);
    win[r[0]] += 1; lose[r[ND - 1]] += 1;
  }
  return { win: win.map((x) => x / sims), lose: lose.map((x) => x / sims) };
}

const payoutAt = (k) => RULES.finals[k] ?? 1;

// Cuánto avanzó la carrera (0 al salir, 1 en la meta): las apuestas finales valen más cuando ya se ve quién va bien
function progress(spaces) {
  const lead = Math.max(...positions(spaces).map((p) => p.space));
  return Math.min(1, lead / RULES.track);
}

// Cada jugada legal con su valor esperado en croquetas
export function scoreActions(v, seat, style = "normal", rnd = () => 0.5) {
  const s = STYLES[style] || STYLES.normal;
  const leg = legOdds(v.spaces, v.dice, v.tiles);
  const out = [{ action: { type: "roll" }, ev: 1, why: "1 croqueta segura" }];

  DOGS.forEach((_, d) => {
    const t = v.tickets[d];
    if (!t.length) return;
    const p1 = leg.first[d], p2 = leg.second[d];
    out.push({ action: { type: "ticket", dog: d }, ev: t[0] * p1 + RULES.second * p2 - RULES.miss * (1 - p1 - p2), p1, p2 });
  });

  // Tapete: donde más se cae. El tipo: hueso si ayuda a un perro con boleto mío, aspiradora si ayuda a frenar a otros
  const mine = new Set(v.bets.filter((b) => b.seat === seat).map((b) => b.dog));
  const spaces = tileSpaces(v, seat).sort((a, b) => leg.lands[b] - leg.lands[a]).slice(0, 3);
  for (const space of spaces) {
    const behind = v.spaces.slice(Math.max(0, space - 3), space).flat();
    const kind = behind.some((d) => mine.has(d)) ? "hueso" : behind.length ? "aspiradora" : "hueso";
    out.push({ action: { type: "tile", space, kind }, ev: leg.lands[space] * 0.95 });
  }

  // Apuestas finales: solo cuando la carrera ya va avanzada (o el estilo atrevido)
  const prog = progress(v.spaces);
  if (v.cards[seat] && v.cards[seat].length && prog + s.finalBias * 0.3 > 0.45) {
    const race = raceOdds(v.spaces, v.dice, v.tiles, rnd, s.sims);
    for (const dog of v.cards[seat]) {
      const pw = race.win[dog], pl = race.lose[dog];
      const ew = payoutAt(v.winnerBets.length) * pw - RULES.finalMiss * (1 - pw);
      const el = payoutAt(v.loserBets.length) * pl - RULES.finalMiss * (1 - pl);
      out.push({ action: { type: "final", which: "winner", dog }, ev: ew + s.finalBias * pw, p: pw });
      out.push({ action: { type: "final", which: "loser", dog }, ev: el + s.finalBias * pl, p: pl });
    }
  }
  return out;
}

export function decide(v, seat, style = "normal", rnd = () => 0.5) {
  if (v.phase === "leg") return { type: "next" };
  if (v.phase !== "play" || v.turn !== seat) return null;
  const s = STYLES[style] || STYLES.normal;
  const opts = scoreActions(v, seat, style, rnd);
  return opts[chooseIndex(opts.map((o) => o.ev), s.azar, rnd)].action;
}

// El consejo: las tres mejores jugadas con su valor esperado
export function advise(v, seat, rnd = () => 0.5) {
  if (v.phase !== "play" || v.turn !== seat) return null;
  const opts = scoreActions(v, seat, "normal", rnd).sort((a, b) => b.ev - a.ev);
  return { best: opts[0], options: opts.slice(0, 3) };
}
