// La mesa de un juego: la plataforma carga la interfaz del juego (game.ui()) y le pasa un ctx con lo que puede
// ver y hacer. La interfaz del juego exporta { mount(el, ctx), update(ctx), unmount(), tick?(ctx, clock) }.
//
// ctx: game, table (asientos, nombres, estado de la mesa), seat (el tuyo), view (lo que tu asiento puede ver),
//      practice, clock (lo que queda del turno, o null), act(action), again(), leave(), advice + askAdvice() + closeAdvice(), setSeatBot(seat, profile),
//      peek() (el estado completo; solo en práctica, para "ver manos"; en línea es null), prefs (las de este juego), err,
//      modal (donde van las ventanas), refresh() (volver a dibujar), setDragging(on) (no redibujar mientras arrastras)
import { gamePrefs } from "../services/index.js";
import { esc } from "./dom.js";

let mounted = null; // { gameId, ui, el }
let loading = null; // { gameId, promise }
let dragging = false;

function buildCtx({ state, actions, store }, modal) {
  const game = state.game, t = state.table, seat = actions.mySeat(), practice = state.practice;
  return {
    game, table: t, seat, practice, clock: actions.clock(),
    view: game.view(t.state, seat),
    peek: practice ? () => store.state.table.state : null,
    act: (a) => actions.play(a),
    again: () => actions.again(),
    leave: () => { location.hash = `#/${game.id}`; },
    advice: state.advice, askAdvice: () => actions.askAdvice(), closeAdvice: () => actions.closeAdvice(),
    setSeatBot: (s, p) => actions.setSeatBot(s, p),
    prefs: gamePrefs(game.id),
    err: state.err,
    modal,
    refresh: () => store.notify(),
    setDragging: (on) => { dragging = !!on; },
  };
}

export function renderPlay(app, modal, app$) {
  const { state } = app$;
  const game = state.game;
  if (!game || !state.table || !state.table.state) { app.className = "shell"; app.innerHTML = `<p class="hint">Cargando…</p>`; return; }
  if (dragging) return;
  if (mounted && mounted.gameId === game.id && mounted.el === app) { mounted.ui.update(buildCtx(app$, modal)); return; }
  if (loading && loading.gameId === game.id) return;
  unmountPlay();
  app.className = "game"; app.innerHTML = `<p class="hint">Cargando la mesa…</p>`;
  const promise = game.ui().then((ui) => {
    if (loading !== mine) return;
    loading = null;
    mounted = { gameId: game.id, ui, el: app };
    ui.mount(app, buildCtx(app$, modal));
  }).catch((e) => {
    loading = null;
    app.innerHTML = `<p class="err" role="alert">No se pudo cargar la mesa: ${esc(e.message)}</p>`;
  });
  const mine = { gameId: game.id, promise };
  loading = mine;
}

// El reloj se pinta sin redibujar toda la mesa
export function tickPlay(app$, modal, clock) {
  if (mounted && mounted.ui.tick && app$.state.table) mounted.ui.tick(buildCtx(app$, modal), clock);
}

export function unmountPlay() {
  if (mounted) { try { mounted.ui.unmount(); } catch {} }
  mounted = null; loading = null; dragging = false;
}
