"""Prueba de humo en un navegador de verdad (Chromium con Playwright): portal → lobby del dominó → práctica →
jugar una mano completa en pantalla de teléfono, sin errores en la consola.

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
    browser.close()

problems = []
if not finished: problems.append("la mano no terminó")
if moves == 0: problems.append("no se pudo tirar ninguna ficha")
if not back_to_lobby: problems.append("'atrás' no regresó al lobby")
problems += errors
print(f"Fichas tiradas: {moves}. Mano terminada: {finished}. Atrás → lobby: {back_to_lobby}.")
if problems:
    print("PROBLEMAS:\n- " + "\n- ".join(problems)); sys.exit(1)
print("OK")
