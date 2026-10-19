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
| **`games/<id>/`** | Un juego. Cumple el contrato. | La plataforma, por medio de `games/registry.js`. | Dominó, La Pata, Piojos, Continental, La Viuda, Panal, Skull, Damas chinas. |

**Plataforma o módulo:** si *todo* juego lo necesita para existir en el sitio, es plataforma; si un juego puede vivir sin eso, es módulo.

### Reglas de dependencia

| Desde | Puede importar | No puede importar |
|---|---|---|
| `platform/core/` | nada | todo lo demás |
| `platform/services/` | `core/` | `app/`, `ui/`, juegos |
| `platform/app/` | `core/`, `services/`, módulos, `games/registry.js` | `ui/`, el código de un juego |
| `platform/ui/` | `app/`, `core/`, módulos | `services/` directo, juegos |
| `modules/<m>/index.js` | `platform/core/`, la API pública de otros módulos | juegos, `platform/app|services|ui` |
| `modules/<m>/ui.js` y `ui/` | lo anterior y `platform/ui/` | juegos, `platform/app|services` |
| `games/<id>/engine/` | `platform/core/`, módulos | su `ai/` y `ui/`, otros juegos, la plataforma salvo `core/` |
| `games/<id>/ai/` | su `engine/`, `platform/core/`, módulos | su `ui/`, otros juegos, la plataforma salvo `core/` |
| `games/<id>/ui/` | su `engine/` y su `ai/` (lectura), módulos, `platform/ui/` | `platform/app/` y `services/` (todo llega por `ctx`), otros juegos |

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
├── ui.js        # opcional: la parte que dibuja (puede apoyarse en archivos de ui/)
├── *.js         # internos; nadie de fuera los importa
└── README.md    # qué hace, su API y qué juegos lo usan
tests/modules/<nombre>/
```

**Un módulo se prueba con un juego que no es del que salió.** `tests/modules/fixtures/nim.js` es un juego de juguete (Nim) que cumple el contrato; las pruebas de `recording` y `tournament` corren sobre él. Si un módulo solo funciona con el dominó, no es genérico todavía.

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
| Grabar y repetir partidas de cualquier juego (acciones + semilla) | (nuevo; myDomino graba por mano en `engine/record.js`) | `modules/recording` | ✅ hecho. El adaptador de Firestore va en `platform/services` (fase 3) |
| Partidas entre bots, enfrentamientos, intervalo de confianza | `ai/tournament.js` | `modules/tournament` | ✅ hecho. La huella de estilo y la escala de puntajes siguen en `games/domino/ai/tournament.js` |
| Llamadas de voz y video (WebRTC, timbre, vistas, sin eco entre teléfonos juntos) | myPata `app/call*.js`, `app/near.js`, `ui/call-*.js`, `services/call-signaling.js` | `modules/call` + señalización en `platform/services/call-signaling.js` | ✅ fase 6c: el dominó y cualquier juego nuevo las tienen sin escribir nada |
| Correr cálculos pesados en un hilo aparte, con plan B | `ai/worker.js`, `app/ai-client.js` | `modules/worker` + un solo worker para la compu de todos los juegos (`platform/app/ai-worker.js`) | ✅ hecho |
| Registro por mano para análisis (JSONL) | `engine/record.js`, `scripts/export-partidas.mjs` | se queda en el dominó | Se podrá derivar de `modules/recording` cuando la plataforma grabe con él |
| Escoger entre opciones cercanas con azar (La Pata: votación del descarte) | myPata `ai/random.js` (`vote`, `seededRandom`) | `modules/choice`, `modules/random` | ✅ fase 6: La Pata ya los usa; escogen exactamente lo mismo que su versión propia (`tests/games/pata/vote.test.js`) |
| Registro de quién puede tener qué | dominó `ai/deduce.js`; La Pata `ai/deduce.js` | se queda en cada juego | Revisado en la fase 6: no se parecen. El dominó deduce con probabilidades fichas que nunca se vieron; La Pata solo sigue cartas exactas que se vieron al levantar el pozo. Un módulo común sería una abstracción forzada. |
| Leer los tiros ajenos y simular manos ocultas (Monte Carlo) | dominó `ai/speculate.js`, `ai/search.js` | se queda en el dominó | La Pata no simula manos ocultas. Se revisa si un tercer juego lo necesita. |
| Perfiles de la compu: estilo, memoria, olvido | dominó `ai/profiles.js`, `ai/mind.js`; La Pata `ai/tune.js` + personalidad por partida | se quedan en cada juego | Revisado en la fase 6: el dominó tiene 20 perfiles (estilo × capacidad); La Pata, 3 niveles con variaciones por partida. Lo común ya está en `modules/choice`. |
| Consejo: pedirlo, "pensando…", descartarlo si cambia el turno | dominó y La Pata `app/actions.js` | `platform/app/session.js` (`askAdvice`) | ✅ fase 4. Cómo se muestra (niveles, pasos, fichas o cartas) se queda en cada juego |
| Notas "creo que sí / no la tiene" | dominó `ui` | se queda en el dominó | Revisado en la fase 6b: La Pata no tiene notas |
| Acomodar la mano | dominó (arrastrar y girar fichas); La Pata (ordenar por número o palo, apartar la bajada) | se quedan en cada juego | Revisado en la fase 6b: no se parecen |
| Rejilla hexagonal | Panal `engine/hex.js`; damas chinas `engine/board.js` | se queda en cada juego | Revisado al llegar las damas chinas: Panal es una colmena sin límites (casillas como texto `"q,r"`, conectividad, puntos de corte); las damas chinas, una estrella fija de 121 hoyos con vecinos y saltos precalculados por índice. Lo único común son las seis direcciones. Se revisa si un tercer juego usa rejilla hexagonal. |
| Sesión (Google o invitado), mesas en Firestore, grabaciones, preferencias, service worker y versión nueva | `services/`, `app/updates.js`, `sw.js` | `platform/services/`, `platform/app/updates.js` | ✅ fase 3 |
| Mesa genérica: asientos, la compu, empezar, jugar (con grabación) | `app/actions.js` (la parte que no es del dominó) | `platform/app/table.js` | ✅ fase 3 |
| Reloj de turno, limpieza de mesas, store | `app/clock.js`, `app/cleanup.js`, `app/store.js` | `platform/app/` | ✅ fase 3 |
| Colores, tipografía, reset, botones, ventanas | `styles/` | `platform/styles/` (lo del paño y las fichas, a `games/domino/styles/`) | ✅ fase 3 |
| Práctica: la compu, el reloj, el consejo, revancha; portal, lobby, ventanas | `app/actions.js`, `app/bots.js`, `ui/` | `platform/app/session.js`, `platform/ui/` | ✅ fase 4 |
| La mesa del dominó, su resultado, consejo y registro | `ui/screens/table.js`, `ui/components/`, `ui/svg/` | `games/domino/ui/` | ✅ fase 4 |
| Mesas en línea: crear, sentarse, la compu en mesas en línea, entrar con Google, grabar partidas | `app/actions.js`, `app/bots.js`, `app/recorder.js`, `ui/screens/lobby.js`, `seats.js` | `platform/app/session.js`, `platform/ui/lobby.js`, `platform/ui/seats.js` | ✅ fase 5 |
| Baraja francesa: notación de cartas, barajas con jokers, revolver, dibujo de cartas | La Pata `engine/cards.js`, `ui/svg/card.js` | `modules/cards` | ✅ al llegar el Continental (segundo juego de cartas). Lo que vale cada carta y qué es comodín se queda en cada juego |
| Reglas que se escogen al crear la mesa (por ejemplo, cómo se compra en el Continental) | (nuevo) | contrato: `options` del juego; el lobby, los asientos y la sesión las muestran y guardan | ✅ genérico: cualquier juego las declara en su manifiesto |
| Portada al empezar la partida: una imagen a pantalla completa unos segundos, con fade, que se salta con un toque y no se repite al reabrir | (nuevo) Carrera de Chihuahuas `ui/cover.js` (#56) | se queda en la carrera | Candidato a `platform/ui` o a un módulo si otro juego (Skull, Panal…) la quiere. El tiempo extra del primer turno (`timing.js`) es de cada juego |
| Fichas, jugadas, puntos, modos, cadena, heurísticas, salida, criterios | `engine/`, `ai/`, `ui/svg/` | `games/domino/` | Se quedan |
| Música de fondo: pool de canciones barajado, silencio y volumen que se recuerdan, arrancar con el primer toque | (nuevo) Carrera de Chihuahuas (#53) | `modules/music` | ✅ de inmediato: no sabe nada del juego. Las canciones y dónde van los controles los pone cada juego |
| Efectos de sonido: catálogo de clips, silencio y volumen propios (aparte de la música), varios a la vez, sin repetir el mismo demasiado seguido | (nuevo) Carrera de Chihuahuas (#69) | `modules/sfx` | ✅ de inmediato: no sabe nada del juego. Los clips y qué evento suena en cada aparato los pone cada juego |
| Banco de imágenes: una imagen por llave con respaldo a un dibujo propio | (nuevo) Panal `assets/bank.js` + `ui/art.js`; Skull `assets/bank.js` + `ui/disc.js`; Carrera de Chihuahuas `assets/bank.js` + `ui/art.js` | se queda en cada juego | Revisado al llegar la carrera (tercer juego): lo común es solo un objeto `{ llave: { href, prompt, source } }` y una prueba de que los archivos existen. El respaldo es distinto en cada uno (SVG en `<g>`, SVG de disco, CSS y emoji), y la carrera pone además texturas como variables de CSS. Se extrae si un juego necesita algo más que el objeto (por ejemplo, tamaños para teléfono y tele) |
| Casillas hexagonales: vecinos, colmena unida, puntos de corte | (nuevo) Panal `engine/hex.js` | se queda en Panal | Candidato si llega otro juego de tablero hexagonal |
| Tutorial con lecciones jugables: posición armada, tarea, revisión y "Muéstrame" | (nuevo) Panal `ui/lessons.js`, `ui/tutorial.js`; Skull `ui/tutorial-script.js`, `ui/tutorial.js` | se queda en cada juego | Con los dos a la vista, lo común es poco: una ventana por pasos (paso *i* de *N*, puntos, Atrás/Siguiente, no avanzar hasta cumplir). El contenido es distinto: Panal hace jugar posiciones armadas con revisión de las reglas; Skull reproduce una ronda de ejemplo con `engine/` y hace preguntas de estrategia. Se extrae la ventana por pasos si un tercer juego la necesita o si las dos se empiezan a copiar |

## 4. El contrato de juego

Cada juego exporta por defecto desde `games/<id>/index.js` un objeto con esta forma. Está descrito con JSDoc en `platform/core/contract.js`, y `validateGame()` lo revisa en las pruebas.

```js
export default {
  // --- Manifiesto (también en manifest.js, para listar sin cargar el juego) ---
  id: "domino",
  name: "Dominó",
  players: { min: 2, max: 4 },
  modes: [ /* configuraciones válidas: jugadores, reparto, parejas… */ ],
  options: [ /* opcional: reglas que se escogen aparte al crear la mesa, ver abajo */ ],

  // --- Reglas (puras) ---
  setup(config, { rnd, now }),              // → estado inicial de la partida
  currentSeats(state),                      // → asientos que deben actuar ahora (uno o varios)
  legalActions(state, seat),                // → acciones posibles para ese asiento
  apply(state, seat, action, { rnd, now }), // → estado nuevo (o lanza error si la acción no es válida)
  view(state, seat),                        // → lo que ese asiento puede ver (oculta manos ajenas)
  isOver(state),                            // → la partida terminó
  result(state),                            // → marcador final, ganador(es)

  // --- Opcionales ---
  timing: { turnMs(state), autoAction(state, seat) },   // tiempo por turno; acción al vencerse
  bots: {
    profiles,                                 // [{ id, name }]
    decide(view, seat, profile, { rnd }),     // → acción; solo recibe la vista de su asiento
    thinkMs(view, seat, now),                 // cuánto espera antes de actuar
    heavy: true,                              // decide() puede tardar: va al hilo aparte
  },
  advise(view, seat, { rnd }),
  remote: true,                             // dibuja el modo Control (ctx.display "phone"); todos tienen Monitor (§5)

  // --- Interfaz (se carga al abrir el juego) ---
  ui: () => import("./ui/index.js"),        // → { mount(el, ctx), update(ctx), unmount(), tick?(ctx, clock) }
};
```

- **Opciones de la mesa.** `options: [{ id, label, default, choices: [{ id, label, hint? }] }]`. El lobby las muestra
  como botones junto al modo y al reloj, se recuerdan por juego, y la escogida llega a `setup()` en `config[id]` (y se
  ve en la lista de mesas y en los asientos). Si no viene (pruebas, mesas viejas), el juego usa su default. Ejemplo: la
  regla de compra del Continental.
- **Acciones y estado son JSON simple** (`{ type: "play", tile: "6-4", side: "L" }`), sin clases ni `Map`. Viajan a Firestore, al Worker y a la grabación sin conversión.
- **`currentSeats` devuelve una lista** para juegos donde varios actúan a la vez (salir en parejas en el dominó, votar en un juego estilo Dixit). Si varios bots pueden actuar, actúa primero el de menor `thinkMs`.
- **Pausas.** `currentSeats` vacío sin que `isOver` sea cierto es una pausa: nadie está obligado, pero `legalActions` puede ofrecer algo (en el dominó, `{ type: "next" }` entre manos). La interfaz lo muestra como botón; un torneo lo toma solo.
- **El reloj es una acción.** Al vencerse el tiempo, la plataforma aplica `timing.autoAction(state, seat)` como cualquier otra acción. Así queda grabada y se repite igual.
- **`view` es la frontera de la privacidad.** La compu y la interfaz solo reciben la vista. En el dominó, una prueba compara las decisiones de cinco perfiles de la compu (incluidos los que deducen y simulan) con su vista y con el estado completo: son idénticas.
- **La interfaz del juego** se monta en `#app` y recibe un `ctx` en cada cambio (`update`); `tick` pinta el reloj varias veces por segundo sin redibujar. Lo que trae `ctx` (`platform/ui/play.js`):

  | Campo | Qué es |
  |---|---|
  | `view`, `seat` | lo que tu asiento puede ver, y cuál es tu asiento |
  | `table` | la mesa: asientos y nombres, `status`, `round`, `turn`, `config` |
  | `act(action)` | tu jugada; si no se vale, queda en `err` |
  | `again()`, `leave()` | otra partida en la misma mesa; salir al lobby |
  | `clock` | lo que queda del turno (`secs`, `pct`) o `null` |
  | `advice`, `askAdvice()`, `closeAdvice()` | el consejo, calculado por la plataforma con tu vista |
  | `practice`, `peek()`, `setSeatBot(seat, profile)` | solo en práctica: el estado completo (para "ver manos") y cambiar el bot de un asiento |
  | `prefs` | preferencias del dispositivo para este juego (`juegos.<id>.*`) |
  | `display` | `"tv"` en Monitor, `"phone"` en Control (si el juego declara `remote`), `"full"` en todo lo demás (§5, "Modos del aparato") |
  | `mode`, `modes`, `setMode(m)` | el modo de este aparato, los que puede escoger y cómo cambiarlo; el menú del juego pone `modeMenu(ctx)` (`platform/ui/modes.js`) |
  | `modal`, `refresh()`, `setDragging(on)` | dónde van las ventanas (`platform/ui/sheet.js`), volver a dibujar, no redibujar mientras arrastras |

  El juego no toca el store ni las acciones de la plataforma: todo pasa por `ctx`.

## 5. Mesas en línea

Se conserva el modelo de myDomino: **sin servidor de juego**. Firestore guarda y sincroniza; cada teléfono aplica las reglas del módulo.

La mesa es la misma en práctica (en memoria) y en línea (Firestore la guarda tal cual, como JSON). Su forma y todo lo que se le hace (sentarse, la compu, empezar, jugar) está en `platform/app/table.js`, puro y sin saber de ningún juego:

```
juegos-mesas/{code}
  json:     { v, code, game, mode, config, seats, host, seed, round, status, state, rec, turn, created, version }
  code, game, created, updated          // fuera del JSON, para ordenar, filtrar y limpiar

  game:     "domino"                    // qué juego la interpreta
  config:   { n, per, teams, timer }    // el modo escogido + opciones
  seats:    [null | { id, name } | { bot: true, profile, name }]
  status:   "lobby" | "playing" | "over"
  round:    2                           // partida número 2 en esta mesa; su semilla es "<seed>:2"
  state:    { … }                       // estado del juego
  rec:      { … }                       // grabación de la partida en curso (modules/recording)
  turn:     17                          // acciones en esta partida
```

- **Una jugada** es una transacción que lee la mesa, revisa `turn`, aplica la acción con `modules/recording` (`step`, que le da a cada acción su azar y su hora a partir de la semilla de la mesa) y escribe el estado nuevo con `turn + 1`. Si otro teléfono ya jugó ese turno, se descarta. Como todas las acciones se aplican así, cualquier partida en línea se puede repetir desde su grabación.
- **La compu de una mesa en línea** la mueve el teléfono de la persona sentada en el asiento más bajo; los demás esperan unos segundos de respaldo.
- **`turnKey` = `"<round>:<turn>"`.** Una acción calculada para un turnKey solo se guarda si la mesa sigue en ese turnKey (la compu, el reloj y otro teléfono pueden competir por el mismo turno).
- **Rutas:** `#/` portal · `#/<juego>` lobby · `#/<juego>/practica` · `#/<juego>/<CÓDIGO>` mesa en línea (el enlace que se comparte).
- **Una sola sesión para práctica y en línea** (`platform/app/session.js`): las dos usan las funciones puras de `table.js`; en práctica se aplican a la mesa en memoria, en línea dentro de una transacción, y el resultado llega de vuelta a todos los teléfonos por `watchTable`.
- **La compu en línea** la mueve el teléfono de la persona sentada en el asiento más bajo; las demás personas sentadas son respaldo y esperan 4 s más. Quien solo mira no la mueve.
- **Grabación:** al terminar una partida, cada teléfono sentado intenta guardarla en `juegos-grabaciones` con un id fijo; las reglas solo dejan crearla una vez.
- **Salir** de una mesa te deja sentado; "Levantarme" libera el asiento. Las mesas que nadie toca se borran solas.
- **Limitaciones conocidas:** el estado completo (manos de todos) vive en Firestore, así que alguien con herramientas podría verlo; y si nadie de la mesa tiene el juego abierto, la compu no mueve. Un servidor propio (Cloud Functions, o FastAPI con WebSockets) resolvería las dos cosas. Como las reglas son puras y el contrato es el mismo, ese cambio quedaría contenido en `platform/services/` y `platform/app/`. Queda como decisión aparte.

### Modos del aparato (Teléfono, Control y Monitor)

Cada aparato que entra a una mesa en línea escoge **su** modo; ya no es una opción de la mesa. La lógica pura está en `platform/app/table.js` (`deviceModes`, `deviceMode`, `displayFor`), el estado en la sesión (`want`, `mode()`, `modes()`, `setMode(m)`) y la interfaz común en `platform/ui/modes.js`.

| Modo | `ctx.display` | Ve | Juega | Necesita asiento |
|---|---|---|---|---|
| **Teléfono** (`"mobile"`) | `"full"` | el tablero y lo suyo | sí | sí |
| **Control** (`"remote"`) | `"phone"` si el juego declara `remote: true`; si no, `"full"` | solo lo suyo (o igual que Teléfono) | sí | sí |
| **Monitor** (`"monitor"`) | `"tv"` | el tablero y las jugadas de todos, sin nada oculto (`view(state, -1)`) | no | no |

- **Sin asiento solo hay Monitor.** Quien entra sin sentarse queda en Monitor durante la partida; mientras se sientan ve los asientos para poder sentarse (la espera de la tele solo sale si pidió Monitor).
- **Sentado en Monitor conserva su asiento** pero no tira (`play` se niega con un aviso) ni pide consejo hasta volver a Teléfono o Control. La compu, el reloj y la grabación los sigue atendiendo como si mirara su teléfono sin tirar (la sesión usa el asiento real, `seatedAt()`, para eso; `mySeat()` es -1 en Monitor). Si le toca, la plataforma muestra un aviso con botones para cambiar de modo (`renderModeBar`).
- **Se cambia desde el menú de la partida**, sin salir de la mesa: cada juego pone `${modeMenu(ctx)}` en su menú y `wireModeMenu(ctx.modal, ctx)`. Una prueba (`tests/platform/modes.test.js`) lo exige a todos los juegos del registro. Un juego con dibujo de Monitor aparte también pone ahí el botón del menú.
- **Por defecto:** sentado, Teléfono; sin asiento, Monitor. El modo escogido se recuerda por aparato y por mesa (`juegos.modos`, las últimas 30). Quien pierde su asiento pasa a Monitor solo. En práctica solo hay Teléfono.
- **La tele:** cualquier aparato abre la mesa en Monitor con `#/<juego>/<CÓDIGO>/tele` (en el lobby, el botón **📺 Monitor** de cada mesa). La plataforma pone la espera mientras se sientan (el código grande, quién está, y un botón para sentarse y jugar en ese aparato), `html.tv` para agrandar las ventanas, pantalla completa y Wake Lock (`platform/ui/tv.js`). Un Monitor sin asiento no mueve a la compu, no resuelve el reloj, no graba y no entra a la llamada.
- **Lo que pone cada juego:** su mesa con `ctx.display`. Todos tienen Monitor sin hacer nada: con `seat` -1 su mesa de siempre ya es la de quien mira. Un juego puede dibujar `"tv"` aparte (todo lo público, grande, sin botones de juego, más el botón del menú) y, con `remote: true`, `"phone"` (solo lo de ese asiento y lo mínimo para decidir; por ejemplo, en Skull de quién voltear se escoge por nombre). Opcional: `tvCover`, una imagen 16:9 de fondo para la espera.
- **Dibujos propios de Monitor y Control:** Skull y la Carrera de Chihuahuas (en Control, la casilla del tapete se escoge por número). Las imágenes grandes que solo usa el Monitor van en llaves aparte del banco del juego (`@tv` en la Carrera), para que el teléfono no las baje. Los demás juegos usan su mesa de siempre en los tres modos: en Control también se ve el tablero, porque en ellos el tablero es lo que se necesita para decidir (por ejemplo, en damas chinas y panal se escoge pieza y destino tocando el tablero).

### Convivir con Noli, La Pata y myDomino

Cuatro apps viven en el mismo dominio (`gcarrerap.github.io`). Desde el 2026-10-17 este sitio tiene su propio proyecto de Firebase (`gcarrerap-games`); las otras tres siguen en `dominomx`. Lo que sí comparten es lo que va por dominio. Para que ninguna pise a otra:

| Recurso | Noli | La Pata | myDomino | Este sitio |
|---|---|---|---|---|
| Claves de `localStorage` (compartido por dominio) | `noli.*` | `pata.*` | `dom.*` | `juegos.*` y `juegos.<juego>.*` |
| Caché del service worker (compartido por dominio) | `noli-v1` | `mypata-v1` | `mydomino-v1` | `juegos-v1` |

**Reglas de Firestore:** como el proyecto es solo de este sitio, `firestore.rules` lleva solo sus colecciones, y `tests/platform/rules.test.js` falla si falta una o si aparece otra. Publicarlo ya no afecta a Noli, La Pata ni myDomino.

**Cachés:** los cachés del navegador también son por dominio. El service worker de este sitio solo borra cachés que empiezan con `juegos-`. Los de Noli, La Pata y myDomino, al activarse, borran *todos* los que no son el suyo (incluido el de este sitio y los de las otras): cada app le quita a las demás su copia para jugar sin conexión. Se arregla en cada uno de esos repositorios con el mismo cambio de una línea que tiene `sw.js` aquí.

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

**Pruebas con `node:test`.** Sin dependencias. `tests/contract.test.js` revisa cada juego registrado con `validateGame()`, juega con la compu una partida completa en cada modo, revisa que sea reproducible y que su grabación se repita igual; `tests/architecture.test.js` revisa las dependencias.

## 8. Plan de migración

Cada fase es un PR que deja las pruebas en verde.

| Fase | Cambio |
|---|---|
| 0 ✅ | README, este documento, contrato y prueba del contrato. |
| 1 ✅ | Copiar `engine/` y `ai/` de myDomino a `games/domino/` con sus pruebas. Extraer `modules/random` y `modules/choice`. Prueba de arquitectura. |
| 2 ✅ | `games/domino/index.js` conforme al contrato. `now` inyectado en el motor. `modules/recording` y `modules/tournament`, probados también con un juego de juguete. |
| 3 ✅ | `platform/services/` (sesión, mesas, grabaciones, preferencias, versión nueva), mesa genérica (`platform/app/table.js`), reloj, limpieza, store, estilos base. `modules/worker` y un solo worker para la compu de todos los juegos. Colecciones y prefijos propios para convivir con myDomino. |
| 4 ✅ | Sesión de práctica (`platform/app/session.js`: la compu, el reloj, el consejo, revancha), portal, lobby genérico, ventanas, `index.html` y rutas. La mesa del dominó (`games/domino/ui/`). Dominó jugable en práctica. Prueba en navegador (`tests/browser/smoke.py`). |
| 5 ✅ | Mesas en línea (`juegos-mesas`): crear, ver las abiertas, sentarse, la compu en asientos libres (la mueve el asiento más bajo; los demás son respaldo), reloj, mirar sin jugar, enlace para compartir, revancha, entrar con Google, y cada partida terminada se graba. Probado con varios "teléfonos" en Node y en el navegador con un Firebase de mentira. |
| 6a ✅ | La Pata: reglas y compu de myPata conformes al contrato (vista privada, reloj, pausa entre rondas), probadas igual que el dominó. Usa `modules/random` y `modules/choice`. Equipos por asiento en el contrato (`teamOf`). |
| 6b ✅ | La mesa de La Pata (`games/pata/ui/`), registrada en el portal. Cada juego carga sus estilos al montar su mesa y los quita al desmontarla (`platform/ui/styles.js`). `ctx.act` dice si la jugada se pudo. Revisado con las dos mesas a la vista: acomodar la mano (el dominó arrastra fichas; La Pata ordena por número o palo y aparta bajadas), notas (solo el dominó) y el consejo (cada juego explica a su manera; lo común, pedirlo con la vista del asiento, ya lo pone la plataforma) se quedan en cada juego. |
| 6c ✅ | Llamadas de voz y video de La Pata como `modules/call`, para cualquier mesa en línea de cualquier juego. Señalización en `platform/services/call-signaling.js` (`juegos-llamadas`). |
| 7 ✅ | Piojos (dados de póker): reglas, compu con tres estilos y mesa. Primer juego escrito desde cero sobre la plataforma: no tocó `platform/` ni `modules/`. |
| 8 ✅ | La Viuda (póker de 5 cartas con la viuda): reglas con comodín creciente y fichas, compu con tres estilos, mesa con botón de reglas. Usa `modules/cards` (barajas, revolver y dibujo de cartas). |
| 9 ✅ | Panal (juego de colmena para 2): tablero hexagonal sin límites, compu con tres niveles (la difícil mira la respuesta del rival, en el hilo aparte), consejo, mesa que se acomoda a la pantalla, bichos dibujados en SVG y un banco de imágenes (`games/panal/assets/`) que los reemplaza cuando existe. No tocó `platform/` ni `modules/`. |
| 10 ✅ | Skull (faroleo con flores y una calavera): reglas, compu con tres estilos y mesa con botón de reglas. Primer juego en que varios asientos actúan a la vez (todos ponen su primer disco al mismo tiempo). No tocó `platform/` ni `modules/`. |
| 11 ✅ | Damas chinas: tablero de estrella (coordenadas hexagonales), pasos y saltos encadenados, regla contra el bloqueo, compu con tres estilos y mesa en SVG que gira para que tu punta quede abajo. Sin azar; no tocó `platform/` ni `modules/`. |
| 12 ✅ | La tele como tablero (§5): opción de la mesa en línea, ruta `/tele`, `ctx.display`, pantalla de espera, Wake Lock. Skull es el primero que la usa: la tele con los tapetes de todos y el teléfono solo con lo tuyo. |
| 13 ✅ | Carrera de Chihuahuas (estilo Camel Up, 2–8): perros que se apilan, boletos de etapa, tapete de hueso o aspiradora y apuestas secretas; compu con probabilidades exactas de la etapa y carreras simuladas, y consejo. Mesa solo para teléfono con las ilustraciones de Petra (#33, elegidas e integradas en el #34); la tele va en el #35. No tocó `platform/` ni `modules/`. |
| 14 ✅ | Modos del aparato (§5, #57): cada aparato escoge Teléfono, Control o Monitor desde el menú de la partida, en todos los juegos. Reemplaza la opción de mesa "La tele como tablero" (`tv`); los dibujos de tele y teléfono de Skull y la Carrera quedan como Monitor y Control. |

**Pendientes heredados** (de `DESIGN.md` de myDomino):

- ✅ El motor ya recibe `now` (fase 2).
- `ai/search.js` y `ai/speculate.js` usan `Math.random` por dentro en vez del `rnd` que reciben. Por eso `ai/tournament.js` todavía reemplaza `Math.random` global (`withSeed`) para que los torneos sean reproducibles. Pasar `rnd` hasta adentro quita las tres entradas de `DEBT`; cambia las sucesiones de azar de la compu, así que va en su propio PR.
- `ai/tune.js` exporta `NOISE`, mutable, que `rolloutFull` apaga mientras simula. Lo limpio es pasar el ruido como parámetro de `botMove`.

## 9. Fuera de alcance por ahora

- Servidor de juego propio (ver §5).
- Video o voz en la mesa.
- Juegos con voz o imágenes generadas (estilo "100 Mexicanos Dijeron" o Dixit). El contrato ya permite que varios asientos actúen a la vez; sus servicios externos se deciden cuando toque.
