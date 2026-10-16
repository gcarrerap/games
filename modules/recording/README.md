# recording

Grabar y repetir partidas de **cualquier** juego que cumpla el contrato. Puro: no guarda en ningún lado; quien lo usa decide dónde va la grabación.

Una grabación es la configuración, una semilla y la lista de acciones con su hora:

```js
{ v: 1, game: "domino", config: {…}, seed: "abc", start: 1760000000000, meta: {…},
  actions: [{ seat: 0, action: { type: "play", tile: "6-6", side: "X" }, t: 1760000004210 }, …] }
```

**La regla que lo hace funcionar:** el azar y el tiempo de cada acción salen siempre de `actionCtx(semilla, i, hora)`. Si quien aplica acciones (la plataforma, el torneo) usa `step()` o `nextCtx()`, la repetición da exactamente el mismo estado, aunque el juego reparta o revuelva a media partida. No hace falta guardar el estado ni los repartos.

| Función | Qué hace |
|---|---|
| `startRecording({ game, config, seed, now, meta })` | Grabación nueva. |
| `initialState(game, rec)` | El estado del `setup` de esa grabación. |
| `step(game, state, rec, seat, action, now)` | Aplica una acción con su contexto y la agrega. Devuelve `{ state, rec }`. |
| `nextCtx(rec, now)` / `setupCtx(rec)` | El `{ rnd, now }` que le toca a la siguiente acción o al setup. |
| `replay(game, rec, { upTo })` | Repite la partida (o sus primeras `upTo` acciones). Truena con el número de acción si alguna no es válida. |
| `actionCtx(seed, i, now)` | El contexto de la acción `i` (`-1` = setup). |

**Privacidad:** la grabación permite reconstruir las manos de todos (es lo que la hace útil para analizar), así que se trata como el estado completo: no se muestra a los jugadores durante la partida.

**Lo usan:** el torneo (`modules/tournament`, opción `record`) y la prueba del contrato, que repite una partida de cada juego y revisa que dé el mismo estado. La plataforma lo usará para grabar las partidas en línea (fase 3, con un adaptador de Firestore en `platform/services/`).

**Relación con las grabaciones del dominó:** `games/domino/engine/record.js` sigue armando el registro por mano que usan las herramientas de análisis de myDomino (formato JSONL, `scripts/export-partidas.mjs`). Ese formato es propio del dominó; cuando la plataforma grabe con este módulo, se podrá derivar de aquí.
