// La llamada de voz y video de la mesa abierta: quién está, si suena, micrófono, cámara, por dónde sale el sonido,
// la vista y los teléfonos que están juntos. De La Pata (myPata, app/call.js), sin el store de la app: el estado vive
// en controller.state y cada cambio se avisa con onChange().
//
// Al abrir una mesa en línea se llama a watch(code) para escuchar quién está en su llamada (para mostrar
// "Fulano está en la llamada · Entrar" y hacer sonar el teléfono); al salir de la mesa, stop() cuelga y deja de
// escuchar. La conexión en sí está en session.js.
import { silencedPeers } from "./near.js";

export const RING_MS = 30 * 1000; // cuánto suena cuando alguien empieza una llamada

// Vistas durante la llamada: solo el juego, el juego con los videos chiquitos, o solo los videos
export const CALL_VIEWS = ["game", "mini", "videos"];
// Preferencias de este teléfono: por dónde sale el audio, si los controles están colapsados y la vista
const callPrefs = (prefs) => ({
  output: prefs.get("callOut") === "earpiece" ? "earpiece" : "speaker",
  collapsed: prefs.get("callMin") === "1",
  view: CALL_VIEWS.includes(prefs.get("callView")) ? prefs.get("callView") : "mini",
});
// deaf: el sonido de la llamada apagado en este teléfono (no se recuerda: cada llamada empieza con sonido)
// near: a quién no se reproduce aquí por estar junto a ti (detectado por ti o por ellos); nearNote: aviso al detectar
const blankCall = (prefs) => ({ code: null, status: "off", audio: true, video: false, err: "", peers: [], ringing: false, deaf: false,
  near: [], nearNote: "", ...callPrefs(prefs) });

// makeSession(code) → una sesión de session.js ya conectada a la llamada de esa mesa
// me() → { id, name } de quien usa este teléfono; prefs: { get, set } de este teléfono; onChange(): avisar a la interfaz
export function createCallController({ makeSession, me, prefs, onChange: notifyUi = () => {} }) {
  const state = blankCall(prefs);

  let session = null, prevOthers = 0, ringTimer = null;
  const notify = () => notifyUi();
  const detected = new Set(), overrides = new Set(); // junto a ti: los que detectaste, y los que pediste volver a oír
  let noteTimer = null;

  function stopRing() { clearTimeout(ringTimer); ringTimer = null; state.ringing = false; }

  function onChange() {
    if (!session) return;
    const s = session.state, others = session.others();
    const c = state;
    // Suena cuando alguien empieza la llamada (de nadie a alguien) y tú no estás. Si ya había llamada al abrir la
    // mesa, solo se muestra el aviso, sin sonar.
    if (s.status === "off" && s.loaded && others.length && !prevOthers && c.loadedOnce) {
      c.ringing = true;
      clearTimeout(ringTimer);
      ringTimer = setTimeout(() => { stopRing(); notify(); }, RING_MS);
      ringTimer.unref?.();
    }
    if (!others.length || s.status !== "off") stopRing();
    if (s.loaded) { prevOthers = others.length; c.loadedOnce = true; }
    if (s.status === "off") { c.deaf = false; detected.clear(); overrides.clear(); }
    const before = new Set(c.near);
    const near = s.status === "on" ? [...silencedPeers(me().id, detected, others, overrides)] : [];
    const fresh = near.filter((id) => !before.has(id));
    if (fresh.length) {
      const who = others.filter((p) => fresh.includes(p.id)).map((p) => p.name || "Alguien").join(" y ");
      c.nearNote = `${who} ${fresh.length > 1 ? "están" : "está"} junto a ti: no se reproduce aquí para evitar eco.`;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { state.nearNote = ""; notify(); }, 8000);
      noteTimer.unref?.();
    }
    if (!near.length) c.nearNote = "";
    Object.assign(c, { status: s.status, audio: s.audio, video: s.video, err: s.err, peers: others, near });
    notify();
  }

  // Empieza a escuchar la llamada de una mesa en línea
  function watch(code) {
    stop();
    if (!code) return;
    Object.assign(state, blankCall(prefs), { code, loadedOnce: false });
    prevOthers = 0;
    session = makeSession(code, onChange);
    session.watch();
  }

  // Cuelga y deja de escuchar (al salir de la mesa)
  function stop() {
    stopRing();
    detected.clear(); overrides.clear(); clearTimeout(noteTimer);
    const old = session; session = null;
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, blankCall(prefs));
    notify();
    if (old) return old.dispose();
    return Promise.resolve();
  }

  function join(video = false) { stopRing(); return session ? session.join({ video }) : Promise.resolve(false); }
  function hangup() { return session ? session.hangup() : Promise.resolve(); }
  function toggleMute() { if (session) session.setMuted(session.state.audio); }
  function toggleVideo() { return session ? session.setVideo(!session.state.video) : Promise.resolve(); }
  function dismissRing() { stopRing(); notify(); }
  function setOutput(mode) { state.output = mode === "earpiece" ? "earpiece" : "speaker"; prefs.set("callOut", state.output); notify(); }
  function setDeaf(on) { state.deaf = !!on; notify(); }
  // Pasa a la siguiente vista: juego → juego con videos → videos → juego
  function nextView() {
    const v = CALL_VIEWS[(CALL_VIEWS.indexOf(state.view) + 1) % CALL_VIEWS.length];
    state.view = v; prefs.set("callView", v); notify();
  }
  function setCollapsed(on) { state.collapsed = !!on; prefs.set("callMin", on ? "1" : "0"); notify(); }
  // Resultado de una prueba de cercanía (la melodía): se suman los que se oyeron; nadie se quita aquí
  function reportNear(ids) {
    if (!session || session.state.status !== "on") return;
    for (const id of ids) if (!overrides.has(id)) detected.add(id);
    session.setNear([...detected]);
    onChange();
  }
  // "Oír de todos modos": deja de silenciar a alguien (por si se equivocó, o ya no están juntos)
  function hearAnyway(id) {
    overrides.add(id); detected.delete(id);
    if (session) session.setNear([...detected]);
    onChange();
  }
  function dismissNearNote() { clearTimeout(noteTimer); state.nearNote = ""; notify(); }
  const streamOf = (id) => (session ? session.streamOf(id) : null);
  const localStream = () => (session ? session.state.local : null);
  const isConnected = (id) => !!(session && session.connected(id));

  return {
    state, watch, stop, join, hangup, toggleMute, toggleVideo, dismissRing, setOutput, setDeaf, nextView, setCollapsed,
    reportNear, hearAnyway, dismissNearNote, streamOf, localStream, isConnected, me,
  };
}
