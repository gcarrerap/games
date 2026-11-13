// Confeti en un canvas encima de toda la mesa (no recibe toques). Se usa para el Yatzi, el bono y el final.
const COLORS = ["#e2b04a", "#f4d27a", "#d9483b", "#2f9e7a", "#3b7dd8", "#f6f1e3", "#b05cc8"];

export function createConfetti(canvas) {
  const g = canvas.getContext("2d");
  let parts = [], raf = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  function frame() {
    const W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.y < H + 40 && p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= 0.99; p.vy *= 0.99;
      p.x += p.vx; p.y += p.vy; p.a += p.va; p.life--;
      g.save();
      g.translate(p.x, p.y); g.rotate(p.a);
      g.scale(1, Math.cos(p.a * 2.3)); // se voltea al caer
      g.fillStyle = p.c;
      g.globalAlpha = Math.min(1, p.life / 30);
      if (p.round) { g.beginPath(); g.arc(0, 0, p.s / 2, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    }
    raf = parts.length ? requestAnimationFrame(frame) : 0;
  }
  return {
    resize,
    // Un estallido desde (x, y) en coordenadas de la pantalla (0–1). n: cuántos papelitos
    burst(x = 0.5, y = 0.45, n = 140, spread = 1) {
      resize();
      const W = canvas.width, H = canvas.height;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2 * spread, v = (6 + Math.random() * 10) * dpr;
        parts.push({ x: x * W, y: y * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.22 * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, s: (7 + Math.random() * 7) * dpr, c: COLORS[i % COLORS.length], life: 160 + Math.random() * 80, round: Math.random() < 0.2 });
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },
    // Lluvia desde arriba (al final de la partida)
    rain(n = 160) {
      resize();
      const W = canvas.width;
      for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -Math.random() * 300 * dpr, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.05 * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.2, s: (7 + Math.random() * 6) * dpr, c: COLORS[i % COLORS.length], life: 400, round: Math.random() < 0.2 });
      if (!raf) raf = requestAnimationFrame(frame);
    },
    destroy() { cancelAnimationFrame(raf); parts = []; },
  };
}
