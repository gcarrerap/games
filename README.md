# Juegos de la Familia

Un solo sitio para jugar en el navegador los juegos que nos gustan: solo contra la compu o con amigos y familia en mesas en línea, desde cualquier teléfono o computadora.

Cada juego es un **módulo** independiente que se conecta a la plataforma. La plataforma pone lo que todos comparten: cuentas, mesas en línea, asientos, la compu en los asientos libres, reloj de turno, grabación de partidas, actualizaciones y el diseño base. Cada juego solo pone sus reglas, su compu y su mesa.

## Juegos

| Juego | Carpeta | Jugadores | Estado |
|---|---|---|---|
| Dominó | `games/domino/` | 2–4 | Por migrar desde [myDomino](https://github.com/gcarrerap/myDomino) |
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
│   ├── platform/         # pruebas de la plataforma
│   ├── contract.test.js  # todos los juegos cumplen el contrato
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
npx serve .          # o: python3 -m http.server 8000
```

Pruebas (Node 18 o más reciente, sin instalar nada):

```bash
npm test
```

## Agregar un juego

1. Crea `games/<id>/` con `manifest.js` e `index.js` siguiendo el contrato.
2. Agrega el manifiesto a `games/registry.js`.
3. Corre `npm test`: la prueba del contrato revisa que el juego cumpla.

La guía completa está en [docs/ADDING-A-GAME.md](docs/ADDING-A-GAME.md).

## Publicar

Se publica con GitHub Pages desde `main`. En cada publicación cambia `platform/version.js` para que los teléfonos abiertos vean "Hay una versión nueva · Actualizar".
