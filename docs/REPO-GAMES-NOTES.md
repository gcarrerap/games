# Repo games: notas para futuras sesiones

Revisión: 12 de noviembre de 2026 (America/New_York).
Repositorio: https://github.com/gcarrerap/games
Base analizada: `main`, commit `67e2a8cc0f1cc6834e613194efdef6dd0581a9ed`.
Estas notas describen esa revisión; al retomar, actualizar desde GitHub y comprobar cambios.
No sustituyen el código ni las instrucciones vigentes del repositorio.

## Objetivo y acceso

Guillermo usará este proyecto para pedir nuevos módulos de juegos en este repositorio.
No confundirlo con `gcarrerap/noli`, `myDomino` ni `myPata`.
La conexión de GitHub devolvió permisos pull/push/admin y el clon HTTPS funcionó.
La creación de esta rama y archivo verifica escritura mediante el conector; no se probó push por CLI.
El repositorio es público. No guardar datos familiares, credenciales ni notas privadas aquí.
No hace falta pedir al usuario que copie archivos o haga cambios manuales si la conexión sigue disponible.

## Orden de lectura al retomar

1. Instrucciones vigentes (AGENTS.md si existe; en la base revisada no existía) y `CLAUDE.md`.
2. `docs/ARCHITECTURE.md` y `docs/ADDING-A-GAME.md`.
3. `platform/core/contract.js`, `games/registry.js`, `platform/ui/play.js`.
4. README y código del juego más parecido, además de los módulos reutilizables relevantes.
5. Ramas/PR abiertos y cambios recientes antes de editar, para evitar trabajo simultáneo.
   La consulta de PR abiertos durante esta revisión no devolvió resultados.

`CLAUDE.md` prescribe rama y PR por cambio; documenta auto-fusión por Claude tras pruebas,
y exige prueba de navegador para cambios de interfaz. Mantener presente ese flujo y las
instrucciones actuales del usuario. Este análisis añade documentación, no modifica juegos.

## Arquitectura comprobada

Sitio estático HTML/CSS/JavaScript, módulos ES nativos y carga diferida por juego.
Sin bundler ni paso de compilación. `package.json` solo configura `node --test` (Node >=18).
El README indica publicación por GitHub Pages desde main; no se verificó el despliegue remoto.

| Directorio o archivo | Responsabilidad |
|---|---|
| `platform/core/contract.js` | Contrato y validador de juegos, opciones |
| `platform/app/table.js` | Operaciones puras de mesa, asientos y modos |
| `platform/app/session.js` | Práctica/en línea, acciones, bots, consejo, reloj |
| `platform/services/` | Firebase, preferencias, mesas y grabaciones |
| `platform/ui/` | Portal, lobby, asientos, montaje, menú de modos |
| `platform/styles/` | Estilos y tokens comunes |
| `games/<id>/` | Manifiesto, adaptación al contrato, motor, IA, UI y assets de un juego |
| `games/registry.js` | Registro de manifiestos e importación diferida |
| `modules/<nombre>/` | Capacidades opcionales compartidas, API pública y README |
| `platform/version.js` | Aviso de nueva versión a dispositivos abiertos |
| `sw.js` | Caché network-first del sitio, prefijo juegos- |

Los juegos no importan otros juegos. La plataforma usa el registro/contrato, no sus motores.
Motor e IA no usan DOM, almacenamiento o servicios; reciben tiempo y azar.
No aumentar la deuda permitida en `tests/architecture.test.js`.
Comentarios/documentación en español; nombres de código en inglés.

## Inventario actual

14 juegos registrados:

| ID | Juego | Referencia útil |
|---|---|---|
| domino | Dominó | IA avanzada y deducción; contiene deuda heredada |
| pata | La Pata | Cartas, equipos y vista privada |
| piojos | Piojos | Juego de dados sobre el contrato |
| continental | Continental | Opciones de mesa y acciones fuera del turno principal |
| viuda | La Viuda | Cartas, rondas y comodines |
| panal | Panal | Tablero hexagonal, IA pesada y tutorial jugable |
| skull | Skull | Información oculta, fases simultáneas, Monitor/Control propios |
| damas-chinas | Damas chinas | Tablero fijo y saltos |
| chihuahuas | Carrera de Chihuahuas | Assets, portada, música/efectos, Monitor/Control propios |
| memoria | Memoria Veloz | Tiempo real |
| cucharas | Cucharas | Cartas en tiempo real |
| timbiriche | Timbiriche | Ejemplo pequeño de juego por turnos con opciones |
| khet | Láser de los Faraones | Dos personas en el mismo aparato, teclado y efectos |
| vikingos | Vikingos | Rompecabezas de un jugador, retos y solucionador en worker |

9 módulos: `random`, `choice`, `recording`, `tournament`, `worker`,
`call`, `cards`, `music`, `sfx`.
Importarlos por `index.js` o `ui.js`, nunca por archivos internos.
El almacenamiento se inyecta; los módulos no acceden a Firebase por su cuenta.
Extraer una utilidad cuando no sabe nada del juego o cuando otro juego la necesita;
no crear abstracciones basadas únicamente en una posible necesidad futura.

## Contrato práctico para un juego nuevo

- `manifest.js`: id, name, players, modes y options opcionales.
- `index.js`: export default con manifiesto y funciones:
  `setup`, `currentSeats`, `legalActions`, `apply`, `view`, `isOver`, `result`, `ui`.
- Estado/acciones: JSON simple. No Map, clases ni referencias a DOM.
- `setup(config, {rnd, now})` y `apply(state, seat, action, {rnd, now})` deben ser reproducibles.
- `apply` debe rechazar acciones ilegales; no confiar solo en botones deshabilitados.
- `currentSeats` es una lista: permite varios jugadores activos.
- `view(state, seat)` filtra información privada; `seat === -1` es espectador/Monitor.
- Bots y consejo trabajan con la vista del asiento. Usar `heavy: true` para cálculo costoso.
- `timing` proporciona `turnMs` y `autoAction`; vencimientos también son acciones grabables.
- `options` llega por config; contemplar defaults para mesas antiguas.
- `realtime`: acciones concurrentes sobre el estado reciente.
- `hotseat`: personas por turnos en el mismo aparato, solo sin información oculta.
  El validador rechaza hotseat combinado con realtime.
- `remote`: UI específica de Control. Todos los juegos tienen Monitor.

UI: exportar `mount(el, ctx)`, `update(ctx)`, `unmount()`; `tick(ctx, clock)` es opcional.
Usar `ctx.view`, `ctx.seat` y `ctx.act(action)` (Promise<boolean>).
No utilizar `ctx.table.state` para mostrar datos privados aunque sea accesible.
`peek()` es una facilidad explícita de práctica; no existe como función en línea.
Incluir `modeMenu(ctx)` y `wireModeMenu(ctx.modal, ctx)`.
`ctx.display`: full (Teléfono), phone (Control propio), tv (Monitor).
Liberar estilos, listeners, timers, audio y animaciones al desmontar.
Cargar assets con rutas relativas robustas (por ejemplo new URL(..., import.meta.url)),
pues Pages vive bajo /games/, no en la raíz del dominio.

## Persistencia y multijugador

Firebase configurado: `gcarrerap-games`.
Colecciones: `juegos-mesas`, `juegos-grabaciones`, `juegos-llamadas`.
Las reglas de cada juego se ejecutan en los clientes; no existe servidor autoritativo de juego.
La plataforma aplica jugadas con transacciones y grabación/semilla mediante `modules/recording`.
`turnKey` combina ronda y turno para descartar resultados obsoletos.
Un cliente sentado conduce los bots; si nadie mantiene la mesa abierta, no siguen jugando.

La privacidad es de presentación: el estado completo está sincronizado.
Las reglas de Firestore revisadas permiten leer/borrar mesas a cualquier autenticado y
crear/actualizar con validaciones generales; no validan las reglas del juego ni propiedad por asiento.
Esto es una limitación existente, no un cambio efectuado ni una auditoría de seguridad completa.
No suponer que una prueba con Firebase falso valida los permisos desplegados.

Preferencias: `juegos.*` y `juegos.<id>.*`; caché `juegos-*`.
No tocar almacenamiento ni cachés de otras apps del mismo dominio.
El service worker ofrece respaldo offline de recursos ya descargados; no garantiza todos los
juegos disponibles en un dispositivo nuevo sin conexión. La música se excluye de caché.

## Secuencia de implementación recomendada

1. Definir reglas, jugadores, victoria, información privada, turnos/concurrencia y controles.
2. Elegir un juego de referencia y revisar módulos reutilizables.
3. Implementar motor puro con pruebas de reglas, límites y acciones ilegales.
4. Adaptar contrato, IA/consejo si corresponde y reproducibilidad de grabación.
5. Registrar manifiesto en `games/registry.js`.
6. Implementar UI adaptable a teléfono y Monitor; Control propio solo cuando aporte valor.
7. Añadir pruebas específicas y cobertura de navegador del flujo nuevo.
8. Actualizar README del juego e inventario/documentación pertinente.
9. Ejecutar pruebas; para publicación funcional actualizar `platform/version.js`.
10. Entregar rama/PR con resultados reales y limitaciones de validación.

No es necesario rehacer cuentas, lobby, asientos, sincronización, reloj ni llamadas por juego.
Un juego nuevo normalmente modifica su carpeta, sus pruebas y el registro; cualquier
extensión de plataforma debe tener justificación y pruebas de regresión.

## Verificación de esta revisión

- Clon HTTPS: correcto.
- Lectura de GitHub y permisos: correctos.
- Escritura: rama `docs/repo-games-notes` y este documento mediante conector.
- `npm test`, Node v24.22.1: **622 pruebas aprobadas, 0 fallos, 0 omitidas** (~46.6 s).
- Pruebas existentes cubren arquitectura, contrato, reglas, IA, plataforma y módulos.
  La prueba genérica juega cada modo con el primer perfil de bot y verifica replay;
  no demuestra por sí sola todos los perfiles, opciones o interacciones visuales.
- `python3 tests/browser/smoke.py`: no llegó a ejecutar escenarios porque faltaba el
  ejecutable de Chromium que esperaba Playwright.
- Segundo intento usando /usr/bin/chromium sin cambiar archivos del repo:
  falló al arrancar por socket() Operation not permitted en el sandbox.
  **Prueba visual pendiente**, no reportarla como aprobada.
- No se probaron autenticación real, transacciones en Firebase de producción,
  llamadas entre dispositivos ni despliegue de Pages.
- No se cambiaron reglas, UI, Firebase ni versión del sitio.

## Diferencias y deuda que conviene recordar

- ARCHITECTURE §9 todavía pone voz/video fuera de alcance, aunque `modules/call`,
  el README y la sección de migración documentan su implementación.
- ADDING-A-GAME muestra solo mount/unmount en su esquema; el montaje real también llama update.
- ARCHITECTURE prohíbe `platform/ui` → services, pero `platform/ui/play.js` importa
  gamePrefs de services. Además, buildCtx entrega la mesa completa. No extender esa exposición.
- El test de arquitectura no comprueba todas las prohibiciones descritas en la tabla
  de dependencias; estar en verde no sustituye revisar imports de UI/servicios.
- Sigue habiendo deuda de azar en IA del dominó y NOISE mutable documentado.
- No se verificaron las afirmaciones de capacidad/costo de Firestore del documento.
  Medir y consultar documentación vigente antes de decidir un juego de alta frecuencia.

Al retomar, leer el estado actual del repositorio: estos inventarios y resultados son una
fotografía del commit indicado, no una promesa de que no habrá cambios posteriores.
