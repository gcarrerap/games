// Quién se ve en grande en la vista "solo videos", como en WhatsApp: con una persona, ella en grande y tú en un
// cuadrito; con varias, la que está hablando. Puro (el tiempo entra como `now`), para probarlo sin navegador.
//
// Para que la imagen no brinque con cada tos o "ajá": alguien pasa a grande cuando lleva TALK_MS hablando sin parar,
// y quien está en grande se queda al menos HOLD_MS. Mientras el de grande habla, nadie lo quita. Tú nunca vas en
// grande si hay alguien más (tu cuadrito flota en una esquina).

export const TALK_MS = 400;
export const HOLD_MS = 2000;

// prev: lo que devolvió la llamada anterior (o null). peers: ids de los demás en la llamada, en orden.
// talking: { id: true } de quién suena ahora. Devuelve { id, at, cand, candAt }: id es quien va en grande (null si
// estás solo), at desde cuándo, y cand/candAt quién está hablando para tomar su lugar y desde cuándo.
export function nextFeatured(prev, { peers, talking = {}, now, talkMs = TALK_MS, holdMs = HOLD_MS }) {
  if (!peers.length) return { id: null, at: now, cand: null, candAt: now };
  const cur = prev && peers.includes(prev.id) ? prev : { id: peers[0], at: now, cand: null, candAt: now };
  if (peers.length === 1 || talking[cur.id]) return { id: cur.id, at: cur.at, cand: null, candAt: now };
  // Sigue hablando quien ya estaba en espera; si no, el primero que suene
  const cand = cur.cand && talking[cur.cand] && peers.includes(cur.cand) ? cur.cand : peers.find((id) => talking[id]) || null;
  const candAt = cand && cand === cur.cand ? cur.candAt : now;
  if (cand && now - candAt >= talkMs && now - cur.at >= holdMs) return { id: cand, at: now, cand: null, candAt: now };
  return { id: cur.id, at: cur.at, cand, candAt };
}
