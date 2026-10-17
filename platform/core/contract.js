// Contrato de juego: la forma que cumple cada módulo en games/<id>/index.js.
// La plataforma solo habla con los juegos por medio de esto. Ver docs/ARCHITECTURE.md §4.

/**
 * @typedef {object} Ctx
 * @property {() => number} rnd  Azar (0..1). Con semilla en pruebas y simulaciones.
 * @property {number} now        Tiempo actual en ms. Nunca se llama Date.now() dentro de un juego.
 */

/**
 * La compu. Solo recibe la vista de su asiento, nunca el estado completo.
 * @typedef {object} GameBots
 * @property {{id: string, name: string}[]} profiles
 * @property {(view: object, seat: number, profile: string, ctx: {rnd: () => number}) => object|null} decide
 *   La acción que toma ese asiento (null si no le toca).
 * @property {(view: object, seat: number, now: number) => number} [thinkMs]
 *   Cuánto espera antes de actuar. Si varios asientos pueden actuar a la vez, actúa primero el de menor espera.
 * @property {boolean} [heavy]  decide() puede tardar: correrlo en un hilo aparte.
 */

/**
 * Una regla que se escoge al crear la mesa. El lobby la muestra como botones; se recuerda por juego.
 * @typedef {object} GameOption
 * @property {string} id                                   Nombre del campo en config.
 * @property {string} label                                Lo que se muestra arriba de los botones.
 * @property {{id: string, label: string, hint?: string}[]} choices
 * @property {string} default                              El id de la opción que se usa si no se escoge.
 */

/**
 * @typedef {object} GameModule
 * @property {string} id                                   Identificador corto, igual al nombre de la carpeta.
 * @property {string} name                                 Nombre que se muestra.
 * @property {{min: number, max: number}} players          Cuántos asientos admite.
 * @property {object[]} modes                              Configuraciones válidas para setup().
 * @property {GameOption[]} [options]
 *   Reglas que se escogen al crear la mesa, aparte del modo (por ejemplo, cómo se compra en el Continental). La
 *   escogida llega a setup() en config[option.id]; si no viene (pruebas, mesas viejas), el juego usa su default.
 * @property {(config: object, ctx: Ctx) => object} setup
 *   Estado inicial (JSON simple). config = un modo de `modes` + opciones de la mesa (por ejemplo timer) +
 *   `names`: el nombre de cada asiento, que la plataforma agrega al empezar.
 * @property {(state: object) => number[]} currentSeats
 *   Asientos que deben actuar ahora. Lista vacía sin terminar = pausa (por ejemplo, entre manos): nadie está
 *   obligado, pero legalActions puede ofrecer algo (repartir la siguiente mano).
 * @property {(state: object, seat: number) => object[]} legalActions
 * @property {(state: object, seat: number, action: object, ctx: Ctx) => object} apply
 * @property {(state: object, seat: number) => object} view  Lo que ese asiento puede ver.
 * @property {(state: object) => boolean} isOver
 * @property {(state: object) => object} result
 * @property {{turnMs: Function, autoAction: Function}} [timing]
 * @property {GameBots} [bots]
 * @property {(view: object, seat: number, ctx: Ctx) => object} [advise]  Consejo para ese asiento.
 * @property {(config: object, seat: number) => number|null} [teamOf]
 *   El equipo de un asiento con esa configuración (0, 1, …), o null si se juega individual. Lo usa la pantalla
 *   de asientos para mostrar quién va con quién.
 * @property {boolean} [tv]
 *   La mesa en línea se puede jugar con la tele como tablero: un aparato sin asiento muestra la mesa a todos y cada
 *   quien usa su teléfono solo para lo suyo (su mano, sus botones). La interfaz recibe ctx.display: "tv" en la tele,
 *   "phone" en los teléfonos sentados de esa mesa y "full" en todo lo demás (docs/ARCHITECTURE.md §4).
 * @property {() => Promise<{mount: Function, update: Function, unmount: Function, tick?: Function}>} ui
 *   La mesa del juego. mount(el, ctx) y update(ctx) reciben el ctx de platform/ui/play.js (docs/ARCHITECTURE.md §4).
 */

const REQUIRED_FNS = ["setup", "currentSeats", "legalActions", "apply", "view", "isOver", "result", "ui"];

// Las opciones escogidas (o el default de cada una), listas para agregarse a config
export function optionValues(game, chosen = {}) {
  const out = {};
  for (const o of game.options || []) out[o.id] = o.choices.some((c) => c.id === chosen[o.id]) ? chosen[o.id] : o.default;
  return out;
}

// "Comprar del pozo: Con castigo, hasta 3" por cada opción de una mesa
export function optionLabels(game, config = {}) {
  return (game.options || []).map((o) => {
    const c = o.choices.find((x) => x.id === (config || {})[o.id]) || o.choices.find((x) => x.id === o.default);
    return `${o.label}: ${c ? c.label : ""}`;
  });
}

/** Revisa que un módulo cumpla el contrato. Devuelve la lista de problemas (vacía si está bien). */
export function validateGame(g) {
  const errs = [];
  if (!g || typeof g !== "object") return ["el módulo no es un objeto"];
  if (typeof g.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(g.id)) errs.push("id: texto en minúsculas, sin espacios");
  if (typeof g.name !== "string" || !g.name) errs.push("name: falta");
  const p = g.players;
  if (!p || !Number.isInteger(p.min) || !Number.isInteger(p.max) || p.min < 1 || p.max < p.min) errs.push("players: {min, max} inválido");
  if (!Array.isArray(g.modes) || g.modes.length === 0) errs.push("modes: al menos una configuración");
  for (const fn of REQUIRED_FNS) if (typeof g[fn] !== "function") errs.push(`${fn}: falta la función`);
  if (g.options !== undefined) {
    if (!Array.isArray(g.options)) errs.push("options: lista de opciones");
    else for (const o of g.options) {
      if (!o || typeof o.id !== "string" || !o.id || typeof o.label !== "string") { errs.push("options: cada opción con id y label"); continue; }
      if (["n", "timer", "names", "code", "tv"].includes(o.id)) errs.push(`options.${o.id}: ese nombre ya lo usa la plataforma`);
      if (!Array.isArray(o.choices) || o.choices.length < 2 || o.choices.some((c) => !c || typeof c.id !== "string" || typeof c.label !== "string")) errs.push(`options.${o.id}: al menos dos choices con id y label`);
      else if (!o.choices.some((c) => c.id === o.default)) errs.push(`options.${o.id}: default no es una de sus choices`);
    }
  }
  if (g.bots && typeof g.bots.decide !== "function") errs.push("bots.decide: falta la función");
  if (g.bots && !Array.isArray(g.bots.profiles)) errs.push("bots.profiles: lista de perfiles");
  if (g.bots && g.bots.thinkMs && typeof g.bots.thinkMs !== "function") errs.push("bots.thinkMs: es una función");
  if (g.tv !== undefined && typeof g.tv !== "boolean") errs.push("tv: true o false");
  if (g.teamOf && typeof g.teamOf !== "function") errs.push("teamOf: es una función");
  if (g.timing && (typeof g.timing.turnMs !== "function" || typeof g.timing.autoAction !== "function")) errs.push("timing: turnMs y autoAction son funciones");
  return errs;
}
