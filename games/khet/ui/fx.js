// Efectos del Láser en un <canvas> encima del tablero: el rayo que avanza y rebota, chispas en cada espejo, el escudo
// del anubis y la explosión de una pieza. Trabaja en unidades del dibujo del tablero (board.js VIEW) y se pinta con
// mezcla aditiva para que brille. No sabe de reglas: recibe los puntos del recorrido ya calculados.
import { VIEW } from "./board.js";

const SPEED = 16; // casillas por segundo
const HOLD_MS = 900, FADE_MS = 500;

export function createFx(canvas) {
  const g = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, raf = 0, alive = true;
  let beam = null; // { pts, lens, total, t0, color, glow, done, endAt, cbs }
  const parts = [];
  const flashes = []; // { x, y, t0, ms, r, color }
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sx = (x) => ((x - VIEW.x) / VIEW.w) * w;
  const sy = (y) => ((y - VIEW.y) / VIEW.h) * h;
  const unit = () => w / VIEW.w; // píxeles por casilla

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const now = () => performance.now();
  function loop() {
    raf = 0;
    if (!alive) return;
    draw(now());
    if (beam || parts.length || flashes.length) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(loop); };

  // Dónde va la punta del rayo después de recorrer d casillas
  function pointAt(b, d) {
    let acc = 0;
    for (let k = 1; k < b.pts.length; k++) {
      const L = b.lens[k - 1];
      if (acc + L >= d) { const f = L ? (d - acc) / L : 1; const [x0, y0] = b.pts[k - 1], [x1, y1] = b.pts[k]; return { k, x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f }; }
      acc += L;
    }
    const last = b.pts[b.pts.length - 1];
    return { k: b.pts.length, x: last[0], y: last[1] };
  }

  function strokePath(b, upto, width, alpha, color) {
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(sx(b.pts[0][0]), sy(b.pts[0][1]));
    for (let k = 1; k < upto.k; k++) g.lineTo(sx(b.pts[k][0]), sy(b.pts[k][1]));
    g.lineTo(sx(upto.x), sy(upto.y));
    g.stroke();
  }

  function draw(t) {
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round"; g.lineJoin = "round";
    const u = unit();
    if (beam) {
      const b = beam;
      const d = Math.min(b.total, ((t - b.t0) / 1000) * SPEED * (reduce ? 3 : 1));
      const head = pointAt(b, d);
      // Rebotes que ya pasó: chispa y aviso (una vez cada uno)
      while (b.next < head.k && b.next < b.pts.length - 1) {
        const [x, y] = b.pts[b.next];
        flashes.push({ x, y, t0: t, ms: 380, r: 0.55, color: b.glow });
        sparks(x, y, 10, b.color, 2.2);
        b.cbs.onReflect && b.cbs.onReflect(b.next);
        b.next++;
      }
      if (!b.done && d >= b.total) { b.done = true; b.endAt = t; b.cbs.onEnd && b.cbs.onEnd(); }
      let fade = 1;
      if (b.done) {
        const e = t - b.endAt;
        if (e > HOLD_MS) fade = Math.max(0, 1 - (e - HOLD_MS) / FADE_MS);
        if (e > HOLD_MS + FADE_MS) beam = null;
      }
      if (beam) {
        const flick = 0.85 + 0.15 * Math.sin(t / 23) * Math.sin(t / 7);
        strokePath(b, head, u * 0.42, 0.10 * fade * flick, b.color);
        strokePath(b, head, u * 0.2, 0.28 * fade * flick, b.color);
        strokePath(b, head, u * 0.08, 0.85 * fade, b.color);
        strokePath(b, head, u * 0.03, 0.95 * fade, "#ffffff");
        // La punta y el lente
        glowDot(head.x, head.y, 0.32 * (b.done ? 0.6 : 1), b.glow, fade);
        glowDot(b.pts[0][0], b.pts[0][1], 0.45 + 0.05 * Math.sin(t / 40), b.glow, fade);
        if (!b.done && Math.random() < 0.6) sparks(head.x, head.y, 1, b.color, 0.8);
      }
    }
    // Destellos
    for (let k = flashes.length - 1; k >= 0; k--) {
      const f = flashes[k], e = (t - f.t0) / f.ms;
      if (e >= 1) { flashes.splice(k, 1); continue; }
      if (f.ring) {
        g.globalAlpha = (1 - e) * 0.8;
        g.strokeStyle = f.ring;
        g.lineWidth = u * 0.08 * (1 - e) + 1;
        g.beginPath(); g.arc(sx(f.x), sy(f.y), u * f.r * (0.3 + e), 0, Math.PI * 2); g.stroke();
      } else glowDot(f.x, f.y, f.r * (0.6 + e * 0.8), f.color, 1 - e);
    }
    // Partículas
    const dt = 1 / 60;
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(k, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav * dt;
      p.rot += p.spin * dt;
      const a = 1 - p.life / p.max;
      if (p.type === "smoke") {
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = a * 0.35;
        g.fillStyle = p.color;
        g.beginPath(); g.arc(sx(p.x), sy(p.y), u * p.size * (1.6 - a), 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = "lighter";
      } else if (p.type === "shard") {
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = Math.min(1, a * 1.4);
        g.fillStyle = p.color;
        g.save(); g.translate(sx(p.x), sy(p.y)); g.rotate(p.rot);
        const s = u * p.size;
        g.beginPath(); g.moveTo(-s, -s * 0.4); g.lineTo(s * 0.8, -s * 0.6); g.lineTo(s * 0.2, s * 0.7); g.closePath(); g.fill();
        g.restore();
        g.globalCompositeOperation = "lighter";
      } else {
        g.globalAlpha = a;
        g.strokeStyle = p.color;
        g.lineWidth = Math.max(1, u * p.size);
        g.beginPath(); g.moveTo(sx(p.x), sy(p.y)); g.lineTo(sx(p.x - p.vx * 0.03), sy(p.y - p.vy * 0.03)); g.stroke();
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  function glowDot(x, y, r, glow, a) {
    const u = unit();
    const R = Math.max(2, u * r);
    const grd = g.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), R);
    grd.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
    grd.addColorStop(0.25, `${glow}${0.8 * a})`);
    grd.addColorStop(1, `${glow}0)`);
    g.globalAlpha = 1;
    g.fillStyle = grd;
    g.beginPath(); g.arc(sx(x), sy(y), R, 0, Math.PI * 2); g.fill();
  }

  function sparks(x, y, n, color, speed = 2) {
    if (reduce) n = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
      parts.push({ type: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.25 + Math.random() * 0.35, size: 0.025, color, drag: 0.92, grav: 0, rot: 0, spin: 0 });
    }
  }

  return {
    resize,
    // pts: puntos del recorrido en unidades del dibujo. color: "#rrggbb"; glow: "rgba(r,g,b," (para degradados)
    beam(pts, { color, glow, onReflect, onEnd } = {}) {
      const lens = [];
      for (let k = 1; k < pts.length; k++) lens.push(Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      beam = { pts, lens, total: lens.reduce((a, b) => a + b, 0), t0: now(), color, glow, done: false, endAt: 0, next: 1, cbs: { onReflect, onEnd } };
      kick();
      return beam.total / SPEED; // segundos que tarda en llegar
    },
    // La pieza estalla: esquirlas de su color, fuego, humo y una onda
    explode([x, y], shardColors, glow) {
      const n = reduce ? 18 : 60;
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4.5;
        parts.push({ type: "shard", x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0, max: 1.1 + Math.random() * 0.9, size: 0.05 + Math.random() * 0.08, color: shardColors[k % shardColors.length], drag: 0.94, grav: 6, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 18 });
      }
      for (let k = 0; k < (reduce ? 8 : 26); k++) {
        const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
        parts.push({ type: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + Math.random() * 0.4, size: 0.035, color: k % 3 ? "#ffb347" : "#fff3c4", drag: 0.9, grav: 2, rot: 0, spin: 0 });
      }
      for (let k = 0; k < (reduce ? 4 : 12); k++) {
        const a = Math.random() * Math.PI * 2, v = 0.3 + Math.random() * 0.8;
        parts.push({ type: "smoke", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: 0, max: 1.2 + Math.random(), size: 0.18 + Math.random() * 0.15, color: "#2a2520", drag: 0.97, grav: -0.3, rot: 0, spin: 0 });
      }
      flashes.push({ x, y, t0: now(), ms: 500, r: 1.6, color: "rgba(255,190,90," });
      flashes.push({ x, y, t0: now(), ms: 650, r: 1.4, ring: "#ffd27a" });
      if (glow) flashes.push({ x, y, t0: now(), ms: 300, r: 1, color: glow });
      kick();
    },
    // El escudo del anubis aguanta: anillo dorado y chispas que rebotan
    block([x, y], color) {
      flashes.push({ x, y, t0: now(), ms: 600, r: 0.9, ring: "#ffe08a" });
      flashes.push({ x, y, t0: now(), ms: 400, r: 0.7, color: "rgba(255,224,138," });
      sparks(x, y, 24, color || "#ffe08a", 3.2);
      kick();
    },
    // El rayo se pierde fuera del tablero o pega en una esfinge
    fizzle([x, y], color) { sparks(x, y, 8, color, 1.5); kick(); },
    // Un brillo suave donde se movió o giró una pieza
    pulse([x, y], ring = "#ffd27a") { flashes.push({ x, y, t0: now(), ms: 450, r: 0.75, ring }); kick(); },
    stop() { beam = null; parts.length = 0; flashes.length = 0; g.clearRect(0, 0, w, h); },
    get busy() { return !!(beam && !beam.done); },
    destroy() { alive = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
  };
}
