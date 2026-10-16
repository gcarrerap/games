// La compu y el consejo, para cualquier juego. Lo pesado (game.bots.heavy) va al hilo aparte (ai-worker.js); si
// el hilo no se puede usar, se calcula aquí. Recibe la vista del asiento, nunca el estado completo.
import { createClient } from "../../modules/worker/index.js";
import { FNS } from "./ai-worker.js";

let client = null;
const getClient = () => client || (client = createClient({
  url: new URL("./ai-worker.js", import.meta.url), local: FNS,
  onFallback: (why) => console.warn("La compu no pudo correr en un hilo aparte; se calcula aquí." + (why ? " " + why : "")),
}));

// La acción de la compu en ese asiento. seed: texto o número (la decisión es reproducible).
export function botDecide(game, view, seat, profile, seed) {
  if (!game.bots) return Promise.reject(new Error(`${game.id} no tiene compu`));
  return game.bots.heavy ? getClient().call("decide", game.id, view, seat, profile, seed) : FNS.decide(game.id, view, seat, profile, seed);
}

export function advise(game, view, seat, seed) {
  if (!game.advise) return Promise.reject(new Error(`${game.id} no da consejos`));
  return getClient().call("advise", game.id, view, seat, seed);
}

// Solo para pruebas
export function _resetForTests(c = null) { if (client) client.reset(); client = c; }
