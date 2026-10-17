// Llamadas de voz y video en una mesa en línea (WebRTC, todos con todos), para cualquier juego. De La Pata (myPata).
// El módulo no habla con Firestore ni con la red: la señalización (platform/services/call-signaling.js) y el entorno
// del navegador (RTCPeerConnection, getUserMedia, servidores ICE) entran como parámetros. La interfaz está en ui.js.
export { createCallSession, STUN, VIDEO_MAX_BITRATE, AUDIO_CONSTRAINTS, VIDEO_CONSTRAINTS } from "./session.js";
export { createCallController, RING_MS, CALL_VIEWS } from "./controller.js";
export { NOTES, NOTE_MS, GAP_MS, MIN_LAG_MS, MAX_LAG_MS, chimeFor, toneSnr, detectChime, silencedPeers, LISTEN_MS } from "./near.js";
export { nextFeatured, TALK_MS, HOLD_MS } from "./layout.js";
