"""Prueba real de Club de Monstruos. Sin servidor externo: inicia uno en localhost.
Python + Playwright; CHROMIUM_PATH permite usar Chromium ya instalado.
Capturas opcionales: MONSTRUOS_SHOTS=/ruta python3 tests/browser/monstruos.py
"""
import os, pathlib, re, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/'
FAKE = re.sub(r'^export ', '', (ROOT/'tests/fakes/firebase.js').read_text(), flags=re.M) + '\nwindow.firebase = fakeFirebase().firebase;'
shots = os.environ.get('MONSTRUOS_SHOTS')
errors, audio, bad_assets = [], [], []
try:
 with sync_playwright() as p:
    opts = {'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
    browser = p.chromium.launch(**opts)
    page = browser.new_page(viewport={'width':1280,'height':1000}, device_scale_factor=1)
    page.add_init_script(FAKE)
    page.add_init_script("""(() => {
      window.mmSoundsStarted = 0; window.mmAudioElements = [];
      const AC = window.AudioContext;
      if (AC) window.AudioContext = class extends AC {
        createBufferSource() {
          const src = super.createBufferSource(), start = src.start.bind(src);
          src.start = (...args) => { window.mmSoundsStarted++; return start(...args); };
          return src;
        }
      };
      const AudioCtor = window.Audio;
      window.Audio = function(...args) { const el = new AudioCtor(...args); window.mmAudioElements.push(el); return el; };
      window.Audio.prototype = AudioCtor.prototype;
    })();""")
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: bad_assets.append(r.url) if '/monstruos/' in r.url and r.status>=400 else None)
    page.on('request', lambda r: audio.append(r.url) if '/monstruos/audio/' in r.url else None)
    page.goto(URL)
    page.click('[data-game="monstruos"]'); page.wait_for_selector('#practice')
    page.click('[data-mode="detective"]'); page.click('#practice')
    page.wait_for_selector('.mm-character')
    assert page.locator('.mm-character').count()==6
    assert page.locator('.mm-door').count()==4
    assert page.locator('#mm-submit').is_disabled()
    page.wait_for_function("document.querySelector('.mm-monster') && getComputedStyle(document.querySelector('.mm-monster')).backgroundImage.includes('characters.webp')")
    if shots: page.screenshot(path=f'{shots}/desktop.png', full_page=True)
    # Ayuda, teclado, copia, intercambio, historial y pistas.
    page.click('#mm-rules'); page.wait_for_selector('.mm-example')
    page.click('#mm-rules-close'); page.wait_for_selector('.mm-example', state='detached')
    page.locator('[data-slot="0"]').focus()
    for key in ['1','2','3','4']: page.keyboard.press(key)
    assert page.locator('#mm-submit').is_enabled()
    page.click('[data-slot="0"]'); page.click('[data-pick="1"]')
    assert 'Lola' in page.locator('[data-slot="0"]').get_attribute('aria-label')
    assert 'Pipo' in page.locator('[data-slot="1"]').get_attribute('aria-label')
    page.click('#mm-submit'); page.wait_for_selector('.mm-history-row')
    assert page.locator('.mm-history-row').count()==1
    assert page.locator('.mm-history-code .mm-token').count()==4
    if page.locator('[data-copy]').count():
      page.click('[data-copy="0"]'); page.click('#mm-submit')
      assert 'ya la probaste' in page.locator('.mm-status').inner_text()
      assert page.locator('.mm-history-row').count()==1
    page.click('[data-mark="5"]'); assert page.locator('[data-mark="5"]').get_attribute('aria-pressed')=='true'
    # Sonido real desbloqueado, mute persistente y canales independientes.
    page.wait_for_function("performance.getEntriesByType('resource').some(x=>x.name.includes('pick0.mp3'))")
    page.wait_for_function("window.mmSoundsStarted > 0")
    page.wait_for_function("window.mmAudioElements.some(a => a.src.includes('club-theme.mp3') && !a.paused && a.currentTime > 0)")
    page.click('[data-sfx="toggle"]')
    assert page.locator('[data-sfx="toggle"]').get_attribute('aria-pressed')=='true'
    assert 'true' in page.evaluate("localStorage.getItem('juegos.monstruos.sfx')")
    assert page.evaluate("window.mmAudioElements.some(a => a.src.includes('club-theme.mp3') && !a.paused)")
    page.click('[data-sfx="toggle"]')
    page.click('[data-music="toggle"]')
    # Responsive y recortes: todos los controles caben horizontalmente.
    for width in [390,320,768]:
      page.set_viewport_size({'width':width,'height':844})
      page.wait_for_timeout(120)
      assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow {width}'
      assert page.locator('.mm-character').count()==6
      if shots and width==390: page.screenshot(path=f'{shots}/mobile.png',full_page=True)
    page.set_viewport_size({'width':1280,'height':1000})
    # Resolver usando solo consejos públicos; no hay acceso al secreto en el test de interfaz.
    for _ in range(10):
      if page.locator('#mm-again').count(): break
      page.click('#mm-hint'); page.wait_for_selector('#mm-use-hint')
      page.click('#mm-use-hint'); page.click('#mm-submit')
      page.wait_for_timeout(150)
    print('Resultado visible:', page.locator('.mm-attempt-title').inner_text(), flush=True)
    if shots: page.screenshot(path=f'{shots}/result-check.png',full_page=True)
    assert 'misterio resuelto' in page.locator('.mm-attempt-title').inner_text().casefold()
    assert page.locator('.mm-secret .mm-token').count()==4
    assert not page.locator('#mm-submit').count()
    if shots: page.screenshot(path=f'{shots}/victory.png',full_page=True)
    page.click('#mm-again'); page.wait_for_selector('.mm-door')
    assert page.locator('.mm-history-row').count()==0
    assert page.locator('[data-mark="5"]').get_attribute('aria-pressed')=='false'
    page.click('#menu'); page.click('#mm-giveup'); page.click('#mm-keep')
    page.wait_for_selector('.sheet',state='detached'); assert page.locator('.mm-door').count()==4
    page.click('#menu'); page.click('#mm-giveup'); page.click('#mm-confirm-end')
    page.wait_for_selector('#mm-again'); assert page.locator('.mm-secret .mm-token').count()==4
    # Experto admite repetidos, y abandonar limpia estilos y reproductores.
    page.click('#mm-levels'); page.wait_for_selector('#practice'); page.click('[data-mode="expert"]'); page.click('#practice')
    page.wait_for_selector('.mm-character')
    for _ in range(4): page.click('[data-pick="0"]')
    assert page.locator('#mm-submit').is_enabled()
    page.click('#mm-submit'); page.wait_for_selector('.mm-history-row')
    assert page.locator('.mm-history-code [aria-label="Pipo"]').count()==4
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('.mm-idle').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    page.click('#mm-back'); page.wait_for_selector('#practice')
    assert page.locator('link[data-game-style="monstruos"]').count()==0
    page.locator('#practice').focus(); page.keyboard.press('1')
    assert len(audio)>=11, audio
    assert not bad_assets, bad_assets
    assert not errors, errors
    browser.close()
    print('OK: tablero, teclado, pistas, duplicados, victoria, revancha, rendición, experto, audio, 320/390/768/1280px y movimiento reducido.')
finally: server.shutdown()
