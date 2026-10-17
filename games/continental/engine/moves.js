// Jugadas del Continental. Puro: apply(estado, asiento, acción, { rnd }) → estado nuevo, o truena con el motivo.
//
// El turno: robar (del mazo o el descarte de arriba), luego bajarse / acomodar / cambiar comodines, y descartar.
//   { type: "draw" }                          robar del mazo
//   { type: "take" }                          tomar el descarte de arriba
//   { type: "down", groups: [[cartas], …] }   bajarse con el contrato de la ronda (todo junto)
//   { type: "add", meld, cards, end? }        acomodar cartas en un juego de la mesa (ya bajado)
//   { type: "swap", meld, card, wild }        poner una carta natural en lugar de un comodín y llevarse el comodín
//   { type: "discard", card }                 descartar; termina el turno
// Fuera de turno, mientras quien sigue no ha robado:
//   { type: "buy" }    pedir el descarte de arriba (si la mesa permite comprar)
//   { type: "pass" }   no lo quiero (solo para que la compu no vuelva a decidir)
// Si quien tiene el turno toma el descarte, nadie lo compra. Si roba del mazo, se lo lleva el primero que lo pidió en
// el orden de la mesa, con una carta del mazo de castigo. Quien ya se bajó no compra.
import { RULES, contractOf, buyLimit } from "./config.js";
import { cardName, removeCards, shuffle, isWild, handPoints } from "./cards.js";
import { arrange, addTo, fitsOf, swapIn, swappable } from "./melds.js";
import { nextSeat, nameOf, pushLog } from "./table.js";

export const topOf = (h) => (h.discard.length ? h.discard[h.discard.length - 1] : null);
const clone = (x) => JSON.parse(JSON.stringify(x));
const fail = (msg) => { throw new Error(msg); };

// Cartas que todavía se pueden robar (el mazo y el pozo menos la de arriba, que se revuelve si hace falta)
const available = (h) => h.stock.length + Math.max(0, h.discard.length - 1);

// ¿Puede ese asiento comprar ahora el descarte de arriba?
export function canBuy(st, seat) {
  const h = st.hand;
  if (st.status !== "playing" || !h || h.phase !== "draw" || !h.offer || !topOf(h)) return false;
  if (seat === h.turn || seat === h.discardFrom || h.down[seat]) return false;
  if (h.buys[seat] >= buyLimit(st.config)) return false;
  if (h.offer.answered.includes(seat)) return false;
  return available(h) >= 2; // una para quien roba y otra de castigo
}

// Quienes todavía pueden pedir el descarte, en el orden de la mesa desde quien tiene el turno
export function buyers(st) {
  const out = [], n = st.config.n, h = st.hand;
  if (!h) return out;
  for (let k = 1; k < n; k++) { const s = (h.turn + k) % n; if (canBuy(st, s)) out.push(s); }
  return out;
}

// Quien se lleva el descarte si quien tiene el turno roba del mazo: el primero que lo pidió en el orden de la mesa
export function buyWinner(st) {
  const h = st.hand, n = st.config.n;
  if (!h.offer || !h.offer.requests.length) return null;
  return h.offer.requests.slice().sort((a, b) => ((a - h.turn + n) % n) - ((b - h.turn + n) % n))[0];
}

// Roba una carta del mazo; si se acabó, revuelve el pozo (menos la de arriba). null si ya no hay nada.
function drawStock(st, rnd) {
  const h = st.hand;
  if (!h.stock.length) {
    const rest = h.discard.slice(0, -1);
    if (!rest.length) return null;
    h.stock = shuffle(rest, rnd || (() => 0));
    h.discard = h.discard.slice(-1);
    st.log = pushLog(st.log, "Se acabó el mazo: se revolvió el pozo.");
  }
  return h.stock.pop();
}

// Revisa una bajada: los grupos cumplen el contrato de la ronda y todas las cartas están en la mano
export function checkDown(st, seat, groups) {
  const h = st.hand, k = contractOf(h.round);
  if (!Array.isArray(groups) || groups.length !== k.sets + k.runs) return `Para bajarte necesitas ${describe(k)}.`;
  const all = groups.flat();
  if (new Set(all).size !== all.length) return "Una carta está en dos juegos.";
  if (all.some((c) => !h.hands[seat].includes(c))) return "No tienes esa carta.";
  const melds = [];
  for (const g of groups) {
    const m = arrange(g);
    if (m.error) return m.error;
    melds.push(m);
  }
  const sets = melds.filter((m) => m.type === "set").length, runs = melds.length - sets;
  if (sets !== k.sets || runs !== k.runs) return `Esta ronda pide ${describe(k)}.`;
  return null;
}
const describe = (k) => [k.sets ? `${k.sets} tercia${k.sets === 1 ? "" : "s"}` : "", k.runs ? `${k.runs} escalera${k.runs === 1 ? "" : "s"}` : ""].filter(Boolean).join(" y ");

// Acomoda varias cartas en un juego, en el orden que quepan. Regresa el juego nuevo o el error.
export function addAll(m, cards, end) {
  let meld = m, left = cards.slice();
  if (left.length === 1) { const r = addTo(meld, left[0], end); return r.error ? r : { meld: r.meld }; }
  // Primero las naturales (de la que esté más cerca de la punta), luego los comodines
  while (left.length) {
    const i = left.findIndex((c) => !isWild(c) && fitsOf(meld, c).length);
    const j = i >= 0 ? i : left.findIndex((c) => fitsOf(meld, c).length);
    if (j < 0) return { error: "No todas esas cartas van en ese juego." };
    meld = addTo(meld, left[j]).meld;
    left.splice(j, 1);
  }
  return { meld };
}

// Revisa una jugada sin aplicarla. Regresa null si se vale, o el motivo.
export function check(st, seat, action) {
  try { apply(st, seat, action, {}); return null; } catch (e) { return e.message; }
}

export function apply(st0, seat, action, env = {}) {
  if (st0.status !== "playing" || !st0.hand) fail("No hay ronda en juego.");
  const type = action && action.type;
  if (type === "buy" || type === "pass") {
    if (!canBuy(st0, seat)) fail(st0.hand.phase === "draw" && st0.hand.down[seat] ? "Ya te bajaste: no puedes comprar." : "No puedes comprar ahora.");
    const st = clone(st0), h = st.hand;
    h.offer.answered.push(seat);
    if (type === "buy") { h.offer.requests.push(seat); st.log = pushLog(st.log, `${nameOf(st, seat)} quiere comprar ${cardName(topOf(h))}.`); }
    return st;
  }
  if (seat !== st0.hand.turn) fail("No es tu turno.");
  const st = clone(st0), h = st.hand, hand = () => h.hands[seat];

  switch (type) {
    case "draw": {
      if (h.phase !== "draw") fail("Ya robaste.");
      const c = drawStock(st, env.rnd);
      if (!c) return endRound(st, null);
      h.hands[seat].push(c);
      h.lastDraw = { seat, from: "stock", cards: [c] };
      h.lastBuy = null;
      const buyer = buyWinner(st);
      if (buyer !== null) {
        const card = h.discard.pop(), penalty = drawStock(st, env.rnd);
        h.hands[buyer].push(card);
        if (penalty) h.hands[buyer].push(penalty);
        h.buys[buyer]++;
        h.lastBuy = { seat: buyer, card, penalty };
        st.log = pushLog(st.log, `${nameOf(st, seat)} robó del mazo. ${nameOf(st, buyer)} compró ${cardName(card)}${penalty ? " (más una de castigo)" : ""}.`);
      } else {
        st.log = pushLog(st.log, `${nameOf(st, seat)} robó del mazo.`);
      }
      h.offer = null;
      h.phase = "play";
      return st;
    }
    case "take": {
      if (h.phase !== "draw") fail("Ya robaste.");
      const c = topOf(h); if (!c) fail("El pozo está vacío.");
      h.discard.pop();
      h.hands[seat].push(c);
      h.lastDraw = { seat, from: "discard", cards: [c] };
      h.lastBuy = null;
      h.offer = null;
      h.phase = "play";
      st.log = pushLog(st.log, `${nameOf(st, seat)} tomó ${cardName(c)} del pozo.`);
      return st;
    }
    case "down": {
      if (h.phase !== "play") fail("Primero roba.");
      if (h.down[seat]) fail("Ya te bajaste.");
      const err = checkDown(st, seat, action.groups); if (err) fail(err);
      for (const g of action.groups) {
        const m = arrange(g);
        h.melds.push({ id: h.nextId++, owner: seat, ...m });
      }
      h.hands[seat] = removeCards(hand(), action.groups.flat());
      h.down[seat] = true;
      st.log = pushLog(st.log, `${nameOf(st, seat)} se bajó.`);
      return hand().length ? st : endRound(st, seat);
    }
    case "add": {
      if (h.phase !== "play") fail("Primero roba.");
      if (!h.down[seat]) fail("Para acomodar cartas primero bájate.");
      const i = h.melds.findIndex((m) => m.id === action.meld); if (i < 0) fail("Ese juego no existe.");
      const cards = Array.isArray(action.cards) ? action.cards : [];
      if (!cards.length) fail("Escoge las cartas que quieres acomodar.");
      if (new Set(cards).size !== cards.length) fail("Una carta repetida.");
      h.hands[seat] = removeCards(hand(), cards);
      const r = addAll(h.melds[i], cards, action.end); if (r.error) fail(r.error);
      h.melds[i] = r.meld;
      st.log = pushLog(st.log, `${nameOf(st, seat)} acomodó ${cards.map(cardName).join(" ")}.`);
      return hand().length ? st : endRound(st, seat);
    }
    case "swap": {
      if (h.phase !== "play") fail("Primero roba.");
      if (!h.down[seat]) fail("Para cambiar un comodín primero bájate.");
      const i = h.melds.findIndex((m) => m.id === action.meld); if (i < 0) fail("Ese juego no existe.");
      if (!hand().includes(action.card)) fail("No tienes esa carta.");
      const r = swapIn(h.melds[i], action.card, action.wild); if (r.error) fail(r.error);
      h.melds[i] = r.meld;
      h.hands[seat] = [...removeCards(hand(), [action.card]), r.wild];
      st.log = pushLog(st.log, `${nameOf(st, seat)} cambió ${cardName(r.wild)} por ${cardName(action.card)}.`);
      return st;
    }
    case "discard": {
      if (h.phase !== "play") fail("Primero roba.");
      if (!hand().includes(action.card)) fail("No tienes esa carta.");
      h.hands[seat] = removeCards(hand(), [action.card]);
      h.discard.push(action.card);
      h.discardFrom = seat;
      st.log = pushLog(st.log, `${nameOf(st, seat)} descartó ${cardName(action.card)}.`);
      if (!hand().length) return endRound(st, seat);
      h.turn = nextSeat(st, seat);
      h.phase = "draw";
      h.turns++;
      h.offer = { requests: [], answered: [] };
      return st;
    }
    default:
      return fail("Jugada desconocida.");
  }
}

// Termina la ronda: cada quien suma lo que le quedó en la mano (quien cerró, 0). winner = null si se acabaron las
// cartas sin que nadie cerrara.
export function endRound(st, winner) {
  const h = st.hand;
  const pts = h.hands.map((cards, s) => (s === winner ? 0 : handPoints(cards)));
  st.scores = st.scores.map((v, s) => v + pts[s]);
  st.rounds = [...st.rounds, { round: h.round, pts, winner }];
  st.result = { round: h.round, winner, pts, hands: h.hands.map((x) => x.slice()) };
  h.offer = null;
  st.status = h.round >= RULES.rounds ? "gameover" : "roundover";
  st.log = pushLog(st.log, winner === null ? `Se acabaron las cartas en la ronda ${h.round}.` : `${nameOf(st, winner)} cerró la ronda ${h.round}.`);
  return st;
}

// Las jugadas posibles de un asiento. La bajada no se enumera (hay demasiadas maneras de agrupar); la interfaz y la
// compu la arman con checkDown.
export function legalActions(st, seat) {
  if (st.status !== "playing") return [];
  const h = st.hand;
  if (seat !== h.turn) return canBuy(st, seat) ? [{ type: "buy" }, { type: "pass" }] : [];
  if (h.phase === "draw") return [{ type: "draw" }, ...(topOf(h) ? [{ type: "take" }] : [])];
  const out = [], mine = h.hands[seat];
  if (h.down[seat]) {
    for (const m of h.melds) for (const c of mine) {
      for (const end of fitsOf(m, c)) out.push({ type: "add", meld: m.id, cards: [c], ...(end === "set" ? {} : { end }) });
      for (const w of swappable(m, c)) out.push({ type: "swap", meld: m.id, card: c, wild: w });
    }
  }
  for (const c of mine) out.push({ type: "discard", card: c });
  return out;
}
