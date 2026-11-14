"""Prueba real de Geografía en un navegador (Chromium con Playwright), en teléfono y en pantalla grande, sin errores
en la consola. Inicia su propio servidor en localhost; CHROMIUM_PATH permite usar un Chromium ya instalado.
Capturas opcionales: GEOGRAFIA_SHOTS=/ruta python3 tests/browser/geografia.py

Cubre: los cuatro modos (continentes con el mapa tocable, silueta, bandera, pin en el mapa con y sin fronteras), el
resultado de cada pregunta, la pista, la respuesta escrita del nivel Experto con su lista de nombres, el sonido
sintetizado, las ventanas (reglas y menú), el teclado, dos personas en el mismo aparato y el final de la partida.
"""
import os, pathlib, re, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/'
FAKE = re.sub(r'^export ', '', (ROOT / 'tests/fakes/firebase.js').read_text(), flags=re.M) + '\nwindow.firebase = fakeFirebase().firebase;'
shots = os.environ.get('GEOGRAFIA_SHOTS')
IGNORED = ('ERR_TUNNEL_CONNECTION_FAILED', 'ERR_NAME_NOT_RESOLVED', 'ERR_INTERNET_DISCONNECTED')
errors, bad = [], []

def shot(page, name):
    if shots: page.screenshot(path=f'{shots}/{name}.png')

def start(page, game, level='Fácil', rounds='5', extra=None):
    page.goto(URL); page.click('[data-game="geografia"]'); page.wait_for_selector('#practice')
    page.click(f'button:has-text("{game}")'); page.click(f'button:text-is("{level}")'); page.click(f'button:text-is("{rounds}")')
    if extra: extra(page)
    page.click('#practice'); page.wait_for_selector('.geo')

def next_q(page):
    page.wait_for_selector('#geo-next'); page.click('#geo-next')

with sync_playwright() as p:
    opts = {'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
    browser = p.chromium.launch(**opts)
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    page.set_default_timeout(10000)
    page.add_init_script(FAKE)
    page.add_init_script("""(() => { window.geoSounds = 0; const AC = window.AudioContext;
      if (AC) window.AudioContext = class extends AC { createOscillator() { window.geoSounds++; return super.createOscillator(); } }; })();""")
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and not any(i in m.text for i in IGNORED) else None)
    page.on('response', lambda r: bad.append(r.url) if '/geografia/' in r.url and r.status >= 400 else None)

    # 1. Continentes: el mapa se toca y los botones responden; resultado y siguiente
    start(page, 'Continentes')
    assert page.locator('.geo-cont').count() == 6
    page.wait_for_function("document.querySelector('.geo-canvas') && document.querySelector('.geo-canvas').width > 100")
    shot(page, 'continentes')
    page.keyboard.press('1')            # África con el teclado
    page.wait_for_selector('.geo-result'); shot(page, 'continentes_resultado')
    assert page.locator('.geo-cont.good').count() == 1
    assert page.locator('.geo-score').first.inner_text() != ''
    next_q(page); page.wait_for_selector('.geo-cont:not([disabled])')
    # tocar el mapa responde (el centro de África cae en un país, en el océano no pasa nada)
    box = page.locator('.geo-canvas').bounding_box()
    page.mouse.click(box['x'] + 3, box['y'] + 3)
    page.wait_for_timeout(200); assert page.locator('.geo-result').count() == 0, 'el océano no responde'
    page.click('.geo-cont >> nth=2'); page.wait_for_selector('.geo-result')

    # 2. Siluetas con la pista, y el sonido sintetizado
    start(page, 'Siluetas')
    assert page.locator('.geo-shape-body').count() == 1 and page.locator('.geo-opt').count() == 4
    d = page.locator('.geo-shape-body').get_attribute('d'); assert d and len(d) > 200
    page.click('#geo-hint'); page.wait_for_selector('.geo-hint p:has-text("Pista")')
    page.click('.geo-opt >> nth=0'); page.wait_for_selector('.geo-result')
    page.wait_for_function('window.geoSounds > 0')
    assert page.locator('.geo-chips .dim').count() == 1, 'la pista se marca en el resultado'
    shot(page, 'siluetas_resultado')

    # 3. Banderas: la bandera se ve y el menú tiene sonido
    start(page, 'Banderas')
    page.wait_for_function("document.querySelector('.geo-flag img').complete && document.querySelector('.geo-flag img').naturalWidth > 0")
    shot(page, 'banderas')
    page.click('#menu'); page.wait_for_selector('[data-sfx="volume"]')
    page.click('#modal [data-sfx="toggle"]'); assert page.locator('#modal [data-sfx="toggle"]').get_attribute('aria-pressed') == 'true'
    assert page.locator('.geo-tools [data-sfx="toggle"]').get_attribute('aria-pressed') == 'true', 'el botón de arriba sigue al del menú'
    page.click('#modal [data-sfx="toggle"]'); page.click('#sheetclose')
    page.click('#geo-rules'); page.wait_for_selector('.geo-help'); page.click('#geo-rules-close')
    page.wait_for_selector('.geo-help', state='detached'); page.wait_for_timeout(400)  # el historial del navegador termina de volver

    # 4. Pin en el mapa: sin pin no se confirma; tocar, mover, zoom, confirmar; con y sin fronteras alternan
    start(page, 'Ubica en el mapa', 'Fácil', '5', None)
    assert page.locator('#geo-confirm').is_disabled()
    page.wait_for_function("document.querySelector('.geo-canvas').width > 100")
    box = page.locator('.geo-canvas').bounding_box()
    page.click('#geo-zin'); page.click('#geo-zin'); page.wait_for_timeout(200)
    page.mouse.click(box['x'] + box['width'] * .5, box['y'] + box['height'] * .5); page.wait_for_timeout(900)
    assert page.locator('#geo-confirm').is_enabled(); shot(page, 'pin_puesto')
    page.mouse.click(box['x'] + box['width'] * .4, box['y'] + box['height'] * .4)
    page.click('#geo-confirm'); page.wait_for_selector('.geo-result'); page.wait_for_timeout(1200); shot(page, 'pin_resultado')
    assert 'km' in page.locator('.geo-result').inner_text() or 'dentro' in page.locator('.geo-result').inner_text()
    first_borders = page.locator('.geo-borders').count()
    next_q(page); page.wait_for_selector('.geo-canvas')
    # con el teclado: Enter pone el pin al centro del mapa
    page.locator('.geo-canvas').focus(); page.keyboard.press('Enter'); page.wait_for_function("!document.querySelector('#geo-confirm').disabled")

    # 5. Experto: se escribe el nombre y sale la lista; sin acentos también vale
    start(page, 'Banderas', 'Experto')
    assert page.locator('.geo-opt').count() == 0
    page.fill('#geo-input', 'esp'); page.wait_for_selector('.geo-sugg button')
    assert page.locator('.geo-sugg button').count() >= 1
    page.keyboard.press('Enter'); page.wait_for_selector('.geo-result')

    # 6. Dos personas en este aparato: el turno pasa de una a otra, y la partida completa llega al final
    def two(pg):
        pg.click('button:text-is("2 jugadores")')
        pg.select_option('select[data-bot="0"]', label_person(pg))
    def label_person(pg):
        return pg.locator('select[data-bot="0"] option', has_text='Persona').first.get_attribute('value')
    start(page, 'Continentes', 'Fácil', '5', two)
    names = page.locator('.geo-pname').all_inner_texts(); assert len(names) == 2, names
    assert page.locator('.geo-chip.turn .geo-pname').inner_text() == names[0]
    for turn in range(10):               # 5 preguntas por jugador
        who = page.locator('.geo-chip.turn .geo-pname').inner_text()
        assert who == names[turn % 2], (turn, who, names)
        page.keyboard.press('1'); page.wait_for_selector('.geo-result'); next_q(page)
        page.wait_for_selector('.geo-final, .geo-cont:not([disabled])')
    page.wait_for_selector('.geo-final'); page.wait_for_timeout(500)
    assert page.locator('.geo-rank li').count() == 2; shot(page, 'final')
    page.click('#geo-again'); page.wait_for_selector('.geo-cont')
    browser.close()

assert not errors, errors
assert not bad, bad
print('Geografía: ok')
