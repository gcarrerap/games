// Sonido de Yatzi. Los efectos se sintetizan al momento (modules/sfx createSynth): el castañeteo de los dados en la
// mano, cada bote en la mesa de madera, apartar y soltar un dado, la campanita al anotar (más notas cuanto más vale),
// el "ni modo" al tachar, el bono y la fanfarria del Yatzi. La voz del locutor son mp3 (sfx/voz-*.mp3, hechos con Fish
// Audio) y suenan con modules/sfx. Un solo botón (🔔) calla todo.
import { createSfx, armOnGesture, createSynth } from "../../../modules/sfx/ui.js";

export const VOICES = ["inicio", "yatzi", "yatzi-extra", "escalera-grande", "escalera-chica", "full", "poker", "tercia", "bono", "ultimo-tiro", "tacha", "tu-turno", "siguiente", "gana", "record", "fin", "empate"];
const CLIPS = Object.fromEntries(VOICES.map((k) => [k, new URL(`../sfx/voz-${k}.mp3`, import.meta.url).href]));

// Escala pentatónica para las campanitas (no desafina nunca)
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export function createSound(prefs) {
  const sfx = createSfx({ clips: CLIPS, prefs, gapFor: (k) => (k === "tacha" ? 4000 : 700) });
  const syn = createSynth(sfx, { reverb: { secs: 1.2, decay: 3.5, wet: 0.18 } });
  const unarm = armOnGesture(document, sfx);
  const { on, env, osc, noise, filt, out } = syn;
  const T = () => syn.ac.currentTime;
  let lastVoiceAt = 0;

  // Un golpe de dado contra madera: un "toc" de ruido filtrado más un cuerpo grave
  function knock(t, str, pitch = 1) {
    const bp = filt("bandpass", (1700 + Math.random() * 1600) * pitch, 2.5), g = out(0.15); bp.connect(g);
    env(g, t, 0.55 * str, 0.001, 0.05 + Math.random() * 0.03); noise(t, 0.08, bp);
    const g2 = out(0.1); env(g2, t, 0.35 * str, 0.002, 0.07); osc("sine", (170 + Math.random() * 60) * pitch, t, 0.09, g2, 90);
    // Hueso contra hueso: un clic agudo
    const hp = filt("highpass", 4200), g3 = out(0); hp.connect(g3); env(g3, t, 0.18 * str, 0.0005, 0.015); noise(t, 0.02, hp);
  }

  const S = {
    // Una "pasada" de castañeteo mientras se agita: 2 o 3 dados chocan dentro de la mano
    rattle(power = 0.5) {
      if (!on()) return; const t = T();
      const n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const tt = t + Math.random() * 0.05, bp = filt("bandpass", 2600 + Math.random() * 2600, 4), g = out(0.05); bp.connect(g);
        env(g, tt, (0.18 + power * 0.25) * (0.6 + Math.random() * 0.4), 0.0008, 0.018); noise(tt, 0.03, bp);
      }
      if (Math.random() < 0.35) { const g = out(0); env(g, t, 0.12 * power, 0.003, 0.06); osc("sine", 140 + Math.random() * 50, t, 0.08, g, 80); }
    },
    impact(str = 1) { if (on()) knock(T(), Math.min(1, str)); },
    hold(on_ = true) {
      if (!on()) return; const t = T();
      knock(t, 0.35, on_ ? 1.3 : 0.8);
      const g = out(0.1); env(g, t, 0.12, 0.004, 0.12); osc("triangle", on_ ? 880 : 587, t, 0.14, g, on_ ? 1320 : 440);
    },
    // Campanitas al anotar: más notas cuanto más vale (hasta 6)
    score(pts) {
      if (!on()) return; const t = T();
      if (!pts) { S.zero(); return; }
      const n = Math.max(1, Math.min(6, Math.round(Math.log2(pts + 1)) - 1)), base = Math.min(3, Math.floor(pts / 20));
      for (let k = 0; k < n; k++) {
        const f = PENTA[Math.min(PENTA.length - 1, base + k)], tt = t + k * 0.075, g = out(0.5);
        env(g, tt, 0.2, 0.003, 0.55); osc("triangle", f, tt, 0.6, g); osc("sine", f * 2, tt, 0.3, g);
      }
      // El lápiz en el papel
      const bp = filt("bandpass", 5200, 1.5), g = out(0); bp.connect(g); env(g, t, 0.08, 0.02, 0.18); noise(t, 0.22, bp);
    },
    zero() {
      if (!on()) return; const t = T();
      [[311, 0], [294, 0.18], [262, 0.36]].forEach(([f, d], k) => {
        const lp = filt("lowpass", 900), g = out(0.3); lp.connect(g);
        env(g, t + d, 0.22, 0.01, k === 2 ? 0.7 : 0.2); osc("sawtooth", f, t + d, k === 2 ? 0.8 : 0.22, lp, k === 2 ? 196 : undefined);
      });
    },
    // Bono: un barrido de chispas hacia arriba
    bonus() {
      if (!on()) return; const t = T();
      PENTA.forEach((f, k) => { const g = out(0.6), tt = t + k * 0.045; env(g, tt, 0.14, 0.002, 0.5); osc("sine", f * 2, tt, 0.55, g); });
      const g = out(0.7); env(g, t + 0.45, 0.2, 0.05, 1.2); [523, 659, 784].forEach((f) => osc("triangle", f, t + 0.45, 1.3, g));
    },
    // ¡Yatzi!: metales de fiesta (acordes de sierra filtrada), platillo y un remate
    fanfare(big = true) {
      if (!on()) return; const t = T();
      const chords = big ? [[392, 494, 587], [392, 494, 587], [523, 659, 784], [587, 740, 880], [784, 988, 1175]] : [[523, 659, 784], [784, 988, 1175]];
      const at = big ? [0, 0.14, 0.28, 0.5, 0.72] : [0, 0.16];
      chords.forEach((c, k) => {
        const last = k === chords.length - 1, lp = filt("lowpass", last ? 2600 : 1800, 0.8), g = out(0.5); lp.connect(g);
        env(g, t + at[k], 0.22, 0.012, last ? 1.6 : 0.13);
        c.forEach((f) => { osc("sawtooth", f, t + at[k], last ? 1.7 : 0.18, lp); osc("sawtooth", f * 1.006, t + at[k], last ? 1.7 : 0.18, lp); });
      });
      const hp = filt("highpass", 6000), g = out(0.6); hp.connect(g); env(g, t + at[at.length - 1], 0.3, 0.003, 1.4); noise(t + at[at.length - 1], 1.5, hp);
      const sub = out(0); env(sub, t + at[at.length - 1], 0.5, 0.004, 0.4); osc("sine", 98, t + at[at.length - 1], 0.45, sub, 49);
    },
    // Te toca: dos notas
    turn() {
      if (!on()) return; const t = T();
      [[784, 0], [1047, 0.11]].forEach(([f, d]) => { const g = out(0.4); env(g, t + d, 0.18, 0.004, 0.4); osc("triangle", f, t + d, 0.45, g); });
    },
    error() {
      if (!on()) return; const t = T(), g = out(0);
      env(g, t, 0.18, 0.01, 0.2); osc("square", 150, t, 0.22, g, 95);
    },
    // El locutor; no se encima con otra voz
    voice(key, at = 0) {
      const nowMs = performance.now() + at;
      if (nowMs - lastVoiceAt < 900) return false;
      if (sfx.play(key, at)) { lastVoiceAt = nowMs; return true; }
      return false;
    },
  };

  return {
    ...S,
    sfx,
    destroy() { unarm && unarm(); sfx.destroy(); syn.destroy(); },
  };
}
