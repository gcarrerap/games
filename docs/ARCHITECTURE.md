# Arquitectura de Juegos de la Familia

Este documento explica cómo se divide el sitio, qué comparte cada juego y qué pone cada uno, y por qué. Parte de lo que ya funciona en [myDomino](https://github.com/gcarrerap/myDomino) (ver su `DESIGN.md`): esa estructura en capas se conserva, y lo que no es del dominó se separa para que otros juegos lo usen.

## 1. Principios

1. **Un juego es un módulo y la plataforma no conoce a ningún juego.** La plataforma solo habla con el contrato (§4). Agregar un juego no cambia nada en `platform/`.
2. **Lo que sirve para más de un juego es un módulo propio**, con una API pública, sus pruebas y su README, que cualquier juego puede usar (§3).
3. **Las reglas son funciones puras.** Estado entra, estado sale. Nada de DOM, `localStorage`, Firebase ni `Date.now()` directo: el tiempo (`now`) y el azar (`rnd`) entran como parámetros. Así se prueba todo con Node y la compu puede simular partidas.
4. **Cada jugador solo ve lo que puede saber.** La interfaz y la compu reciben la *vista* de un asiento (`view(state, seat)`), nunca el estado completo.
5. **Sin compilación.** Módulos ES nativos; se publica subiendo archivos. Cada juego se carga con `import()` solo cuando se abre.
6. **Las reglas se revisan solas.** `tests/architecture.test.js` lee los imports en cada `npm test` y falla si alguien rompe §2 (§6).

## 2. Tres tipos de piezas

```
                      games/<id>/               un juego: sus reglas, su compu, su mesa
                     ╱           ╲
                    ▼             ▼
          modules/<nombre>/      platform/      lo compartido
                    ╲             ╱
                     ▼           ▼
                    platform/core/              contrato y tipos, puro
```

| Pieza | Qué es | Quién la usa | Ejemplos |
|---|---|---|---|
| **`platform/`** | La casa: lo que todo juego recibe sin pedirlo. | El sitio; los juegos solo a través del contrato y `ctx`. | Entrar, portal y lobby, mesas en línea, asientos, la compu en asientos libres, reloj de turno, limpieza, actualizaciones, estilos base. |
| **`modules/<nombre>/`** | Una capacidad que un juego **escoge** usar. Independiente, con API pública. | Cualquier juego que la importe (y la plataforma si le sirve). | Azar con semilla, escoger con dudas, registro de lo que cada quien puede tener, simulaciones Monte Carlo, perfiles de la compu, notas, acomodar la mano. |
| **`games/<id>/`** | Un juego. Cumple el contrato. | La plataforma, por medio de `games/registry.js`. | Dominó, La Pata. |

**Plataforma o módulo:** si *todo* juego lo necesita para existir en el sitio, es plataforma; si un juego puede vivir sin eso, es módulo.

### Reglas de dependencia

| Desde | Puede importar | No puede importar |
|---|---|---|
| `platform/core/` | nada | todo lo demás |
| `platform/services/` | `core/` | `app/`, `ui/`, juegos |
| `platform/app/` | `core/`, `services/`, módulos, `games/registry.js` | `ui/`, el código de un juego |
| `platform/ui/` | `app/`, `core/`, módulos | `services/` directo, juegos |
| `modules/<m>/index.js` | `platform/core/`, la API pública de otros módulos | juegos, `platform/app|services|ui` |
| `modules/<m>/ui.js` | lo anterior y `platform/ui/` | juegos, `platform/app|services` |
| `games/<id>/engine/` | `platform/core/`, módulos | su `ai/` y `ui/`, otros juegos, la plataforma salvo `core/` |
| `games/<id>/ai/` | su `engine/`, `platform/core/`, módulos | su `ui/`, otros juegos, la plataforma salvo `core/` |
| `games/<id>/ui/` | su `engine/` (lectura), módulos, `platform/ui/`, acciones de `platform/app/` | `services/`, otros juegos |

Reglas concretas:

- **Un juego nunca importa a otro.** Si dos juegos necesitan lo mismo, eso es un módulo.
- **Desde fuera, un módulo se usa solo por `index.js` (y `ui.js` si tiene interfaz).** Lo de adentro puede cambiar sin avisar.
- **Los módulos no hacen entrada/salida por su cuenta.** Si un módulo necesita guardar algo (por ejemplo, grabaciones), recibe el almacenamiento como parámetro; quien lo usa le pasa el de `platform/services/`. Así el módulo se prueba con un falso y no depende de Firebase.
- **La interfaz nunca llama a Firestore.** Pide `ctx.act(action)` y `platform/app` decide si es práctica (local) o en línea (transacción).
- **Ningún módulo exporta variables mutables.** El estado de la app vive en `platform/app/store.js`.

## 3. Módulos

### Forma de un módulo

```
modules/<nombre>/
├── index.js     # API pública, pura (corre en Node y en un Web Worker)
├── ui.js        # opcional: la parte que dibuja
├── *.js         # internos; nadie de fuera los importa
└── README.md    # qué hace, su API y qué juegos lo usan
tests/modules/<nombre>/
```

### Cuándo algo se vuelve módulo

Se extrae a módulo cuando se cumple **una** de estas:

1. **No sabe nada del juego.** Su API no menciona fichas, cartas ni reglas, y no importa nada del juego. Se extrae de inmediato (como `random` y `choice`).
2. **Un segundo juego lo necesita.** Se extrae en ese momento, diseñando la API con los dos casos a la vista.

Lo que *podría* servirle a otro juego pero hoy solo tiene un caso se queda en el juego, marcado como candidato en la tabla de abajo. Razón: una API genérica diseñada con un solo ejemplo casi siempre lleva escondidas las suposiciones de ese ejemplo (por ejemplo, que todo lo oculto son fichas con dos números), y una abstracción equivocada cuesta más que unas líneas repetidas. Con La Pata al lado del dominó, la forma correcta de "registro de cartas" o "simular manos ocultas" se ve sola.

### Inventario

Qué hay hoy en myDomino y a dónde va.

| Funcionalidad | Origen en myDomino | Destino | Cuándo |
|---|---|---|---|
| Azar con semilla, hash, número fijo por clave | `ai/rng.js` | `modules/random` | ✅ hecho |
| Escoger entre opciones con puntaje, con dudas | `ai/decide.js` | `modules/choice` | ✅ hecho |
| Correr cálculos pesados en un hilo aparte | `ai/worker.js`, `app/ai-client.js` | `modules/worker` | Fase 3, junto con `ai-client` |
| Grabar y repetir partidas (registro de acciones + semilla) | `engine/record.js`, `services/recordings.js`, `app/recorder.js` | `modules/recording` (+ adaptador en `platform/services`) | Fase 2, cuando las acciones del contrato existan |
| Torneos de bots y escala de puntajes | `ai/tournament.js`, `scripts/torneo.mjs` | `modules/tournament` | Fase 2: con el contrato ya no depende del dominó |
| Registro de quién puede tener qué (deducción) | `ai/deduce.js` | `modules/tracker` | Con La Pata |
| Leer los tiros ajenos y simular manos ocultas (Monte Carlo) | `ai/speculate.js`, `ai/search.js` | `modules/hidden-info` | Con La Pata |
| Perfiles de la compu: estilo, memoria, olvido | `ai/profiles.js`, `ai/mind.js` (la parte de memoria) | `modules/bot-profiles` | Con La Pata (los criterios siguen siendo de cada juego) |
| Consejo: qué haría cada nivel y por qué (ventana) | `ui/components/advice.js` | `modules/advice` (`ui.js`); la lógica sigue en el juego | Con La Pata |
| Notas "creo que sí / no la tiene" | `ui` de la mesa | `modules/notes` | Con La Pata |
| Acomodar la mano: tocar, arrastrar, reordenar | `ui/screens/table.js` | `modules/hand` (`ui.js`) | Con La Pata |
| Entrar, mesas en línea, asientos, la compu en mesas, reloj, limpieza, actualizaciones, preferencias, ventanas, resultado, estilos base | `services/`, `app/`, `ui/components/`, `styles/` | `platform/` | Fases 3 a 5 |
| Fichas, jugadas, puntos, modos, cadena, heurísticas, salida, criterios | `engine/`, `ai/`, `ui/svg/` | `games/domino/` | Se quedan |

## 4. El contrato de juego

Cada juego exporta por defecto desde `games/<id>/index.js` un objeto con esta forma. Está descrito con JSDoc en `platform/core/contract.js`, y `validateGame()` lo revisa en las pruebas.

```js
export default {
  // --- Manifiesto (también en manifest.js, para listar sin cargar el juego) ---
  id: "domino",
  name: "Dominó",
  players: { min: 2, max: 4 },
  modes: [ /* configuraciones válidas: jugadores, reparto, parejas… */ ],

  // --- Reglas (puras) ---
  setup(config, { rnd, now }),              // → estado inicial de la partida
  currentSeats(state),                      // → asientos que deben actuar ahora (uno o varios)
  legalActions(state, seat),                // → acciones posibles para ese asiento
  apply(state, seat, action, { rnd, now }), // → estado nuevo (o lanza error si la acción no es válida)
  view(state, seat),                        // → lo que ese asiento puede ver (oculta manos ajenas)
  isOver(state),                            // → la partida terminó
  result(state),                            // → marcador final, ganador(es)

  // --- Opcionales ---
  timing: { turnMs(state), autoAction(state, seat) },
  bots: { profiles, decide(view, profile, { rnd }), heavy: true },
  advise(view, { rnd }),
  record: { build(state), replay(rec) },

  // --- Interfaz (se carga al abrir el juego) ---
  ui: () => import("./ui/index.js"),        // → { mount(el, ctx), unmount() }
};
```

- **Acciones y estado son JSON simple** (`{ type: "play", tile: "6-4", side: "L" }`), sin clases ni `Map`. Viajan a Firestore, al Worker y a la grabación sin conversión.
- **`currentSeats` devuelve una lista** para juegos donde varios actúan a la vez (por ejemplo, votar en un juego estilo Dixit).
- **`ctx` de la interfaz** trae la vista del asiento propio, `act(action)`, la mesa (asientos, nombres, reloj), las preferencias y los componentes de `platform/ui/`.

## 5. Mesas en línea

Se conserva el modelo de myDomino: **sin servidor de juego**. Firestore guarda y sincroniza; cada teléfono aplica las reglas del módulo.

```
mesas/{code}
  game:      "domino"          // qué juego la interpreta
  mode:      { ... }           // una de las configuraciones de modes
  seats:     [{ uid, name } | { bot: "b02" } | null, ...]
  state:     { ... }           // estado del juego (JSON)
  turn:      17                // contador de jugadas: la transacción solo aplica si no cambió
  updatedAt: <timestamp>
  version:   "2026.10.15"      // versión del sitio que creó la mesa
```

- **Una jugada** es una transacción que lee la mesa, revisa `turn`, aplica `game.apply()` y escribe el estado nuevo con `turn + 1`. Si otro teléfono ya jugó ese turno, se descarta.
- **La compu de una mesa en línea** la mueve el teléfono de la persona sentada en el asiento más bajo; los demás esperan unos segundos de respaldo.
- **Rutas:** `#/` portal · `#/<juego>` lobby · `#/<juego>/<code>` mesa, para compartir el enlace de una mesa.
- **Limitaciones conocidas:** el estado completo (manos de todos) vive en Firestore, así que alguien con herramientas podría verlo; y si nadie de la mesa tiene el juego abierto, la compu no mueve. Un servidor propio (Cloud Functions, o FastAPI con WebSockets) resolvería las dos cosas. Como las reglas son puras y el contrato es el mismo, ese cambio quedaría contenido en `platform/services/` y `platform/app/`. Queda como decisión aparte.

## 6. Cómo se cuidan las reglas

`tests/architecture.test.js` corre con `npm test` y falla si:

- un juego importa a otro;
- un módulo importa un juego, o `platform/app|services|ui` (salvo `ui.js` → `platform/ui/`);
- alguien de fuera importa un archivo interno de un módulo;
- la plataforma importa un juego;
- `engine/` o `ai/` importan interfaz o servicios, o `engine/` importa `ai/`;
- la lógica pura (`engine/`, `ai/`, módulos, `platform/core/`) toca el DOM o el almacenamiento, o llama a `Date.now()`/`Math.random()` más de lo permitido. `rnd = Math.random` como valor por defecto sí se vale. Los usos heredados de myDomino están en la lista `DEBT` de esa prueba con su cuenta máxima: solo puede bajar.

## 7. Decisiones

**Un solo repositorio para plataforma, módulos y juegos.** Cambian juntos; un repositorio evita versiones cruzadas entre paquetes. myDomino queda como historia hasta que la versión de aquí lo alcance.

**Módulos ES sin bundler, carga diferida por juego.** Igual que myDomino. `games/registry.js` solo trae manifiestos; el código de cada juego se baja con `import()` al abrirlo.

**Una sola colección `mesas` con campo `game`.** Un solo juego de reglas de seguridad y una sola limpieza para todos.

**Firebase compat cargado después de dibujar.** Se hereda de myDomino (medido allí: el SDK modular pesa más sin bundler). Encapsulado en `platform/services/`.

**Pruebas con `node:test`.** Sin dependencias. `tests/contract.test.js` revisa cada juego registrado con `validateGame()`; `tests/architecture.test.js` revisa las dependencias.

## 8. Plan de migración

Cada fase es un PR que deja las pruebas en verde.

| Fase | Cambio |
|---|---|
| 0 ✅ | README, este documento, contrato y prueba del contrato. |
| 1 ✅ | Copiar `engine/` y `ai/` de myDomino a `games/domino/` con sus pruebas. Extraer `modules/random` y `modules/choice`. Prueba de arquitectura. |
| 2 | `games/domino/index.js`: adaptar el motor al contrato. Inyectar `now` en el motor (baja la lista `DEBT`). Extraer `modules/recording` y `modules/tournament`. |
| 3 | Subir a `platform/` lo genérico de myDomino (services, store, reloj, limpieza, estilos base, ventanas). Extraer `modules/worker`. |
| 4 | `platform/app/session.js` y la compu genéricos; portal y lobby. Dominó jugable en práctica. |
| 5 | Mesas en línea con `mesas` y el campo `game`. Dominó con las mismas funciones que myDomino. |
| 6 | La Pata. Al construir su compu, extraer `tracker`, `hidden-info`, `bot-profiles`, `notes`, `hand` y `advice` con los dos juegos a la vista. |

**Pendientes heredados** (de `DESIGN.md` de myDomino): el motor llama a `Date.now()` en vez de recibir `now`; `ai/tune.js` exporta `NOISE` mutable que `rolloutFull` apaga mientras simula; `tournament.js` reemplaza `Math.random` global mientras corre. Los tres bajan en la fase 2.

## 9. Fuera de alcance por ahora

- Servidor de juego propio (ver §5).
- Video o voz en la mesa.
- Juegos con voz o imágenes generadas (estilo "100 Mexicanos Dijeron" o Dixit). El contrato ya permite que varios asientos actúen a la vez; sus servicios externos se deciden cuando toque.
