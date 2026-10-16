// Hilo aparte para la compu de cualquier juego. Carga el juego del registro la primera vez que se le pide y
// llama a su compu o a su consejo. El mismo archivo sirve de plan B en la página (ai.js importa FNS).
// Solo recibe vistas (lo que ese asiento puede saber) y una semilla: nada que no sea JSON cruza entre hilos.
import { GAMES } from "../../games/registry.js";
import { createHost, serve } from "../../modules/worker/index.js";
import { seededRandom } from "../../modules/random/index.js";

const loaded = new Map();
async function load(gameId) {
  if (!loaded.has(gameId)) {
    const entry = GAMES.find((g) => g.id === gameId);
    if (!entry) throw new Error("Juego desconocido: " + gameId);
    loaded.set(gameId, entry.load().then((m) => m.default));
  }
  return loaded.get(gameId);
}

export const FNS = {
  async decide(gameId, view, seat, profile, seed) {
    const g = await load(gameId);
    return g.bots.decide(view, seat, profile, { rnd: seededRandom(seed) });
  },
  async advise(gameId, view, seat, seed) {
    const g = await load(gameId);
    if (!g.advise) throw new Error(`${gameId} no da consejos`);
    return g.advise(view, seat, { rnd: seededRandom(seed) });
  },
};

serve(createHost(FNS));
