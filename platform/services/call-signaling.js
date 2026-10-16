// Señalización de las llamadas de voz y video (WebRTC) en Firestore (de La Pata, myPata services/call-signaling.js).
// Es lo único de las llamadas que toca Firestore; modules/call la recibe ya conectada a la llamada de una mesa.
//
// Cada mesa tiene su llamada en "juegos-llamadas/{código}", aparte de la mesa: así las señales nunca chocan con las
// transacciones de las jugadas. Dentro hay dos subcolecciones:
//   peers/{id}     quién está en la llamada: { id, name, sid, audio, video, near, seen }
//   signals/{id}   mensajes de un teléfono a otro: { from, fromSid, to, toSid, type: "desc" | "ice", desc | candidate, t }
// sid identifica cada vez que alguien entra a la llamada, para descartar señales viejas de una entrada anterior.
// Quien recibe una señal la borra. Los audios y videos nunca pasan por Firestore: van directo entre teléfonos.
//
// No es "pata_llamadas" (la de myPata, que sigue en línea): dos sitios en la misma colección se cruzarían señales.

export const CALLS = "juegos-llamadas";
export const HEARTBEAT_MS = 15 * 1000; // cada cuánto avisa cada teléfono que sigue en la llamada
export const PEER_TTL_MS = 45 * 1000; // sin aviso en este tiempo, se considera que ya no está

// Ids que Firestore ordena por hora de creación (sus documentos se entregan ordenados por id): la oferta llega
// antes que sus candidatos ICE.
let counter = 0;
export function newId(now = Date.now(), rnd = Math.random) {
  counter = (counter + 1) % 1296;
  return now.toString(36).padStart(9, "0") + counter.toString(36).padStart(2, "0") + rnd().toString(36).slice(2, 7);
}

// La señalización de la llamada de una mesa, con la forma que espera modules/call (createCallSession)
export function callSignaling(fs, code, { now = () => Date.now() } = {}) {
  const base = `${CALLS}/${code}`;
  return {
    heartbeatMs: HEARTBEAT_MS,
    newId: () => newId(now()),
    // Entrar o avisar que sigues en la llamada
    putPeer: (peer) => fs.doc(`${base}/peers/${peer.id}`).set({ ...peer, seen: now() }),
    removePeer: (id) => fs.doc(`${base}/peers/${id}`).delete(),
    // Quién está (solo quienes avisaron hace poco). Devuelve cómo dejar de escuchar.
    watchPeers: (onPeers, onError) => fs.collection(`${base}/peers`).onSnapshot((snap) => {
      const t = now();
      onPeers(snap.docs.map((d) => d.data()).filter((p) => p && t - (p.seen || 0) < PEER_TTL_MS));
    }, onError),
    sendSignal: (msg) => fs.doc(`${base}/signals/${newId(now())}`).set({ ...msg, t: now() }),
    // Las señales para `to`: cada una se entrega una sola vez, en orden, y se borra. Devuelve cómo dejar de escuchar.
    watchSignals: (to, onSignal, onError) => {
      const done = new Set();
      return fs.collection(`${base}/signals`).where("to", "==", to).onSnapshot((snap) => {
        for (const d of snap.docs) {
          if (done.has(d.id)) continue;
          done.add(d.id);
          const m = d.data();
          Promise.resolve().then(() => d.ref.delete()).catch(() => {});
          if (m) onSignal(m);
        }
      }, onError);
    },
  };
}

// Servidores ICE: STUN de Google y, si hay window.TURN_URL (platform/config.js), los de TURN. El puerto 53 se quita
// porque los navegadores lo bloquean y solo hace esperar.
export const STUN = [{ urls: "stun:stun.l.google.com:19302" }];
export async function fetchIceServers(url = globalThis.TURN_URL) {
  if (!url) return STUN;
  try {
    const res = await fetch(url);
    if (!res.ok) return STUN;
    const list = (await res.json()).iceServers;
    if (!Array.isArray(list) || !list.length) return STUN;
    return list.map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) })).filter((s) => s.urls.length);
  } catch { return STUN; }
}
