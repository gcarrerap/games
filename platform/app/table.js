// Una mesa: asientos, la compu, y la partida del juego que se juega en ella. Sirve igual para práctica (en memoria)
// que para mesas en línea (Firestore guarda la mesa tal cual). Puro: el tiempo (now) y la semilla entran como
// parámetro; el juego se recibe como módulo del contrato (no sabe de ningún juego en particular).
//
// Toda acción se aplica con modules/recording, así cada partida de una mesa queda grabada en table.rec y se puede
// repetir. Forma de la mesa (docs/ARCHITECTURE.md §5):
//   { v, code, game, mode, config, seats, host, seed, round, status, state, rec, turn, created, version }
//   seats: [null | { id, name } | { bot: true, profile, name }]
//   status: "lobby" (sentándose) | "playing" | "over" (terminó; se puede jugar otra)
import { startRecording, initialState, step } from "../../modules/recording/index.js";

export const TABLE_VERSION = 1;

export const seatCount = (game, config) => config.n ?? game.players.max;

// mode: una de game.modes, o su id; options: lo que se escoge aparte (por ejemplo { timer: false })
export function newTable(game, { code, mode: m, options = {}, host = null, seed, now, version = null }) {
  if (!code) throw new Error("Falta el código de la mesa");
  if (seed === undefined || seed === null) throw new Error("Falta la semilla");
  const mode = game.modes.find((x) => x === m || (x.id !== undefined && x.id === (m && m.id !== undefined ? m.id : m)));
  if (!mode) throw new Error("Modo desconocido");
  const config = { ...mode, ...options };
  return {
    v: TABLE_VERSION, code, game: game.id, mode: mode.id ?? null, config,
    seats: Array(seatCount(game, config)).fill(null), host, seed: String(seed), round: 0,
    status: "lobby", state: null, rec: null, turn: 0, created: now, version,
  };
}

const copy = (t, patch) => ({ ...t, ...patch, seats: (patch.seats || t.seats).slice() });
const inLobby = (t) => t.status === "lobby" || t.status === "over";
const check = (t, i) => { if (!Number.isInteger(i) || i < 0 || i >= t.seats.length) throw new Error("Ese asiento no existe."); };

// Se sienta una persona. Si ya estaba en otro asiento, se cambia.
export function sit(t, i, player) {
  check(t, i);
  if (!inLobby(t)) throw new Error("La partida ya empezó.");
  if (t.seats[i] && t.seats[i].id !== player.id) throw new Error("Ese asiento ya lo tomaron.");
  const seats = t.seats.map((s) => (s && !s.bot && s.id === player.id ? null : s));
  seats[i] = { id: player.id, name: player.name };
  return copy(t, { seats });
}

export function leaveSeat(t, playerId) {
  if (!inLobby(t)) throw new Error("La partida ya empezó.");
  return copy(t, { seats: t.seats.map((s) => (s && !s.bot && s.id === playerId ? null : s)) });
}

export function addBot(t, i, { profile, name }) {
  check(t, i);
  if (!inLobby(t)) throw new Error("La partida ya empezó.");
  if (t.seats[i]) throw new Error("Ese asiento ya lo tomaron.");
  const seats = t.seats.slice(); seats[i] = { bot: true, profile, name };
  return copy(t, { seats });
}

export function removeBot(t, i) {
  check(t, i);
  if (!inLobby(t)) throw new Error("La partida ya empezó.");
  if (!(t.seats[i] && t.seats[i].bot)) throw new Error("En ese asiento no está la compu.");
  const seats = t.seats.slice(); seats[i] = null;
  return copy(t, { seats });
}

export function setBotProfile(t, i, profile) {
  check(t, i);
  if (!(t.seats[i] && t.seats[i].bot)) throw new Error("En ese asiento no está la compu.");
  const seats = t.seats.slice(); seats[i] = { ...seats[i], profile };
  return copy(t, { seats });
}

export const canStart = (t) => inLobby(t) && t.seats.every(Boolean);

// Reparte y empieza una partida (la primera, u otra después de terminar). Cada partida de la mesa tiene su
// propia semilla, derivada de la de la mesa y del número de partida.
export function start(game, t, now) {
  if (!canStart(t)) throw new Error(inLobby(t) ? "Faltan jugadores." : "La partida ya empezó.");
  const round = t.round + 1;
  const config = { ...t.config, names: t.seats.map((s) => s.name) };
  const players = t.seats.map((s) => (s.bot ? { bot: true, profile: s.profile, name: s.name } : { id: s.id, name: s.name }));
  const rec = startRecording({ game, config, seed: `${t.seed}:${round}`, now, meta: { code: t.code, players, version: t.version } });
  const state = initialState(game, rec);
  return copy(t, { round, rec, state, turn: 0, status: game.isOver(state) ? "over" : "playing" });
}

// Aplica la acción de un asiento. Truena (sin cambiar nada) si no se vale.
export function act(game, t, seat, action, now) {
  if (t.status !== "playing") throw new Error("No hay partida en juego.");
  check(t, seat);
  const { state, rec } = step(game, t.state, t.rec, seat, action, now);
  return copy(t, { state, rec, turn: t.turn + 1, status: game.isOver(state) ? "over" : "playing" });
}

// Identifica el momento de la partida: cambia con cada acción y con cada partida nueva. Una acción calculada para
// un turnKey solo se guarda si la mesa sigue en ese turnKey (otro teléfono pudo adelantarse).
export const turnKey = (t) => (t && t.status === "playing" ? `${t.round}:${t.turn}` : null);

// Cómo se dibuja la mesa en un aparato (ctx.display): "tv" si es la tele de una mesa en línea, "phone" si la mesa se
// juega con tele y ese aparato tiene asiento, "full" en todo lo demás (práctica, quien solo mira, juegos sin tele).
export function displayFor({ game, table, seat, practice = false, tv = false }) {
  if (!game || !game.tv || practice) return "full";
  if (tv) return "tv";
  return table && table.config && table.config.tv && seat >= 0 ? "phone" : "full";
}

export const mySeat = (t, playerId) => t.seats.findIndex((s) => s && !s.bot && s.id === playerId);
export const humanSeats = (t) => t.seats.map((s, i) => (s && !s.bot ? i : -1)).filter((i) => i >= 0);
export const botSeats = (t) => t.seats.map((s, i) => (s && s.bot ? i : -1)).filter((i) => i >= 0);

// Mesa abandonada antes de empezar: ninguna persona sentada (la compu sola no cuenta)
export const isEmptyTable = (t) => t.status === "lobby" && humanSeats(t).length === 0;
