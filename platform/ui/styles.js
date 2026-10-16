// Hojas de estilo de un juego: se cargan al montar su mesa y se quitan al desmontarla. Dos juegos pueden usar los
// mismos nombres de clase (.game, .hand, .rl…) sin pisarse, porque nunca están cargados a la vez.
const tag = (owner) => `link[data-game-style="${owner}"]`;

// owner: el id del juego; urls: rutas ya resueltas (new URL("../styles/x.css", import.meta.url).href)
export function loadStyles(owner, urls) {
  const have = new Set([...document.querySelectorAll(tag(owner))].map((l) => l.href));
  for (const href of urls) {
    if (have.has(href)) continue;
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href; l.dataset.gameStyle = owner;
    document.head.appendChild(l);
  }
}

export function unloadStyles(owner) {
  for (const l of document.querySelectorAll(tag(owner))) l.remove();
}
