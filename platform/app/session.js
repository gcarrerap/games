// La app: qué pantalla se ve, qué juego está abierto y la mesa de práctica contra la compu. Todo lo que cambia el
// estado pasa por estas acciones; la interfaz solo dibuja y convierte toques en acciones.
// (Las mesas en línea llegan en la fase 5 y usan la misma mesa de platform/app/table.js.)
//
// Sin dependencias del navegador: el reloj, los temporizadores, la compu y las preferencias se inyectan, así la
// sesión completa se prueba en Node (tests/platform/session.test.js).
import { createStore } from "./store.js";
import { newTable, sit, addBot, setBotProfile, start, act, turnKey, botSeats } from "./table.js";
import { clockStatus, timeoutAction } from "./clock.js";

export const PRACTICE_CODE = "PRÁCTICA";
export const BOT_NAMES = ["Lupe", "Toño", "Chuy", "Meche", "Pancho", "Licha", "Beto"];
const ME = "yo"; // en práctica, tú eres siempre el asiento 0

// deps: { now(), schedule(fn, ms) → id, cancel(id), random() → [0,1), loadGame(id) → Promise<módulo>,
//         botDecide(game, view, seat, profile, seed) → Promise<acción>, advise(game, view, seat, seed) → Promise,
//         prefs: { get, set, getJSON, setJSON } del sitio, gamePrefs(id) → las de un juego }
export function createSession(deps) {
  const { now, schedule, cancel, random, loadGame, botDecide, advise, prefs, gamePrefs } = deps;
  const store = createStore({
    screen: "portal", // "portal" | "lobby" | "table"
    gameId: null, game: null, loading: false,
    me: { id: ME, name: prefs.get("name") || "" },
    table: null,
    err: "",
    seen: { key: null, at: 0 }, // cuándo vio este teléfono el turno actual (para el reloj)
    advice: null, // { key, data } — data null mientras se calcula
    updateAvailable: null,
  });
  const s = store.state;
  let botTimer = null, botKey = null;

  const set = (patch) => store.set(patch);
  const fail = (e) => set({ err: (e && e.message) || "Algo falló, intenta otra vez." });

  // ---------- Pantallas ----------
  function goPortal() { stopBots(); set({ screen: "portal", gameId: null, game: null, table: null, err: "", advice: null }); }

  async function openGame(id) {
    stopBots();
    set({ screen: "lobby", gameId: id, game: null, table: null, loading: true, err: "", advice: null });
    try {
      const game = await loadGame(id);
      if (s.gameId === id) set({ game, loading: false });
    } catch (e) { if (s.gameId === id) set({ loading: false, err: "No se pudo cargar el juego." }); }
  }

  function leave() { stopBots(); set({ screen: "lobby", table: null, err: "", advice: null }); }

  function setName(name) { s.me.name = String(name).trim().slice(0, 16); prefs.set("name", s.me.name); }

  // ---------- Lo que escogiste para practicar (se recuerda por juego) ----------
  function practiceSettings(game = s.game) {
    const p = gamePrefs(game.id), saved = p.getJSON("practice", {}) || {};
    const mode = game.modes.find((m) => m.id === saved.mode) || game.modes[game.modes.length - 1];
    const profiles = game.bots ? game.bots.profiles.map((x) => x.id) : [];
    const def = profiles.includes(saved.defaultBot) ? saved.defaultBot : profiles[Math.min(1, profiles.length - 1)];
    const bots = Array.from({ length: 8 }, (_, i) => (profiles.includes(saved.bots && saved.bots[i]) ? saved.bots[i] : def));
    return { mode: mode.id, timer: saved.timer !== false, bots };
  }
  function savePractice(patch) {
    const p = gamePrefs(s.game.id);
    p.setJSON("practice", { ...practiceSettings(), ...patch });
    store.notify();
  }

  // ---------- Práctica ----------
  function startPractice(settings = practiceSettings()) {
    const game = s.game; if (!game) return;
    gamePrefs(game.id).setJSON("practice", { ...practiceSettings(game), ...settings }); // se recuerda para la próxima
    try {
      const options = game.timing ? { timer: settings.timer !== false } : {};
      let t = newTable(game, { code: PRACTICE_CODE, mode: settings.mode, options, host: ME, seed: Math.floor(random() * 2 ** 31).toString(36), now: now() });
      t = sit(t, 0, { id: ME, name: s.me.name || "Tú" });
      for (let i = 1; i < t.seats.length; i++) t = addBot(t, i, { profile: settings.bots[i - 1], name: BOT_NAMES[(i - 1) % BOT_NAMES.length] });
      t = start(game, t, now());
      set({ screen: "table", table: t, err: "", advice: null });
      afterChange();
    } catch (e) { fail(e); }
  }

  // Tu jugada
  function play(action) { apply(0, action); }

  function apply(seat, action, expectKey = null) {
    const t = s.table, game = s.game;
    if (!t || !game) return false;
    if (expectKey !== null && turnKey(t) !== expectKey) return false; // otro ya jugó ese turno
    try {
      set({ table: act(game, t, seat, action, now()), err: "", advice: null });
      afterChange();
      return true;
    } catch (e) { fail(e); return false; }
  }

  // Otra partida en la misma mesa (revancha)
  function again() {
    const t = s.table, game = s.game; if (!t || t.status !== "over") return;
    try { set({ table: start(game, t, now()), err: "", advice: null }); afterChange(); } catch (e) { fail(e); }
  }

  // Cambiar el bot de un asiento de la práctica (y recordarlo para las siguientes)
  function setSeatBot(seat, profile) {
    const t = s.table; if (!t) return;
    try {
      set({ table: setBotProfile(t, seat, profile) });
      const bots = practiceSettings().bots; bots[seat - 1] = profile; savePractice({ bots });
      afterChange();
    } catch (e) { fail(e); }
  }

  // ---------- La compu ----------
  function stopBots() { if (botTimer !== null) cancel(botTimer); botTimer = null; botKey = null; }

  function afterChange() {
    const t = s.table, game = s.game;
    const key = turnKey(t);
    if (key !== s.seen.key) s.seen = { key, at: now() };
    if (botKey !== key) stopBots();
    if (!key || botTimer !== null || !game.bots) return;
    const mine = new Set(botSeats(t));
    const ready = game.currentSeats(t.state).filter((x) => mine.has(x));
    if (!ready.length) return;
    // Si varios bots pueden actuar (salir en parejas), actúa primero el que menos espera
    const waits = ready.map((seat) => ({ seat, ms: game.bots.thinkMs ? game.bots.thinkMs(game.view(t.state, seat), seat, now()) : 600 }));
    waits.sort((a, b) => a.ms - b.ms);
    const { seat, ms } = waits[0];
    botKey = key;
    botTimer = schedule(async () => {
      botTimer = null;
      const t2 = s.table; if (turnKey(t2) !== key) return;
      let action = null;
      try { action = await botDecide(game, game.view(t2.state, seat), seat, t2.seats[seat].profile, `${t2.rec.seed}:bot:${t2.turn}:${seat}`); }
      catch (e) { console.warn("La compu no pudo decidir:", e); }
      if (action && turnKey(s.table) === key) apply(seat, action, key);
      else if (!action) botKey = null;
    }, Math.max(0, ms));
  }

  // ---------- Reloj ----------
  // Se llama varias veces por segundo. Devuelve lo que la interfaz pinta, y resuelve el turno vencido.
  // clock(): solo lo que queda (para pintar); tick(): además resuelve el turno vencido.
  function clock() {
    const t = s.table, game = s.game;
    if (!t || !game || s.screen !== "table") return null;
    if (turnKey(t) !== s.seen.key) s.seen = { key: turnKey(t), at: now() };
    return clockStatus(game, t, { seenAt: s.seen.at, now: now(), me: 0, practice: true });
  }
  function tick() {
    const c = clock();
    if (c && c.due) apply(c.seat, timeoutAction(s.game, s.table, c.seat), c.key);
    return c;
  }

  // ---------- Consejo ----------
  function askAdvice() {
    const t = s.table, game = s.game; if (!t || !game || !game.advise) return;
    const key = turnKey(t);
    set({ advice: { key, data: null } });
    advise(game, game.view(t.state, 0), 0, `${t.rec.seed}:advice:${t.turn}`)
      .then((data) => data, () => ({ error: true }))
      .then((data) => { if (s.advice && s.advice.key === key && turnKey(s.table) === key) set({ advice: { key, data } }); });
  }
  function closeAdvice() { set({ advice: null }); }

  function setUpdateAvailable(v) { set({ updateAvailable: v }); }

  return {
    store,
    actions: { goPortal, openGame, leave, setName, practiceSettings, savePractice, startPractice, play, again, setSeatBot, clock, tick, askAdvice, closeAdvice, setUpdateAvailable },
  };
}
