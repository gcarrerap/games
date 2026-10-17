// Lista de juegos del sitio. Solo manifiestos (pocos bytes); el código de cada juego
// se baja con load() al abrirlo. Para agregar un juego, ver docs/ADDING-A-GAME.md.
//
// Cada entrada: { id, name, players: {min, max}, load: () => import("./<id>/index.js") }
import domino from "./domino/manifest.js";
import pata from "./pata/manifest.js";
import piojos from "./piojos/manifest.js";
import continental from "./continental/manifest.js";
import viuda from "./viuda/manifest.js";

export const GAMES = [
  { ...domino, load: () => import("./domino/index.js") },
  { ...pata, load: () => import("./pata/index.js") },
  { ...piojos, load: () => import("./piojos/index.js") },
  { ...continental, load: () => import("./continental/index.js") },
  { ...viuda, load: () => import("./viuda/index.js") },
];

export const findGame = (id) => GAMES.find((g) => g.id === id) || null;
