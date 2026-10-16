// Reloj de turno (heredado de myDomino). Cada teléfono mide el tiempo desde que VIO el turno nuevo, así no importa
// si los relojes de los teléfonos no coinciden. Puro: recibe la hora y cuándo se vio el turno.
//
// Quien tiene el turno lo resuelve al llegar a 0; los demás esperan GRACE_MS más por si ese teléfono no responde.
// En práctica no hay espera. Resolver = aplicar game.timing.autoAction(state, seat), que queda grabada como
// cualquier acción.
import { turnKey } from "./table.js";

export const GRACE_MS = 3000;

// Devuelve null si no hay reloj, o { key, seat, limitMs, secs, pct, due }:
//   seat: de quién es el turno (el primero de currentSeats); secs/pct: lo que queda (para pintar);
//   due: true si este teléfono ya debe resolver el turno vencido.
// seenAt: cuándo vio este teléfono el turnKey actual. me: el asiento de este teléfono (-1 si solo mira).
export function clockStatus(game, t, { seenAt, now, me = -1, practice = false }) {
  const key = turnKey(t);
  if (!key || !game.timing) return null;
  const limit = game.timing.turnMs(t.state);
  if (!limit) return null;
  const seats = game.currentSeats(t.state);
  if (!seats.length) return null;
  const left = limit - (now - seenAt);
  const mine = seats.includes(me);
  const grace = practice || mine ? 0 : GRACE_MS;
  const canResolve = practice || me >= 0; // quien solo mira no resuelve
  return {
    key, seat: seats[0], limitMs: limit,
    secs: Math.max(0, Math.ceil(left / 1000)),
    pct: Math.max(0, Math.min(100, (left / limit) * 100)),
    due: canResolve && left <= -grace,
  };
}

// La acción que resuelve un turno vencido
export const timeoutAction = (game, t, seat) => game.timing.autoAction(t.state, seat);
