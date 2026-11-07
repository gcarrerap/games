# Memoria Veloz

El juego de pares, pero **sin turnos**: de 1 a 4 jugadores juegan al mismo tiempo, cada quien en su teléfono, y gana el más rápido. Es el primer juego en tiempo real del sitio (`realtime: true`, ver `docs/ARCHITECTURE.md` §4).

## Reglas

- **Tablero:** 18 pares con 1–2 jugadores, 24 pares con 3–4.
- **Abrir:** abres una carta y luego otra. Mientras la tienes abierta, solo tú ves su cara y solo tú la puedes tomar; los demás la ven marcada con tu color, sin la cara. **Una carta abierta no se regresa** (si no, ganaría quien abre y cierra cartas sin armar pares).
- **Si la segunda es pareja:** el par es tuyo en ese momento (sin botón de reclamar) y sale del juego.
- **Si no es pareja:** las dos se regresan solas a su lugar y quedas **congelado 2 s** (no abres cartas ni pones timers). Solo tú viste las caras.
- **Timer:** le pones uno de **5 s** a otro que tenga una carta abierta; al acabarse se le regresa. Si antes junta su par o falla, vence sin acción. Un timer a la vez sobre cada jugador; puedes poner otro **10 s** después de que el tuyo terminó (no se acumulan).
- **Fin:** cuando no quedan pares. Gana quien tenga más; en empate, quien llegó primero a ese número.

El issue con las reglas acordadas es el #83.

```
games/memoria/
├── manifest.js   # id, nombre, 1–4 jugadores, realtime
├── index.js      # conforme al contrato; el "reloj" son los timers (timing → tick)
├── engine/       # reglas (puro): abrir, par al instante, congelado, timers, desempate, la vista
├── ai/           # la compu: despistado, normal y memorión (recuerdan con olvido; también ponen timers)
├── ui/           # la mesa: jugadores con ⏱ y el tablero (se acomoda al espacio libre); faces.js (las caras)
└── styles/
```

## Cómo funciona el tiempo

- Congelado y la recarga del timer se revisan contra la hora de cada acción (`ctx.now`); la hora del estado nunca retrocede.
- Un timer vencido regresa las cartas con la acción `tick`, que aplica la plataforma cuando llega su hora (`timing.turnMs` es lo que falta para el siguiente timer). Así lo que ve cada asiento siempre es el estado, y la compu no decide con algo que cambió sin saberlo.
- La mesa cuenta los segundos con la hora del estado más lo que ha pasado en ese teléfono desde que lo vio, así no importa si los relojes de los teléfonos no coinciden.

## La memoria de la compu

`view(state, seat).memory` es lo que ese asiento ya vio (dónde está cada cara). La compu lo necesita porque no guarda nada entre decisiones; la mesa no lo muestra. Cada estilo recuerda una carta con una probabilidad que baja con las acciones que han pasado desde que la vio.

## Pendiente

- **Caras:** por ahora son emoji (`ui/faces.js`); las ilustraciones de Petra se cambian ahí sin tocar las reglas.
- **En línea:** cada toque es una escritura en Firestore sobre la misma mesa. Para una familia funciona, pero Firestore aguanta del orden de una escritura por segundo sostenida por documento y cuenta lecturas por cada teléfono que mira; con 4 personas tocando rápido puede haber esperas o reintentos y se gasta la cuota gratis más rápido que en los juegos por turnos. Un servidor propio (ver ARCHITECTURE.md §5) lo resolvería. En práctica contra la compu no hay ese límite.
