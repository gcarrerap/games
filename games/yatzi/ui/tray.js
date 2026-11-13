// La bandeja: el paño donde ruedan los dados y la repisa de abajo donde se apartan. Se arma una vez y vive toda la
// partida, para que las animaciones no se corten cuando la mesa se redibuja.
//
// - roll(): los dados que no están apartados entran volando desde abajo (o desde la mano, si venían agitándose),
//   rebotan dos veces girando y se quedan con su cara. Cada rebote suena (sound.impact) en el momento justo.
// - rattle(): mientras se agita el teléfono (o se deja apretado el botón), los dados se juntan y castañetean.
// - place(): acomoda sin animar volar: apartados en la repisa, los demás donde cayeron.
import { dieHTML, SHOW, cubeTransform } from "./dice.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

export function createTray(host, sound) {
  host.innerHTML = `<div class="yz-felt" id="felt"><div class="yz-glow"></div>
      <div class="yz-dice">${[0, 1, 2, 3, 4].map(dieHTML).join("")}</div>
      <div class="yz-burst" id="burst" aria-live="polite"></div>
    </div>
    <div class="yz-rack" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<span class="slot s${i}"></span>`).join("")}</div>`;
  const dice = [...host.querySelectorAll(".yz-die")];
  const st = dice.map(() => ({ x: 0, y: 0, rz: 0, rx: 0, ry: 0, v: 1, held: false }));
  let geo = null, rattling = null, anims = [], timers = [], onTap = null, busy = false;

  function measure() {
    // El tamaño del dado sale del ancho de la caja y de su alto (paño + repisa ≈ 4.4 dados de alto)
    const r0 = host.getBoundingClientRect();
    const d = Math.round(Math.max(30, Math.min((r0.width - 20) / 6.2, (r0.height - 28) / 4.4, 96)));
    if (host.style.getPropertyValue("--d") !== `${d}px`) host.style.setProperty("--d", `${d}px`);
    const r = host.getBoundingClientRect();
    const felt = host.querySelector(".yz-felt").getBoundingClientRect();
    const rack = host.querySelector(".yz-rack").getBoundingClientRect();
    geo = {
      d, w: r.width, h: r.height,
      // Zona libre del paño (relativa al host) y la repisa
      fx: felt.left - r.left, fy: felt.top - r.top, fw: felt.width, fh: felt.height,
      ry: rack.top - r.top + rack.height / 2, rx0: rack.left - r.left, rw: rack.width,
    };
    return geo;
  }
  const slotOf = (i) => ({ x: geo.rx0 + (geo.rw * (i + 0.5)) / 5 - geo.d / 2, y: geo.ry - geo.d / 2 });

  // Lugares sin encimarse en el paño para los dados que caen
  function spots(n) {
    const out = [], m = geo.d * 0.35, min = geo.d * 1.32;
    for (let k = 0; k < n; k++) {
      let best = null;
      for (let t = 0; t < 60; t++) {
        const p = { x: geo.fx + rand(m, geo.fw - geo.d - m), y: geo.fy + rand(m, geo.fh - geo.d - m) };
        const dist = Math.min(Infinity, ...out.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
        if (dist >= min) { best = p; break; }
        if (!best || dist > best.dist) best = { ...p, dist };
      }
      out.push(best);
    }
    return out;
  }

  function paint(i) {
    const s = st[i], el = dice[i];
    el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.held ? 0 : s.rz}deg)`;
    el.querySelector(".yz-cube").style.transform = cubeTransform(s.rx, s.ry);
    el.classList.toggle("held", s.held);
    el.dataset.v = s.v;
  }
  const faceTo = (s, v) => { s.v = v; [s.rx, s.ry] = SHOW[v]; };

  function stopAll() {
    for (const a of anims) { try { a.cancel(); } catch { /* ya terminó */ } }
    anims = [];
    timers.forEach(clearTimeout); timers = [];
    stopRattle(false);
    busy = false;
  }

  // Coloca sin volar. held[i]: si va en la repisa. idle: los dados de antes del primer tiro, alineados y apagados.
  function place(values, held, { idle = false, smooth = true } = {}) {
    if (busy) return;
    measure();
    const row = (i) => ({ x: geo.fx + (geo.fw * (i + 0.5)) / 5 - geo.d / 2, y: geo.fy + geo.fh * 0.5 - geo.d / 2 });
    dice.forEach((el, i) => {
      const s = st[i];
      el.classList.toggle("smooth", smooth);
      el.classList.toggle("idle", idle);
      faceTo(s, values[i]);
      const wasHeld = s.held;
      s.held = !!held[i] && !idle;
      if (s.held) Object.assign(s, slotOf(i));
      else if (idle) { Object.assign(s, row(i)); s.rz = 0; }
      else if (wasHeld || !s.placed) { const [p] = spots(1); Object.assign(s, p); s.rz = rand(-20, 20); }
      // Si quedó fuera del paño (cambió el tamaño), se regresa
      if (!s.held && !idle && (s.x < geo.fx || s.y < geo.fy || s.x > geo.fx + geo.fw - geo.d || s.y > geo.fy + geo.fh - geo.d)) { const [p] = spots(1); Object.assign(s, p); }
      s.placed = true;
      paint(i);
    });
  }

  // El tiro: los dados no apartados vuelan a su lugar. power (0–1) lo hace más rápido y con más vueltas.
  // Regresa la duración en ms.
  function roll(values, held, { power = 0.5, onDone = null } = {}) {
    stopAll();
    measure();
    busy = true;
    const free = dice.map((_, i) => i).filter((i) => !held[i]);
    const dest = spots(free.length);
    const fromHand = !!rattling || dice.some((el) => el.classList.contains("shaking"));
    const dur = Math.round(1250 - power * 300);
    dice.forEach((el, i) => { el.classList.remove("idle", "shaking"); el.classList.add("smooth"); });
    // Los apartados a la repisa (con transición)
    dice.forEach((el, i) => { if (held[i]) { const s = st[i]; s.held = true; faceTo(s, values[i]); Object.assign(s, slotOf(i)); paint(i); } });
    free.forEach((i, k) => {
      const el = dice[i], s = st[i], p = dest[k];
      el.classList.remove("smooth");
      const from = fromHand ? { x: s.x, y: s.y } : { x: geo.fx + geo.fw / 2 + rand(-geo.fw * 0.3, geo.fw * 0.3) - geo.d / 2, y: geo.h + geo.d * rand(0.6, 1.4) };
      const r0 = { x: s.rx, y: s.ry };
      s.held = false; s.placed = true; faceTo(s, values[i]); s.rz = rand(-28, 28); Object.assign(s, p);
      // Vueltas enteras extra para llegar girando a su cara
      const spinX = 360 * pick([2, 3, -2, -3]) * (0.8 + power * 0.6), spinY = 360 * pick([1, 2, -1, -2]);
      const fx = s.rx + Math.round(spinX / 360) * 360, fy = s.ry + Math.round(spinY / 360) * 360;
      const lag = k * rand(25, 55);
      const mid = (a, b, t) => a + (b - a) * t;
      // Trayectoria: vuelo largo, primer bote a 70% del camino, saltito, segundo bote, reposo
      const b1 = { x: mid(from.x, p.x, 0.72) + rand(-10, 10), y: mid(from.y, p.y, 0.78) };
      const b2 = { x: mid(from.x, p.x, 0.92), y: mid(from.y, p.y, 0.95) };
      const opts = { duration: dur, delay: lag, easing: "linear" };
      const rz0 = s.rz + rand(-200, 200);
      anims.push(el.animate([
        { transform: `translate(${from.x}px, ${from.y}px) rotate(${rz0}deg)`, offset: 0, easing: "cubic-bezier(.25,.6,.5,1)" },
        { transform: `translate(${b1.x}px, ${b1.y}px) rotate(${mid(rz0, s.rz, 0.7)}deg)`, offset: 0.42, easing: "cubic-bezier(.3,.6,.5,1)" },
        { transform: `translate(${b2.x}px, ${b2.y}px) rotate(${mid(rz0, s.rz, 0.93)}deg)`, offset: 0.7, easing: "ease-out" },
        { transform: `translate(${p.x}px, ${p.y}px) rotate(${s.rz}deg)`, offset: 1 },
      ], opts));
      anims.push(el.querySelector(".yz-lift").animate([
        { transform: "scale(1.55) translateY(-8%)", offset: 0, easing: "ease-in" },
        { transform: "scale(1)", offset: 0.42, easing: "ease-out" },
        { transform: "scale(1.16) translateY(-4%)", offset: 0.55, easing: "ease-in" },
        { transform: "scale(1)", offset: 0.7, easing: "ease-out" },
        { transform: "scale(1.04)", offset: 0.8, easing: "ease-in" },
        { transform: "scale(1)", offset: 0.88 },
        { transform: "scale(1)", offset: 1 },
      ], opts));
      anims.push(el.querySelector(".yz-shadow").animate([
        { transform: "translate(18%, 30%) scale(.7)", opacity: 0.25, offset: 0 },
        { transform: "translate(5%, 8%) scale(1)", opacity: 0.6, offset: 0.42 },
        { transform: "translate(9%, 14%) scale(.9)", opacity: 0.45, offset: 0.55 },
        { transform: "translate(5%, 8%) scale(1)", opacity: 0.6, offset: 0.7 },
        { transform: "translate(5%, 8%) scale(1)", opacity: 0.6, offset: 1 },
      ], opts));
      anims.push(el.querySelector(".yz-cube").animate([
        { transform: cubeTransform(r0.x, r0.y), offset: 0 },
        { transform: cubeTransform(mid(r0.x, fx, 0.7), mid(r0.y, fy, 0.7)), offset: 0.42 },
        { transform: cubeTransform(mid(r0.x, fx, 0.93), mid(r0.y, fy, 0.93)), offset: 0.7 },
        { transform: cubeTransform(fx, fy), offset: 1 },
      ].map((f, j) => ({ ...f, easing: j < 3 ? "ease-out" : undefined })), opts));
      s.rx = fx; s.ry = fy;
      paint(i);
      // Los botes suenan cuando pegan
      for (const [at, str] of [[0.42, 1], [0.7, 0.55], [0.88, 0.25]]) timers.push(setTimeout(() => sound.impact(str * (0.6 + power * 0.4), i), lag + dur * at));
    });
    timers.push(setTimeout(() => {
      busy = false;
      // Se quedan con su cara sin las vueltas extra (para que el siguiente giro empiece cerca)
      dice.forEach((_, i) => { faceTo(st[i], st[i].v); paint(i); });
      anims = [];
      onDone && onDone();
    }, dur + 5 * 55 + 30));
    return dur + 250;
  }

  // Agitar: los dados libres se juntan en "la mano" y castañetean hasta que se suelta
  function startRattle(held) {
    if (rattling || busy) return;
    measure();
    const cx = geo.fx + geo.fw / 2, cy = geo.fy + geo.fh * 0.62;
    const free = dice.map((_, i) => i).filter((i) => !held[i]);
    free.forEach((i) => { dice[i].classList.remove("smooth", "idle"); dice[i].classList.add("shaking"); });
    let last = 0, power = 0.4;
    const tick = (t) => {
      if (!rattling) return;
      if (t - last > 55) {
        last = t;
        free.forEach((i, k) => {
          const s = st[i], a = (k / free.length) * Math.PI * 2 + t / 180;
          s.x = cx - geo.d / 2 + Math.cos(a) * geo.d * 0.55 + rand(-6, 6) * (1 + power * 2);
          s.y = cy - geo.d / 2 + Math.sin(a) * geo.d * 0.35 + rand(-6, 6) * (1 + power * 2);
          s.rx += rand(40, 120); s.ry += rand(40, 120); s.rz = rand(-40, 40);
          paint(i);
        });
        sound.rattle(power);
      }
      rattling.raf = requestAnimationFrame(tick);
    };
    rattling = { raf: requestAnimationFrame(tick), setPower(p) { power = Math.max(0.2, Math.min(1, p)); } };
  }
  function stopRattle(putBack = true, held = []) {
    if (!rattling) return;
    cancelAnimationFrame(rattling.raf);
    rattling = null;
    if (putBack) { dice.forEach((el) => el.classList.remove("shaking")); place(st.map((s) => s.v), held, { smooth: true }); }
  }

  host.addEventListener("click", (e) => {
    const d = e.target.closest(".yz-die");
    if (d && onTap && !busy) onTap(Number(d.dataset.die));
  });

  // Destello de una combinación sobre el paño
  function burst(html, cls = "") {
    const b = host.querySelector("#burst");
    b.className = `yz-burst show ${cls}`;
    b.innerHTML = html;
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.className = "yz-burst"; }, 1900);
  }
  // Brillo en los dados que forman la combinación
  function glow(idx) {
    dice.forEach((el, i) => el.classList.toggle("glow", idx.includes(i)));
    timers.push(setTimeout(() => dice.forEach((el) => el.classList.remove("glow")), 1800));
  }
  // Marca de consejo: los dados que conviene apartar
  function hint(idx) { dice.forEach((el, i) => el.classList.toggle("hint", !!idx && idx.includes(i))); }
  function tappable(on) { dice.forEach((el) => { el.classList.toggle("tap", on); el.tabIndex = on ? 0 : -1; }); }

  return {
    measure, place, roll, startRattle, stopRattle, stopAll, burst, glow, hint, tappable,
    get busy() { return busy; },
    get rattling() { return !!rattling; },
    setPower(p) { rattling && rattling.setPower(p); },
    onTap(fn) { onTap = fn; },
    dieEl: (i) => dice[i],
  };
}
