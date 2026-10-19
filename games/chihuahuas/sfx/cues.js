// Qué efecto toca en cada cosa que pasa en la carrera, y en qué aparato. Puro: no suena nada; solo devuelve
// { key, at, audience }. at es el retraso en ms (para ir con la animación). audience es "public" (la mesa, o la tele)
// o "local" (el teléfono de quien juega).
//
// Con la tele como tablero no se oye doble: la tele suena lo público y el teléfono solo lo suyo (clic, error, "te
// toca"). Quien mira una mesa con tele tampoco suena lo público: ya lo suena la tele. Sin tele, el mismo aparato
// suena todo. Nada de esto se dispara al redibujar: gather() solo agrega cues cuando cambia la jugada, el turno,
// el error, los asientos o la revelación de pagos.
import { DOGS, RULES, SHOW, rollSteps, showMs } from "../engine/index.js";

// Igual que el hueco entre perros de la salida (ui/fx.js, INTRO.gap)
const START_GAP = 420;

export function barkKey(dog) {
  const id = DOGS[dog] && DOGS[dog].id;
  return id ? `ladrido-${id}` : null;
}

// "board": la tele, solo lo público. "hand": el teléfono (o quien mira una mesa con tele), solo lo local.
// "all": la mesa sin tele, las dos cosas.
export function soundRole(display, tvOn) {
  if (display === "tv") return "board";
  if (display === "phone") return "hand";
  if (tvOn) return "hand";
  return "all";
}

export function hears(role, audience) {
  if (role === "all") return true;
  if (role === "board") return audience === "public";
  return audience === "local";
}

// La tirada: el tazón, el ladrido cuando sale el dado, un pasito por casilla, el tapete, la pila y la meta.
// spaces es el tablero ya movido (para saber si cayó encima de otro).
export function rollCues(last, spaces) {
  if (!last || last.kind !== "roll") return [];
  const cues = [{ key: "tazon-sacudir", at: 0 }];
  const bark = barkKey(last.dog);
  if (bark) cues.push({ key: bark, at: Math.round(SHOW.reveal * 0.55) });
  cues.push({ key: "croqueta-ganar", at: Math.round(SHOW.reveal * 0.85) });
  const steps = Math.max(0, rollSteps(last));
  const vacuum = !!(last.tile && last.tile.kind === "aspiradora");
  for (let i = 1; i <= steps; i++) {
    const at = SHOW.reveal + i * SHOW.step;
    const tileStep = last.tile && i === steps;
    if (tileStep) cues.push({ key: vacuum ? "caer-aspiradora" : "caer-hueso", at });
    else cues.push({ key: "pasitos", at });
  }
  const unit = new Set([last.dog, ...(last.carried || [])]);
  const dest = (spaces && spaces[last.to]) || [];
  const onOthers = dest.some((d) => !unit.has(d));
  const carrying = (last.carried || []).length > 0;
  const pile = (at) => { if (!cues.some((c) => c.key === "apilar" && c.at === at)) cues.push({ key: "apilar", at }); };
  if (carrying && steps > 0) pile(SHOW.reveal + SHOW.step);
  if (onOthers && !vacuum && steps > 0) pile(SHOW.reveal + steps * SHOW.step);
  if (last.to > RULES.track) {
    const arrive = Math.max(1, Math.min(last.landed, RULES.track + 1) - last.from);
    cues.push({ key: "meta", at: SHOW.reveal + arrive * SHOW.step });
  }
  if (last.tile) cues.push({ key: "croqueta-ganar", at: SHOW.reveal + steps * SHOW.step + 80 });
  return cues;
}

// Boleto, tapete (poner o mover) y apuesta secreta. prevTiles: los tapetes de antes de esta jugada.
export function actionCues(last, prevTiles) {
  if (!last || last.kind === "roll") return [];
  if (last.kind === "ticket") return [{ key: "boleto-tomar", at: 0 }];
  if (last.kind === "final") return [{ key: "apuesta-secreta", at: 0 }];
  if (last.kind === "tile") {
    const had = (prevTiles || []).some((t) => t.seat === last.seat);
    return [{ key: had ? "tapete-mover" : (last.tileKind === "hueso" ? "tapete-hueso" : "aspiradora-poner"), at: 0 }];
  }
  return [];
}

// La salida de una partida que acaba de empezar (cada perro lanza su lugar). Una sola vez, con seq 0.
export function startCues(st) {
  if (!st || st.seq !== 0) return [];
  const start = (st.hist || []).find((h) => h.kind === "start");
  if (!start || !start.start) return [];
  const cues = [];
  start.start.forEach((o, i) => {
    const key = barkKey(o.dog);
    if (key) cues.push({ key, at: i * START_GAP });
  });
  return cues;
}

// Los pagos, al ritmo de revealPlan (ui/table.js). La meta ya sonó en la tirada que cerró la carrera.
export function revealCues(st, plan) {
  if (!st || !plan || !st.summary) return [];
  const over = st.phase === "over";
  const cues = [{ key: over ? "fin-carrera" : "fin-etapa", at: 0 }];
  (st.summary.bets || []).forEach((b, i) => {
    cues.push({ key: b.got > 0 ? "pago-ganar" : "pago-perder", at: plan.legAt[i] || 0 });
  });
  if (over && st.final) {
    const add = (list, times) => (list || []).forEach((b, i) => {
      cues.push({ key: b.got > 0 ? "pago-ganar" : "pago-perder", at: (times && times[i]) || 0 });
    });
    add(st.final.winner, plan.winAt);
    add(st.final.loser, plan.loseAt);
    // El efecto corto «ganador» lo reemplaza la música de festejo (celebrate.js), que sale en este mismo momento.
    // Si esa pieza no puede sonar, la interfaz usa «ganador» como respaldo.
  }
  return cues;
}

const seatId = (s) => (!s ? "" : s.bot ? `bot:${s.profile || ""}:${s.name || ""}` : `id:${s.id}`);

// Alguien se sentó o se levantó. Misma persona en el mismo asiento no suena.
export function seatCues(prevIds, nextIds) {
  const a = prevIds || [], b = nextIds || [];
  const n = Math.max(a.length, b.length);
  const cues = [];
  let i = 0;
  for (let s = 0; s < n; s++) {
    if ((a[s] || "") === (b[s] || "")) continue;
    if (a[s]) cues.push({ key: "jugador-sale", at: i++ * 160 });
    if (b[s]) cues.push({ key: "jugador-entra", at: i++ * 160 });
  }
  return cues;
}

function idsOf(seats) {
  return (seats || []).map(seatId);
}

function makeSnap({ st, seats, err, plan, fxOn, prev }) {
  let reveal = null;
  if (plan && fxOn) reveal = prev ? prev.reveal : null;
  else if (plan) reveal = plan.key;
  const turn = st.turn;
  return {
    seq: st.seq,
    turn,
    phase: st.phase,
    err: err || "",
    tiles: st.tiles || [],
    seats: idsOf(seats),
    botTurn: st.phase === "play" && !!(seats && seats[turn] && seats[turn].bot),
    reveal,
  };
}

// Lo que hay que sonar ahora, y la foto para la próxima vez. Sin prev (acabas de abrir o reconectar) no suena nada.
export function gather({ role = "all", prev = null, st, seat = -1, seats = [], err = "", plan = null, fxOn = false } = {}) {
  const snap = makeSnap({ st, seats, err, plan, fxOn, prev });
  if (!prev || !st) return { cues: [], snap };
  const cues = [];
  if (st.seq !== prev.seq) {
    const pub = st.seq === 0 && !(st.last && st.last.kind)
      ? startCues(st)
      : st.last && st.last.kind === "roll"
        ? rollCues(st.last, st.spaces)
        : actionCues(st.last, prev.tiles);
    for (const c of pub) cues.push({ ...c, audience: "public" });
  }
  if (plan && !fxOn && prev.reveal !== plan.key) {
    // Si la tirada que cierra la etapa todavía no tuvo animación, los pagos esperan a que terminen los pasitos
    const shift = st.seq !== prev.seq && st.last && st.last.kind === "roll" ? showMs(st.last) : 0;
    for (const c of revealCues(st, plan)) cues.push({ ...c, at: (c.at || 0) + shift, audience: "public" });
  }
  if (snap.seats.join("|") !== (prev.seats || []).join("|")) {
    for (const c of seatCues(prev.seats, snap.seats)) cues.push({ ...c, audience: "public" });
  }
  const myGo = st.phase === "play" && turnIs(st.turn, seat);
  const wasGo = prev.phase === "play" && turnIs(prev.turn, seat);
  if (myGo && !wasGo) {
    const wait = role === "all" && st.last && st.last.kind === "roll" && st.seq !== prev.seq ? showMs(st.last) : 0;
    cues.push({ key: "te-toca", at: wait, audience: "local" });
  }
  if (snap.botTurn && !prev.botTurn) {
    const wait = st.last && st.last.kind === "roll" && st.seq !== prev.seq ? showMs(st.last) : 0;
    cues.push({ key: "turno-compu", at: wait, audience: "public" });
  }
  if (err && err !== prev.err) cues.push({ key: "error", at: 0, audience: "local" });
  return { cues: cues.filter((c) => hears(role, c.audience)), snap };
}

function turnIs(turn, seat) {
  return seat >= 0 && turn === seat;
}
