"""Prueba de humo en un navegador de verdad (Chromium con Playwright), en pantalla de teléfono y sin errores en la
consola:
  1. Práctica: portal → lobby del dominó → práctica → una mano completa → "atrás" regresa al lobby.
  2. La Pata en práctica: varios turnos (robar y descartar), el registro y el consejo; los estilos del dominó se
     quitan al cambiar de juego.
  3. Piojos en práctica: tirar y plantarse varios turnos contra la compu; solo sus estilos quedan cargados.
  3b. La Viuda en práctica: el botón "Reglas" abre las reglas; tomar o pasar a ciegas, cambiar una carta, tocar (el paño
     se pone rojo con el aviso de última vuelta) y pasar a la siguiente mano.
  4. El Continental en práctica: escoger la regla de compra, comprar fuera de turno, robar, descartar, bajarse con
     el consejo y abrir el menú. En línea: la regla escogida se ve en la pantalla de asientos.
  5. Escribir tu nombre: el teclado del teléfono cambia el tamaño de la pantalla y la lista de mesas puede cambiar
     mientras escribes; el campo no debe perder el foco (el teclado se abría y cerraba sin parar).
  6. En línea, con un Firebase de mentira en la página (tests/fakes/firebase.js): crear una mesa, agregar a la
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

    # ---------- La Pata en práctica ----------
    page.evaluate("location.hash = '#/pata'"); page.wait_for_selector("#practice")
    page.click("[data-mode='4p']"); page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector("#hand .cardbtn", timeout=10000); shot("7-pata")
    pata_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")
    pata_turns = 0
    for _ in range(200):
        if pata_turns >= 4: break
        # Tu turno: roba; luego escoge una carta y descártala (cada toque redibuja la mesa, por eso un paso a la vez)
        if tap("#draw:not([disabled])"): pass
        elif page.query_selector("#discardbtn") and not page.query_selector(".cardbtn.sel"): tap(".cardbtn")
        elif tap("#discardbtn:not([disabled])"): pata_turns += 1
        page.wait_for_timeout(250)
    shot("8-pata-turnos")
    tap("[data-track='1']"); page.wait_for_selector(".sheet[data-sheet='track-1']"); tap("#trkclose")
    page.wait_for_timeout(200)

    # ---------- Piojos en práctica ----------
    page.evaluate("location.hash = '#/piojos'"); page.wait_for_selector("#practice")
    page.click("[data-mode='3']"); page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector(".game.piojos", timeout=10000); shot("9-piojos")
    piojos_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")
    piojos_rolls = piojos_banks = 0
    for _ in range(300):
        if piojos_banks >= 3 or page.query_selector(".sheet #again"): break
        # Tu turno: tira; si ya llevas 30 o más, plántate
        bank = page.query_selector("#bank")
        pts = page.inner_text(".turnpts b") if page.query_selector(".turnpts b") else "0"
        if bank and int(pts) >= 30:
            if tap("#bank"): piojos_banks += 1
        elif tap("#roll"): piojos_rolls += 1
        page.wait_for_timeout(300)
    shot("10-piojos-turnos")

    # ---------- El Continental en práctica ----------
    page.evaluate("location.hash = '#/continental'"); page.wait_for_selector("#practice")
    page.click("[data-mode='4']"); page.click("[data-timer='0']"); page.click("[data-opt='buy'][data-val='free']")
    page.click("#practice"); page.wait_for_selector("#hand .cardbtn", timeout=10000); shot("11-continental")
    cont_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")
    cont_turns = cont_buys = cont_downs = 0
    for _ in range(400):
        if cont_turns >= 8 and cont_buys and cont_downs: break
        if tap(".sheet #next"): page.wait_for_timeout(300); continue
        if tap("#buy"): cont_buys += 1
        elif tap("#draw"): pass
        elif page.query_selector("#discardbtn") and tap("#advice:not([disabled])"):
            # En tu turno, haz lo que dice el consejo (bajarse si ya se puede; si no, descartar)
            try: page.wait_for_selector("#advplay", timeout=3000)
            except PWError: continue
            txt = page.inner_text("#advplay")
            if tap("#advplay"):
                if txt.startswith("Bájate"): cont_downs += 1
                if txt.startswith("Descarta"): cont_turns += 1
        page.wait_for_timeout(200)
    shot("12-continental-turnos")
    tap("#menu"); page.wait_for_selector(".sheet[data-sheet='gameMenu']")
    cont_menu = "Se compra con castigo, sin límite" in page.inner_text(".sheet")
    tap("#menuclose"); page.wait_for_timeout(200)

    # ---------- La Viuda en práctica ----------
    page.evaluate("location.hash = '#/viuda'"); page.wait_for_selector("#practice")
    page.click("[data-mode='3']"); page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector(".game.viuda", timeout=10000); shot("11-viuda")
    page.click("#rules"); page.wait_for_selector(".sheet[data-sheet='rules'] .ranking")
    viuda_rules = "Flor imperial" in page.inner_text(".sheet[data-sheet='rules']"); shot("12-viuda-reglas")
    page.click("#rulesclose"); page.wait_for_timeout(200)
    viuda_acts = viuda_hands = 0
    viuda_alert = False
    viuda_widow_shown = False
    for _ in range(300):
        if not viuda_alert and page.query_selector(".felt.lastround .knockalert"):
            viuda_alert = True; shot("13b-viuda-tocaron")
        if (viuda_hands >= 1 and viuda_acts >= 3 and viuda_alert) or viuda_hands >= 5 or page.query_selector(".sheet #again"): break
        if page.query_selector(".sheet #next"):
            if viuda_hands == 0:
                shot("13-viuda-manos")
                viuda_widow_shown = bool(page.query_selector(".sheet .sdrow.widowrow .sdcards svg"))
            if tap(".sheet #next"): viuda_hands += 1
        elif page.query_selector("#all") and page.query_selector("#pass") and not page.query_selector("#swap"):
            if tap("#all" if viuda_hands else "#pass"): viuda_acts += 1   # a ciegas: pasa la primera mano, luego toma
        elif page.query_selector("#swap"):
            if viuda_acts >= 3 and tap("#knock"): viuda_acts += 1
            # Cambiar una: tu carta, la de la viuda y el botón (cada toque redibuja la mesa, un paso a la vez)
            elif not page.query_selector("[data-give].sel"): tap("[data-give]")
            elif not page.query_selector("[data-take].sel"): tap("[data-take]")
            elif tap("#swap:not([disabled])"): viuda_acts += 1
        page.wait_for_timeout(300)
    viuda_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")

    # ---------- Escribir tu nombre sin que se cierre el teclado ----------
    kb = browser.new_page(viewport={"width": 390, "height": 844})
    kb.on("pageerror", lambda e: errors.append(f"pageerror (teclado): {e}"))
    kb.add_init_script(FAKE_SCRIPT)
    kb.goto(URL + "#/domino"); kb.wait_for_selector("#create:not([disabled])")
    kb.click("#nm"); kb.keyboard.type("Me", delay=30)
    kb.set_viewport_size({"width": 390, "height": 480}); kb.wait_for_timeout(300)  # se abre el teclado
    keyboard_resize_ok = kb.evaluate("document.activeElement && document.activeElement.id") == "nm"
    # Otra persona crea una mesa mientras escribes: la lista cambia y la pantalla se redibuja
    kb.evaluate("""firebase.firestore().doc('juegos-mesas/ZZZZ').set({ json: JSON.stringify({ v: 1, code: 'ZZZZ', game: 'domino', mode: '2x7',
      config: { n: 2, per: 7, teams: false }, seats: [{ id: 'x', name: 'Beto' }, null], status: 'lobby', round: 0, turn: 0, created: Date.now() }),
      code: 'ZZZZ', game: 'domino', created: Date.now(), updated: Date.now() })""")
    kb.wait_for_selector("[data-open='ZZZZ']")
    kb.keyboard.type("mo", delay=30)
    typed = kb.input_value("#nm")
    list_redraw_ok = kb.evaluate("document.activeElement && document.activeElement.id") == "nm" and typed == "Memo"
    kb.close()

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
    # El Continental en línea: la regla de compra escogida se ve en los asientos y se puede empezar con la compu
    on.evaluate("location.hash = '#/continental'"); on.wait_for_selector("#create:not([disabled])")
    on.click("[data-mode='3']"); on.click("[data-opt='buy'][data-val='none']"); on.click("#create")
    on.wait_for_selector(".seatlist")
    cont_online_rule = "No se compra" in on.inner_text(".shell-head")
    for i in (1, 2):
        on.click(f"[data-addbot='{i}']"); on.wait_for_timeout(100)
    on.click("#start:not([disabled])"); on.wait_for_selector("#hand .cardbtn", timeout=10000)
    cont_online_buy = bool(on.query_selector("#buy"))
    browser.close()

problems = []
if not keyboard_resize_ok: problems.append("al abrir el teclado, el campo del nombre pierde el foco")
if not list_redraw_ok: problems.append(f"al cambiar la lista de mesas, el campo del nombre pierde el foco (escrito: {typed!r})")
if cont_turns < 8: problems.append(f"Continental: solo se jugaron {cont_turns} turnos")
if not cont_buys: problems.append("Continental: nunca se pudo comprar fuera de turno")
if not cont_downs: problems.append("Continental: nunca se pudo bajar")
if not cont_menu: problems.append("Continental: el menú no dice la regla de compra")
if "pata" in cont_styles or "domino" in cont_styles: problems.append("estilos de otro juego cargados en el Continental")
if not cont_online_rule: problems.append("Continental en línea: la pantalla de asientos no dice la regla de compra")
if cont_online_buy: problems.append("Continental en línea: con 'no se compra' apareció el botón de comprar")
if pata_turns < 4: problems.append(f"La Pata: solo se jugaron {pata_turns} turnos")
if piojos_rolls < 3: problems.append(f"Piojos: solo se tiraron {piojos_rolls} veces")
if piojos_styles != ["piojos"]: problems.append(f"Piojos: estilos cargados {piojos_styles}")
if not viuda_rules: problems.append("La Viuda: el botón Reglas no mostró las reglas")
if viuda_acts < 3: problems.append(f"La Viuda: solo se jugaron {viuda_acts} turnos")
if viuda_hands < 1: problems.append("La Viuda: no terminó ninguna mano")
if viuda_hands and not viuda_widow_shown: problems.append("La Viuda: al final no se ven las cartas de la viuda")
if not viuda_alert: problems.append("La Viuda: al tocar no apareció el aviso de última vuelta")
if set(viuda_styles) != {"viuda"}: problems.append(f"La Viuda: estilos cargados {viuda_styles}")
if "domino" in pata_styles: problems.append("los estilos del dominó siguen cargados en La Pata")
if not online_finished: problems.append("en línea: la mano no terminó")
if online_moves == 0: problems.append("en línea: no se pudo tirar ninguna ficha")
if not finished: problems.append("la mano no terminó")
if moves == 0: problems.append("no se pudo tirar ninguna ficha")
if not back_to_lobby: problems.append("'atrás' no regresó al lobby")
problems += errors
print(f"Práctica: fichas tiradas {moves}, mano terminada {finished}, atrás → lobby {back_to_lobby}.")
print(f"La Pata: turnos jugados {pata_turns}, estilos cargados {sorted(set(pata_styles))}.")
print(f"La Viuda: reglas {viuda_rules}, turnos {viuda_acts}, manos {viuda_hands}.")
print(f"Piojos: tiros {piojos_rolls}, plantadas {piojos_banks}, estilos cargados {piojos_styles}.")
print(f"Continental: turnos {cont_turns}, compras {cont_buys}, bajadas {cont_downs}, menú {cont_menu}; en línea: regla {cont_online_rule}.")
print(f"Teclado: foco al cambiar el tamaño {keyboard_resize_ok}, foco al cambiar la lista {list_redraw_ok} (escrito {typed!r}).")
print(f"En línea: mesa {code}, fichas tiradas {online_moves}, mano terminada {online_finished}, en la lista {in_list}, se reabre por enlace {reopened}.")
if problems:
    print("PROBLEMAS:\n- " + "\n- ".join(problems)); sys.exit(1)
print("OK")
