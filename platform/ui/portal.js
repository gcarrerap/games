// Portal: la lista de juegos del sitio. Solo usa los manifiestos (no carga el código de ningún juego).
import { GAMES } from "../../games/registry.js";
import { esc } from "./dom.js";

const players = (p) => (p.min === p.max ? `${p.min} jugadores` : `${p.min} a ${p.max} jugadores`);

export function renderPortal(app, { actions }) {
  app.className = "shell";
  app.innerHTML = `
    <header class="shell-head"><div><h1>Juegos de la Familia</h1><small>Solo contra la compu o con la familia</small></div></header>
    <ul class="game-list">${GAMES.map((g) => `<li><button class="big game-card" data-game="${esc(g.id)}">
      <span><b>${esc(g.name)}</b><span class="muted">${esc(players(g.players))}</span></span><span aria-hidden="true" class="chev">›</span></button></li>`).join("")}</ul>
    ${GAMES.length ? "" : `<p class="hint">Todavía no hay juegos.</p>`}`;
  app.querySelectorAll("[data-game]").forEach((b) => b.onclick = () => { location.hash = `#/${b.dataset.game}`; });
}
