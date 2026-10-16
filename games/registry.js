// Lista de juegos del sitio. Solo manifiestos (pocos bytes); el código de cada juego
// se baja con load() al abrirlo. Para agregar un juego, ver docs/ADDING-A-GAME.md.
//
// Cada entrada: { id, name, players: {min, max}, load: () => import("./<id>/index.js") }
//
// Ejemplo, cuando dominó esté migrado:
//   import domino from "./domino/manifest.js";
//   export const GAMES = [{ ...domino, load: () => import("./domino/index.js") }];

export const GAMES = [];

export const findGame = (id) => GAMES.find((g) => g.id === id) || null;
