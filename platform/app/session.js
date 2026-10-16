// La app: qué pantalla se ve, qué juego está abierto, la sesión (invitado o Google) y la mesa abierta, ya sea de
// práctica (en memoria) o en línea (Firestore). Todo lo que cambia el estado pasa por estas acciones; la interfaz
// solo dibuja y convierte toques en acciones.
//
// Las dos clases de mesa usan las mismas funciones puras de table.js. La diferencia está en mutate(fn): en
// práctica fn se aplica a la mesa en memoria; en línea se aplica dentro de una transacción de Firestore (lee lo
// último guardado, aplica, guarda), y el cambio llega de vuelta por watchTable a todos los teléfonos.
//
// Sin dependencias del navegador: el reloj, los temporizadores, la compu, la conexión y las preferencias se
// inyectan, así la sesión se prueba en Node, incluso con dos "teléfonos" sobre el mismo Firestore de mentira.
import { createStore } from "./store.js";
import {
  newTable, sit, leaveSeat, addBot, removeBot, setBotProfile, start, act, turnKey, botSeats, humanSeats, mySeat as seatOf,
} from "./table.js";
import { clockStatus, timeoutAction } from "./clock.js";
import { cleanupInactiveTables, CLEANUP_EVERY_MS } from "./cleanup.js";
import { TABLES, SKIP, watchTableList, watchTable, saveNewTable, updateTable, saveRecording } from "../services/index.js";

export const PRACTICE_CODE = "PRÁCTICA";
export const BOT_NAMES = ["Lupe", "Toño", "Chuy", "Meche", "Pancho", "Licha", "Beto"];
export const BACKUP_MS = 4000; // en línea, los teléfonos de respaldo esperan esto antes de mover a la compu
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

// deps: { now(), schedule(fn, ms) → id, cancel(id), random() → [0,1), loadGame(id) → Promise<módulo>,
//         botDecide(game, view, seat, profile, seed) → Promise<acción>, advise(game, view, seat, seed) → Promise,
//         prefs, gamePrefs(id), version,
//         auth: { connect(onUser) → Promise<db>, signIn() → Promise, signOut() → Promise } (opcional: sin auth, solo práctica) }
export function createSession(deps) {
  const { now, schedule, cancel, random, loadGame, botDecide, advise, prefs, gamePrefs, auth = null, version = null } = deps;
  let deviceId = prefs.get("dev");
  if (!deviceId) { deviceId = "d" + Math.floor(random() * 36 ** 8).toString(36); prefs.set("dev", deviceId); }

  const store = createStore({
    screen: "portal", // "portal" | "lobby" | "table"
    gameId: null, game: null, loading: false,
    me: { id: deviceId, name: prefs.get("name") || "" },
    user: null, // usuario de Firebase (invitado anónimo o Google)
    db: null, online: auth ? "connecting" : "off", // "connecting" | "on" | "off"
    tables: [], updated: {}, // mesas abiertas del juego (lobby) y cuándo se guardó cada una
    table: null, practice: false, code: null,
    err: "",
    seen: { key: null, at: 0 }, // cuándo vio este teléfono el turno actual (para el reloj)
    advice: null, // { key, data } — data null mientras se calcula
    updateAvailable: null,
  });
  const s = store.state;
  let botTimer = null, botKey = null, unsubTable = null, unsubList = null, lastCleanup = 0;
  const saved = new Set(); // partidas ya grabadas desde este teléfono

  const set = (patch) => store.set(patch);
  const message = (e) => (e && e.code === "permission-denied" ? "No hay permiso para guardar en esta mesa."
    : e && e.code === "resource-exhausted" ? "Se alcanzó el límite gratis de hoy. Intenta mañana."
      : (e && e.message) || "Algo falló, intenta otra vez.");
  const fail = (e) => set({ err: message(e) });
  const isGoogle = () => !!(s.user && !s.user.isAnonymous);
  const me = () => (s.practice ? 0 : s.table ? seatOf(s.table, s.me.id) : -1);

  // ---------- Conexión y sesión ----------
  async function connect() {
    if (!auth) return;
    try {
      const db = await auth.connect((u) => {
        s.user = u;
        s.me.id = u && !u.isAnonymous ? "g_" + u.uid : deviceId;
        if (isGoogle() && !s.me.name && u.displayName) setName(u.displayName.split(" ")[0]);
        store.notify();
      });
      set({ db, online: "on" });
      if (s.screen === "lobby" && s.game) watchList();
    } catch (e) {
      console.warn("Sin conexión con las mesas en línea:", e);
      set({ db: null, online: "off" });
    }
  }
  async function googleIn() {
    try { await auth.signIn(); }
    catch (e) {
      if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
      set({ err: e.code === "auth/unauthorized-domain" ? "Este sitio aún no está autorizado en Firebase (Authorized domains)." : "No se pudo entrar con Google." });
    }
  }
  async function googleOut() { await auth.signOut(); }
  function setName(name) { s.me.name = String(name).trim().slice(0, 16); prefs.set("name", s.me.name); }
  const needName = () => { if (s.me.name) return false; set({ err: "Escribe tu nombre primero." }); return true; };

  // ---------- Pantallas ----------
  function closeTable() {
    stopBots();
    if (unsubTable) { unsubTable(); unsubTable = null; }
  }
  function stopList() { if (unsubList) { unsubList(); unsubList = null; } }

  function goPortal() {
    closeTable(); stopList();
    set({ screen: "portal", gameId: null, game: null, table: null, practice: false, code: null, err: "", advice: null, tables: [] });
  }

  async function openGame(id) {
    closeTable(); stopList();
    set({ screen: "lobby", gameId: id, game: null, table: null, practice: false, code: null, loading: true, err: "", advice: null, tables: [] });
    try {
      const game = await loadGame(id);
      if (s.gameId !== id) return;
      set({ game, loading: false });
      watchList();
    } catch (e) { if (s.gameId === id) set({ loading: false, err: "No se pudo cargar el juego." }); }
  }

  // Salir de la mesa al lobby del juego. En línea sigues sentado (para volver, o para ir a compartir el enlace);
  // para dejar tu lugar está "Levantarme". Las mesas que nadie vuelve a tocar se borran solas (cleanup.js).
  function leave() {
    closeTable();
    set({ screen: "lobby", table: null, practice: false, code: null, err: "", advice: null });
    watchList();
  }

  // ---------- Mesas abiertas (lobby) ----------
  function watchList() {
    if (unsubList || !s.db || !s.game) return;
    const gameId = s.game.id;
    unsubList = watchTableList(s.db, gameId, (list, updated) => {
      if (s.gameId !== gameId) return;
      set({ tables: list, updated });
      cleanup();
    }, () => { unsubList = null; });
  }
  function cleanup() {
    if (!s.db || !s.tables.length) return;
    lastCleanup = now();
    cleanupInactiveTables(s.db, s.tables, s.updated, lastCleanup);
  }

  // ---------- Cambiar la mesa ----------
  // fn(mesa) → mesa nueva, o SKIP para no guardar. En línea, truena si Firestore rechaza o fn truena.
  // En práctica el cambio se aplica en el momento (sin esperar), así la interfaz y las pruebas lo ven enseguida.
  function applyLocal(fn) {
    const next = fn(s.table);
    if (next !== SKIP) { set({ table: next, err: "", advice: null }); afterChange(); }
  }
  function mutate(fn) {
    if (!s.table) return Promise.resolve();
    if (s.practice) { try { applyLocal(fn); return Promise.resolve(); } catch (e) { return Promise.reject(e); } }
    return updateTable(s.db, s.code, fn);
  }
  // Para la interfaz: aplica y muestra el error, si hay
  function run(fn) {
    if (s.err) set({ err: "" });
    if (s.practice) { try { if (s.table) applyLocal(fn); } catch (e) { fail(e); } return Promise.resolve(); }
    return mutate(fn).catch(fail);
  }

  // ---------- Práctica ----------
  function practiceSettings(game = s.game) {
    const p = gamePrefs(game.id), saved = p.getJSON("practice", {}) || {};
    const mode = game.modes.find((m) => m.id === saved.mode) || game.modes[game.modes.length - 1];
    const profiles = game.bots ? game.bots.profiles.map((x) => x.id) : [];
    const def = profiles.includes(saved.defaultBot) ? saved.defaultBot : profiles[Math.min(1, profiles.length - 1)];
    const bots = Array.from({ length: 8 }, (_, i) => (profiles.includes(saved.bots && saved.bots[i]) ? saved.bots[i] : def));
    return { mode: mode.id, timer: saved.timer !== false, bots };
  }
  function savePractice(patch) {
    gamePrefs(s.game.id).setJSON("practice", { ...practiceSettings(), ...patch });
    store.notify();
  }
  const newSeed = () => Math.floor(random() * 2 ** 31).toString(36);
  const optionsFor = (game, settings) => (game.timing ? { timer: settings.timer !== false } : {});

  function startPractice(settings = practiceSettings()) {
    const game = s.game; if (!game) return;
    gamePrefs(game.id).setJSON("practice", { ...practiceSettings(game), ...settings }); // se recuerda para la próxima
    try {
      closeTable(); stopList();
      let t = newTable(game, { code: PRACTICE_CODE, mode: settings.mode, options: optionsFor(game, settings), host: s.me.id, seed: newSeed(), now: now(), version });
      t = sit(t, 0, { id: s.me.id, name: s.me.name || "Tú" });
      for (let i = 1; i < t.seats.length; i++) t = addBot(t, i, { profile: settings.bots[i - 1], name: BOT_NAMES[(i - 1) % BOT_NAMES.length] });
      t = start(game, t, now());
      set({ screen: "table", table: t, practice: true, code: null, err: "", advice: null });
      afterChange();
    } catch (e) { fail(e); }
  }

  // ---------- En línea ----------
  // Crea una mesa con el modo de la práctica, te sienta en el asiento 1 y la abre. Devuelve el código.
  async function createTable(settings = practiceSettings()) {
    const game = s.game; if (!game || !s.db) return null;
    if (needName()) return null;
    try {
      let code = null;
      for (let i = 0; i < 6 && !code; i++) {
        const c = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(random() * CODE_LETTERS.length)]).join("");
        if (!(await s.db.doc(`${TABLES}/${c}`).get()).exists) code = c;
      }
      if (!code) throw new Error("No se pudo crear la mesa, intenta otra vez.");
      let t = newTable(game, { code, mode: settings.mode, options: optionsFor(game, settings), host: s.me.id, seed: newSeed(), now: now(), version });
      t = sit(t, 0, { id: s.me.id, name: s.me.name });
      await saveNewTable(s.db, t);
      return code;
    } catch (e) { fail(e); return null; }
  }

  // Abre una mesa en línea y la escucha. Cada cambio guardado (de cualquier teléfono) llega aquí.
  function openTable(code) {
    if (!s.db || !s.game) { set({ err: s.online === "connecting" ? "Conectando…" : "Sin conexión con las mesas en línea." }); return; }
    closeTable(); stopList();
    const gameId = s.game.id;
    set({ screen: "table", table: null, practice: false, code, err: "", advice: null });
    unsubTable = watchTable(s.db, code, (t) => {
      if (s.code !== code) return;
      if (!t) { set({ table: null, err: "Esta mesa ya no existe." }); return; }
      if (t.game !== gameId) { set({ table: null, err: "Esta mesa es de otro juego." }); return; }
      set({ table: t, err: s.table && t.turn === s.table.turn ? s.err : "" });
      afterChange();
    }, () => set({ err: "Se perdió la conexión con la mesa. Vuelve a abrirla." }));
  }

  const inLobby = () => s.table && (s.table.status === "lobby" || s.table.status === "over");
  function sitAt(i) {
    if (needName()) return Promise.resolve();
    return run((t) => sit(t, i, { id: s.me.id, name: s.me.name }));
  }
  const standUp = () => run((t) => leaveSeat(t, s.me.id));
  function botName(t) {
    const used = new Set(t.seats.filter(Boolean).map((x) => x.name));
    return BOT_NAMES.find((n) => !used.has(n)) || `Compu ${botSeats(t).length + 1}`;
  }
  // La compu solo se agrega si hay alguien sentado: la mueve el teléfono de una persona de la mesa
  const addBotAt = (i, profile) => run((t) => {
    if (seatOf(t, s.me.id) < 0) throw new Error("Siéntate primero.");
    return addBot(t, i, { profile, name: botName(t) });
  });
  const removeBotAt = (i) => run((t) => removeBot(t, i));
  function setSeatBot(i, profile) {
    if (s.practice) {
      const bots = practiceSettings().bots; bots[i - 1] = profile; savePractice({ bots });
    }
    return run((t) => setBotProfile(t, i, profile));
  }
  function startGame() {
    if (!inLobby()) return Promise.resolve();
    return run((t) => {
      if (seatOf(t, s.me.id) < 0) throw new Error("Siéntate primero.");
      return t.status === "lobby" || t.status === "over" ? start(s.game, t, now()) : SKIP;
    });
  }

  // ---------- Jugar ----------
  // Tu jugada. En línea solo cuenta si la mesa sigue en el turno que viste (otro teléfono pudo adelantarse).
  function play(action) {
    const seat = me(); if (seat < 0 || !s.table) return Promise.resolve();
    const key = turnKey(s.table);
    return run((t) => (turnKey(t) === key ? act(s.game, t, seat, action, now()) : SKIP));
  }
  // Otra partida en la misma mesa (revancha)
  function again() {
    return run((t) => (t.status === "over" ? start(s.game, t, now()) : SKIP));
  }

  // Después de cada cambio de la mesa: el reloj, la compu y la grabación
  function afterChange() {
    const t = s.table, game = s.game;
    if (!t || !game) return;
    const key = turnKey(t);
    if (key !== s.seen.key) s.seen = { key, at: now() };
    if (t.status === "over") saveGame(t);
    scheduleBot();
  }

  // ---------- La compu ----------
  // En práctica la mueve este teléfono. En línea la mueve el teléfono de la persona sentada en el asiento más bajo;
  // las demás personas sentadas son respaldo (esperan BACKUP_MS más) por si ese teléfono no está.
  function botRole(t) {
    if (s.practice) return "primary";
    const mine = seatOf(t, s.me.id); if (mine < 0) return null;
    return humanSeats(t)[0] === mine ? "primary" : "backup";
  }
  function stopBots() { if (botTimer !== null) cancel(botTimer); botTimer = null; botKey = null; }

  function scheduleBot() {
    const t = s.table, game = s.game;
    const key = turnKey(t);
    if (botKey !== key) stopBots();
    if (!key || botTimer !== null || !game.bots) return;
    const role = botRole(t); if (!role) return;
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
      if (!action) { botKey = null; return; }
      try { await mutate((x) => (turnKey(x) === key ? act(game, x, seat, action, now()) : SKIP)); }
      catch (e) { console.warn("No se pudo guardar la jugada de la compu:", e); botKey = null; }
    }, Math.max(0, ms) + (role === "backup" ? BACKUP_MS : 0));
  }

  // ---------- Reloj ----------
  // clock(): lo que queda del turno (para pintar); tick(): además resuelve el turno vencido. Quien tiene el turno
  // lo resuelve al llegar a 0; los demás teléfonos esperan un poco más (ver clock.js).
  function clock() {
    const t = s.table, game = s.game;
    if (!t || !game || s.screen !== "table") return null;
    if (turnKey(t) !== s.seen.key) s.seen = { key: turnKey(t), at: now() };
    return clockStatus(game, t, { seenAt: s.seen.at, now: now(), me: me(), practice: s.practice });
  }
  let firing = null;
  function tick() {
    if (s.screen === "lobby" && s.db && now() - lastCleanup >= CLEANUP_EVERY_MS) cleanup();
    const c = clock();
    if (c && c.due && firing !== c.key) {
      firing = c.key;
      const action = timeoutAction(s.game, s.table, c.seat);
      mutate((t) => (turnKey(t) === c.key ? act(s.game, t, c.seat, action, now()) : SKIP)).catch(() => { firing = null; });
    }
    return c;
  }

  // ---------- Grabar partidas ----------
  // Al terminar una partida, cada teléfono sentado intenta guardarla; las reglas solo dejan crearla una vez.
  function saveGame(t) {
    if (!s.db || !t.rec) return;
    const id = `${t.game}-${t.code}-${t.created}-${t.round}`.replace(/[^A-Za-z0-9_-]/g, "");
    if (saved.has(id) || (!s.practice && seatOf(t, s.me.id) < 0)) return;
    saved.add(id);
    const rec = { ...t.rec, meta: { ...t.rec.meta, mode: s.practice ? "practice" : "online" } };
    saveRecording(s.db, id, rec).catch(() => {}); // ya la guardó otro teléfono, o sin conexión: no pasa nada
  }

  // ---------- Consejo ----------
  function askAdvice() {
    const t = s.table, game = s.game, seat = me(); if (!t || !game || !game.advise || seat < 0) return;
    const key = turnKey(t);
    set({ advice: { key, data: null } });
    advise(game, game.view(t.state, seat), seat, `${t.rec.seed}:advice:${t.turn}`)
      .then((data) => data, () => ({ error: true }))
      .then((data) => { if (s.advice && s.advice.key === key && turnKey(s.table) === key) set({ advice: { key, data } }); });
  }
  function closeAdvice() { set({ advice: null }); }

  function setUpdateAvailable(v) { set({ updateAvailable: v }); }
  function setError(msg) { set({ err: msg }); }

  return {
    store,
    actions: {
      connect, googleIn, googleOut, setName, setError, isGoogle, mySeat: me,
      goPortal, openGame, leave,
      practiceSettings, savePractice, startPractice,
      createTable, openTable, sitAt, standUp, addBotAt, removeBotAt, setSeatBot, startGame,
      play, again, clock, tick, askAdvice, closeAdvice, setUpdateAvailable,
    },
  };
}
