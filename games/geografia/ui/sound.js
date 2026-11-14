// Sonido de Geografía. No hay archivos: todo se sintetiza al momento con Web Audio (modules/sfx createSynth), así que
// respeta el silencio y el volumen de modules/sfx (el botón 🔔). Suena: el toque de las opciones, la gotita del pin al
// caer, el arpegio de un acierto (más brillante con la racha), el zumbido grave de un fallo, el tictac de los últimos
// segundos, el «whoosh» al pasar de pregunta y la fanfarria del final.
import { createSfx, armOnGesture, createSynth } from "../../../modules/sfx/ui.js";

const HZ = (n) => 440 * Math.pow(2, (n - 69) / 12); // nota MIDI → hertzios
const MAJOR = [0, 4, 7, 12, 16, 19, 24];

export function createSound(prefs) {
  const sfx = createSfx({ prefs, gapFor: () => 0 }); // sin archivos: solo guarda silencio y volumen
  const syn = createSynth(sfx, { reverb: { secs: 1.5, decay: 3.2, wet: 0.24 } });
  const unarm = armOnGesture(document, sfx);
  const { on, vol, env, osc, noise, filt } = syn;
  let ac = null;
  const ready = () => { const ok = on(); ac = syn.ac; return ok; };
  const out = (send = 0.25) => syn.out(send);
  // Una nota con campana: el tono y su octava suave
  function note(midi, t, dur, { type = "triangle", peak = 0.2, send = 0.3, bell = 0 } = {}) {
    const g = out(send);
    env(g, t, peak, 0.006, dur);
    osc(type, HZ(midi), t, dur, g);
    if (bell) { const g2 = out(send); env(g2, t, peak * bell, 0.004, dur * 0.6); osc("sine", HZ(midi + 12) * 1.003, t, dur * 0.6, g2); }
  }

  const S = {
    // Escoger una opción o abrir algo
    tap() {
      if (!ready()) return; const t = ac.currentTime, g = out(0.12);
      env(g, t, 0.16, 0.003, 0.09); osc("sine", 640, t, 0.1, g, 900);
    },
    // Una tecla escrita en la respuesta
    key() {
      if (!ready()) return; const t = ac.currentTime, f = filt("highpass", 2400, 0.7), g = out(0.05); f.connect(g);
      env(g, t, 0.1, 0.002, 0.03); noise(t, 0.04, f);
    },
    // El pin cae sobre el mapa: «plop» de gota y un clic
    pin() {
      if (!ready()) return; const t = ac.currentTime, g = out(0.4);
      env(g, t, 0.34, 0.004, 0.2); osc("sine", 1100, t, 0.2, g, 230);
      const f = filt("bandpass", 1800, 1.4), g2 = out(0.2); f.connect(g2);
      env(g2, t, 0.2, 0.002, 0.05); noise(t, 0.06, f);
      const g3 = out(0.35); env(g3, t + 0.17, 0.08, 0.01, 0.2); osc("sine", 420, t + 0.17, 0.22, g3, 300);
    },
    // Acierto: arpegio mayor; con racha sube de tono y suma notas
    correct(streak = 1) {
      if (!ready()) return; const t = ac.currentTime, base = 72 + Math.min(5, Math.max(0, streak - 1));
      const n = Math.min(MAJOR.length, 3 + Math.floor(streak / 2));
      for (let i = 0; i < n; i++) note(base + MAJOR[i], t + i * 0.075, 0.55, { peak: 0.2, bell: 0.35 });
      const f = filt("highpass", 5000, 0.6), g = out(0.4); f.connect(g);
      env(g, t + 0.05, 0.1, 0.01, 0.35); noise(t + 0.05, 0.4, f);
    },
    // Casi: lo bastante cerca en el mapa, pero no del todo
    near() {
      if (!ready()) return; const t = ac.currentTime;
      note(67, t, 0.35, { peak: 0.2, bell: 0.2 }); note(72, t + 0.11, 0.5, { peak: 0.2, bell: 0.2 });
    },
    // Fallo: zumbido grave que cae (amable, no regaño)
    wrong() {
      if (!ready()) return; const t = ac.currentTime, lp = filt("lowpass", 900, 1.5), g = out(0.15); lp.connect(g);
      env(g, t, 0.26, 0.01, 0.36);
      osc("sawtooth", 196, t, 0.38, lp, 118); osc("square", 98.5, t, 0.38, lp, 59);
    },
    // Se acabó el tiempo
    timeout() {
      if (!ready()) return; const t = ac.currentTime;
      note(64, t, 0.3, { type: "sine", peak: 0.18 }); note(59, t + 0.16, 0.3, { type: "sine", peak: 0.18 }); note(52, t + 0.32, 0.5, { type: "sine", peak: 0.2 });
    },
    // Tictac de los últimos segundos (más agudo en el último)
    tick(last = false) {
      if (!ready()) return; const t = ac.currentTime, g = out(0.1);
      env(g, t, last ? 0.3 : 0.18, 0.002, 0.07); osc("square", last ? 1320 : 880, t, 0.08, g);
    },
    // Pasar a la pregunta siguiente
    whoosh() {
      if (!ready()) return; const t = ac.currentTime, f = filt("bandpass", 500, 1.1), g = out(0.3); f.connect(g);
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
      env(g, t, 0.22, 0.05, 0.2); noise(t, 0.3, f);
    },
    // La campanita de la pista
    hint() {
      if (!ready()) return; const t = ac.currentTime;
      note(84, t, 0.7, { type: "sine", peak: 0.18, bell: 0.4, send: 0.5 }); note(91, t + 0.12, 0.8, { type: "sine", peak: 0.14, bell: 0.4, send: 0.5 });
    },
    // Empieza la partida: un redoble corto y un acorde
    start() {
      if (!ready()) return; const t = ac.currentTime;
      for (let i = 0; i < 4; i++) { const g = out(0.2); env(g, t + i * 0.06, 0.18, 0.004, 0.08); osc("sine", 160, t + i * 0.06, 0.1, g, 90); }
      [60, 64, 67, 72].forEach((m, i) => note(m, t + 0.28 + i * 0.01, 0.9, { peak: 0.12, bell: 0.3, send: 0.45 }));
    },
    // Fin de la partida: fanfarria de metales
    fanfare() {
      if (!ready()) return; const t = ac.currentTime;
      const seq = [[60, 0], [64, 0.14], [67, 0.28], [72, 0.46], [67, 0.7], [72, 0.84], [76, 1.0]];
      seq.forEach(([m, dt], i) => {
        const lp = filt("lowpass", 2600, 0.8), g = out(0.4); lp.connect(g);
        const dur = i === seq.length - 1 ? 1.5 : 0.28;
        env(g, t + dt, 0.2, 0.02, dur);
        osc("sawtooth", HZ(m), t + dt, dur, lp); osc("sawtooth", HZ(m) * 1.004, t + dt, dur, lp);
      });
      [48, 55].forEach((m) => { const g = out(0.3); env(g, t + 1.0, 0.16, 0.03, 1.4); osc("sine", HZ(m), t + 1.0, 1.4, g); });
    },
    // Un final tranquilo (nadie ganó nada)
    soft() {
      if (!ready()) return; const t = ac.currentTime;
      [60, 64, 67].forEach((m, i) => note(m, t + i * 0.12, 1.1, { type: "sine", peak: 0.14, bell: 0.2, send: 0.5 }));
    },
  };

  return {
    sfx,
    play(name, ...args) { try { S[name] && S[name](...args); } catch { /* el audio nunca debe romper el juego */ } },
    destroy() { unarm(); syn.destroy(); sfx.destroy(); },
  };
}
