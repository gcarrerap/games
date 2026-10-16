// Partidas entre bots sin interfaz, sobre cualquier juego que cumpla el contrato. Reproducibles con semilla.
// Sirve para medir la fuerza de los perfiles de la compu y como prueba de punta a punta de un juego:
// si setup/legalActions/apply/currentSeats/isOver no son coherentes, aquí se nota.
import { seededRandom } from "../random/index.js";
import { actionCtx, startRecording, initialState, step as recordStep } from "../recording/index.js";

// Hora simulada: un segundo por acción. El azar de cada acción es el de modules/recording, así la partida se
// puede grabar y repetir. La misma semilla da la misma partida.
const timeAt = (t0, i) => t0 + Math.max(0, i) * 1000;
export const stepCtx = (seed, i, t0 = 0) => actionCtx(String(seed), i, timeAt(t0, i));

// Una partida. profiles: perfil de la compu por asiento.
// opts: { config, seed, t0, maxSteps, stopWhen(state), decide(view, seat, profile, ctx, state) para envolver la
//         decisión (estadísticas), onStep({ state, seat, action, step }) }
// Devuelve { state, result, steps, stalled, recording }: stalled = true si nadie pudo actuar sin que terminara;
// recording es la grabación de la partida (modules/recording), que se puede repetir con replay().
export function playGame(game, profiles, { config, seed = 1, t0 = 0, maxSteps = 10000, stopWhen = null, decide = null, onStep = null } = {}) {
  if (!game.bots) throw new Error(`${game.id} no tiene compu`);
  const choose = decide || ((v, seat, profile, ctx) => game.bots.decide(v, seat, profile, ctx));
  let rec = startRecording({ game, config, seed, now: t0 });
  let state = initialState(game, rec);
  let step = 0, stalled = false;
  for (; step < maxSteps; step++) {
    if (game.isOver(state) || (stopWhen && stopWhen(state))) break;
    const now = timeAt(t0, step);
    let seat, action;
    const seats = game.currentSeats(state);
    if (seats.length) {
      // Si varios pueden actuar, actúa primero el que menos espera (por ejemplo, quién sale en parejas)
      seat = seats.length === 1 || !game.bots.thinkMs ? seats[0]
        : seats.map((s) => ({ s, w: game.bots.thinkMs(game.view(state, s), s, now) })).sort((a, b) => a.w - b.w)[0].s;
      action = choose(game.view(state, seat), seat, profiles[seat], { rnd: seededRandom(`${seed}:bot:${step}`) }, state);
      if (!action) throw new Error(`${game.id}: la compu del asiento ${seat} no decidió`);
    } else {
      // Pausa (por ejemplo, entre manos): actúa el primer asiento que tenga algo que hacer
      const n = profiles.length;
      for (let s = 0; s < n && !action; s++) { const la = game.legalActions(state, s); if (la.length) { seat = s; action = la[0]; } }
      if (!action) { stalled = true; break; }
    }
    ({ state, rec } = recordStep(game, state, rec, seat, action, now));
    if (onStep) onStep({ state, seat, action, step });
  }
  return { state, result: game.result(state), steps: step, stalled, recording: rec };
}

// Intervalo de confianza del 95% (aproximación normal) para una proporción
export function ci95(wins, n) {
  const p = n ? wins / n : 0, se = Math.sqrt(Math.max(p * (1 - p), 1e-9) / Math.max(n, 1));
  return [Math.max(0, p - 1.96 * se), Math.min(1, p + 1.96 * se)];
}

// Varias partidas. lineup(g) → perfiles por asiento de la partida g (para alternar asientos);
// won(result, g) → true si ganó el lado que se mide. Devuelve { games, wins, winRate, ci95, results }.
export function match(game, { config, games = 20, seed = 1, lineup, won, ...opts }) {
  let wins = 0; const results = [];
  for (let g = 0; g < games; g++) {
    const r = playGame(game, lineup(g), { config, seed: seed * 1000 + g, ...opts });
    if (won(r.result, g)) wins++;
    results.push(r);
  }
  return { games, wins, winRate: wins / games, ci95: ci95(wins, games), results };
}
