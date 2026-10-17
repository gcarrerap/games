// Lo que la compu sabe calcular sobre una mano: si ya se puede bajar (y con qué grupos) y qué tanto sirve cada carta
// para el contrato de la ronda. Puro.
import { SUITS, isWild, isJoker, rankOf, suitOf, valueOf, cardPoints, arrange, fitsOf } from "../engine/index.js";

// Grupos posibles con lo mínimo (tercias de 3, escaleras de 4): { kind, nat: [cartas naturales], wild: cuántos faltan }
function candidates(hand) {
  const nat = hand.filter((c) => !isWild(c)), sets = [], runs = [];
  const byRank = new Map();
  for (const c of nat) { if (!byRank.has(rankOf(c))) byRank.set(rankOf(c), []); byRank.get(rankOf(c)).push(c); }
  for (const cs of byRank.values()) {
    // Con seis o más del mismo número caben dos tercias
    for (let i = 0; i + 1 < cs.length; i += 3) {
      const take = cs.slice(i, i + 3);
      sets.push({ kind: "set", nat: take, wild: Math.max(0, 3 - take.length) });
      if (take.length === 3) sets.push({ kind: "set", nat: take.slice(0, 2), wild: 1 });
    }
  }
  for (const s of SUITS) {
    const mine = nat.filter((c) => suitOf(c) === s);
    if (mine.length < 2) continue;
    for (let lo = 1; lo <= 11; lo++) {
      // Con dos barajas puede haber dos escaleras iguales: la segunda con las cartas que no usó la primera
      const used = new Set();
      for (let copy = 0; copy < 2; copy++) {
        const found = [];
        for (let v = lo; v < lo + 4; v++) {
          const c = mine.find((x) => !used.has(x) && (valueOf(x) === v || (v === 14 && rankOf(x) === "A")));
          if (c) { used.add(c); found.push(c); }
        }
        const miss = 4 - found.length;
        if (found.length >= 2 && miss <= found.length) runs.push({ kind: "run", nat: found, wild: miss });
      }
    }
  }
  const byWild = (a, b) => a.wild - b.wild;
  return { sets: sets.sort(byWild), runs: runs.sort(byWild) };
}

// Los grupos para bajarse con el contrato k ({ sets, runs }), o null. Pone primero los jokers (los que más cuestan).
export function findDown(hand, k) {
  const { sets, runs } = candidates(hand);
  const wilds = hand.filter(isWild).sort((a, b) => cardPoints(b) - cardPoints(a));
  const need = [...Array(k.sets).fill("set"), ...Array(k.runs).fill("run")];
  const chosen = [];
  const used = new Set();
  function go(i, wildLeft) {
    if (i === need.length) return true;
    const list = need[i] === "set" ? sets : runs;
    for (const c of list) {
      if (c.wild > wildLeft || c.nat.some((x) => used.has(x))) continue;
      c.nat.forEach((x) => used.add(x)); chosen.push(c);
      if (go(i + 1, wildLeft - c.wild)) return true;
      chosen.pop(); c.nat.forEach((x) => used.delete(x));
    }
    return false;
  }
  if (!go(0, wilds.length)) return null;
  let w = 0;
  const groups = chosen.map((c) => [...c.nat, ...wilds.slice(w, (w += c.wild))]);
  return groups.every((g, i) => !arrange(g, need[i]).error) ? groups : null;
}

// Distancia entre dos cartas del mismo palo en una escalera (el As cuenta abajo y arriba)
function gap(a, b) {
  const va = rankOf(a) === "A" ? [1, 14] : [valueOf(a)], vb = rankOf(b) === "A" ? [1, 14] : [valueOf(b)];
  let d = 99;
  for (const x of va) for (const y of vb) d = Math.min(d, Math.abs(x - y));
  return d;
}

// Qué tanto sirve una carta con el resto de la mano para el contrato k. Los comodines siempre sirven.
export function usefulness(card, rest, k) {
  if (isWild(card)) return isJoker(card) ? 40 : 30;
  let s = 0;
  const nat = rest.filter((c) => !isWild(c));
  if (k.sets) {
    const same = nat.filter((c) => rankOf(c) === rankOf(card)).length;
    s += (same >= 2 ? 14 : same === 1 ? 7 : 0) * (k.runs ? 1 : 1.3);
  }
  if (k.runs) {
    let r = 0;
    for (const c of nat) {
      if (suitOf(c) !== suitOf(card)) continue;
      const d = gap(c, card);
      if (d === 1) r += 5; else if (d === 2) r += 3; else if (d === 3) r += 1;
    }
    s += Math.min(r, 14) * (k.sets ? 1 : 1.3);
  }
  return s;
}

// Las cartas que caben en algún juego de la mesa: [{ card, meld, end }]
export function placements(hand, melds) {
  const out = [];
  for (const c of hand) for (const m of melds) for (const end of fitsOf(m, c)) out.push({ card: c, meld: m.id, end });
  return out;
}

// Cuántas cartas le faltan a la mano para el contrato k, contando los comodines que tiene (una por hueco, sin pasar
// de un comodín por carta natural en cada grupo). 0 = ya se puede bajar. Búsqueda con poda: mejor arreglo de grupos.
export function distance(hand, k) {
  const nat = hand.filter((c) => !isWild(c)), wilds = hand.length - nat.length;
  const sets = [], runs = [];
  const byRank = new Map();
  for (const c of nat) { if (!byRank.has(rankOf(c))) byRank.set(rankOf(c), []); byRank.get(rankOf(c)).push(c); }
  for (const cs of byRank.values()) for (let i = 0; i < cs.length; i += 3) {
    const take = cs.slice(i, i + 3);
    sets.push({ nat: take, miss: 3 - take.length });
  }
  for (const s of SUITS) {
    const mine = nat.filter((c) => suitOf(c) === s);
    for (let lo = 1; lo <= 11; lo++) {
      const used = new Set(), found = [];
      for (let v = lo; v < lo + 4; v++) {
        const c = mine.find((x) => !used.has(x) && (valueOf(x) === v || (v === 14 && rankOf(x) === "A")));
        if (c) { used.add(c); found.push(c); }
      }
      if (found.length) runs.push({ nat: found, miss: 4 - found.length });
    }
  }
  sets.sort((a, b) => a.miss - b.miss); runs.sort((a, b) => a.miss - b.miss);
  const need = [...Array(k.sets).fill(sets), ...Array(k.runs).fill(runs)];
  const used = new Set();
  let best = Infinity;
  // Un grupo sin ninguna carta: le faltan todas (3 o 4)
  const empty = (list) => (list === sets ? 3 : 4);
  function go(i, miss, wildRoom) {
    // Faltantes que pagan los comodines: tantos como haya y quepan
    if (miss - wilds >= best) return; // ni con todos los comodines mejora
    if (i === need.length) { best = Math.max(0, miss - Math.min(wilds, wildRoom)); return; }
    let tried = 0;
    for (const c of need[i]) {
      if (c.nat.some((x) => used.has(x))) continue;
      c.nat.forEach((x) => used.add(x));
      go(i + 1, miss + c.miss, wildRoom + Math.min(c.miss, c.nat.length));
      c.nat.forEach((x) => used.delete(x));
      if (++tried >= 6) break; // los primeros (los más completos) bastan
    }
    go(i + 1, miss + empty(need[i]), wildRoom);
  }
  go(0, 0, 0);
  return best;
}
