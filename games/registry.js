// Lista de juegos del sitio. Solo manifiestos (pocos bytes); el código de cada juego
// se baja con load() al abrirlo. Para agregar un juego, ver docs/ADDING-A-GAME.md.
//
// Cada entrada: { id, name, players: {min, max}, load: () => import("./<id>/index.js") }
import domino from "./domino/manifest.js";
import pata from "./pata/manifest.js";
import piojos from "./piojos/manifest.js";
import continental from "./continental/manifest.js";
import viuda from "./viuda/manifest.js";
import panal from "./panal/manifest.js";
import skull from "./skull/manifest.js";
import damasChinas from "./damas-chinas/manifest.js";
import chihuahuas from "./chihuahuas/manifest.js";
import memoria from "./memoria/manifest.js";
import cucharas from "./cucharas/manifest.js";
import timbiriche from "./timbiriche/manifest.js";
import khet from "./khet/manifest.js";
import vikingos from "./vikingos/manifest.js";

export const GAMES = [
  { ...domino, load: () => import("./domino/index.js") },
  { ...pata, load: () => import("./pata/index.js") },
  { ...piojos, load: () => import("./piojos/index.js") },
  { ...continental, load: () => import("./continental/index.js") },
  { ...viuda, load: () => import("./viuda/index.js") },
  { ...panal, load: () => import("./panal/index.js") },
  { ...skull, load: () => import("./skull/index.js") },
  { ...damasChinas, load: () => import("./damas-chinas/index.js") },
  { ...chihuahuas, load: () => import("./chihuahuas/index.js") },
  { ...memoria, load: () => import("./memoria/index.js") },
  { ...cucharas, load: () => import("./cucharas/index.js") },
  { ...timbiriche, load: () => import("./timbiriche/index.js") },
  { ...khet, load: () => import("./khet/index.js") },
  { ...vikingos, load: () => import("./vikingos/index.js") },
];

export const findGame = (id) => GAMES.find((g) => g.id === id) || null;
