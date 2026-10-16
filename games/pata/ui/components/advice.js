// Consejo (de myPata): qué haría cada nivel de la compu en tu lugar, paso a paso, y por qué. Lo calcula la
// plataforma con tu vista (ctx.askAdvice); aquí solo se muestra.
import { LEVELS } from "../../ai/index.js";
import { esc } from "../../../../platform/ui/dom.js";
import { renderSheet } from "../../../../platform/ui/sheet.js";
import { timerOn } from "../table.js";

export function renderAdvice(ctx, st, seat, mv) {
  const m = ctx.modal, d = ctx.advice.data;
  let body;
  if (!d) body = `<p class="hint">Pensando…</p>`;
  else if (d.error) body = `<p class="err">No se pudo calcular el consejo. Intenta otra vez.</p>`;
  else {
    const sig = (l) => JSON.stringify(l.steps.map((s) => s.action));
    const same = d.levels.every((l) => sig(l) === sig(d.levels[0]));
    body = (same ? `<p class="adv-agree">Los tres niveles coinciden.</p>` : "") +
      (same ? d.levels.slice(0, 1) : d.levels).map((l) => `<section class="adv-card">
        <div class="adv-head"><span class="lvtag adv-lv">${same ? "Los tres" : LEVELS[l.level]}</span></div>
        <ol>${l.steps.map((s) => `<li><b>${esc(s.text)}.</b> ${esc(s.why)}</li>`).join("")}</ol>
        ${l.steps[0] && l.steps[0].action ? `<button class="primary adv-play" data-advplay="${l.level}">${esc(l.steps[0].text)}</button>` : ""}
      </section>`).join("");
    if (d.phase === "draw") body += `<p class="hint">Después de robar, pide consejo otra vez para saber qué bajar y qué descartar.</p>`;
  }
  renderSheet(m, "advice", "Consejo", `
    <p class="hint">Cada nivel solo usa lo que tú puedes saber: tus cartas, la mesa, el pozo y lo que los demás levantaron.${timerOn(st) ? " El reloj sigue corriendo." : ""}</p>
    ${body}`);
  // Esta ventana no es del historial: se cierra con su ✕ o tocando fuera
  const close = () => ctx.closeAdvice();
  const x = m.querySelector("#sheetclose"); if (x) x.onclick = close;
  m.querySelector("#sheetbg").onclick = (e) => { if (e.target.id === "sheetbg") close(); };
  m.querySelectorAll("[data-advplay]").forEach((b) => b.onclick = () => {
    const l = d.levels.find((y) => y.level === +b.dataset.advplay);
    mv.act(l.steps[0].action);
  });
}
