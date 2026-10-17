// El tutorial de Skull en una ventana: un paso a la vez, con una mesa de ejemplo y una pregunta en los pasos que la
// llevan. Lo que está abierto vive en el overlay "tutorial" ({ step, pick }); el guion y las escenas están en
// tutorial-script.js. Se abre desde la mesa (aviso de la primera ronda), la ventana de Reglas y el menú.
import { onMat, nameOf } from "../engine/index.js";
import { discSVG, discName } from "./disc.js";
import { $, esc } from "../../../platform/ui/dom.js";
import { openOverlay, updateOverlay, closeOverlay, renderSheet, overlay } from "../../../platform/ui/sheet.js";
import { STEPS, tutorialScenes } from "./tutorial-script.js";

let scenes = null; // se calculan la primera vez que se abre
const SEEN = "tutorial";

export const tutorialSeen = (ctx) => !!(ctx.prefs && ctx.prefs.get(SEEN));
export function openTutorial(ctx) {
  if (ctx.prefs) ctx.prefs.set(SEEN, "1");
  openOverlay("tutorial", { step: 0, pick: null });
}

function matHTML(stack, flipped) {
  if (!stack.length) return `<span class="sk-tut-empty">vacío</span>`;
  return stack.map((d, i) => `<span class="sk-tut-slot ${i >= stack.length - flipped ? "up" : ""}" aria-label="${discName(d)}">${discSVG(d, 26)}</span>`).join("");
}

function handOf(v) {
  const own = v.discs[0], stack = v.stacks[0];
  const left = { F: own.F - stack.filter((d) => d === "F").length, S: own.S - stack.filter((d) => d === "S").length };
  return [...Array(left.F).fill("F"), ...Array(left.S).fill("S")];
}

const handHTML = (hand) => `<div class="sk-tut-hand"><span class="sk-tut-lbl">En la mano</span>${hand.length ? hand.map((d) => discSVG(d, 34)).join("") : `<span class="sk-tut-empty">nada</span>`}</div>`;

// La mesa de ejemplo: un renglón por jugador, la apuesta y lo volteado
function sceneHTML(v) {
  const flipping = v.phase === "flip" || v.phase === "discard" || (v.phase === "pause" && v.reveals.length);
  const rows = v.names.map((_, s) => {
    const tags = [
      v.bid && v.bid.seat === s ? `apuesta ${v.bid.n}` : "",
      v.passed[s] && v.phase === "bid" ? "pasó" : "",
      v.challenger === s ? "retador" : "",
      v.wins[s] ? "🏆".repeat(v.wins[s]) : "",
    ].filter(Boolean).join(" · ");
    return `<div class="sk-tut-row ${s === 0 ? "mine" : ""}"><b>${esc(nameOf(v, s))}</b><span class="sk-tut-mat">${matHTML(v.stacks[s], v.flipped[s])}</span>${tags ? `<small>${tags}</small>` : ""}</div>`;
  }).join("");
  const center = v.bid
    ? `<div class="sk-tut-bid"><span>Apuesta</span><b>${v.bid.n}</b><span>de ${onMat(v)}</span></div>`
    : `<div class="sk-tut-bid quiet"><span>Discos en la mesa</span><b>${onMat(v)}</b></div>`;
  const reveals = flipping ? `<div class="sk-tut-reveals">${v.reveals.map((r) => `<span>${discSVG(r.disc, 26)}<small>${esc(nameOf(v, r.seat))}</small></span>`).join("")}</div>` : "";
  const lost = v.outcome && !v.outcome.success && v.outcome.lost ? `<p class="sk-tut-note">Te quitaron ${v.outcome.lost === "S" ? "la calavera" : "una flor"}.</p>` : "";
  return `<div class="sk-tut-scene">${rows}<div class="sk-tut-felt ${flipping ? "challenge" : ""}">${center}${reveals}${lost}</div>${handHTML(handOf(v))}</div>`;
}

function quizHTML(quiz, pick) {
  const chosen = pick === null ? null : quiz.options[pick];
  return `<div class="sk-tut-quiz">
    <p class="sk-tut-q">${esc(quiz.q)}</p>
    <div class="sk-tut-opts">${quiz.options.map((o, i) => `<button data-pick="${i}" class="${pick === i ? `picked ${o.kind}` : ""}" aria-pressed="${pick === i}">${o.disc ? discSVG(o.disc, 26) : ""}<span>${esc(o.label)}</span></button>`).join("")}</div>
    ${chosen ? `<p class="sk-tut-why ${chosen.kind}" role="status">${chosen.kind === "bad" ? "🤔 " : "✓ "}${chosen.why}</p>` : ""}
  </div>`;
}

export function renderTutorial(ctx) {
  if (!scenes) scenes = tutorialScenes();
  const { step = 0, pick = null } = (overlay() && overlay().data) || {};
  const i = Math.max(0, Math.min(STEPS.length - 1, step));
  const s = STEPS[i];
  const answered = !s.quiz || (pick !== null && s.quiz.options[pick].kind !== "bad");
  const sceneKey = s.quiz && answered && s.after ? s.after : s.scene;
  const last = i === STEPS.length - 1;
  const clockOn = ctx.view && ctx.view.config && ctx.view.config.timer !== false && ["place", "build", "bid", "flip", "discard"].includes(ctx.view.phase);
  renderSheet(ctx.modal, "tutorial", "Cómo jugar Skull", `
    <div class="sk-tut">
      <div class="sk-tut-top"><span class="sk-tut-count">Paso ${i + 1} de ${STEPS.length}</span>
        <span class="sk-tut-dots" aria-hidden="true">${STEPS.map((_, k) => `<i class="${k === i ? "on" : k < i ? "done" : ""}"></i>`).join("")}</span></div>
      <h4>${esc(s.title)}</h4>
      ${s.text}
      ${sceneKey ? sceneHTML(scenes[sceneKey]) : s.hand ? `<div class="sk-tut-scene">${handHTML(s.hand)}</div>` : ""}
      ${s.quiz ? quizHTML(s.quiz, pick) : ""}
      ${clockOn ? `<p class="hint">Ojo: el reloj de tu partida sigue corriendo.</p>` : ""}
      <div class="sk-tut-nav">
        <button id="tutprev" class="ghost" ${i === 0 ? "disabled" : ""}>← Atrás</button>
        ${last ? `<button id="tutdone" class="primary">A jugar</button>` : `<button id="tutnext" class="primary" ${answered ? "" : "disabled"}>${s.quiz && !answered ? "Contesta para seguir" : "Siguiente →"}</button>`}
      </div>
    </div>`);
  const go = (k) => updateOverlay({ step: k, pick: null });
  ctx.modal.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => updateOverlay({ pick: Number(b.dataset.pick) }));
  $("#tutprev", ctx.modal)?.addEventListener("click", () => go(i - 1));
  $("#tutnext", ctx.modal)?.addEventListener("click", () => go(i + 1));
  $("#tutdone", ctx.modal)?.addEventListener("click", closeOverlay);
}
