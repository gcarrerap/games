"""Prueba de humo en un navegador de verdad (Chromium con Playwright), en pantalla de teléfono y sin errores en la
consola:
  1. Práctica: portal → lobby del dominó → práctica → una mano completa → "atrás" regresa al lobby.
  2. En línea, con un Firebase de mentira en la página (tests/fakes/firebase.js): crear una mesa, agregar a la
     compu, empezar y jugar una mano completa; abrir la mesa por su enlace.

Uso (desde la raíz del repositorio):
    python3 -m http.server 8765 &        # cualquier servidor estático
    python3 tests/browser/smoke.py        # o: python3 tests/browser/smoke.py http://localhost:8765/ capturas/

No corre con `npm test` (necesita Python, Playwright y Chromium). Falla con código 1 si algo no funciona.
"""
import sys
from playwright.sync_api import sync_playwright, Error as PWError

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
IGNORED = ("ERR_TUNNEL_CONNECTION_FAILED", "ERR_NAME_NOT_RESOLVED", "ERR_INTERNET_DISCONNECTED")  # fuentes sin internet

import pathlib, re
FAKE = pathlib.Path(__file__).resolve().parent.parent / "fakes" / "firebase.js"
# El Firebase de mentira es un módulo ES; aquí se convierte en un script que deja window.firebase listo antes de
# que cargue el sitio (platform/services/firebase.js no descarga el SDK si ya existe window.firebase).
FAKE_SCRIPT = re.sub(r"^export ", "", FAKE.read_text(), flags=re.M) + "\nwindow.firebase = fakeFirebase().firebase;\n"

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" and not any(x in m.text for x in IGNORED) else None)
    shot = lambda name: SHOTS and page.screenshot(path=f"{SHOTS}/{name}.png")

    page.goto(URL)
    page.wait_for_selector("[data-game=domino]"); shot("1-portal")
    page.click("[data-game=domino]")
    page.wait_for_selector("#practice")
    page.click("[data-mode='4x7p']"); page.click("[data-timer='0']"); shot("2-lobby")
    page.click("#practice")
    page.wait_for_selector("#hand"); shot("3-mesa")

    # La mesa se redibuja cuando juega la compu: un elemento puede desaparecer justo al tocarlo; se reintenta
    def tap(selector):
        try:
            el = page.query_selector(selector)
            if not el: return False
            el.click(timeout=1000); return True
        except PWError:
            return False

    moves = 0
    for _ in range(400):
        if page.query_selector(".sheet #next, .sheet #again"):
            break
        if tap(".tilebtn.play, .tilebtn.sel"):
            moves += 1
            tap("[data-side]")
        elif not tap("#draw:not([disabled])"):
            tap("#pass:not([disabled])")
        page.wait_for_timeout(250)
    finished = bool(page.query_selector(".sheet #next, .sheet #again")); shot("4-fin-de-mano")

    tap("#next")
    page.wait_for_timeout(300)
    page.go_back(); page.wait_for_timeout(300)
    back_to_lobby = bool(page.query_selector("#practice"))

    # ---------- En línea (Firebase de mentira) ----------
    on = browser.new_page(viewport={"width": 390, "height": 844})
    on.on("pageerror", lambda e: errors.append(f"pageerror (en línea): {e}"))
    on.on("console", lambda m: errors.append(f"console (en línea): {m.text}") if m.type == "error" and not any(x in m.text for x in IGNORED) else None)
    on.add_init_script(FAKE_SCRIPT)
    page = on
    on.goto(URL + "#/domino")
    on.wait_for_selector("#create:not([disabled])")
    on.fill("#nm", "Ana")
    on.click("[data-mode='4x7p']"); on.click("[data-timer='0']")
    on.click("#create")
    on.wait_for_selector(".seatlist")
    code = on.evaluate("location.hash.split('/')[2]")
    for i in (1, 2, 3):
        on.click(f"[data-addbot='{i}']"); on.wait_for_timeout(100)
    shot("5-asientos")
    on.click("#start:not([disabled])")
    on.wait_for_selector("#hand")
    online_moves = 0
    for _ in range(400):
        if on.query_selector(".sheet #next, .sheet #again"):
            break
        if tap(".tilebtn.play, .tilebtn.sel"):
            online_moves += 1
            tap("[data-side]")
        elif not tap("#draw:not([disabled])"):
            tap("#pass:not([disabled])")
        on.wait_for_timeout(250)
    online_finished = bool(on.query_selector(".sheet #next, .sheet #again")); shot("6-en-linea-fin")
    # Al lobby: la mesa aparece en la lista; volver a abrirla por su enlace
    on.evaluate("location.hash = '#/domino'"); on.wait_for_selector(f"[data-open='{code}']")
    in_list = True
    on.evaluate(f"location.hash = '#/domino/{code}'"); on.wait_for_selector("#hand, .sheet #next", timeout=5000)
    reopened = True
    browser.close()

problems = []
if not online_finished: problems.append("en línea: la mano no terminó")
if online_moves == 0: problems.append("en línea: no se pudo tirar ninguna ficha")
if not finished: problems.append("la mano no terminó")
if moves == 0: problems.append("no se pudo tirar ninguna ficha")
if not back_to_lobby: problems.append("'atrás' no regresó al lobby")
problems += errors
print(f"Práctica: fichas tiradas {moves}, mano terminada {finished}, atrás → lobby {back_to_lobby}.")
print(f"En línea: mesa {code}, fichas tiradas {online_moves}, mano terminada {online_finished}, en la lista {in_list}, se reabre por enlace {reopened}.")
if problems:
    print("PROBLEMAS:\n- " + "\n- ".join(problems)); sys.exit(1)
print("OK")
