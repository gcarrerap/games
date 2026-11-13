// Sonido de Vikingos. Los efectos se sintetizan al momento con Web Audio (no hay archivos que bajar): el oleaje de
// fondo, la gota al escoger una pieza, el crujido de madera y el remolino de agua al girar con su "clac" al
// encajar, el golpe sordo de una pieza trabada, la campana de un barco que llega a puerto, la ola grande al
// reiniciar y el cuerno vikingo con tambores al empezar y al ganar. La voz del narrador son mp3 (sfx/voz-*.mp3,
// hechos con Fish Audio) y suena con modules/sfx. Un solo botón (🔔) calla todo, también el oleaje.
import { createSfx, armOnGesture } from "../../../modules/sfx/ui.js";

const VOICES = ["inicio", "llega-rojo", "llega-verde", "llega-amarillo", "llega-azul", "victoria", "perfecto",
  "trabada", "sin-barco", "reiniciar", "consejo"];
const CLIPS = Object.fromEntries(VOICES.map((k) => [k, new URL(`../sfx/voz-${k}.mp3`, import.meta.url).href]));
// Las quejas no se repiten seguido; el susurro del consejo, casi nunca
const GAP = { trabada: 6000, "sin-barco": 6000, consejo: 90000 };

export const ARRIVE_VOICE = { R: "llega-rojo", G: "llega-verde", Y: "llega-amarillo", B: "llega-azul" };

export function createSound(prefs) {
  const sfx = createSfx({ clips: CLIPS, prefs, gapFor: (k) => GAP[k] ?? 800 });
  let ac = null, master = null, verb = null, sea = null;
  // Callar o cambiar el volumen también afecta al oleaje
  for (const m of ["toggle", "setMuted", "setVolume"]) {
    const orig = sfx[m].bind(sfx);
    sfx[m] = (...args) => { const r = orig(...args); syncSea(); return r; };
  }

  function ensure() {
    if (ac) return ac;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 3;
      master = ac.createGain();
      master.connect(comp); comp.connect(ac.destination);
      // Un eco de fiordo: impulso de ruido que decae
      verb = ac.createConvolver();
      const len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5); }
      verb.buffer = ir;
      const wet = ac.createGain(); wet.gain.value = 0.28;
      verb.connect(wet); wet.connect(master);
    } catch { ac = null; }
    return ac;
  }
  const unarm = armOnGesture(document, sfx);
  const onFirst = () => { const a = ensure(); if (a && a.state === "suspended") a.resume().then(syncSea, () => {}); else syncSea(); };
  document.addEventListener("pointerdown", onFirst, true);
  document.addEventListener("keydown", onFirst, true);

  const audible = () => !sfx.muted && sfx.volume > 0;
  const on = () => audible() && ensure() && ac.state === "running";
  const vol = () => sfx.volume;

  function out(send = 0.4) {
    const gn = ac.createGain();
    gn.gain.value = 0;
    gn.connect(master);
    if (send) { const s = ac.createGain(); s.gain.value = send; gn.connect(s); s.connect(verb); }
    return gn;
  }
  function env(gn, t, peak, a, d) {
    gn.gain.cancelScheduledValues(t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol()), t + a);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, dur, dest, f2) {
    const o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  let noiseBuf = null;
  function noise(t, dur, dest) {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      // Ruido café (más grave que el blanco): suena a agua
      let last = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.2 + w * 0.15; }
    }
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = dur > 2.5; s.connect(dest); s.start(t, Math.random() * 0.5);
    if (dur < Infinity) s.stop(t + dur + 0.05);
    return s;
  }
  const filt = (type, f, q = 1) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

  // Una gota que cae al agua
  function drop(t, f = 700, peak = 0.22) {
    const gn = out(0.35); env(gn, t, peak, 0.004, 0.16); osc("sine", f, t, 0.18, gn, f * 2.2);
  }
  // El "clac" de madera al encajar
  function clack(t, peak = 0.5) {
    const bp = filt("bandpass", 1900, 3), gn = out(0.25); bp.connect(gn); env(gn, t, peak, 0.001, 0.05); noise(t, 0.07, bp);
    const g2 = out(0.2); env(g2, t, peak * 0.8, 0.002, 0.12); osc("triangle", 190, t, 0.14, g2, 120);
  }
  // Cuerno vikingo: dos sierras desafinadas con filtro y vibrato
  function horn(t, f, dur, peak = 0.3) {
    const lp = filt("lowpass", 700, 1.4), gn = out(0.6); lp.connect(gn);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(peak * vol(), t + 0.18);
    gn.gain.setValueAtTime(peak * vol(), t + dur - 0.3);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(1100, t + 0.35); lp.frequency.linearRampToValueAtTime(800, t + dur);
    const a = osc("sawtooth", f * 0.97, t, dur, lp, f), b = osc("sawtooth", f * 1.006, t, dur, lp);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.2; lg.gain.value = f * 0.012;
    lfo.connect(lg); lg.connect(a.frequency); lg.connect(b.frequency); lfo.start(t + 0.3); lfo.stop(t + dur);
  }
  // Tambor de piel
  function drum(t, peak = 0.7) {
    const gn = out(0.3); env(gn, t, peak, 0.003, 0.4); osc("sine", 120, t, 0.45, gn, 48);
    const lp = filt("lowpass", 600), g2 = out(0.2); lp.connect(g2); env(g2, t, peak * 0.5, 0.002, 0.08); noise(t, 0.1, lp);
  }

  // El oleaje de fondo: ruido grave con olas lentas. Suena mientras la mesa está abierta y no hay silencio.
  function syncSea() {
    if (!ac) return;
    if (audible() && ac.state === "running") {
      if (sea) { sea.gain.gain.setTargetAtTime(0.05 * vol(), ac.currentTime, 0.4); return; }
      const lp = filt("lowpass", 520, 0.6), gain = ac.createGain();
      gain.gain.value = 0;
      lp.connect(gain); gain.connect(master);
      const src = noise(ac.currentTime, Infinity, lp);
      // Olas: el volumen y el filtro suben y bajan cada ~7 s
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.14; lg.gain.value = 0.035 * vol();
      lfo.connect(lg); lg.connect(gain.gain);
      const lf2 = ac.createOscillator(), lg2 = ac.createGain(); lf2.frequency.value = 0.09; lg2.gain.value = 260;
      lf2.connect(lg2); lg2.connect(lp.frequency);
      lfo.start(); lf2.start();
      gain.gain.setTargetAtTime(0.05 * vol(), ac.currentTime, 1.2);
      sea = { gain, src, lfo, lf2 };
    } else if (sea) {
      const s = sea; sea = null;
      try { s.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.2); [s.src, s.lfo, s.lf2].forEach((o) => o.stop(ac.currentTime + 0.8)); } catch {}
    }
  }

  const S = {
    select() { if (on()) drop(ac.currentTime, 640); },
    // Girar: crujido de madera y remolino de agua; `secs` es lo que dura la animación, al final encaja
    rotate(turns = 1, secs = 0.4) {
      if (!on()) return; const t = ac.currentTime, d = Math.max(0.25, secs);
      const bp = filt("bandpass", 400, 1.1), gn = out(0.45); bp.connect(gn);
      bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(1200 + 300 * turns, t + d * 0.7); bp.frequency.exponentialRampToValueAtTime(500, t + d);
      env(gn, t, 0.5, 0.06, d); noise(t, d + 0.1, bp);
      // Crujido: una sierra grave con tirones
      const cr = filt("bandpass", 900, 6), gc = out(0.2); cr.connect(gc);
      env(gc, t, 0.12, 0.03, d * 0.9);
      const o = osc("sawtooth", 62, t, d, cr, 48);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 17; lg.gain.value = 18;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + d);
      clack(t + d - 0.02);
      drop(t + d + 0.03, 420, 0.12);
    },
    undo(secs = 0.4) {
      if (!on()) return; const t = ac.currentTime, d = Math.max(0.25, secs);
      const bp = filt("bandpass", 1200, 1), gn = out(0.4); bp.connect(gn);
      bp.frequency.setValueAtTime(1300, t); bp.frequency.exponentialRampToValueAtTime(280, t + d);
      env(gn, t, 0.4, 0.04, d); noise(t, d + 0.1, bp);
      clack(t + d - 0.02, 0.35);
    },
    // Pieza trabada: dos golpes sordos de madera
    blocked() {
      if (!on()) return; const t = ac.currentTime;
      [0, 0.11].forEach((dt, k) => { const gn = out(0.15); env(gn, t + dt, k ? 0.28 : 0.4, 0.002, 0.12); osc("triangle", k ? 95 : 120, t + dt, 0.15, gn, 70); });
    },
    // Sin barco: una burbuja que se hunde
    empty() { if (on()) { const t = ac.currentTime, gn = out(0.4); env(gn, t, 0.18, 0.01, 0.3); osc("sine", 520, t, 0.32, gn, 180); } },
    // Un barco llega a su flecha: campana de puerto con chapoteo
    arrive(k = 0) {
      if (!on()) return; const t = ac.currentTime + 0.05 + k * 0.25;
      for (const [f, a] of [[784, 0.22], [1176, 0.14], [1568, 0.08], [2093, 0.05]]) { const gn = out(0.8); env(gn, t, a, 0.003, 1.4); osc("sine", f, t, 1.5, gn); }
      const hp = filt("highpass", 900), gn = out(0.3); hp.connect(gn); env(gn, t, 0.25, 0.01, 0.3); noise(t, 0.35, hp);
    },
    // Un barco se va de su flecha
    leave() { if (on()) { const t = ac.currentTime, gn = out(0.4); env(gn, t, 0.12, 0.01, 0.35); osc("sine", 660, t, 0.4, gn, 330); } },
    // Reiniciar: una ola grande que barre el tablero
    reset() {
      if (!on()) return; const t = ac.currentTime;
      const lp = filt("lowpass", 300, 0.7), gn = out(0.5); lp.connect(gn);
      lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(3200, t + 0.7); lp.frequency.exponentialRampToValueAtTime(400, t + 1.6);
      env(gn, t, 0.7, 0.5, 1.2); noise(t, 1.8, lp);
      sfx.play("reiniciar", 500);
    },
    // Empezar un reto: cuerno, un tambor y el narrador
    start() {
      if (!on()) return; const t = ac.currentTime;
      horn(t, 110, 1.3, 0.28); drum(t + 0.05, 0.5); drum(t + 0.6, 0.35);
      sfx.play("inicio", 900);
    },
    // Ganar: tambores, dos cuernos en quinta y el narrador
    victory(perfect = false) {
      if (!on()) return; const t = ac.currentTime;
      [0, 0.28, 0.56, 0.7, 0.84].forEach((dt, k) => drum(t + dt, k < 3 ? 0.7 : 0.5));
      horn(t + 0.9, 110, 1.8, 0.26); horn(t + 0.9, 165, 1.8, 0.2); horn(t + 1.5, 220, 1.3, 0.16);
      for (let k = 0; k < 6; k++) { const tt = t + 1 + k * 0.09, gn = out(0.7); env(gn, tt, 0.06, 0.002, 0.6); osc("sine", 1568 + k * 260, tt, 0.65, gn); }
      sfx.play(perfect ? "perfecto" : "victoria", 1700);
    },
    advice() { if (on()) { const t = ac.currentTime; [0, 0.08, 0.16].forEach((dt, k) => { const gn = out(0.8); env(gn, t + dt, 0.07, 0.003, 0.5); osc("sine", 1760 + k * 440, t + dt, 0.55, gn); }); } },
    voice(key, at = 0) { if (audible()) sfx.play(key, at); },
    sync: syncSea,
  };

  return {
    ...S,
    sfx,
    destroy() {
      unarm && unarm();
      document.removeEventListener("pointerdown", onFirst, true);
      document.removeEventListener("keydown", onFirst, true);
      sfx.destroy();
      if (ac) ac.close().catch(() => {});
      ac = null; sea = null;
    },
  };
}
