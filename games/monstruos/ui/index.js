import { CHARACTERS, sameCode } from "../engine/index.js";
import { monster } from "./art.js";
import { esc } from "../../../platform/ui/dom.js";
import { loadStyles, unloadStyles } from "../../../platform/ui/styles.js";
import { overlay, openOverlay, closeOverlay, renderSheet } from "../../../platform/ui/sheet.js";
import { modeMenu, wireModeMenu } from "../../../platform/ui/modes.js";
import { createSfx, armOnGesture, sfxButton, sfxControls, wireSfx, SFX_STYLES } from "../../../modules/sfx/ui.js";
import { createMusic, armOnGesture as armMusic, musicButton, musicControls, wireMusic, MUSIC_STYLES } from "../../../modules/music/ui.js";

const url = (p) => new URL(p, import.meta.url).href;
const clips = Object.fromEntries(["pick0", "pick1", "pick2", "pick3", "pick4", "pick5", "erase", "clue", "win", "retry"].map((k) => [k, url(`../audio/${k}.mp3`)]));
let ui = null;

export function mount(el, ctx) {
  loadStyles("monstruos", [url("../styles/table.css"), SFX_STYLES, MUSIC_STYLES]);
  const sfx = createSfx({ clips, prefs: ctx.prefs });
  const music = createMusic({ songs: [url("../audio/club-theme.mp3")], prefs: ctx.prefs });
  ui = { el, ctx, sfx, music, offSfx: armOnGesture(el, sfx), offMusic: armMusic(el, music),
    draft: Array(ctx.view.slots).fill(null), active: 0, seq: ctx.view.seq, round: ctx.table.round,
    message: "", busy: false, marked: new Set(), justPicked: null };
  render(ctx);
}
export function update(ctx) { if (ui) render(ctx); }
export function unmount() {
  if (ui) { ui.offSfx(); ui.offMusic(); ui.sfx.destroy(); ui.music.destroy(); ui.el.onkeydown = null; ui.el.innerHTML = ""; }
  ui = null; unloadStyles("monstruos");
}

const feedback = (h) => `<span class="mm-feedback" aria-label="${h.exact} en su lugar y ${h.misplaced} en otro lugar">
  <span class="mm-exact"><b>✓ ${h.exact}</b><small>en su lugar</small></span>
  <span class="mm-moved"><b>↔ ${h.misplaced}</b><small>otro lugar</small></span></span>`;
const codeHTML = (code) => code.map((id) => `<span class="mm-token" title="${CHARACTERS[id].name}" role="img" aria-label="${CHARACTERS[id].name}">${monster(id)}</span>`).join("");

function rules(ctx) {
  renderSheet(ctx.modal, "mm-rules", "El secreto está en las pistas", `<div class="mm-help">
    <p>Unos monstruos se escondieron en una fila. Descubre <b>quiénes son y en qué orden están</b>.</p>
    <ol><li>Toca un lugar de tu fila y luego un personaje para colocarlo.</li><li>Llena todos los lugares y pulsa <b>Probar fila</b>.</li><li>Compara las pistas de cada intento y prueba una fila mejor.</li></ol>
    <p><b>✓ En su lugar:</b> personaje correcto en la posición correcta.<br><b>↔ Otro lugar:</b> personaje correcto, pero en una posición diferente.</p>
    <p><strong>Las pistas son totales: no señalan casillas concretas.</strong> Cada aparición de un personaje cuenta como máximo una vez.</p>
    <div class="mm-example"><span>Ejemplo: secreto</span><div>${codeHTML([0,1,2])}</div><span>Tu intento</span><div>${codeHTML([0,2,3])}${feedback({exact:1,misplaced:1})}</div></div>
    <p>Pipo está en su lugar. Taco sí está, pero va en otro lugar. Momo no está.</p>
    <p><b>Junior:</b> 3 lugares, sin repetidos, 8 intentos.<br><b>Detective:</b> 4 lugares, sin repetidos, 10 intentos.<br><b>Experto:</b> 4 lugares, se permiten repetidos, 10 intentos.</p>
    <p>El bloc de sospechosos es solo para tus notas: tachar un personaje no lo elimina del juego. El botón <b>Pista</b> propone una prueba usando únicamente los intentos anteriores.</p>
    <p class="hint">Teclado: 1–6 elige personaje · ← → cambia lugar · Supr borra · Enter prueba la fila. No hay límite de tiempo.</p>
    </div><button id="mm-rules-close" class="primary big-cta">¡A investigar!</button>`);
  ctx.modal.querySelector("#mm-rules-close").onclick = closeOverlay;
}
function menu(ctx) {
  renderSheet(ctx.modal, "mm-menu", "Club de Monstruos", `<p>Música</p>${musicControls(ui.music)}<p>Efectos</p>${sfxControls(ui.sfx)}
    ${modeMenu(ctx)}<button id="mm-menu-rules">Cómo jugar</button>
    ${ctx.seat === 0 && ctx.view.phase === "play" ? '<button id="mm-giveup">Ver solución y terminar</button>' : ''}
    <button id="mm-leave">Salir al menú de niveles</button>`);
  wireModeMenu(ctx.modal, ctx); wireMusic(ctx.modal, ui.music, { setDragging: ctx.setDragging }); wireSfx(ctx.modal, ui.sfx, { setDragging: ctx.setDragging });
  ctx.modal.querySelector("#mm-menu-rules").onclick = () => openOverlay("mm-rules");
  ctx.modal.querySelector("#mm-giveup")?.addEventListener("click", () => openOverlay("mm-confirm"));
  ctx.modal.querySelector("#mm-leave").onclick = () => { closeOverlay(); ctx.leave(); };
}
function confirm(ctx) {
  renderSheet(ctx.modal, "mm-confirm", "¿Abrimos la fila secreta?", '<p>Verás la solución y terminará esta partida. Después puedes empezar otra.</p><button class="primary big-cta" id="mm-confirm-end">Sí, ver solución</button><button id="mm-keep">Seguir investigando</button>');
  ctx.modal.querySelector("#mm-keep").onclick = closeOverlay;
  ctx.modal.querySelector("#mm-confirm-end").onclick = () => { closeOverlay(); ctx.act({ type: "giveup" }); };
}
function pick(id) {
  if (!ui || ui.busy || ui.ctx.seat !== 0 || ui.ctx.view.phase !== "play") return;
  const st = ui.ctx.view;
  // En los niveles sin repetidos, mover un personaje intercambia los lugares en vez de duplicarlo.
  const old = ui.draft.indexOf(id);
  if (!st.repeats && old >= 0 && old !== ui.active) ui.draft[old] = ui.draft[ui.active];
  ui.draft[ui.active] = id; ui.justPicked = id; ui.message = "";
  const empty = ui.draft.findIndex((v) => v === null);
  ui.active = empty >= 0 ? empty : (ui.active + 1) % st.slots;
  ui.sfx.play(`pick${id}`); render(ui.ctx);
}
async function submit() {
  if (!ui || ui.busy || ui.ctx.seat !== 0 || ui.ctx.view.phase !== "play") return;
  if (ui.draft.some((v) => v === null)) { ui.message = "Faltan personajes: llena todos los lugares."; render(ui.ctx); return; }
  if (ui.ctx.view.history.some((h) => sameCode(h.code, ui.draft))) {
    ui.message = "¡Esa fila ya la probaste! Cambia un personaje o su lugar."; render(ui.ctx); return;
  }
  const mine = ui, action = { type: "guess", code: [...ui.draft] };
  mine.busy = true; render(mine.ctx);
  try { await mine.ctx.act(action); }
  finally { if (ui === mine) { mine.busy = false; render(mine.ctx); } }
}
function render(ctx) {
  if (!ui) return;
  ui.ctx = ctx;
  const st = ctx.view, over = st.phase === "over", me = ctx.seat === 0, play = me && !over;
  const roundChanged = ui.round !== ctx.table.round;
  if (roundChanged || ui.seq !== st.seq) {
    if (!roundChanged) ui.sfx.play(over ? st.won ? "win" : "retry" : "clue");
    ui.draft = Array(st.slots).fill(null); ui.active = 0; ui.message = ""; ui.justPicked = null;
    if (roundChanged) ui.marked.clear();
    ui.round = ctx.table.round; ui.seq = st.seq;
  }
  const activeElement = document.activeElement;
  const focus = ui.el.contains(activeElement) ? activeElement?.dataset.focus : null;
  const oldScroll = ui.el.querySelector(".mm-history")?.scrollTop || 0;
  const last = st.history.at(-1);
  const status = ui.message || (over ? st.won ? "¡Caso resuelto! Encontraste a toda la pandilla." : "Cada pista te enseñó algo. ¡Vamos por otra!"
    : last ? `${last.exact} en su lugar y ${last.misplaced} en otro lugar. ¿Qué puedes deducir?` : "Toca un personaje para llenar el lugar marcado.");
  const advice = ctx.advice?.data;
  const ready = ui.draft.every((x) => x !== null);
  ui.el.className = "game mm-game";
  ui.el.innerHTML = `<div class="mm-shell">
    <header class="mm-header"><button id="mm-back" class="mm-back" aria-label="Salir al menú de niveles">←</button>
      <div class="mm-brand"><span class="mm-brand-mark" aria-hidden="true">✦</span><span>CLUB DE<br><b>MONSTRUOS</b></span></div>
      <div class="mm-tools">${musicButton(ui.music)}${sfxButton(ui.sfx)}<button id="mm-rules" aria-label="Cómo jugar">?</button><button id="menu" aria-label="Menú del juego">☰</button></div>
    </header>
    <div class="mm-layout">
      <aside class="mm-roster-panel">
        <div class="mm-intro"><span class="mm-eyebrow">PEQUEÑOS MONSTRUOS · GRANDES MISTERIOS</span><h1>La fila<br><span>secreta.</span></h1><p>Seis sospechosos muy traviesos.<br>¿Puedes descubrir quién se esconde?</p></div>
        <div class="mm-roster-title"><h2>Conoce a la pandilla</h2><span>1–6</span></div>
        <div class="mm-roster">${CHARACTERS.map((c) => `<button class="mm-character ${ui.justPicked === c.id ? 'mm-picked' : ''}" data-pick="${c.id}" data-focus="char${c.id}" aria-label="Elegir ${c.name}" ${play && !ui.busy ? '' : 'disabled'} style="--tint:${c.color};--i:${c.id}">
          <span class="mm-char-number" aria-hidden="true">${c.id + 1}</span>${monster(c.id, "mm-idle")}<b>${c.name}</b><small>${c.trait}</small></button>`).join("")}</div>
        <div class="mm-notebook"><h3>Bloc de sospechosos <span>tus notas</span></h3><p>Tacha a quienes creas que no están.</p><div>${CHARACTERS.map((c) => `<button data-mark="${c.id}" data-focus="mark${c.id}" class="${ui.marked.has(c.id) ? 'mm-crossed' : ''}" aria-pressed="${ui.marked.has(c.id)}" aria-label="${ui.marked.has(c.id) ? 'Quitar tachado de' : 'Tachar a'} ${c.name}">${c.name}</button>`).join("")}</div></div>
      </aside>
      <main class="mm-case">
        <div class="mm-case-head"><span class="mm-level">${st.name}</span><span>${st.slots} lugares · ${st.repeats ? 'pueden repetirse' : 'sin repetidos'} · sin reloj</span></div>
        <section class="mm-stage ${over ? 'mm-revealed' : ''}" aria-label="Fila secreta">
          <div class="mm-stage-label">${over ? 'EL SECRETO ERA…' : 'SHHH… ¡AQUÍ SE ESCONDEN!'}</div>
          <div class="mm-secret" style="--slots:${st.slots}">${over ? codeHTML(st.solution) : Array.from({length:st.slots}, () => '<span class="mm-door"><span>?</span><i></i></span>').join('')}</div>
          <span class="mm-stage-star a" aria-hidden="true">✦</span><span class="mm-stage-star b" aria-hidden="true">✧</span>
        </section>
        <div class="mm-legend"><span><b>✓</b> Personaje y lugar correctos</span><span><b>↔</b> Personaje correcto, otro lugar</span><small>Las pistas son totales; no señalan casillas.</small></div>
        <section class="mm-workbench">
          <div class="mm-attempt-title"><h2>${over ? st.won ? '¡Misterio resuelto!' : 'La pandilla te espera' : `Intento ${st.history.length + 1}`} ${!over ? `<span>/ ${st.attempts}</span>` : ''}</h2><span class="mm-progress">${Array.from({length:st.attempts},(_,i)=>`<i class="${i < st.history.length ? 'used' : ''}"></i>`).join('')}</span></div>
          ${play ? `<div class="mm-draft" style="--slots:${st.slots}" aria-label="Tu fila">${ui.draft.map((id, i) => `<button class="mm-slot ${i === ui.active ? 'active' : ''}" data-slot="${i}" data-focus="slot${i}" aria-pressed="${i === ui.active}" aria-label="Lugar ${i+1}: ${id === null ? 'vacío' : CHARACTERS[id].name}" ${ui.busy ? 'disabled' : ''}>${id === null ? '<span class="mm-plus">+</span>' : monster(id)}<small>${i+1}</small></button>`).join('')}</div>` : ''}
          <p class="mm-status" role="status" aria-live="polite">${esc(ui.message || ctx.err || status)}</p>
          ${play ? `<div class="mm-actions"><button id="mm-erase" data-focus="erase" aria-label="Borrar el lugar seleccionado" ${ui.busy ? 'disabled' : ''}>⌫</button><button id="mm-hint" data-focus="hint" ${ui.busy || (ctx.advice && !advice) ? 'disabled' : ''}>✦ Pista</button><button id="mm-submit" data-focus="submit" class="mm-primary" ${!ready || ui.busy ? 'disabled' : ''}>${ui.busy ? 'Revisando…' : 'Probar fila'} <span aria-hidden="true">→</span></button></div>` : over && me ? `<div class="mm-end"><span class="mm-stars" aria-hidden="true">${st.won ? '✦ ✦ ✦' : '✦'}</span><button id="mm-again" class="mm-primary">¡Otra fila secreta! →</button><button id="mm-levels">Cambiar nivel</button></div>` : '<p class="mm-watching">Estás mirando la investigación.</p>'}
          ${play && ctx.advice ? `<div class="mm-advice" role="status">${advice ? `<p>${esc(advice.why)}</p>${advice.action?.code ? `<div class="mm-advice-row">${codeHTML(advice.action.code)}</div><button id="mm-use-hint">Colocar esta prueba</button>` : ''}<button id="mm-close-hint" aria-label="Cerrar pista">Cerrar</button>` : 'Pensando con tus pistas…'}</div>` : ''}
        </section>
        <section class="mm-evidence"><div class="mm-history-title"><h2>Tus pistas</h2><span>${st.history.length ? 'Más reciente primero' : 'Cada intento cuenta una historia'}</span></div>
          <div class="mm-history">${st.history.length ? st.history.map((h,i)=>({h,i})).reverse().map(({h,i})=>`<div class="mm-history-row"><span class="mm-history-num">${String(i+1).padStart(2,'0')}</span><div class="mm-history-code">${codeHTML(h.code)}</div>${feedback(h)}${play ? `<button data-copy="${i}" aria-label="Copiar intento ${i+1} para editar">↶</button>` : ''}</div>`).join('') : '<div class="mm-empty"><span aria-hidden="true">⌕</span><p>El misterio empieza contigo.<br><b>Arma tu primera fila.</b></p></div>'}</div>
        </section>
      </main>
    </div><footer class="mm-footer">Observa. Prueba. Descubre. <span>¡Aquí equivocarse también da pistas!</span></footer>
    </div>`;
  const el = ui.el;
  el.querySelector('.mm-history').scrollTop = oldScroll;
  if (focus) el.querySelector(`[data-focus="${focus}"]`)?.focus({ preventScroll: true });
  wireMusic(el, ui.music); wireSfx(el, ui.sfx);
  el.querySelector('#mm-back').onclick = () => ctx.leave();
  el.querySelector('#menu').onclick = () => openOverlay('mm-menu');
  el.querySelector('#mm-rules').onclick = () => openOverlay('mm-rules');
  el.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => pick(Number(b.dataset.pick)));
  el.querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { ui.active = Number(b.dataset.slot); ui.justPicked = null; render(ctx); });
  el.querySelectorAll('[data-mark]').forEach((b) => b.onclick = () => { const n = Number(b.dataset.mark); ui.marked.has(n) ? ui.marked.delete(n) : ui.marked.add(n); render(ctx); });
  el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { ui.draft = [...st.history[Number(b.dataset.copy)].code]; ui.active = 0; ui.message = 'Fila copiada. Toca un lugar para cambiarlo.'; render(ctx); });
  el.querySelector('#mm-submit')?.addEventListener('click', submit);
  el.querySelector('#mm-erase')?.addEventListener('click', () => { ui.draft[ui.active] = null; ui.sfx.play('erase'); render(ctx); });
  el.querySelector('#mm-hint')?.addEventListener('click', () => ctx.askAdvice());
  el.querySelector('#mm-close-hint')?.addEventListener('click', () => ctx.closeAdvice());
  el.querySelector('#mm-use-hint')?.addEventListener('click', () => { ui.draft = [...advice.action.code]; ui.active = 0; ui.message = 'Esta fila es una prueba sugerida. Pulsa Probar fila cuando estés listo.'; ctx.closeAdvice(); });
  el.querySelector('#mm-again')?.addEventListener('click', () => ctx.again());
  el.querySelector('#mm-levels')?.addEventListener('click', () => ctx.leave());
  el.onkeydown = (e) => {
    if (!play || ui.busy || overlay() || e.altKey || e.ctrlKey || e.metaKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (/^[1-6]$/.test(e.key)) { e.preventDefault(); pick(Number(e.key)-1); }
    else if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); ui.active = (ui.active + (e.key === 'ArrowRight' ? 1 : st.slots-1)) % st.slots; render(ctx); el.querySelector(`[data-slot="${ui.active}"]`)?.focus(); }
    else if (['Delete','Backspace'].includes(e.key)) { e.preventDefault(); ui.draft[ui.active] = null; render(ctx); }
    else if (e.key === 'Enter' && e.target.matches('[data-slot]')) { e.preventDefault(); submit(); }
  };
  const ov = overlay();
  if (ov?.id === 'mm-menu') menu(ctx);
  else if (ov?.id === 'mm-rules') rules(ctx);
  else if (ov?.id === 'mm-confirm') confirm(ctx);
  else ctx.modal.innerHTML = '';
}
