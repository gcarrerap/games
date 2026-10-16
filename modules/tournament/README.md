# tournament

Partidas entre bots sin interfaz, sobre **cualquier** juego que cumpla el contrato, reproducibles con semilla.

| Función | Qué hace |
|---|---|
| `playGame(game, profiles, opts)` | Juega una partida completa con la compu en todos los asientos. Devuelve `{ state, result, steps, stalled }`. |
| `match(game, { config, games, seed, lineup, won })` | Varias partidas; `lineup(g)` da los perfiles por asiento (para alternar), `won(result, g)` dice si ganó el lado medido. Devuelve tasa de victorias e intervalo de confianza. |
| `stepCtx(seed, i, t0)` | El `{ rnd, now }` del paso `i`: azar con semilla `seed:i` y tiempo fijo. |
| `ci95(wins, n)` | Intervalo de confianza del 95% para una proporción. |

Opciones de `playGame`: `config` (para `setup`), `seed`, `maxSteps`, `stopWhen(state)` (cortar antes, por ejemplo a menos puntos), `decide(view, seat, profile, ctx, state)` (envolver la decisión de la compu para juntar estadísticas propias del juego) y `onStep`.

Cómo resuelve cada paso:

- Si `currentSeats` trae un asiento, decide la compu de ese asiento con **su vista** (`game.view`), nunca con el estado completo.
- Si trae varios, actúa primero el de menor `bots.thinkMs`.
- Si viene vacío y la partida no terminó (una pausa, como entre manos), actúa el primer asiento con alguna acción legal.
- Si nadie puede actuar, la partida se marca `stalled`: eso es un error del juego, y la prueba del contrato lo detecta.

**Lo usan:** dominó (`games/domino/ai/tournament.js`: fuerza y huella de estilo de los perfiles) y `tests/contract.test.js` (una partida completa de cada juego registrado).
