// Grabar y repetir partidas de cualquier juego que cumpla el contrato. Puro: no guarda nada por su cuenta;
// quien lo usa decide dónde va la grabación (la plataforma le pasará Firestore).
//
// Idea: una partida se reconstruye con su configuración, una semilla y la lista de acciones con su hora. Para que
// eso alcance, el azar y el tiempo de cada acción salen SIEMPRE de actionCtx(semilla, número de acción, hora).
// Quien aplique acciones (la plataforma, el torneo) debe usar step() o nextCtx(): así la repetición da exactamente
// el mismo estado, aunque el juego reparta o revuelva en medio de la partida.
import { seededRandom } from "../random/index.js";

export const RECORDING_VERSION = 1;

// El { rnd, now } de la acción i (i = -1 es el setup)
export const actionCtx = (seed, i, now) => ({ rnd: seededRandom(`${seed}:${i}`), now });

// meta: lo que quiera guardar quien graba (jugadores, versión del sitio, código de mesa…). Debe ser JSON.
export function startRecording({ game, config, seed, now, meta = {} }) {
  if (!game || !game.id) throw new Error("Falta el juego");
  if (seed === undefined || seed === null) throw new Error("Falta la semilla");
  return { v: RECORDING_VERSION, game: game.id, config, seed: String(seed), start: now, meta, actions: [] };
}

export const setupCtx = (rec) => actionCtx(rec.seed, -1, rec.start);
export const nextCtx = (rec, now) => actionCtx(rec.seed, rec.actions.length, now);

// Estado inicial de la grabación
export const initialState = (game, rec) => game.setup(rec.config, setupCtx(rec));

// Aplica una acción con el contexto que le toca y la agrega a la grabación. Devuelve { state, rec }.
// Si la acción no es válida, game.apply truena y la grabación no cambia.
export function step(game, state, rec, seat, action, now) {
  const next = game.apply(state, seat, action, nextCtx(rec, now));
  return { state: next, rec: { ...rec, actions: [...rec.actions, { seat, action, t: now }] } };
}

// Vuelve a jugar la grabación desde el principio. upTo: cuántas acciones aplicar (por omisión, todas).
// Truena con el número de acción si alguna no es válida (la grabación no corresponde a una partida real).
export function replay(game, rec, { upTo = Infinity } = {}) {
  if (rec.game !== game.id) throw new Error(`La grabación es de ${rec.game}, no de ${game.id}`);
  let state = initialState(game, rec);
  const n = Math.min(upTo, rec.actions.length);
  for (let i = 0; i < n; i++) {
    const { seat, action, t } = rec.actions[i];
    try { state = game.apply(state, seat, action, actionCtx(rec.seed, i, t)); }
    catch (e) { throw new Error(`Acción ${i} no válida (${JSON.stringify(action)} del asiento ${seat}): ${e.message}`); }
  }
  return state;
}
