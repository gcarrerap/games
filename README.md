# Juegos de la Familia

Un solo sitio para jugar en el navegador los juegos que nos gustan: solo contra la compu o con amigos y familia en mesas en línea, desde cualquier teléfono o computadora.

El sitio tiene tres tipos de piezas:

- **Plataforma** (`platform/`): lo que todo juego recibe sin pedirlo: cuentas, portal, mesas en línea, asientos, la compu en los asientos libres, reloj de turno, actualizaciones y el diseño base.
- **Módulos** (`modules/`): capacidades que cualquier juego puede escoger usar, cada una independiente, con su API, pruebas y README: azar con semilla, la forma de escoger de la compu, y con el tiempo el registro de cartas o fichas, simulaciones, perfiles de la compu, notas, acomodar la mano…
- **Juegos** (`games/`): cada juego es un módulo propio con sus reglas, su compu y su mesa, que usa la plataforma y los módulos que necesite.

## Juegos

| Juego | Carpeta | Jugadores | Estado |
|---|---|---|---|
| Dominó | `games/domino/` | 2–4 | Se puede practicar contra la compu. Mesas en línea: fase 5 |
| La Pata | `games/pata/` | por definir | Por migrar |

## Cómo está hecho

HTML, CSS y JavaScript en módulos ES nativos, **sin paso de compilación** ni dependencias para correr el sitio: el navegador carga los archivos tal cual y se publica en GitHub Pages. Las mesas en línea se sincronizan con Firebase (Firestore y Auth). Node solo se usa para correr las pruebas.

```
games/
├── index.html            # esqueleto de la página: carga la plataforma
├── sw.js                 # service worker: siempre la versión más reciente; práctica sin internet
├── firestore.rules       # reglas de seguridad, una sola vez para todos los juegos
├── platform/             # lo que comparten todos los juegos
│   ├── core/             # puro: contrato de juego, azar, asientos, tiempo, grabación
│   ├── services/         # lo único que habla con Firebase y localStorage
│   ├── app/              # estado, mesas, la compu, reloj, limpieza, rutas
│   ├── ui/               # portal de juegos, lobby, asientos, ventanas, resultado
│   └── styles/           # reset, colores y tipografía, componentes base
├── modules/              # capacidades reutilizables que un juego escoge usar
│   ├── random/           # azar con semilla
│   ├── choice/           # escoger entre jugadas con puntaje, con dudas
│   ├── recording/        # grabar y repetir partidas de cualquier juego
│   ├── tournament/       # partidas entre bots de cualquier juego
│   └── <nombre>/         # index.js (API pública), ui.js (opcional), README.md
├── games/
│   ├── registry.js       # lista de juegos (solo manifiestos; el código se carga al abrir cada juego)
│   ├── domino/
│   │   ├── manifest.js   # id, nombre, jugadores, modos
│   │   ├── index.js      # el módulo del juego, conforme al contrato
│   │   ├── engine/       # reglas (puro)
│   │   ├── ai/           # la compu y el consejo (puro)
│   │   ├── ui/           # la mesa del juego
│   │   └── styles/
│   └── pata/             # misma forma
├── tests/
│   ├── architecture.test.js # las reglas de dependencia se cumplen (revisa los imports)
│   ├── contract.test.js  # todos los juegos cumplen el contrato
│   ├── platform/         # pruebas de la plataforma
│   ├── modules/<nombre>/ # pruebas de cada módulo
│   └── games/<juego>/    # pruebas de cada juego
├── scripts/              # herramientas (exportar partidas, torneos de bots…)
└── docs/
    ├── ARCHITECTURE.md   # capas, contrato de juego, mesas en línea y decisiones
    └── ADDING-A-GAME.md  # paso a paso para agregar un juego
```

El detalle (capas, reglas de dependencia, el contrato que cumple cada juego y cómo funcionan las mesas en línea) está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Correr en tu computadora

Los módulos ES no abren con doble clic; hace falta un servidor local cualquiera:

```bash
python3 -m http.server 8765      # luego abre http://localhost:8765
```

Pruebas (Node 18 o más reciente, sin instalar nada):

```bash
npm test
```

Prueba en un navegador de verdad (Python con Playwright y Chromium; abre el sitio, practica una mano de dominó en pantalla de teléfono y revisa que no haya errores):

```bash
python3 -m http.server 8765 &
python3 tests/browser/smoke.py
```

## Agregar un juego

1. Crea `games/<id>/` con `manifest.js` e `index.js` siguiendo el contrato.
2. Agrega el manifiesto a `games/registry.js`.
3. Corre `npm test`: la prueba del contrato revisa que el juego cumpla.

La guía completa está en [docs/ADDING-A-GAME.md](docs/ADDING-A-GAME.md).

## Firebase

Las mesas en línea y las cuentas usan el mismo proyecto de Firebase que myDomino (`dominomx`, configuración en `platform/config.js`), con colecciones propias (`juegos-mesas`, `juegos-grabaciones`) para que los dos sitios no se pisen. Detalle en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §5.

Las reglas están en `firestore.rules` y **incluyen las de myDomino**: publicar reglas reemplaza todas las del proyecto. Se publican desde la consola de Firebase (Firestore → Reglas) o con `firebase deploy --only firestore:rules`.

## Publicar

Se publica con GitHub Pages desde `main`. En cada publicación cambia `platform/version.js` para que los teléfonos abiertos vean "Hay una versión nueva · Actualizar".
