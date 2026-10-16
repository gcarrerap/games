// Consejo (de myDomino): qué tirarían los tres niveles y por qué. Lo calcula la plataforma con tu vista
// (ctx.askAdvice); aquí solo se muestra.
import { P } from "../../engine/index.js";
import { LEVELS } from "../../ai/index.js";
import { esc } from "../../../../platform/ui/dom.js";
import { renderSheet } from "../../../../platform/ui/sheet.js";
import { tileSVG } from "../svg/tile.js";
import { timerOn } from "../table.js";

export function renderAdvice(ctx, st, seat) {
  const m = ctx.modal, d = ctx.advice.data;
  let body;
  if (!d) body = `<p class="hint">Pensando… el avanzado está probando tus tiros en varios repartos posibles.</p>`;
  else if (d.error) body = `<p class="err">No se pudo calcular el consejo. Intenta otra vez.</p>`;
  else if (d.none) body = `<p>No tienes ninguna ficha que pegue. ${d.action === "draw" ? "Los tres niveles te dicen lo mismo: <b>come</b> hasta que te salga una que pegue." : "Los tres niveles te dicen lo mismo: <b>pasa</b>."}</p>`;
  else {
    const same = d.levels.every((x) => x.tile === d.levels[0].tile && x.side === d.levels[0].side);
    body = (d.only ? `<p class="hint">Solo tienes un tiro posible.</p>` : same ? `<p class="adv-agree">Los tres niveles coinciden.</p>` : "") +
      d.levels.map((x, i) => {
        const [a, b] = P(x.tile);
        return `<section class="adv-card">
          <div class="adv-head"><span class="lvtag adv-lv">${LEVELS[i + 1]}</span>
            <span class="adv-tile">${tileSVG(a, b, false, 16)}</span>
            <span class="adv-what"><b>${x.tile}</b> ${esc(x.sideText)}</span></div>
          <ul>${x.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
          <button class="primary adv-play" data-advplay="${x.tile}|${x.side}">Tirar ${x.tile}</button>
        </section>`;
      }).join("");
  }
  const sheet = renderSheet(m, "advice", "Consejo", `
    <p class="hint">Cada nivel solo usa lo que tú puedes saber: tus fichas, la mesa y tu registro.${timerOn(st) ? " El reloj sigue corriendo." : ""}</p>
    ${body}`);
  // Esta ventana no es del historial: se cierra con su ✕ o tocando fuera
  const close = () => ctx.closeAdvice();
  const x = m.querySelector("#sheetclose"); if (x) x.onclick = close;
  m.querySelector("#sheetbg").onclick = (e) => { if (e.target.id === "sheetbg") close(); };
  sheet.querySelectorAll("[data-advplay]").forEach((b) => b.onclick = () => {
    const [tile, side] = b.dataset.advplay.split("|");
    ctx.act({ type: "play", tile, side });
  });
}
