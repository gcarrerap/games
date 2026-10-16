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
 * @typedef {object} GameModule
 * @property {string} id                                   Identificador corto, igual al nombre de la carpeta.
 * @property {string} name                                 Nombre que se muestra.
 * @property {{min: number, max: number}} players          Cuántos asientos admite.
 * @property {object[]} modes                              Configuraciones válidas para setup().
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
 * @property {{build: Function, replay: Function}} [record]
 * @property {() => Promise<{mount: Function, unmount: Function}>} ui
 */

const REQUIRED_FNS = ["setup", "currentSeats", "legalActions", "apply", "view", "isOver", "result", "ui"];

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
  if (g.bots && typeof g.bots.decide !== "function") errs.push("bots.decide: falta la función");
  if (g.bots && !Array.isArray(g.bots.profiles)) errs.push("bots.profiles: lista de perfiles");
  if (g.bots && g.bots.thinkMs && typeof g.bots.thinkMs !== "function") errs.push("bots.thinkMs: es una función");
  if (g.timing && (typeof g.timing.turnMs !== "function" || typeof g.timing.autoAction !== "function")) errs.push("timing: turnMs y autoAction son funciones");
  return errs;
}
