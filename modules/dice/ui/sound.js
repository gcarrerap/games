// Los sonidos de los dados, sintetizados con createSynth de modules/sfx: el castañeteo en la mano, cada bote contra la
// mesa de madera y el "toc" de apartar o soltar un dado.
export function createDiceSounds(syn) {
  const { on, env, osc, noise, filt, out } = syn;
  const T = () => syn.ac.currentTime;
  // Un golpe de dado contra madera: un "toc" de ruido filtrado, un cuerpo grave y un clic de hueso
  function knock(t, str, pitch = 1) {
    const bp = filt("bandpass", (1700 + Math.random() * 1600) * pitch, 2.5), g = out(0.15); bp.connect(g);
    env(g, t, 0.55 * str, 0.001, 0.05 + Math.random() * 0.03); noise(t, 0.08, bp);
    const g2 = out(0.1); env(g2, t, 0.35 * str, 0.002, 0.07); osc("sine", (170 + Math.random() * 60) * pitch, t, 0.09, g2, 90);
    const hp = filt("highpass", 4200), g3 = out(0); hp.connect(g3); env(g3, t, 0.18 * str, 0.0005, 0.015); noise(t, 0.02, hp);
  }
  return {
    knock: (t, str, pitch) => knock(t, str, pitch),
    // Una "pasada" de castañeteo mientras se agita: 2 a 4 dados chocan dentro de la mano
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
    hold(held = true) {
      if (!on()) return; const t = T();
      knock(t, 0.35, held ? 1.3 : 0.8);
      const g = out(0.1); env(g, t, 0.12, 0.004, 0.12); osc("triangle", held ? 880 : 587, t, 0.14, g, held ? 1320 : 440);
    },
  };
}
