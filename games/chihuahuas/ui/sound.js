// Engancha los efectos con lo que acaba de pasar. syncSounds se llama en cada dibujo, pero gather() solo devuelve
// sonidos cuando hay un evento nuevo (jugada, turno, error, asiento, pagos): redibujar o reconectar no repite.
import { gather, soundRole } from "../sfx/cues.js";
import { takeParty } from "../sfx/celebrate.js";

// ¿La fiesta de este plan sigue en pantalla? Entonces la hoja de pagos todavía no se abre.
export function partyOn(ui, plan) {
  return !!(ui && ui.party && plan && ui.party.key === plan.key);
}

export function syncSounds(ui, ctx, { fxOn = false, plan = null } = {}) {
  if (!ui) return null;
  const tvOn = !!(ctx.table && ctx.table.config && ctx.table.config.tv);
  ui.soundRole = soundRole(ctx.display || "full", tvOn);
  ui.modal = ctx.modal || null;
  const sfx = ui.sfx;
  if (!sfx || !ctx.view) return null;
  const prev = ui.soundSnap || null;
  // La fiesta usa el mismo portón que estos efectos: la foto de antes, no el redibujado. Mientras está en pantalla
  // (la que sale ahora o una que sigue), los pagos esperan.
  const party = takeParty({ prev, st: ctx.view, plan, fxOn: !!fxOn });
  const hold = !!party || partyOn(ui, plan);
  const { cues, snap } = gather({
    role: ui.soundRole,
    prev,
    st: ctx.view,
    seat: ctx.seat,
    seats: (ctx.table && ctx.table.seats) || [],
    err: ctx.err || "",
    plan,
    fxOn: !!fxOn,
    hold,
  });
  if (party) snap.party = party.key;
  const seqChanged = !!(prev && ctx.view && ctx.view.seq !== prev.seq);
  ui.soundSnap = snap;
  if (seqChanged) sfx.cancel();
  if (cues.length) sfx.playAll(cues);
  return party;
}

// Clic de un botón de la mesa. En la tele no (ahí no se juega). En la mesa sin tele, la jugada en sí ya suena
// (el tazón, el boleto…): el clic solo acompaña a los botones que no tienen efecto propio, y en el teléfono de
// una mesa con tele, donde lo público lo pone la tele.
export function playPress(ui, { action = false } = {}) {
  if (!ui || !ui.sfx || ui.soundRole === "board") return;
  if (action && ui.soundRole === "all") return;
  ui.sfx.play("boton");
}
