// La fiesta del ganador: qué evento la dispara y qué sonido hace cada perro.
// Puro: no toca el DOM ni suena nada. La interfaz está en ui/party.js.
//
// Sale una sola vez, cuando un perro llega a la meta y se acaba la carrera (fase «over»), no al cerrar cada etapa.
// Festeja solo el ganador: su WebP, su sombra y sus sonidos. Los pagos de la hoja final esperan a que termine.
//
// Este archivo es el único lugar del mapeo perro → sonido. Petra (la artista) todavía no manda los clips
// originales; cuando lleguen, se cambian las llaves de aquí y nada más.
//
// Hoy no hay aullido ni cola como gesto principal, así que aullido-festejo no se usa. brinco.mp3 salió casi en
// silencio (máximo −27 dB), y el brinco que sí se oye es caer-hueso. El audio sacado de los videos de IA no se usa:
// es música o ruido, no un ladrido limpio.
import { DOGS } from "../engine/index.js";

// Cuánto dura la fiesta en pantalla (la pieza de festejo dura ~7 s).
export const PARTY_MS = 7200;
// A qué fracción del volumen baja la música de fondo mientras suena la pieza.
export const MUSIC_DUCK = 0.22;

// Colores de papel picado.
export const PAPEL = ["#e4007c", "#ff6b1a", "#ffd100", "#00a651", "#7b2d8e", "#1c6dd0"];
// Partículas: la tele y la mesa completa, el teléfono de una mesa con tele, y prefers-reduced-motion.
export const CONFETTI = { full: 70, mini: 24, reduced: 12 };

// Clips que están en el catálogo pero la fiesta no usa, y por qué.
export const PARKED_CLIPS = {
  "aullido-festejo": "Ningún perro aúlla como gesto principal.",
  brinco: "El mp3 salió casi en silencio (máximo −27 dB). Los brincos usan caer-hueso.",
};

// Qué archivo de Petra corresponde a cada gesto, y cuánto dura. Los tiempos de los sonidos caben ahí.
export const MOVES = {
  oreo: {
    festejo: {
      file: "festejo-oreo.webp", shadow: "festejo-oreo-sombra.webp", ms: 5040,
      move: "Levanta una pata trasera como si hiciera pipí y la mantiene de 1 a 3 s, con cara orgullosa.",
    },
  },
  chia: {
    festejo: {
      file: "festejo-chia.webp", shadow: "festejo-chia-sombra.webp", ms: 5040,
      move: "Se acuesta boca arriba y saca la lengua.",
    },
  },
  gustavo: {
    festejo: {
      file: "festejo-gustavo.webp", shadow: "festejo-gustavo-sombra.webp", ms: 5040,
      move: "Pone cara de bravo y sacude la cabeza todo el tiempo.",
    },
  },
  chocolate: {
    festejo: {
      file: "festejo-chocolate.webp", shadow: "festejo-chocolate-sombra.webp", ms: 5040,
      move: "Aplaude parado en dos patas y le rebota la panza.",
    },
  },
  catrina: {
    festejo: {
      file: "festejo-catrina.webp", shadow: "festejo-catrina-sombra.webp", ms: 4830,
      move: "Brinca moviendo las patas delanteras.",
    },
  },
};

// Sonidos amarrados al gesto, en milisegundos desde que arranca ESA animación. No son temporizadores sueltos:
// la interfaz los programa cuando empieza la fiesta, que es cuando empiezan las WebP.
export const DOG_SOUNDS = {
  oreo: {
    cues: [{ at: 1000, key: "ladrido-oreo" }],
  },
  chia: {
    cues: [{ at: 480, key: "ladrido-chia" }, { at: 1750, key: "grunido-feliz" }],
  },
  gustavo: {
    cues: [
      { at: 220, key: "ladrido-gustavo" },
      { at: 2300, key: "ladrido-gustavo" },
      { at: 4300, key: "ladrido-gustavo" },
    ],
  },
  chocolate: {
    // apilar es el boing blandito de la panza. caer-hueso no: ese es el salto de Catrina.
    cues: [
      { at: 1400, key: "ladrido-chocolate" },
      { at: 2100, key: "apilar" },
      { at: 3400, key: "apilar" },
    ],
  },
  catrina: {
    // Ladrido doble y brinco en cada salto. El brinco audible es caer-hueso (brinco.mp3 no se oye).
    cues: [
      { at: 400, key: "ladrido-doble" },
      { at: 400, key: "caer-hueso" },
      { at: 2000, key: "ladrido-doble" },
      { at: 2000, key: "caer-hueso" },
      { at: 3600, key: "ladrido-doble" },
      { at: 3600, key: "caer-hueso" },
    ],
  },
};

const PAIR_MS = 40;
const GAP_MS = 200;

// Separa los ataques para que varios perros a la vez no suenen todos en el mismo instante.
// Dos llaves con la misma marca (el ladrido y el brinco de un salto) se quedan juntas. Un tercero se descarta.
export function packSounds(cues) {
  const items = (cues || []).map((c) => ({ key: c.key, at: c.at }));
  items.sort((a, b) => a.at - b.at || String(a.key).localeCompare(String(b.key)));
  const groups = [];
  for (const c of items) {
    const g = groups[groups.length - 1];
    if (g && c.at - g.at <= PAIR_MS) g.items.push(c);
    else groups.push({ at: c.at, items: [c] });
  }
  let prev = -1000;
  const out = [];
  for (const g of groups) {
    let at = g.at;
    if (at - prev < GAP_MS) at = prev + GAP_MS;
    for (const c of g.items.slice(0, 2)) out.push({ key: c.key, at });
    prev = at;
  }
  return out;
}

const shoutName = (dog) => (DOGS[dog].id === "catrina" ? "LA CATRINA" : DOGS[dog].name.toUpperCase());

export function winnerShout(dog) {
  return `¡¡GANÓ ${shoutName(dog)}!!`;
}

function dogShow(index) {
  const id = DOGS[index].id;
  const meta = MOVES[id].festejo;
  return { dog: index, id, name: DOGS[index].name, anim: "festejo", file: meta.file, shadow: meta.shadow, ms: meta.ms };
}

// Los sonidos de esta fiesta: el confeti, el letrero y el gesto del ganador.
export function celebrationSounds(party) {
  const cues = [{ key: "confeti", at: 0 }, { key: "nombre-entra", at: 380 }];
  for (const dog of party.dogs) {
    for (const c of DOG_SOUNDS[dog.id].cues) cues.push({ key: c.key, at: c.at });
  }
  return packSounds(cues);
}

// La fiesta que corresponde a este estado, o null si la carrera no se ha acabado.
export function partyFrom(st, key) {
  if (!st || st.phase !== "over") return null;
  const rank = st.final && st.final.rank;
  if (!rank || !rank.length || !DOGS[rank[0]]) return null;
  const winner = rank[0];
  const party = {
    kind: "winner",
    key: key || "over",
    phase: st.phase,
    winner,
    winnerId: DOGS[winner].id,
    shout: winnerShout(winner),
    dogs: [dogShow(winner)],
    ms: PARTY_MS,
  };
  party.cues = celebrationSounds(party);
  return party;
}

// El mismo portón que los efectos de fin de carrera (sfx/cues.js): solo cuando el plan de revelar cambia, no mientras
// corre la tirada, y nunca sin foto anterior (abrir o reconectar). Mientras dura la fiesta, prev.reveal se queda como
// estaba (los pagos esperan), así que prev.party marca que esta fiesta ya salió y no se repite al redibujar.
export function takeParty({ prev = null, st = null, plan = null, fxOn = false } = {}) {
  if (!prev || !st || !plan || fxOn) return null;
  if (prev.reveal === plan.key || prev.party === plan.key) return null;
  return partyFrom(st, plan.key);
}

// La tele y la mesa sin tele oyen la fiesta. El teléfono de una mesa con tele, no: la tele ya la está sonando.
export function partyHears(role) {
  return role === "board" || role === "all";
}

export function partySize(role) {
  return partyHears(role) ? "full" : "mini";
}
