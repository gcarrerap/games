// La compu de Memoria Veloz. Solo recibe la vista: sus cartas abiertas, dónde están las cartas de los demás (sin
// cara), los timers y lo que ella misma ya vio (`memory`).
//
// Recordar: cada carta vista se recuerda con una probabilidad que baja con las acciones que han pasado desde que la
// vio (estilo: `mem` al verla, `fade` por acción). Con eso decide:
//   - Con dos iguales abiertas: las reclama.
//   - Con una abierta: si recuerda dónde está su pareja (y está libre), la abre; si no, abre una que no ha visto.
//   - Sin cartas: si recuerda un par completo libre, abre una; si alguien lleva rato con cartas abiertas y puede,
//     le pone timer; si no, abre una que no ha visto.
// Congelada, o sin nada que hacer, espera (`tick`). Qué tan rápido actúa lo dice thinkMs.
import { isFrozen, canTimer } from "../engine/index.js";

export const STYLES = {
  despistado: { name: "Despistado", mem: 0.55, fade: 0.93, speed: 1500, timerAfter: 4000 },
  normal: { name: "Normal", mem: 0.8, fade: 0.97, speed: 1100, timerAfter: 2500 },
  memorion: { name: "Memorión", mem: 0.97, fade: 0.995, speed: 800, timerAfter: 1800 },
};
const style = (profile) => STYLES[profile] || STYLES.normal;
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
const TICK = { type: "tick" };

// Lo que recuerda ahora: { carta: cara }
export function recall(v, s, rnd) {
  const out = new Map();
  for (const m of v.memory) {
    const age = Math.max(0, v.seq - m.q);
    if (rnd() < s.mem * Math.pow(s.fade, age)) out.set(m.i, m.f);
  }
  return out;
}

export function decide(v, seat, profile, rnd) {
  if (v.phase !== "play") return null;
  const s = style(profile);
  if (isFrozen(v, seat, v.t)) return TICK;
  const mine = v.mine;
  const free = v.cards.map((c, i) => (c.hold < 0 && c.won < 0 ? i : -1)).filter((i) => i >= 0);
  const known = recall(v, s, rnd);
  const seen = new Set(v.memory.map((m) => m.i));
  const unseen = free.filter((i) => !seen.has(i));
  const explore = () => (unseen.length ? pick(unseen, rnd) : free.length ? pick(free, rnd) : -1);

  if (mine.length === 2) return v.cards[mine[0]].f === v.cards[mine[1]].f ? { type: "claim" } : { type: "backAll" };

  if (mine.length === 1) {
    const f = v.cards[mine[0]].f;
    const match = free.find((i) => known.get(i) === f);
    if (match !== undefined) return { type: "open", i: match };
    // Si cree saber qué hay en todas las libres y ninguna es su pareja, mejor la suelta
    const i = unseen.length ? pick(unseen, rnd) : free.filter((j) => !known.has(j)).length ? pick(free.filter((j) => !known.has(j)), rnd) : -1;
    return i >= 0 ? { type: "open", i } : { type: "back", i: mine[0] };
  }

  // Sin cartas abiertas: un par que recuerda completo
  const byFace = new Map();
  for (const i of free) if (known.has(i)) { const f = known.get(i); if (!byFace.has(f)) byFace.set(f, []); byFace.get(f).push(i); }
  const pair = [...byFace.values()].find((l) => l.length >= 2);
  if (pair) return { type: "open", i: pair[0] };

  // Timer a quien lleva rato con cartas abiertas
  if (canTimer(v, seat, v.t)) {
    const slow = v.counts
      .map((c, o) => ({ o, since: Math.min(...v.cards.filter((x) => x.hold === o).map((x) => x.at)) }))
      .filter(({ o }) => o !== seat && v.counts[o] > 0 && !v.timers[o])
      .filter(({ since }) => v.t - since >= s.timerAfter);
    if (slow.length) return { type: "timer", seat: slow[0].o };
  }

  const i = explore();
  return i >= 0 ? { type: "open", i } : TICK;
}

// Cuánto tarda: su velocidad, un poco al azar por asiento y acción, más rápido con una carta abierta y para reclamar, y si está congelada,
// hasta que se le quite
export function thinkMs(v, seat, now, profile) {
  const s = style(profile);
  const jitter = 0.75 + (((v.seq * 7 + seat * 13) % 10) / 20); // 0.75 … 1.2
  let ms = s.speed * jitter;
  if (v.mine.length === 2) ms *= 0.5; // reclamar es inmediato
  else if (v.mine.length === 1) ms *= 0.6; // ya está buscando la pareja
  const frozenLeft = (v.frozen[seat] || 0) - now;
  if (frozenLeft > 0) ms = Math.max(ms, frozenLeft + 50);
  return Math.round(ms);
}
