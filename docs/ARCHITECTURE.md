# Arquitectura de Juegos de la Familia

Este documento explica cómo se divide el sitio, qué comparte cada juego y qué pone cada uno, y por qué se tomaron las decisiones. Parte de lo que ya funciona en [myDomino](https://github.com/gcarrerap/myDomino) (ver su `DESIGN.md`): esa estructura en capas se conserva, y lo que no es del dominó sube a la plataforma.

## 1. Principios

1. **Un juego es un módulo, la plataforma no conoce a ningún juego.** La plataforma solo habla con el contrato (§3). Agregar un juego no cambia nada en `platform/`.
2. **Las reglas son funciones puras.** Estado entra, estado sale. Nada de `document`, `window`, `localStorage`, Firebase ni `Date.now()` directo: el tiempo (`now`) y el azar (`rnd`) entran como parámetros. Así se prueba todo con Node y la compu puede simular partidas.
3. **Cada jugador solo ve lo que puede saber.** La interfaz y la compu reciben la *vista* de un asiento (`view(state, seat)`), nunca el estado completo.
4. **Sin compilación.** Módulos ES nativos; se publica subiendo archivos. Cada juego se carga con `import()` solo cuando se abre.
5. **Cambios pequeños.** Cada migración o funcionalidad es un PR que deja el sitio funcionando.

## 2. Capas y reglas de dependencia

```
              platform/ui  ◄──────────  games/<id>/ui
                  │                          │
                  ▼                          ▼
              platform/app ──────► platform/services
                  │                          │
                  ▼                          │
       games/<id>/ai ─► games/<id>/engine    │
                  │            │             │
                  ▼            ▼             ▼
                      platform/core
```

| Capa | Puede importar | No puede importar | Responsabilidad |
|---|---|---|---|
| `platform/core/` | nada | todo lo demás | Contrato de juego, azar con semilla, asientos y equipos, tiempo por turno, formato de grabación. Puro. |
| `platform/services/` | `platform/core/` | `app/`, `ui/`, `games/` | Firebase (auth, mesas, grabaciones), `localStorage`, service worker. Nadie más los toca. |
| `platform/app/` | `core/`, `services/`, `games/registry.js` | `ui/`, el código interno de un juego | Estado de la app, rutas, mesas (crear, unirse, sentarse, jugar), la compu, reloj, limpieza. Solo usa los juegos por el contrato. |
| `platform/ui/` | `app/`, `core/` | `services/` directo, `games/` | Portal, lobby, asientos, ventanas, resultado, barra de actualización. |
| `games/<id>/engine/` | `platform/core/` | todo lo demás | Reglas del juego. Puro. |
| `games/<id>/ai/` | su `engine/`, `platform/core/` | `app/`, `ui/`, `services/` | La compu y el consejo, solo con la vista de su asiento. Puro. |
| `games/<id>/ui/` | `platform/ui/`, `platform/app/` (acciones), su `engine/` (lectura) | `services/`, otros juegos | Dibujar la mesa del juego y convertir toques en acciones. |
| `games/<id>/index.js` | su `engine/`, `ai/`, `ui/` | otros juegos | Arma el módulo conforme al contrato. |

Reglas concretas:

- **Un juego nunca importa a otro.** Si dos juegos necesitan lo mismo (una baraja, un dibujo de carta), eso sube a `platform/core/` o `platform/ui/`.
- **La interfaz nunca llama a Firestore.** Pide `actions.act(action)` y `platform/app` decide si es práctica (local) o en línea (transacción).
- **Ningún módulo exporta variables mutables.** El estado vive en `platform/app/store.js`; solo `platform/app/` lo escribe.
- `engine/` y `ai/` de cada juego deben poder correr dentro de un Web Worker (no tocan el DOM).

## 3. El contrato de juego

Cada juego exporta por defecto desde `games/<id>/index.js` un objeto con esta forma. Está descrito con JSDoc en `platform/core/contract.js`, y `validateGame()` lo revisa en las pruebas.

```js
export default {
  // --- Manifiesto (también en manifest.js, para listar sin cargar el juego) ---
  id: "domino",
  name: "Dominó",
  players: { min: 2, max: 4 },
  modes: [ /* configuraciones válidas: jugadores, reparto, parejas… */ ],

  // --- Reglas (puras) ---
  setup(config, { rnd, now }),          // → estado inicial de la partida
  currentSeats(state),                  // → asientos que deben actuar ahora (uno o varios)
  legalActions(state, seat),            // → acciones posibles para ese asiento
  apply(state, seat, action, { rnd, now }), // → estado nuevo (o lanza error si la acción no es válida)
  view(state, seat),                    // → lo que ese asiento puede ver (oculta manos ajenas)
  isOver(state),                        // → la partida terminó
  result(state),                        // → marcador final, ganador(es)

  // --- Opcionales ---
  timing: { turnMs(state), autoAction(state, seat) }, // tiempo por turno y jugada automática al vencerse
  bots: {
    profiles,                           // lista de perfiles de la compu (id, nombre, nivel)
    decide(view, profile, { rnd }),     // → acción; solo recibe la vista de su asiento
    heavy: true,                        // correr decide() en el Web Worker
  },
  advise(view, { rnd }),                // consejo: qué jugaría la compu y por qué
  record: { build(state), replay(rec) },// grabación de partidas

  // --- Interfaz (se carga al abrir el juego) ---
  ui: () => import("./ui/index.js"),    // → { mount(el, ctx), unmount() }
};
```

Notas del contrato:

- **Las acciones son datos simples** (`{ type: "play", tile: "6-4", side: "L" }`), serializables a JSON. Así viajan a Firestore, al Worker y a la grabación sin conversión.
- **El estado también es JSON simple.** Nada de clases ni `Map`, para que Firestore lo guarde tal cual.
- **`currentSeats` devuelve una lista** para cubrir juegos donde varios actúan a la vez (por ejemplo, un juego estilo Dixit donde todos votan).
- **`ctx` de la interfaz** trae: la vista del asiento propio, `act(action)`, la mesa (asientos, nombres, reloj), las preferencias y los componentes compartidos (`sheet`, `result`…).

## 4. Qué pone la plataforma

| Funcionalidad | Dónde | Viene de myDomino |
|---|---|---|
| Entrar con Google o como invitado | `platform/services/auth.js` | `services/firebase.js` |
| Mesas en línea: listar, crear, escuchar, cambiar con transacción | `platform/services/tables-repo.js` | `services/tables-repo.js`, generalizado por `gameId` |
| Sesión de mesa: unirse, sentarse, repartir, jugar | `platform/app/session.js` | `app/actions.js` (la parte que no es del dominó) |
| La compu en práctica y en mesas en línea | `platform/app/bots.js` | `app/bots.js` |
| Cálculos pesados en un hilo aparte | `platform/app/ai-client.js` + `platform/core/worker.js` | `app/ai-client.js`, `ai/worker.js` |
| Reloj de turno y jugada automática | `platform/app/clock.js` | `app/clock.js` |
| Borrar mesas abandonadas | `platform/app/cleanup.js` | `app/cleanup.js` |
| Grabar partidas | `platform/services/recordings.js` | `services/recordings.js` |
| Versión nueva disponible, sin conexión | `platform/services/updates.js`, `sw.js` | igual |
| Preferencias del dispositivo | `platform/services/prefs.js` | `services/prefs.js`, con prefijo por juego |
| Portal, lobby, asientos, ventanas, resultado | `platform/ui/` | `ui/screens/lobby.js`, `seats.js`, `components/` |
| Colores, tipografía, tema claro/oscuro | `platform/styles/` | `styles/tokens.css`, `base.css` |

## 5. Mesas en línea

Se conserva el modelo de myDomino: **sin servidor de juego**. Firestore guarda y sincroniza; cada teléfono aplica las reglas del módulo.

```
mesas/{code}
  game:      "domino"          // qué módulo la interpreta
  mode:      { ... }           // una de las configuraciones de manifest.modes
  seats:     [{ uid, name } | { bot: "b02" } | null, ...]
  state:     { ... }           // estado del juego (JSON del módulo)
  turn:      17                // contador de jugadas: la transacción solo aplica si no cambió
  updatedAt: <timestamp>
  version:   "2026.10.15"      // versión del sitio que creó la mesa
```

- **Una jugada** = transacción que lee la mesa, revisa `turn`, aplica `game.apply()` y escribe el estado nuevo con `turn + 1`. Si otro teléfono ya jugó ese turno, se descarta. Así nunca cuentan dos jugadas para un turno.
- **La compu de una mesa en línea** la mueve el teléfono de la persona sentada en el asiento más bajo; los demás esperan unos segundos de respaldo.
- **Rutas:** `#/` portal · `#/<juego>` lobby de ese juego · `#/<juego>/<code>` mesa. Un enlace a una mesa se puede compartir por mensaje.
- **Limitaciones conocidas:** el estado completo (manos de todos) vive en Firestore, así que un jugador con herramientas podría verlo; y si nadie de la mesa tiene el juego abierto, la compu no mueve. Un servidor propio (Cloud Functions, o FastAPI con WebSockets) resolvería las dos cosas: guardaría manos privadas y validaría jugadas. Como todas las reglas ya son puras y el contrato es el mismo, ese cambio quedaría contenido en `platform/services/` y `platform/app/session.js`. Queda como decisión aparte.

## 6. Decisiones

**Un solo repositorio para la plataforma y los juegos.** Los juegos comparten mucho código que cambia junto; un repositorio evita versiones cruzadas entre paquetes. Los repositorios de cada juego (myDomino) quedan como historia hasta que la versión aquí los alcance.

**Módulos ES sin bundler, carga diferida por juego.** Igual que myDomino: se publica subiendo archivos. `games/registry.js` solo trae manifiestos (pocos bytes); el código de cada juego se baja con `import()` al abrirlo, así agregar juegos no hace más lento el portal.

**Una sola colección `mesas` con campo `game`.** Un solo juego de reglas de seguridad y una sola limpieza para todos. El lobby filtra por `game`.

**Firebase compat cargado después de dibujar.** Se hereda de myDomino (medido allí: el SDK modular pesa más sin bundler). Queda encapsulado en `platform/services/`.

**Pruebas con `node:test`.** Sin dependencias. `tests/contract.test.js` recorre `games/registry.js` y revisa cada juego con `validateGame()`, además de jugar una partida completa de bots con semilla fija para comprobar que `apply`, `legalActions` y `isOver` son coherentes.

## 7. Plan de migración

Cada fase es un PR que deja el sitio publicable.

| Fase | Cambio |
|---|---|
| 0 | README, este documento, contrato (`platform/core/contract.js`), registro vacío y prueba del contrato. |
| 1 | Copiar `engine/` y `ai/` de myDomino a `games/domino/` sin cambios, con sus pruebas. |
| 2 | Escribir `games/domino/index.js`: adaptar el motor al contrato (`setup`, `legalActions`, `apply`, `view`…). |
| 3 | Subir a `platform/` lo genérico de myDomino: services, store, reloj, limpieza, ai-client, estilos base y ventanas. |
| 4 | `platform/app/session.js` y `platform/app/bots.js` genéricos; portal y lobby. Dominó jugable en práctica. |
| 5 | Mesas en línea con la colección `mesas` y el campo `game`. Dominó con las mismas funciones que myDomino. |
| 6 | La Pata: motor y contrato, luego su mesa. |

## 8. Fuera de alcance por ahora

- Servidor de juego propio (ver §5).
- Video o voz en la mesa.
- Juegos con voz o imágenes generadas (estilo "100 Mexicanos Dijeron" o Dixit). El contrato ya permite que varios asientos actúen a la vez, pero sus servicios externos se deciden cuando toque.
