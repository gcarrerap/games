// Sonido del Láser. Los efectos se sintetizan al momento con Web Audio (no hay archivos que bajar): el zumbido del
// láser, el "ping" de cada espejo, el golpe metálico del escudo, la explosión, el roce de la piedra al mover y el
// trinquete al girar. La voz del narrador son mp3 (sfx/voz-*.mp3, hechos con Fish Audio) y suena con modules/sfx.
// El silencio y el volumen son los mismos de modules/sfx (🔔 en la mesa), así un solo botón calla todo.
import { createSfx, armOnGesture } from "../../../modules/sfx/ui.js";

const VOICES = ["inicio", "turno-plata", "turno-rojo", "destruida", "anubis", "faraon-cae", "gana-plata", "gana-rojo", "empate", "tu-turno", "fuego-propio"];
const CLIPS = Object.fromEntries(VOICES.map((k) => [k, new URL(`../sfx/voz-${k}.mp3`, import.meta.url).href]));

export function createSound(prefs) {
  const sfx = createSfx({ clips: CLIPS, prefs, gapFor: () => 600 });
  let ac = null, master = null, verb = null;

  function ensure() {
    if (ac) return ac;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ac.createGain();
      master.connect(comp); comp.connect(ac.destination);
      // Reverberación de templo: un impulso de ruido que decae
      verb = ac.createConvolver();
      const len = Math.floor(ac.sampleRate * 1.8), ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb.buffer = ir;
      const wet = ac.createGain(); wet.gain.value = 0.32;
      verb.connect(wet); wet.connect(master);
    } catch { ac = null; }
    return ac;
  }
  const unarm = armOnGesture(document, sfx);
  const onFirst = () => { const a = ensure(); if (a && a.state === "suspended") a.resume().catch(() => {}); };
  document.addEventListener("pointerdown", onFirst, true);
  document.addEventListener("keydown", onFirst, true);

  const on = () => !sfx.muted && sfx.volume > 0 && ensure() && ac.state === "running";
  const vol = () => sfx.volume;

  // Un destino con su envolvente: va al master y un poco a la reverberación
  function out(gain, send = 0.4) {
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
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return s;
  }
  const filt = (type, f, q = 1) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

  let hum = null; // el zumbido mientras avanza el rayo

  const S = {
    select() {
      if (!on()) return; const t = ac.currentTime, gn = out(1, 0.2);
      env(gn, t, 0.18, 0.005, 0.12); osc("sine", 980, t, 0.14, gn, 1470);
    },
    move() {
      if (!on()) return; const t = ac.currentTime;
      const f = filt("bandpass", 500, 1.2); const gn = out(1, 0.35); f.connect(gn);
      f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.28);
      env(gn, t, 0.55, 0.03, 0.32); noise(t, 0.4, f);
      const g2 = out(1, 0.3); env(g2, t + 0.22, 0.5, 0.005, 0.25); osc("sine", 110, t + 0.22, 0.3, g2, 55);
    },
    rotate() {
      if (!on()) return; const t = ac.currentTime;
      for (let k = 0; k < 4; k++) {
        const tt = t + k * 0.055, f = filt("highpass", 1800, 0.8), gn = out(1, 0.25); f.connect(gn);
        env(gn, tt, 0.35, 0.002, 0.04); noise(tt, 0.06, f);
      }
      const g2 = out(1, 0.3); env(g2, t, 0.16, 0.02, 0.28); osc("triangle", 260, t, 0.3, g2, 340);
    },
    // Carga y disparo; el zumbido dura `secs` (lo que tarda el rayo en llegar)
    fire(secs, team = 0) {
      if (!on()) return; const t = ac.currentTime;
      const gc = out(1, 0.4); env(gc, t, 0.3, 0.02, 0.28); osc("sine", 180, t, 0.3, gc, 1400);
      const base = team === 0 ? 150 : 110;
      const lp = filt("lowpass", 1600, 2); const gh = out(1, 0.5); lp.connect(gh);
      gh.gain.setValueAtTime(0.0001, t + 0.12);
      gh.gain.exponentialRampToValueAtTime(0.22 * vol(), t + 0.2);
      const end = t + 0.2 + Math.max(0.2, secs) + 0.9;
      gh.gain.setValueAtTime(0.22 * vol(), end - 0.5);
      gh.gain.exponentialRampToValueAtTime(0.0001, end);
      const o1 = osc("sawtooth", base, t + 0.12, end - t, lp), o2 = osc("square", base * 2.01, t + 0.12, end - t, lp);
      const sh = out(1, 0.6); sh.gain.setValueAtTime(0.0001, t + 0.12); sh.gain.exponentialRampToValueAtTime(0.05 * vol(), t + 0.25); sh.gain.exponentialRampToValueAtTime(0.0001, end);
      const o3 = osc("sine", team === 0 ? 2350 : 1760, t + 0.12, end - t, sh);
      // Trémolo
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 23; lg.gain.value = 0.06 * vol();
      lfo.connect(lg); lg.connect(gh.gain); lfo.start(t); lfo.stop(end);
      hum = { gh, end, oscs: [o1, o2, o3, lfo] };
    },
    reflect(k = 0) {
      if (!on()) return; const t = ac.currentTime, gn = out(1, 0.7);
      const f = 2200 + (k % 4) * 260;
      env(gn, t, 0.22, 0.002, 0.35); osc("sine", f, t, 0.4, gn); osc("sine", f * 1.5, t, 0.25, gn);
    },
    block() {
      if (!on()) return; const t = ac.currentTime;
      for (const [f, a] of [[523, 0.3], [1340, 0.22], [2210, 0.14], [3120, 0.08]]) { const gn = out(1, 0.6); env(gn, t, a, 0.002, 0.9); osc("sine", f, t, 1, gn); }
      const hp = filt("highpass", 2500), gn = out(1, 0.4); hp.connect(gn); env(gn, t, 0.4, 0.002, 0.12); noise(t, 0.15, hp);
    },
    explode() {
      if (!on()) return; const t = ac.currentTime;
      const lp = filt("lowpass", 4000, 0.7), gn = out(1, 0.5); lp.connect(gn);
      lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
      env(gn, t, 0.95, 0.004, 1.1); noise(t, 1.2, lp);
      const sub = out(1, 0.2); env(sub, t, 0.9, 0.005, 0.7); osc("sine", 90, t, 0.8, sub, 32);
      for (let k = 0; k < 7; k++) { const tt = t + 0.1 + Math.random() * 0.6, hp = filt("bandpass", 2500 + Math.random() * 2500, 4), g2 = out(1, 0.3); hp.connect(g2); env(g2, tt, 0.3, 0.001, 0.05); noise(tt, 0.06, hp); }
    },
    fizzle() {
      if (!on()) return; const t = ac.currentTime, hp = filt("highpass", 3000), gn = out(1, 0.3); hp.connect(gn);
      env(gn, t, 0.12, 0.01, 0.25); noise(t, 0.3, hp);
    },
    // El zumbido termina cuando el rayo se apaga
    stopHum() {
      if (!hum || !ac) return;
      const t = ac.currentTime;
      try { hum.gh.gain.cancelScheduledValues(t); hum.gh.gain.setValueAtTime(Math.max(0.0001, hum.gh.gain.value), t); hum.gh.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); hum.oscs.forEach((o) => o.stop(t + 0.4)); } catch {}
      hum = null;
    },
    turn() {
      if (!on()) return; const t = ac.currentTime;
      [[659, 0], [988, 0.12]].forEach(([f, d]) => { const gn = out(1, 0.5); env(gn, t + d, 0.25, 0.004, 0.5); osc("triangle", f, t + d, 0.55, gn); osc("sine", f * 2, t + d, 0.3, gn); });
    },
    error() {
      if (!on()) return; const t = ac.currentTime, gn = out(1, 0.1);
      env(gn, t, 0.2, 0.01, 0.22); osc("square", 140, t, 0.25, gn, 90);
    },
    // Fanfarria con escala egipcia (frigia dominante)
    fanfare(win = true) {
      if (!on()) return; const t = ac.currentTime;
      const notes = win ? [330, 349, 415, 440, 494, 523, 659, 880] : [440, 415, 349, 330, 247];
      notes.forEach((f, k) => {
        const d = k * 0.13, gn = out(1, 0.7);
        env(gn, t + d, 0.22, 0.01, k === notes.length - 1 ? 1.6 : 0.4);
        osc("triangle", f, t + d, k === notes.length - 1 ? 1.7 : 0.45, gn);
        osc("sawtooth", f / 2, t + d, 0.3, (() => { const lp = filt("lowpass", 900); lp.connect(gn); return lp; })());
      });
      if (win) { const gn = out(1, 0.8); env(gn, t + notes.length * 0.13, 0.3, 0.3, 2); [165, 247, 330].forEach((f) => osc("sawtooth", f, t + notes.length * 0.13, 2.3, (() => { const lp = filt("lowpass", 1200); lp.connect(gn); return lp; })())); }
    },
    voice(key, at = 0) { sfx.play(key, at); },
  };

  return {
    ...S,
    sfx,
    destroy() {
      S.stopHum();
      unarm && unarm();
      document.removeEventListener("pointerdown", onFirst, true);
      document.removeEventListener("keydown", onFirst, true);
      sfx.destroy();
      if (ac) ac.close().catch(() => {});
      ac = null;
    },
  };
}
