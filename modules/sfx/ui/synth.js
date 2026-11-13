// Sonido sintetizado al momento con Web Audio, para efectos que no son archivos (salió del Láser y ahora lo usa
// también Yatzi). Respeta el silencio y el volumen del reproductor de efectos (createSfx): si está callado, nada suena.
//
// Lo que da: el contexto (se crea y reanuda con el primer toque), una salida con compresor y, si se pide, una
// reverberación, y piezas para armar sonidos: out (destino con envío a la reverberación), env (envolvente), osc,
// noise y filt. Cada juego arma sus efectos con estas piezas.
export function createSynth(sfx, { reverb = null, threshold = -14, ratio = 4, doc = globalThis.document } = {}) {
  let ac = null, master = null, verb = null, noiseBuf = null;

  function ensure() {
    if (ac) return ac;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = threshold; comp.ratio.value = ratio;
      master = ac.createGain();
      master.connect(comp); comp.connect(ac.destination);
      if (reverb) {
        // Un impulso de ruido que decae: { secs, decay, wet }
        verb = ac.createConvolver();
        const len = Math.floor(ac.sampleRate * (reverb.secs || 1.5)), ir = ac.createBuffer(2, len, ac.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, reverb.decay || 3); }
        verb.buffer = ir;
        const wet = ac.createGain(); wet.gain.value = reverb.wet ?? 0.3;
        verb.connect(wet); wet.connect(master);
      }
    } catch { ac = null; }
    return ac;
  }
  const onFirst = () => { const a = ensure(); if (a && a.state === "suspended") a.resume().catch(() => {}); };
  if (doc) { doc.addEventListener("pointerdown", onFirst, true); doc.addEventListener("keydown", onFirst, true); }

  const api = {
    get ac() { return ac; },
    // Si ahora puede sonar algo (efectos encendidos y el audio ya desbloqueado)
    on: () => !sfx.muted && sfx.volume > 0 && !!ensure() && ac.state === "running",
    vol: () => sfx.volume,
    now: () => (ac ? ac.currentTime : 0),
    // Un destino que va al master y, con `send`, un poco a la reverberación
    out(send = 0) {
      const gn = ac.createGain();
      gn.gain.value = 0;
      gn.connect(master);
      if (send && verb) { const s = ac.createGain(); s.gain.value = send; gn.connect(s); s.connect(verb); }
      return gn;
    },
    // Ataque `a` y caída `d` (segundos) hasta `peak` × volumen
    env(gn, t, peak, a, d) {
      gn.gain.cancelScheduledValues(t);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sfx.volume), t + a);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    },
    osc(type, f, t, dur, dest, f2) {
      const o = ac.createOscillator();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
      return o;
    },
    noise(t, dur, dest) {
      if (!noiseBuf) {
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const s = ac.createBufferSource(); s.buffer = noiseBuf; s.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
      return s;
    },
    filt(type, f, q = 1) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; },
    destroy() {
      if (doc) { doc.removeEventListener("pointerdown", onFirst, true); doc.removeEventListener("keydown", onFirst, true); }
      if (ac) ac.close().catch(() => {});
      ac = null; master = null; verb = null; noiseBuf = null;
    },
  };
  return api;
}
