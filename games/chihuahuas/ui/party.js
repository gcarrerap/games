// La fiesta en pantalla: los perros de Petra, el confeti, el nombre y el audio.
// Se dispara una sola vez por evento (takeParty). Redibujar la mesa no la reinicia: el cartel vive fuera del
// HTML de la mesa. Un toque en la fiesta, el botón Saltar o una tecla la cierran. El botón de la siguiente etapa
// sigue abajo y se puede tocar: la fiesta no bloquea el turno.
import { CLIPS } from "../sfx/index.js";
import {
  PAPEL, CONFETTI, PARTY_MS, MUSIC_DUCK, partyHears, partySize,
} from "../sfx/celebrate.js";
import { href } from "./art.js";

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const asset = (file) => new URL(`../assets/${file}`, import.meta.url).href;

function lineup(dogs, winner) {
  const rest = dogs.filter((d) => d.dog !== winner);
  const mid = Math.ceil(rest.length / 2);
  const star = dogs.find((d) => d.dog === winner);
  return [...rest.slice(0, mid), ...(star ? [star] : []), ...rest.slice(mid)];
}

function fallback(dog) {
  const el = document.createElement("span");
  el.className = "party-fallback";
  el.dataset.dog = dog.id;
  el.textContent = "🐕";
  el.setAttribute("aria-label", dog.name);
  return el;
}

function dogFigure(dog, winner, reduced) {
  const fig = document.createElement("figure");
  fig.className = "party-dog" + (dog.dog === winner ? " win" : "");
  fig.dataset.dog = dog.id;
  const img = (src, cls, alt) => {
    const el = document.createElement("img");
    el.className = cls;
    el.alt = alt;
    el.draggable = false;
    el.decoding = "async";
    el.src = src;
    return el;
  };
  if (reduced) {
    const face = href(`face-${dog.id}`);
    fig.append(face ? img(face, "dog facepic", dog.name) : fallback(dog));
    return fig;
  }
  const shadow = img(asset(dog.shadow), "shadow", "");
  const body = img(asset(dog.file), "dog", dog.anim === "tropiezo" ? `${dog.name} se tropieza` : `${dog.name} festeja`);
  shadow.addEventListener("error", () => shadow.remove());
  body.addEventListener("error", () => {
    shadow.remove();
    body.remove();
    if (!fig.querySelector(".party-fallback")) fig.append(fallback(dog));
  });
  fig.append(shadow, body);
  return fig;
}

function banner() {
  const el = document.createElement("div");
  el.className = "party-banner";
  el.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 12; i++) {
    const flag = document.createElement("i");
    flag.style.background = PAPEL[i % PAPEL.length];
    el.append(flag);
  }
  return el;
}

// Confeti de papel picado. Con poco movimiento, un puñado quieto. Si no hay canvas, no pasa nada.
function startConfetti(canvas, count, reduced) {
  const ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return () => {};
  let alive = true, frame = 0, last = performance.now();
  const parts = [];
  const rnd = Math.random;
  const spawn = (w, h) => {
    parts.length = 0;
    const n = Math.max(0, count);
    for (let i = 0; i < n; i++) {
      const side = rnd();
      let x, y, vx, vy;
      if (reduced) {
        x = rnd() * w; y = rnd() * h * 0.85; vx = 0; vy = 0;
      } else if (side < 0.45) {
        x = rnd() * w; y = h + 8; vx = (rnd() - 0.5) * 2.4; vy = -(3.2 + rnd() * 4.8);
      } else if (side < 0.72) {
        x = -8; y = h * (0.35 + rnd() * 0.6); vx = 1.4 + rnd() * 2.6; vy = -(1.6 + rnd() * 3.4);
      } else {
        x = w + 8; y = h * (0.35 + rnd() * 0.6); vx = -(1.4 + rnd() * 2.6); vy = -(1.6 + rnd() * 3.4);
      }
      parts.push({
        x, y, vx, vy, w: 6 + rnd() * 10, h: 8 + rnd() * 14, rot: rnd() * 6.3, vr: (rnd() - 0.5) * 0.28,
        color: PAPEL[i % PAPEL.length], grav: reduced ? 0 : 0.04 + rnd() * 0.03, kind: rnd() < 0.3 ? "strip" : "bit",
      });
    }
    if (!reduced) {
      const strips = Math.max(4, Math.round(n * 0.28));
      for (let i = 0; i < strips; i++) {
        parts.push({
          x: (i + 0.5) * (w / strips), y: -16 - rnd() * h * 0.3, vx: (rnd() - 0.5) * 0.4, vy: 0.55 + rnd() * 0.9,
          w: 9 + rnd() * 8, h: 14 + rnd() * 16, rot: rnd() * 0.6, vr: (rnd() - 0.5) * 0.08,
          color: PAPEL[i % PAPEL.length], grav: 0.008, kind: "strip",
        });
      }
    }
  };
  const fit = () => {
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1);
    const w = canvas.clientWidth || window.innerWidth || 360, h = canvas.clientHeight || window.innerHeight || 640;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  };
  let box = fit();
  spawn(box.w || 300, box.h || 500);
  const drawBit = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  };
  const paint = () => {
    ctx.clearRect(0, 0, box.w, box.h);
    for (const p of parts) drawBit(p);
  };
  const step = (now) => {
    if (!alive) return;
    const dt = Math.min(34, now - last);
    last = now;
    box = { w: canvas.clientWidth || box.w, h: canvas.clientHeight || box.h };
    for (const p of parts) {
      p.vy += p.grav * (dt / 16);
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.rot += p.vr * (dt / 16);
      if (p.y > box.h + 30) { p.y = -20; p.x = Math.random() * (box.w || 1); p.vy = 0.5 + Math.random(); }
    }
    paint();
    frame = requestAnimationFrame(step);
  };
  if (reduced) paint();
  else frame = requestAnimationFrame(step);
  const onResize = () => { box = fit(); if (reduced) paint(); };
  window.addEventListener("resize", onResize);
  return () => { alive = false; if (frame) cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); };
}

function build(party, size, reduced) {
  const root = document.createElement("div");
  root.className = `party ${size}${reduced ? " still" : ""}`;
  root.dataset.party = party.key;
  root.dataset.dog = party.winnerId;
  const canvas = document.createElement("canvas");
  canvas.className = "party-fx";
  canvas.setAttribute("aria-hidden", "true");
  const hit = document.createElement("div");
  hit.className = "party-hit";
  const name = document.createElement("p");
  name.className = "party-name";
  name.setAttribute("role", "status");
  name.textContent = party.shout;
  hit.append(name);
  if (size !== "mini") {
    const row = document.createElement("div");
    row.className = "party-dogs";
    for (const dog of lineup(party.dogs, party.winner)) row.append(dogFigure(dog, party.winner, reduced));
    hit.append(row);
  }
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "ghost party-skip";
  skip.textContent = "Saltar";
  root.append(canvas, banner(), skip, hit);
  return { root, canvas, hit, skip };
}

function playAudio(ui, party) {
  const timers = [];
  if (!partyHears(ui.soundRole)) return timers;
  for (const c of party.cues) {
    const fire = () => { if (ui.party && ui.party.key === party.key && ui.sfx) ui.sfx.play(c.key); };
    if (c.at <= 0) fire();
    else timers.push(setTimeout(fire, c.at));
  }
  const src = CLIPS["celebracion-musica"];
  if (src && ui.music && !ui.music.muted && ui.music.volume > 0 && typeof ui.music.playCue === "function") {
    Promise.resolve(ui.music.playCue(src, { ms: PARTY_MS + 400, duck: MUSIC_DUCK })).then((ok) => {
      // Si la pieza no arranca (falta el archivo, o el navegador no deja), el efecto corto de ganador cubre.
      if (!ok && ui.party && ui.party.key === party.key && ui.sfx) ui.sfx.play("ganador");
    }, () => {});
  }
  return timers;
}

export function stopParty(ui) {
  if (!ui || !ui.party) return;
  const p = ui.party;
  ui.party = null;
  (p.timers || []).forEach(clearTimeout);
  if (p.stopFx) p.stopFx();
  if (p.root && p.root.parentNode) p.root.remove();
  if (p.onKey) document.removeEventListener("keydown", p.onKey);
  if (ui.music && typeof ui.music.stopCue === "function") ui.music.stopCue();
}

function onKey(ui, e) {
  if (!ui.party) return;
  const tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (e.key !== "Escape" && e.key !== " " && e.key !== "Enter") return;
  if (e.key !== "Escape" && e.target && e.target.closest && e.target.closest("button, a, [role=button]")) return;
  e.preventDefault();
  stopParty(ui);
}

export function syncParty(ui, ctx, party) {
  if (!ui || typeof document === "undefined") return;
  if (party) { startParty(ui, party); return; }
  const st = ctx && ctx.view;
  const still = ui.party && st && (st.phase === "leg" || st.phase === "over") && st.phase === ui.party.phase;
  if (ui.party && !still) stopParty(ui);
}

function startParty(ui, party) {
  if (ui.party && ui.party.key === party.key) return;
  if (ui.party) stopParty(ui);
  const reduced = reducedMotion();
  const size = partySize(ui.soundRole);
  const count = reduced ? CONFETTI.reduced : CONFETTI[size] || CONFETTI.full;
  const { root, canvas, hit, skip } = build(party, size, reduced);
  document.body.append(root);
  const stopFx = startConfetti(canvas, count, reduced);
  const keyFn = (e) => onKey(ui, e);
  document.addEventListener("keydown", keyFn);
  const skipNow = (e) => { e.preventDefault(); e.stopPropagation(); stopParty(ui); };
  hit.addEventListener("pointerdown", skipNow);
  skip.addEventListener("pointerdown", skipNow);
  ui.party = { key: party.key, phase: party.phase, root, stopFx, onKey: keyFn, timers: [] };
  const timers = playAudio(ui, party);
  timers.push(setTimeout(() => { if (ui.party && ui.party.key === party.key) stopParty(ui); }, party.ms || PARTY_MS));
  ui.party.timers = timers;
}
