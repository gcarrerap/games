// Sonido de Piojos. Los dados (castañeteo y botes) vienen de modules/dice; aquí se sintetiza lo demás con createSynth:
// el "ting" de cada piojo que se aparta (sube de tono), el "ni modo" de quedarse sin piojos, la lluvia de monedas al
// plantarse, la fanfarria y el aviso de turno. La voz del locutor son mp3 de Fish Audio (sfx/voz-*.mp3). Un solo botón
// (🔔) calla todo.
import { createSfx, armOnGesture, createSynth } from "../../../modules/sfx/ui.js";
import { createDiceSounds } from "../../../modules/dice/ui.js";

export const VOICES = ["inicio", "sin-piojos", "cinco", "planta", "arriesgas", "ases", "casi", "tu-turno", "siguiente", "gana"];
const CLIPS = Object.fromEntries(VOICES.map((k) => [k, new URL(`../sfx/voz-${k}.mp3`, import.meta.url).href]));
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export function createSound(prefs) {
  const sfx = createSfx({ clips: CLIPS, prefs, gapFor: (k) => (k === "arriesgas" ? 20000 : 700) });
  const syn = createSynth(sfx, { reverb: { secs: 1.1, decay: 3.5, wet: 0.16 } });
  const unarm = armOnGesture(document, sfx);
  const dice = createDiceSounds(syn);
  const { on, env, osc, noise, filt, out } = syn;
  const T = () => syn.ac.currentTime;
  let lastVoiceAt = 0;

  const S = {
    rattle: dice.rattle,
    impact: dice.impact,
    // El k-ésimo piojo apartado en este tiro: una campanita que sube
    louse(k = 0, value = 10) {
      if (!on()) return; const t = T();
      const f = PENTA[Math.min(PENTA.length - 1, 2 + k + (value >= 20 ? 2 : 0))], g = out(0.5);
      env(g, t, 0.2, 0.002, 0.45); osc("triangle", f, t, 0.5, g); osc("sine", f * 2.01, t, 0.25, g);
      dice.knock(t, 0.3, 1.4);
    },
    bust() {
      if (!on()) return; const t = T();
      [[311, 0], [294, 0.2], [262, 0.4], [233, 0.62]].forEach(([f, d], k) => {
        const lp = filt("lowpass", 800), g = out(0.3); lp.connect(g);
        env(g, t + d, 0.24, 0.01, k === 3 ? 0.9 : 0.2); osc("sawtooth", f, t + d, k === 3 ? 1 : 0.22, lp, k === 3 ? 165 : undefined);
      });
    },
    // Monedas que caen: cuantas más, más puntos
    coins(pts = 50) {
      if (!on()) return; const t = T();
      const n = Math.max(4, Math.min(16, Math.round(pts / 10)));
      for (let k = 0; k < n; k++) {
        const tt = t + k * 0.055 + Math.random() * 0.03, f = 2400 + Math.random() * 1800, g = out(0.4);
        env(g, tt, 0.12, 0.001, 0.18); osc("sine", f, tt, 0.2, g); osc("sine", f * 1.5, tt, 0.1, g);
      }
      const g = out(0.5); env(g, t + n * 0.055, 0.18, 0.01, 0.7); [784, 988, 1175].forEach((f) => osc("triangle", f, t + n * 0.055, 0.8, g));
    },
    // Los cinco piojos, o ganar: metales de fiesta
    fanfare(big = true) {
      if (!on()) return; const t = T();
      const chords = big ? [[392, 494, 587], [392, 494, 587], [523, 659, 784], [587, 740, 880], [784, 988, 1175]] : [[523, 659, 784], [784, 988, 1175]];
      const at = big ? [0, 0.14, 0.28, 0.5, 0.72] : [0, 0.16];
      chords.forEach((c, k) => {
        const last = k === chords.length - 1, lp = filt("lowpass", last ? 2600 : 1800, 0.8), g = out(0.5); lp.connect(g);
        env(g, t + at[k], 0.22, 0.012, last ? 1.6 : 0.13);
        c.forEach((f) => { osc("sawtooth", f, t + at[k], last ? 1.7 : 0.18, lp); osc("sawtooth", f * 1.006, t + at[k], last ? 1.7 : 0.18, lp); });
      });
      const end = t + at[at.length - 1], hp = filt("highpass", 6000), g = out(0.6); hp.connect(g); env(g, end, 0.3, 0.003, 1.4); noise(end, 1.5, hp);
    },
    turn() {
      if (!on()) return; const t = T();
      [[784, 0], [1047, 0.11]].forEach(([f, d]) => { const g = out(0.4); env(g, t + d, 0.18, 0.004, 0.4); osc("triangle", f, t + d, 0.45, g); });
    },
    error() {
      if (!on()) return; const t = T(), g = out(0);
      env(g, t, 0.18, 0.01, 0.2); osc("square", 150, t, 0.22, g, 95);
    },
    voice(key, at = 0) {
      const nowMs = performance.now() + at;
      if (nowMs - lastVoiceAt < 900) return false;
      if (sfx.play(key, at)) { lastVoiceAt = nowMs; return true; }
      return false;
    },
  };
  return { ...S, sfx, destroy() { unarm && unarm(); sfx.destroy(); syn.destroy(); } };
}
