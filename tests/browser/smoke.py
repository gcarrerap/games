"""Prueba de humo en un navegador de verdad (Chromium con Playwright), en pantalla de teléfono y sin errores en la
consola:
  1. Práctica: portal → lobby del dominó → práctica → una mano completa → "atrás" regresa al lobby.
  2. La Pata en práctica: varios turnos (robar y descartar), el registro y el consejo; los estilos del dominó se
     quitan al cambiar de juego.
  3. Piojos en práctica: tirar y plantarse varios turnos contra la compu; solo sus estilos quedan cargados.
  3a. Panal en práctica: el botón "Reglas"; la primera lección del tutorial ("Aprender"); poner bichos y moverlos tocando la reserva, la colmena y las casillas
     marcadas; solo sus estilos quedan cargados.
  3b. La Viuda en práctica: el botón "Reglas" abre las reglas; tomar o pasar a ciegas, cambiar una carta, tocar (el paño
     se pone rojo con el aviso de última vuelta) y pasar a la siguiente mano.
  3c. Skull en práctica: el botón "Reglas"; el tutorial desde el aviso de la primera ronda, de principio a fin; poner discos, apostar, voltear y pasar a la siguiente ronda.
  3c2. Carrera de Chihuahuas en práctica: el botón "Reglas"; sacudir el tazón, tomar un boleto, poner la aspiradora
     en una casilla, una apuesta secreta y seguir el consejo; pasar a la siguiente etapa; la ventana de jugadas.
  3d. Damas chinas en práctica (3 jugadores): el botón "Reglas"; escoger una canica, ver a dónde puede ir y moverla
     varias veces contra la compu.
  4. El Continental en práctica: escoger la regla de compra, comprar fuera de turno, robar, descartar, bajarse con
     el consejo y abrir el menú. En línea: la regla escogida se ve en la pantalla de asientos.
  5. Escribir tu nombre: el teclado del teléfono cambia el tamaño de la pantalla y la lista de mesas puede cambiar
     mientras escribes; el campo no debe perder el foco (el teclado se abría y cerraba sin parar).
  7. Skull con la tele como tablero (al final): crear la mesa con la opción, abrirla como tele desde el lobby (espera
     con el código), empezar desde el teléfono (solo lo suyo), y la tele con los tapetes de todos y sin botones.
  7b. La Carrera con la tele como tablero (al final): mesa de 8 con la opción; la espera de la tele con la portada;
     jugar un turno desde el teléfono (solo lo suyo: el tapete se escoge con la tira de números) y la tele con la
     pista grande, las imágenes en alta, los 8 jugadores sin encimarse (16:9 y cuadrada) y sin botones.
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

    # ---------- Panal en práctica ----------
    page.evaluate("location.hash = '#/panal'"); page.wait_for_selector("#practice")
    page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector(".game.panal svg.hive", timeout=10000); shot("10b-panal")
    panal_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")
    tap("#rules"); page.wait_for_selector(".sheet[data-sheet='rules']")
    panal_rules = "Chapulín" in page.inner_text(".sheet")
    tap("#rulesclose"); page.wait_for_timeout(200)
    # El tutorial: la primera lección se cumple con "Muéstrame" y tocando la casilla marcada
    tap("#learn"); page.wait_for_selector(".sheet[data-sheet='tutorial'] .tut-felt svg.hive")
    page.wait_for_timeout(300); page.click("#tutshow"); page.wait_for_timeout(200)
    page.click(".tut .target.adv"); page.wait_for_timeout(200)
    panal_tut = page.query_selector(".tut-msg.ok") is not None
    page.click("#tutnext"); page.wait_for_timeout(200)
    panal_tut = panal_tut and "lección 2" in page.inner_text(".tut-prog").lower()
    shot("10b2-panal-tutorial")
    page.click("#sheetclose"); page.wait_for_timeout(200)
    panal_places = panal_moves = 0
    for i in range(200):
        if (panal_places >= 5 and panal_moves >= 2) or page.query_selector(".sheet #again"): break
        page.wait_for_timeout(250)
        if not page.query_selector(".tray.mine .handbtn:not([disabled])") and not page.query_selector(".cell.can"): continue
        movable = page.query_selector_all(".cell.can")
        moving = panal_places >= 5 and movable
        if not (tap(".cell.can") if moving else tap(".tray.mine .handbtn:not([disabled])")): continue
        page.wait_for_timeout(100)
        if tap("[data-target]"):
            if moving: panal_moves += 1
            else: panal_places += 1
    shot("10c-panal-turnos")

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

    # ---------- Skull en práctica ----------
    page.evaluate("location.hash = '#/skull'"); page.wait_for_selector("#practice")
    page.click("[data-mode='4']"); page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector(".game.skull", timeout=10000); shot("14-skull")
    page.click("#rules"); page.wait_for_selector(".sheet[data-sheet='rules'] .rules")
    skull_rules = "retador" in page.inner_text(".sheet[data-sheet='rules']")
    page.click("#rulesclose"); page.wait_for_timeout(200)
    # Tutorial: el aviso de la primera ronda lo abre; se contesta cada pregunta (probando opciones) hasta el final
    skull_tut_steps, skull_tut_done = 0, False
    if tap("#tutnudge"):
        page.wait_for_selector(".sheet[data-sheet='tutorial']"); shot("14a-skull-tutorial")
        for _ in range(60):
            if tap(".sheet #tutdone"): skull_tut_done = True; break
            if tap(".sheet #tutnext:not([disabled])"): skull_tut_steps += 1
            else: tap(".sheet [data-pick][aria-pressed='false']")
            page.wait_for_timeout(120)
            if skull_tut_steps == 5: shot("14b-skull-tutorial-reto")
        page.wait_for_timeout(200)
    skull_nudge_gone = not page.query_selector("#tutnudge")
    skull_places = skull_bids = skull_flips = skull_rounds = 0
    for _ in range(300):
        if skull_rounds >= 2 or page.query_selector(".sheet #again"): break
        if page.query_selector(".sheet #next"):
            if skull_rounds == 0: shot("15-skull-ronda")
            if tap(".sheet #next"): skull_rounds += 1
        elif tap("[data-place]:not([disabled])"): skull_places += 1
        elif tap("#flipmine") or tap("[data-flip]"): skull_flips += 1
        elif tap("[data-discard]"): pass
        elif page.query_selector("#bid") and (skull_places >= 2 or not page.query_selector("[data-place]:not([disabled])")):
            if page.query_selector("#pass") and skull_bids >= 2: tap("#pass")
            elif tap("#bid"): skull_bids += 1
        page.wait_for_timeout(250)
    skull_over = bool(page.query_selector(".sheet #again"))
    skull_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")
    # ---------- Carrera de Chihuahuas en práctica ----------
    page.evaluate("location.hash = '#/chihuahuas'"); page.wait_for_selector("#practice")
    page.click("[data-mode='4']"); page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector(".game.chihuahuas .board .cell", timeout=10000); shot("15c-chihuahuas")
    tap("#rules"); page.wait_for_timeout(200)
    ch_rules = "aspiradora" in page.inner_text(".sheet[data-sheet='rules']")
    tap("#rulesclose"); page.wait_for_timeout(200)
    page.wait_for_timeout(3000)  # la salida: los perros entran a la pista
    ch_dogs = len(page.query_selector_all(".game.chihuahuas .rider:not(.pending)")) == 5
    ch_acts = {"roll": 0, "ticket": 0, "tile": 0, "final": 0, "advice": 0}
    ch_legs = 0
    for i in range(400):
        if ch_legs >= 2 or page.query_selector(".sheet #again"): break
        if page.query_selector(".sheet #next"):
            if ch_legs == 0: shot("15d-chihuahuas-etapa")
            if tap(".sheet #next"): ch_legs += 1
        elif page.query_selector(".sheet #advdo"):
            if tap(".sheet #advdo"): ch_acts["advice"] += 1
        elif page.query_selector("#roll:not([disabled])"):
            # Una jugada distinta cada turno: tapete, boleto, apuesta secreta, consejo y sacudir el tazón
            k = sum(ch_acts.values()) % 5
            if k == 0 and tap("#tilebtn:not([disabled])"):
                page.wait_for_timeout(150); tap("[data-kind='aspiradora']"); page.wait_for_timeout(150)
                if tap(".cell.can"): ch_acts["tile"] += 1
            elif k == 1 and tap("[data-ticket]:not([disabled])"): ch_acts["ticket"] += 1
            elif k == 2 and tap("#finalbtn:not([disabled])"):
                page.wait_for_selector(".sheet[data-sheet='final']"); page.wait_for_timeout(150)
                if tap(".sheet [data-final='winner']:not([disabled])"): ch_acts["final"] += 1
            elif k == 3 and tap("#advice"): page.wait_for_selector(".sheet[data-sheet='advice']", timeout=10000)
            elif tap("#roll:not([disabled])"): ch_acts["roll"] += 1
        page.wait_for_timeout(250)
    shot("15e-chihuahuas-turnos")
    tap("#hist"); page.wait_for_timeout(300)
    ch_hist = bool(page.query_selector(".sheet[data-sheet='hist'] .hrow")) and "Salida" in page.inner_text(".sheet[data-sheet='hist']")
    tap("#histclose"); page.wait_for_timeout(200)
    ch_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")
    # ---------- Damas chinas en práctica ----------
    page.evaluate("location.hash = '#/damas-chinas'"); page.wait_for_selector("#practice")
    page.click("[data-mode='3']"); page.click("[data-timer='0']"); page.click("#practice")
    page.wait_for_selector(".game.damas-chinas .cc-board", timeout=10000); shot("16-damas-chinas")
    tap("#rules"); page.wait_for_timeout(200)
    cc_rules = bool(page.query_selector(".sheet[data-sheet='rules']")) and "Saltos" in page.inner_text(".sheet[data-sheet='rules']")
    tap("#rulesclose"); page.wait_for_timeout(200)
    cc_moves = 0
    for _ in range(80):
        if cc_moves >= 5: break
        # Tu turno: toca una canica que se puede mover y luego un destino (cada toque redibuja la mesa)
        if page.query_selector(".dest"):
            if tap(".dest"): cc_moves += 1
        else: tap(".marble.can")
        page.wait_for_timeout(300)
    shot("17-damas-chinas-jugadas")
    cc_styles = page.eval_on_selector_all("link[data-game-style]", "ls => ls.map(l => l.dataset.gameStyle)")

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
    # Skull con la tele como tablero: el mismo aparato hace de teléfono y de tele (el Firebase de mentira vive en la página)
    on.evaluate("location.hash = '#/skull'"); on.wait_for_selector("#create:not([disabled])")
    on.click("[data-mode='3']"); on.click("[data-timer='0']"); on.click("[data-tvopt='1']"); on.click("#create")
    on.wait_for_selector(".seatlist")
    tv_code = on.evaluate("location.hash.split('/')[2]")
    tv_hint = bool(on.query_selector(".tvinfo"))
    for i in (1, 2):
        on.click(f"[data-addbot='{i}']"); on.wait_for_timeout(100)
    on.evaluate("location.hash = '#/skull'"); on.wait_for_selector(f"[data-tv='{tv_code}']")
    on.set_viewport_size({"width": 1280, "height": 720})
    on.click(f"[data-tv='{tv_code}']"); on.wait_for_selector(".tvwait")
    tv_wait = tv_code in on.inner_text(".tvcode") and not on.query_selector("[data-sit], #start"); shot("16-tele-espera")
    on.set_viewport_size({"width": 390, "height": 844})
    on.evaluate(f"location.hash = '#/skull/{tv_code}'"); on.wait_for_selector("#start:not([disabled])")
    on.click("#start"); on.wait_for_selector(".game.skull.phone [data-place]:not([disabled])", timeout=10000)
    tv_phone = not on.query_selector(".game.skull .board"); shot("17-tele-telefono")
    on.click("[data-place='S']"); on.wait_for_timeout(300)
    on.set_viewport_size({"width": 1280, "height": 720})
    on.evaluate(f"location.hash = '#/skull/{tv_code}/tele'"); on.wait_for_selector(".game.skull.tv .board")
    on.wait_for_timeout(2500)  # la compu no la mueve la tele, pero sí se ve lo que ya pasó
    tv_board = (len(on.query_selector_all(".skull.tv .prow")) == 3 and not on.query_selector(".skull.tv [data-place], .skull.tv #bid, .skull.tv [data-flip]")
                and on.evaluate("document.documentElement.classList.contains('tv')"))
    shot("18-tele-tablero")
    on.evaluate(f"location.hash = '#/skull/{tv_code}'"); on.wait_for_selector(".game.skull.phone")
    tv_left = not on.evaluate("document.documentElement.classList.contains('tv')")

    # La Carrera de Chihuahuas con la tele como tablero: mesa de 8 (7 con la compu)
    on.evaluate("location.hash = '#/chihuahuas'"); on.wait_for_selector("#create:not([disabled])")
    on.click("[data-mode='8']"); on.click("[data-timer='0']"); on.click("[data-tvopt='1']"); on.click("#create")
    on.wait_for_selector(".seatlist")
    ch_code = on.evaluate("location.hash.split('/')[2]")
    for i in range(1, 8):
        on.click(f"[data-addbot='{i}']"); on.wait_for_timeout(80)
    on.set_viewport_size({"width": 1920, "height": 1080})
    on.evaluate(f"location.hash = '#/chihuahuas/{ch_code}/tele'"); on.wait_for_selector(".tvwait")
    ch_tv_wait = bool(on.query_selector(".tvwait.cover")) and ch_code in on.inner_text(".tvcode"); shot("19-carrera-tele-espera")
    on.set_viewport_size({"width": 390, "height": 844})
    on.evaluate(f"location.hash = '#/chihuahuas/{ch_code}'"); on.wait_for_selector("#start:not([disabled])")
    on.click("#start"); on.wait_for_selector(".game.chihuahuas.phone", timeout=10000)
    ch_phone_only = not on.query_selector(".game.chihuahuas .board, .game.chihuahuas .players") and "tele" in on.inner_text(".tvnote")
    # Esperar el turno propio (la compu la mueve este mismo teléfono) y poner el tapete con la tira de números
    on.wait_for_selector(".game.chihuahuas.phone #tilebtn:not([disabled])", timeout=90000)
    on.click("#tilebtn"); on.wait_for_selector(".spacepick [data-pick]")
    ch_strip = len(on.query_selector_all(".spacepick [data-pick]")); shot("20-carrera-tele-telefono")
    picked = on.get_attribute(".spacepick [data-pick]", "data-pick")
    on.click(".spacepick [data-pick]")
    on.wait_for_selector(".game.chihuahuas.phone .minebox", timeout=5000); on.wait_for_timeout(400)
    ch_phone_turn = f"en la {picked}" in on.inner_text(".minebox")
    # La tele, en 16:9 y en cuadrada
    def tv_check(w, h, name):
        on.set_viewport_size({"width": w, "height": h})
        on.evaluate(f"location.hash = '#/chihuahuas/{ch_code}/tele'"); on.wait_for_selector(".game.chihuahuas.tv .board")
        on.wait_for_timeout(2500)
        shot(name)
        return on.evaluate("""(picked) => {
          const q = (s) => [...document.querySelectorAll(s)];
          const r = (el) => el.getBoundingClientRect();
          const pls = q(".chihuahuas.tv .pl").map(r);
          const inside = (a) => a.left >= 0 && a.top >= 0 && a.right <= innerWidth + 1 && a.bottom <= innerHeight + 1;
          const overlap = pls.some((a, i) => pls.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
          const board = r(document.querySelector(".chihuahuas.tv .board"));
          const side = r(document.querySelector(".chihuahuas.tv .side"));
          const crash = board.left < side.right - 1 && side.left < board.right - 1 && board.top < side.bottom - 1 && side.top < board.bottom - 1;
          return {
            players: pls.length, overlap, fits: pls.every(inside) && inside(board) && !crash,
            buttons: q(".chihuahuas.tv #roll, .chihuahuas.tv [data-ticket], .chihuahuas.tv [data-pick], .chihuahuas.tv #menu, .chihuahuas.tv #bubble").length,
            big: q(".chihuahuas.tv .board .dogimg").length > 0 && q(".chihuahuas.tv .board .dogimg").every((i) => i.src.includes("-tele.")),
            tile: !!document.querySelector(`.chihuahuas.tv .cell[data-space="${picked}"] .tile`),
            tvClass: document.documentElement.classList.contains("tv"),
            boardPx: Math.round(board.width),
          };
        }""", picked)
    ch_tv = tv_check(1920, 1080, "21-carrera-tele-tablero")
    ch_tv_sq = tv_check(1080, 1080, "22-carrera-tele-cuadrada")
    on.set_viewport_size({"width": 390, "height": 844})
    on.evaluate(f"location.hash = '#/chihuahuas/{ch_code}'"); on.wait_for_selector(".game.chihuahuas.phone")
    ch_phone_small = not on.evaluate("[...document.images].some((i) => i.src.includes('-tele.'))")
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
if panal_places < 5: problems.append(f"Panal: solo se pusieron {panal_places} bichos")
if panal_moves < 1: problems.append("Panal: no se pudo mover ningún bicho")
if not panal_rules: problems.append("Panal: el botón Reglas no mostró las reglas")
if not panal_tut: problems.append("Panal: el tutorial no se pudo cumplir con Muéstrame")
if panal_styles != ["panal"]: problems.append(f"Panal: estilos cargados {panal_styles}")
if not viuda_rules: problems.append("La Viuda: el botón Reglas no mostró las reglas")
if viuda_acts < 3: problems.append(f"La Viuda: solo se jugaron {viuda_acts} turnos")
if viuda_hands < 1: problems.append("La Viuda: no terminó ninguna mano")
if viuda_hands and not viuda_widow_shown: problems.append("La Viuda: al final no se ven las cartas de la viuda")
if not viuda_alert: problems.append("La Viuda: al tocar no apareció el aviso de última vuelta")
if not skull_rules: problems.append("Skull: el botón Reglas no mostró las reglas")
if not skull_tut_done or skull_tut_steps < 9: problems.append(f"Skull: el tutorial no se pudo recorrer ({skull_tut_steps} pasos)")
if not skull_nudge_gone: problems.append("Skull: el aviso del tutorial sigue después de verlo")
if skull_places < 2: problems.append(f"Skull: solo se pusieron {skull_places} discos")
if skull_bids < 1: problems.append("Skull: nunca se pudo apostar")
if skull_rounds < 1 and not skull_over: problems.append("Skull: no terminó ninguna ronda")
if set(skull_styles) != {"skull"}: problems.append(f"Skull: estilos cargados {skull_styles}")
if not ch_rules: problems.append("Carrera: el botón Reglas no mostró las reglas")
if not ch_dogs: problems.append("Carrera: no se ven los 5 perros en la pista")
if not ch_hist: problems.append("Carrera: la ventana de jugadas no muestra el historial")
if min(ch_acts.values()) < 1: problems.append(f"Carrera: faltó alguna jugada {ch_acts}")
if ch_legs < 1 and not page.query_selector(".sheet #again"): problems.append("Carrera: no terminó ninguna etapa")
if set(ch_styles) != {"chihuahuas"}: problems.append(f"Carrera: estilos cargados {ch_styles}")
if not cc_rules: problems.append("Damas chinas: el botón Reglas no mostró las reglas")
if cc_moves < 5: problems.append(f"Damas chinas: solo se movieron {cc_moves} canicas")
if cc_styles != ["damas-chinas"]: problems.append(f"Damas chinas: estilos cargados {cc_styles}")
if set(viuda_styles) != {"viuda"}: problems.append(f"La Viuda: estilos cargados {viuda_styles}")
if "domino" in pata_styles: problems.append("los estilos del dominó siguen cargados en La Pata")
if not tv_hint: problems.append("Skull con tele: la pantalla de asientos no explica cómo abrir la tele")
if not tv_wait: problems.append("Skull con tele: la tele no muestra la espera con el código (o tiene botones de asiento)")
if not tv_phone: problems.append("Skull con tele: el teléfono muestra los tapetes de todos")
if not tv_board: problems.append("Skull con tele: la tele no muestra los 3 tapetes sin botones")
if not tv_left: problems.append("Skull con tele: al volver al teléfono sigue en modo tele")
if not ch_tv_wait: problems.append("Carrera con tele: la espera no tiene la portada o el código")
if not ch_phone_only: problems.append("Carrera con tele: el teléfono muestra la pista o los jugadores")
if not ch_strip: problems.append("Carrera con tele: el teléfono no ofrece casillas para el tapete")
if not ch_phone_turn: problems.append("Carrera con tele: no se pudo poner el tapete desde el teléfono")
if not ch_phone_small: problems.append("Carrera con tele: el teléfono bajó imágenes de la tele")
for label, r in (("16:9", ch_tv), ("cuadrada", ch_tv_sq)):
    if r["players"] != 8 or r["overlap"] or not r["fits"]: problems.append(f"Carrera con tele ({label}): los 8 jugadores no caben sin encimarse {r}")
    if r["buttons"]: problems.append(f"Carrera con tele ({label}): la tele tiene botones de juego")
    if not r["big"] or not r["tvClass"]: problems.append(f"Carrera con tele ({label}): la tele no usa las imágenes en alta {r}")
    if not r["tile"]: problems.append(f"Carrera con tele ({label}): el tapete puesto desde el teléfono no se ve en la tele")
if not online_finished: problems.append("en línea: la mano no terminó")
if online_moves == 0: problems.append("en línea: no se pudo tirar ninguna ficha")
if not finished: problems.append("la mano no terminó")
if moves == 0: problems.append("no se pudo tirar ninguna ficha")
if not back_to_lobby: problems.append("'atrás' no regresó al lobby")
problems += errors
print(f"Práctica: fichas tiradas {moves}, mano terminada {finished}, atrás → lobby {back_to_lobby}.")
print(f"La Pata: turnos jugados {pata_turns}, estilos cargados {sorted(set(pata_styles))}.")
print(f"Panal: puestos {panal_places}, movidos {panal_moves}, reglas {panal_rules}, tutorial {panal_tut}.")
print(f"La Viuda: reglas {viuda_rules}, turnos {viuda_acts}, manos {viuda_hands}.")
print(f"Skull: reglas {skull_rules}, tutorial {skull_tut_steps + skull_tut_done} pasos, discos {skull_places}, apuestas {skull_bids}, volteos {skull_flips}, rondas {skull_rounds}.")
print(f"Carrera: reglas {ch_rules}, perros {ch_dogs}, historial {ch_hist}, jugadas {ch_acts}, etapas {ch_legs}.")
print(f"Damas chinas: reglas {cc_rules}, jugadas {cc_moves}, estilos cargados {cc_styles}.")
print(f"Piojos: tiros {piojos_rolls}, plantadas {piojos_banks}, estilos cargados {piojos_styles}.")
print(f"Continental: turnos {cont_turns}, compras {cont_buys}, bajadas {cont_downs}, menú {cont_menu}; en línea: regla {cont_online_rule}.")
print(f"Teclado: foco al cambiar el tamaño {keyboard_resize_ok}, foco al cambiar la lista {list_redraw_ok} (escrito {typed!r}).")
print(f"Tele: aviso {tv_hint}, espera {tv_wait}, teléfono {tv_phone}, tablero {tv_board}, salir {tv_left}.")
print(f"Carrera con tele: espera {ch_tv_wait}, teléfono {ch_phone_only}, casillas {ch_strip}, tapete {ch_phone_turn}, tele 16:9 {ch_tv}, cuadrada {ch_tv_sq}.")
print(f"En línea: mesa {code}, fichas tiradas {online_moves}, mano terminada {online_finished}, en la lista {in_list}, se reabre por enlace {reopened}.")
if problems:
    print("PROBLEMAS:\n- " + "\n- ".join(problems)); sys.exit(1)
print("OK")
