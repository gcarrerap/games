// Sonido del Láser. Los efectos se sintetizan al momento con Web Audio (no hay archivos que bajar): el zumbido del
// láser, el "ping" de cada espejo, el golpe metálico del escudo, la explosión, el roce de la piedra al mover y el
// trinquete al girar. La voz del narrador son mp3 (sfx/voz-*.mp3, hechos con Fish Audio) y suena con modules/sfx.
// El silencio y el volumen son los mismos de modules/sfx (🔔 en la mesa), así un solo botón calla todo.
import { createSfx, armOnGesture, createSynth } from "../../../modules/sfx/ui.js";

const VOICES = ["inicio", "turno-plata", "turno-rojo", "destruida", "anubis", "faraon-cae", "gana-plata", "gana-rojo", "empate", "tu-turno", "fuego-propio"];
const CLIPS = Object.fromEntries(VOICES.map((k) => [k, new URL(`../sfx/voz-${k}.mp3`, import.meta.url).href]));

export function createSound(prefs) {
  const sfx = createSfx({ clips: CLIPS, prefs, gapFor: () => 600 });
  // Reverberación de templo
  const syn = createSynth(sfx, { reverb: { secs: 1.8, decay: 3.2, wet: 0.32 } });
  const unarm = armOnGesture(document, sfx);
  const { on, vol, env, osc, noise, filt } = syn;
  const out = (_gain, send = 0.4) => syn.out(send);
  let ac = null;
  // Antes de cada efecto: on() crea el contexto si hace falta; aquí se toma para leer currentTime
  const ready = () => { const ok = on(); ac = syn.ac; return ok; };

  let hum = null; // el zumbido mientras avanza el rayo

  const S = {
    select() {
      if (!ready()) return; const t = ac.currentTime, gn = out(1, 0.2);
      env(gn, t, 0.18, 0.005, 0.12); osc("sine", 980, t, 0.14, gn, 1470);
    },
    move() {
      if (!ready()) return; const t = ac.currentTime;
      const f = filt("bandpass", 500, 1.2); const gn = out(1, 0.35); f.connect(gn);
      f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.28);
      env(gn, t, 0.55, 0.03, 0.32); noise(t, 0.4, f);
      const g2 = out(1, 0.3); env(g2, t + 0.22, 0.5, 0.005, 0.25); osc("sine", 110, t + 0.22, 0.3, g2, 55);
    },
    rotate() {
      if (!ready()) return; const t = ac.currentTime;
      for (let k = 0; k < 4; k++) {
        const tt = t + k * 0.055, f = filt("highpass", 1800, 0.8), gn = out(1, 0.25); f.connect(gn);
        env(gn, tt, 0.35, 0.002, 0.04); noise(tt, 0.06, f);
      }
      const g2 = out(1, 0.3); env(g2, t, 0.16, 0.02, 0.28); osc("triangle", 260, t, 0.3, g2, 340);
    },
    // Carga y disparo; el zumbido dura `secs` (lo que tarda el rayo en llegar)
    fire(secs, team = 0) {
      if (!ready()) return; const t = ac.currentTime;
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
      if (!ready()) return; const t = ac.currentTime, gn = out(1, 0.7);
      const f = 2200 + (k % 4) * 260;
      env(gn, t, 0.22, 0.002, 0.35); osc("sine", f, t, 0.4, gn); osc("sine", f * 1.5, t, 0.25, gn);
    },
    block() {
      if (!ready()) return; const t = ac.currentTime;
      for (const [f, a] of [[523, 0.3], [1340, 0.22], [2210, 0.14], [3120, 0.08]]) { const gn = out(1, 0.6); env(gn, t, a, 0.002, 0.9); osc("sine", f, t, 1, gn); }
      const hp = filt("highpass", 2500), gn = out(1, 0.4); hp.connect(gn); env(gn, t, 0.4, 0.002, 0.12); noise(t, 0.15, hp);
    },
    explode() {
      if (!ready()) return; const t = ac.currentTime;
      const lp = filt("lowpass", 4000, 0.7), gn = out(1, 0.5); lp.connect(gn);
      lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
      env(gn, t, 0.95, 0.004, 1.1); noise(t, 1.2, lp);
      const sub = out(1, 0.2); env(sub, t, 0.9, 0.005, 0.7); osc("sine", 90, t, 0.8, sub, 32);
      for (let k = 0; k < 7; k++) { const tt = t + 0.1 + Math.random() * 0.6, hp = filt("bandpass", 2500 + Math.random() * 2500, 4), g2 = out(1, 0.3); hp.connect(g2); env(g2, tt, 0.3, 0.001, 0.05); noise(tt, 0.06, hp); }
    },
    fizzle() {
      if (!ready()) return; const t = ac.currentTime, hp = filt("highpass", 3000), gn = out(1, 0.3); hp.connect(gn);
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
      if (!ready()) return; const t = ac.currentTime;
      [[659, 0], [988, 0.12]].forEach(([f, d]) => { const gn = out(1, 0.5); env(gn, t + d, 0.25, 0.004, 0.5); osc("triangle", f, t + d, 0.55, gn); osc("sine", f * 2, t + d, 0.3, gn); });
    },
    error() {
      if (!ready()) return; const t = ac.currentTime, gn = out(1, 0.1);
      env(gn, t, 0.2, 0.01, 0.22); osc("square", 140, t, 0.25, gn, 90);
    },
    // Fanfarria con escala egipcia (frigia dominante)
    fanfare(win = true) {
      if (!ready()) return; const t = ac.currentTime;
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
      sfx.destroy();
      syn.destroy();
      ac = null;
    },
  };
}
