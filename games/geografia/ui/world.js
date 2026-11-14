// El mapamundi de Geografía en un <canvas>: proyección Tierra Igual, arrastrar para moverse, pellizcar o rueda para
// acercar, vuelos suaves de cámara, pin que cae con rebote y el país resaltado con brillo.
//
// Tres pinturas: «con» (países de colores con fronteras blancas), «sin» (una sola tierra con halo de costa y rejilla,
// nada que delate dónde está cada país) y «cont» (cada país del color de su continente). Los trazos se arman una vez
// en unidades del plano (Path2D) y se simplifican en tres niveles de detalle según el zoom, así moverse es fluido.
// El mapa base se guarda en un lienzo aparte y solo el pin y los brillos se redibujan en cada cuadro.
import { geometry, equalEarth, equalEarthInvert, EQUAL_EARTH_BOUNDS } from "../engine/geo.js";
import { COUNTRIES, TERRITORIES } from "../data/world.js";
import { CONTINENTS } from "../engine/catalog.js";

export const W = EQUAL_EARTH_BOUNDS.x * 2; // ancho del mundo en el plano
export const YM = EQUAL_EARTH_BOUNDS.y; // mitad del alto
const LODS = [0.006, 0.0018, 0]; // tolerancia de cada nivel de detalle (plano); 0 = todo
const PALETTE = ["#e9c4a2", "#b9d6a9", "#f2de9f", "#aacbe2", "#dbb6d8", "#f1b6ab", "#c0e1d1", "#d9d2a8"];
const CONT_COLOR = Object.fromEntries(CONTINENTS.map((c) => [c.id, c.color]));
const ALL = [...COUNTRIES, ...TERRITORIES];
const META = new Map(ALL.map((c) => [c.code, c]));

// ───────── Trazos
const ringsXY = new Map(); // code → [Float64Array xy][] (proyectados, y hacia arriba)
function projected(code) {
  let r = ringsXY.get(code);
  if (r) return r;
  r = [];
  const g = geometry(code);
  if (g) for (const p of g.polys) for (const ring of p.rings) {
    const a = new Float64Array(ring.length);
    for (let i = 0; i < ring.length; i += 2) { const [x, y] = equalEarth(ring[i], ring[i + 1]); a[i] = x; a[i + 1] = y; }
    r.push(a);
  }
  ringsXY.set(code, r);
  return r;
}
function addRings(path, code, tol) {
  for (const a of projected(code)) {
    let lx = a[0], ly = a[1], n = 1;
    path.moveTo(lx, ly);
    for (let i = 2; i < a.length; i += 2) {
      if (tol && Math.hypot(a[i] - lx, a[i + 1] - ly) < tol && i < a.length - 2) continue;
      path.lineTo(a[i], a[i + 1]); lx = a[i]; ly = a[i + 1]; n++;
    }
    path.closePath();
  }
}
const pathCache = new Map();
function pathOf(key, lod, codes) {
  const k = `${key}:${lod}`;
  let p = pathCache.get(k);
  if (!p) { p = new Path2D(); for (const c of codes()) addRings(p, c, LODS[lod]); pathCache.set(k, p); }
  return p;
}
const countryPath = (code, lod) => pathOf(code, lod, () => [code]);
const allPath = (lod) => pathOf("*", lod, () => ALL.map((c) => c.code));
const colorPath = (i, lod) => pathOf(`#${i}`, lod, () => ALL.filter((c) => (c.color || 0) === i).map((c) => c.code));
const contPath = (id, lod) => pathOf(`@${id}`, lod, () => ALL.filter((c) => c.cont === id).map((c) => c.code));

// Rejilla de meridianos y paralelos cada 30°
let graticule = null;
function gratPath() {
  if (graticule) return graticule;
  const p = new Path2D();
  for (let lon = -180; lon <= 180; lon += 30) { p.moveTo(...equalEarth(lon, -90)); for (let lat = -88; lat <= 90; lat += 2) p.lineTo(...equalEarth(lon, lat)); }
  for (let lat = -60; lat <= 60; lat += 30) { p.moveTo(...equalEarth(-180, lat)); for (let lon = -176; lon <= 180; lon += 4) p.lineTo(...equalEarth(lon, lat)); }
  graticule = p;
  return p;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapDx = (d) => d - W * Math.round(d / W);

export function createWorld(canvas, { onTap = null, interactive = true, reduced = false } = {}) {
  const g = canvas.getContext("2d");
  const base = document.createElement("canvas"), bg = base.getContext("2d");
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, k = 1, kMin = 1, kMax = 1;
  let style = { paint: "con", highlight: null, tint: "#ffd45a", dim: false };
  let markers = [], lines = [], flight = null, raf = 0, baseDirty = true, sized = false, initial = null, dead = false;
  const pointers = new Map();
  let gesture = null;

  const lodFor = () => { for (let i = 0; i < LODS.length - 1; i++) if (LODS[i] * k <= 0.9) return i; return LODS.length - 1; };
  const sx = (ex) => (ex - cx) * k + w / 2, sy = (ey) => h / 2 - (ey - cy) * k;
  /** Pantalla de un punto (la copia del mundo más cercana al centro de la vista, o a `near` si se pide). */
  function project(lon, lat, near = null) {
    const [ex, ey] = equalEarth(lon, lat), ref = near === null ? cx : near;
    return [sx(ex + W * Math.round((ref - ex) / W)), sy(ey)];
  }
  /** [lon, lat] bajo un punto de la pantalla, o null si cae fuera del mundo. */
  function lonLatAt(px, py) {
    const ex = cx + (px - w / 2) / k, ey = cy - (py - h / 2) / k;
    if (Math.abs(ey) > YM) return null;
    const [lon, lat] = equalEarthInvert(ex - W * Math.round(ex / W), ey);
    return Number.isFinite(lon) && Math.abs(lon) <= 180.2 && Math.abs(lat) <= 90 ? [lon, lat] : null;
  }
  function clamp() {
    k = Math.max(kMin, Math.min(kMax, k));
    cx = wrapDx(cx);
    const half = h / (2 * k);
    cy = half >= YM ? 0 : Math.max(-YM + half, Math.min(YM - half, cy));
  }
  const dirty = () => { baseDirty = true; kick(); };
  function kick() { if (!raf && !dead) raf = requestAnimationFrame(frame); }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.round(r.width), nh = Math.round(r.height);
    if (!nw || !nh || (nw === w && nh === h && sized)) return;
    const first = !sized;
    w = nw; h = nh; dpr = Math.min(2.5, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    base.width = canvas.width; base.height = canvas.height;
    const keep = k / (kMin || 1);
    kMin = Math.min(w / W, h / (2 * YM)); kMax = kMin * 40;
    sized = true;
    if (first) { if (initial && initial.ext) flyExtent(initial.ext, { pad: initial.pad, maxK: initial.maxK, instant: true }); else if (initial) flyTo(initial.box, { ...initial.opts, instant: true }); else { k = kMin; cx = 0; cy = 0; } } else k = kMin * keep;
    clamp(); dirty();
  }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else globalThis.addEventListener("resize", resize);

  // ───────── Pintar el mapa base
  function paintBase() {
    baseDirty = false;
    const lod = lodFor();
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sea = bg.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    if (style.paint === "sin") { sea.addColorStop(0, "#2a6fa3"); sea.addColorStop(1, "#154068"); } else { sea.addColorStop(0, "#2f78a8"); sea.addColorStop(1, "#173f6a"); }
    bg.fillStyle = sea; bg.fillRect(0, 0, w, h);
    const copies = [];
    for (let i = -3; i <= 3; i++) { const x0 = sx(-W / 2 + W * i), x1 = sx(W / 2 + W * i); if (x1 >= 0 && x0 <= w) copies.push(W * i); }
    for (const off of copies) {
      bg.setTransform(dpr * k, 0, 0, -dpr * k, dpr * (w / 2 + (off - cx) * k), dpr * (h / 2 + cy * k));
      const px = 1 / k;
      bg.lineJoin = "round";
      // Rejilla
      bg.strokeStyle = style.paint === "sin" ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.07)";
      bg.lineWidth = px * 0.8; bg.stroke(gratPath());
      if (style.paint === "sin") {
        bg.strokeStyle = "rgba(190,230,255,.13)"; bg.lineWidth = px * 9; bg.stroke(allPath(lod));
        bg.strokeStyle = "rgba(190,230,255,.22)"; bg.lineWidth = px * 4; bg.stroke(allPath(lod));
        bg.fillStyle = "#d5dcb6"; bg.fill(allPath(lod), "evenodd");
        bg.strokeStyle = "#8c9a72"; bg.lineWidth = px * 0.9; bg.stroke(allPath(lod));
      } else if (style.paint === "cont") {
        for (const c of CONTINENTS) { bg.fillStyle = CONT_COLOR[c.id]; bg.globalAlpha = style.dim ? 0.45 : 0.95; bg.fill(contPath(c.id, lod), "evenodd"); }
        bg.globalAlpha = 1; bg.fillStyle = "#cfd8dc"; bg.fill(contPath("antartida", lod), "evenodd");
        bg.strokeStyle = "rgba(255,255,255,.75)"; bg.lineWidth = px * 0.8; bg.stroke(allPath(lod));
      } else {
        for (let i = 0; i < PALETTE.length; i++) { bg.fillStyle = PALETTE[i]; bg.fill(colorPath(i, lod), "evenodd"); }
        bg.strokeStyle = "rgba(255,255,255,.85)"; bg.lineWidth = px * 0.9; bg.stroke(allPath(lod));
        bg.strokeStyle = "rgba(60,70,60,.35)"; bg.lineWidth = px * 0.45; bg.stroke(allPath(lod));
      }
      if (style.highlight) {
        const p = countryPath(style.highlight, lod);
        bg.save();
        bg.shadowColor = style.tint; bg.shadowBlur = 22 * dpr;
        bg.fillStyle = style.tint; bg.globalAlpha = 0.62; bg.fill(p, "evenodd");
        bg.globalAlpha = 1; bg.strokeStyle = style.tint; bg.lineWidth = px * 2.2; bg.stroke(p);
        bg.restore();
        bg.setTransform(dpr * k, 0, 0, -dpr * k, dpr * (w / 2 + (off - cx) * k), dpr * (h / 2 + cy * k));
        bg.strokeStyle = "rgba(255,255,255,.95)"; bg.lineWidth = px * 1.1; bg.stroke(p);
      }
    }
  }

  // ───────── Pin, estrella de la respuesta y líneas
  function pinShape(x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-3, -9, -13, -14, -13, -25); g.arc(0, -25, 13, Math.PI, 0); g.bezierCurveTo(13, -14, 3, -9, 0, 0); g.closePath();
    g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.fillStyle = color; g.fill(); g.shadowColor = "transparent";
    g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.95)"; g.stroke();
    g.beginPath(); g.arc(0, -25, 5, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
    g.restore();
  }
  function starShape(x, y, r, color) {
    g.save(); g.translate(x, y); g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 8; g.fillStyle = color; g.fill();
    g.shadowColor = "transparent"; g.lineWidth = 2; g.strokeStyle = "#fff"; g.stroke(); g.restore();
  }
  function label(text, x, y) {
    g.save(); g.font = "700 13px ui-rounded, 'Trebuchet MS', system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const tw = g.measureText(text).width + 16;
    g.fillStyle = "rgba(14,26,44,.82)"; g.beginPath(); g.roundRect(x - tw / 2, y - 12, tw, 24, 12); g.fill();
    g.fillStyle = "#fff"; g.fillText(text, x, y + 0.5); g.restore();
  }
  function overlay(now) {
    let busy = false;
    for (const l of lines) {
      const a = project(l.a[0], l.a[1]), b = project(l.b[0], l.b[1], sxToEx(a[0]));
      const p = reduced ? 1 : Math.min(1, (now - (l.t0 || 0)) / 600);
      if (p < 1) busy = true;
      g.save(); g.setLineDash([2, 9]); g.lineCap = "round"; g.lineWidth = 3; g.strokeStyle = l.color || "#fff";
      g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 4;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + (b[0] - a[0]) * ease(p), a[1] + (b[1] - a[1]) * ease(p)); g.stroke(); g.restore();
      if (l.text && p >= 1) label(l.text, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 18);
    }
    for (const m of markers) {
      const [x, y] = project(m.lon, m.lat), age = reduced ? 9999 : now - (m.t0 || 0);
      if (m.kind === "pin") {
        let dy = 0, s = 1;
        if (age < 520) { busy = true; const t = age / 520; dy = -Math.abs(Math.cos(t * Math.PI * 1.5)) * (1 - t) * 70; s = 1 + (1 - t) * 0.25; }
        if (age < 700) { g.save(); g.globalAlpha = 0.4 * (1 - Math.min(1, age / 700)); g.fillStyle = "#000"; g.beginPath(); g.ellipse(x, y, 9 * (1 - dy / 140), 4, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
        if (age > 120 && age < 800) { // onda al caer
          const t = (age - 120) / 680; busy = true;
          g.save(); g.globalAlpha = 0.7 * (1 - t); g.lineWidth = 3; g.strokeStyle = "#fff"; g.beginPath(); g.arc(x, y, 6 + t * 34, 0, Math.PI * 2); g.stroke(); g.restore();
        }
        pinShape(x, y + dy, s, m.color || "#e5484d");
      } else if (m.kind === "star") {
        busy = true;
        const t = (age % 1600) / 1600, sc = age < 450 ? ease(age / 450) * 1.2 : 1;
        g.save(); g.globalAlpha = 0.65 * (1 - t); g.lineWidth = 3; g.strokeStyle = m.color || "#ffd45a"; g.beginPath(); g.arc(x, y, 12 + t * 40, 0, Math.PI * 2); g.stroke(); g.restore();
        starShape(x, y, 15 * sc, m.color || "#ffd45a");
      } else if (m.kind === "dot") {
        g.save(); g.fillStyle = m.color || "#fff"; g.lineWidth = 2; g.strokeStyle = "#fff"; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
      if (m.text) label(m.text, x, y + (m.kind === "pin" ? 16 : 28));
    }
    return busy;
  }
  const sxToEx = (px) => cx + (px - w / 2) / k;

  function frame(now) {
    raf = 0;
    if (dead || !sized) return;
    if (flight) {
      const t = flight.ms ? Math.min(1, (now - flight.t0) / flight.ms) : 1, e = ease(t);
      cx = flight.cx0 + flight.dcx * e; cy = flight.cy0 + (flight.cy1 - flight.cy0) * e;
      k = Math.exp(Math.log(flight.k0) + (Math.log(flight.k1) - Math.log(flight.k0)) * e);
      clamp(); baseDirty = true;
      if (t >= 1) flight = null;
    }
    if (baseDirty) paintBase();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(base, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const busy = overlay(now);
    if (flight || busy) kick();
  }

  // ───────── Cámara
  function extent(points) {
    // Puntos [lon, lat] acomodados alrededor del primero (para que no abarquen medio mundo por cruzar el 180°)
    const [e0] = [equalEarth(points[0][0], points[0][1])];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [lon, lat] of points) {
      const [ex, ey] = equalEarth(lon, lat), x = ex + W * Math.round((e0[0] - ex) / W);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, ey); y1 = Math.max(y1, ey);
    }
    return { x0, x1, y0, y1 };
  }
  function flyExtent(e, { pad = 0.25, instant = false, maxK = null, ms = 750 } = {}) {
    if (!sized) { initial = { box: null, opts: {}, ext: e, pad, maxK }; return; }
    const dx = Math.max(1e-6, e.x1 - e.x0), dy = Math.max(1e-6, e.y1 - e.y0);
    let k1 = Math.min((w * (1 - pad)) / dx, (h * (1 - pad)) / dy);
    k1 = Math.max(kMin, Math.min(maxK ? Math.min(kMax, maxK * kMin) : kMax, k1));
    const cx1 = (e.x0 + e.x1) / 2, cy1 = (e.y0 + e.y1) / 2;
    if (instant || reduced) { k = k1; cx = cx1; cy = cy1; flight = null; clamp(); dirty(); return; }
    flight = { t0: performance.now(), ms, cx0: cx, dcx: wrapDx(cx1 - cx), cy0: cy, cy1, k0: k, k1 };
    kick();
  }
  /** Vuela a la caja [lon0, lat0, lon1, lat1] (las longitudes pueden pasar de ±180). */
  function flyTo(box, opts = {}) {
    if (!box) { flyExtent({ x0: -W / 2, x1: W / 2, y0: -YM, y1: YM }, { ...opts, pad: 0 }); return; }
    const pts = [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]], [(box[0] + box[2]) / 2, box[1]], [(box[0] + box[2]) / 2, box[3]], [box[0], (box[1] + box[3]) / 2], [box[2], (box[1] + box[3]) / 2]];
    const e = extent(pts);
    if (!sized) { initial = { box, opts }; return; }
    flyExtent(e, opts);
  }
  function flyToPoints(list, opts = {}) { if (list.length) flyExtent(extent(list), opts); }

  function zoomAt(px, py, f) {
    const ex = cx + (px - w / 2) / k, ey = cy - (py - h / 2) / k;
    flight = null; k *= f; clamp();
    cx = ex - (px - w / 2) / k; cy = ey + (py - h / 2) / k;
    clamp(); dirty();
  }

  // ───────── Gestos
  const rectOf = () => canvas.getBoundingClientRect();
  function onDown(e) {
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (interactive) flight = null;
    gesture = { moved: 0, t0: performance.now(), pinch: null, multi: pointers.size > 1 };
    if (pointers.size === 2) gesture.pinch = pinchState();
  }
  const pinchState = () => { const [a, b] = [...pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p || !gesture) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    gesture.moved += Math.abs(dx) + Math.abs(dy);
    if (!interactive) return;
    if (pointers.size === 1) { cx -= dx / k; cy += dy / k; clamp(); dirty(); }
    else if (pointers.size === 2 && gesture.pinch) {
      const s = pinchState(), r = rectOf();
      zoomAt(s.mx - r.left, s.my - r.top, s.d / gesture.pinch.d);
      cx -= (s.mx - gesture.pinch.mx) / k; cy += (s.my - gesture.pinch.my) / k; clamp(); dirty();
      gesture.pinch = s;
    }
    canvas.classList.add("grabbing");
  }
  function onUp(e) {
    const had = pointers.delete(e.pointerId);
    canvas.classList.remove("grabbing");
    if (!gesture) return;
    const tap = had && !gesture.multi && gesture.moved < 10 && performance.now() - gesture.t0 < 600;
    if (pointers.size === 0) {
      gesture = null;
      if (tap && onTap) { const r = rectOf(), px = e.clientX - r.left, py = e.clientY - r.top; onTap(lonLatAt(px, py), px, py); }
    } else if (pointers.size === 1) { gesture.pinch = null; gesture.multi = true; }
  }
  function onWheel(e) {
    if (!interactive) return;
    e.preventDefault();
    const r = rectOf();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
  }
  function onDbl(e) { if (!interactive) return; const r = rectOf(); zoomAt(e.clientX - r.left, e.clientY - r.top, 2); }
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", onDbl);

  resize();
  return {
    canvas,
    setStyle(patch) { style = { ...style, ...patch }; dirty(); },
    setMarkers(list) { markers = list.map((m) => ({ t0: performance.now(), ...m })); kick(); },
    setLines(list) { lines = list.map((l) => ({ t0: performance.now(), ...l })); kick(); },
    flyTo, flyToPoints,
    fit(opts = {}) { flyTo(null, opts); },
    zoomBy(f) { zoomAt(w / 2, h / 2, f); },
    pan(dx, dy) { cx += dx / k; cy -= dy / k; flight = null; clamp(); dirty(); },
    centerLonLat() { return lonLatAt(w / 2, h / 2); },
    setInteractive(v) { interactive = !!v; },
    lonLatAt, project, redraw: dirty, resize,
    get zoom() { return k / (kMin || 1); },
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro ? ro.disconnect() : globalThis.removeEventListener("resize", resize);
      for (const [t, f] of [["pointerdown", onDown], ["pointermove", onMove], ["pointerup", onUp], ["pointercancel", onUp], ["wheel", onWheel], ["dblclick", onDbl]]) canvas.removeEventListener(t, f);
    },
  };
}

export const countryMeta = (code) => META.get(code) || null;
