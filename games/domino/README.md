# Dominó

Dominó doble seis para 2 a 4 jugadores, migrado de [myDomino](https://github.com/gcarrerap/myDomino). Las reglas, modos y la compu están descritos en el README de ese repositorio.

```
games/domino/
├── engine/    # reglas (puro): fichas, modos, mesa, jugadas, puntos, tiempo, grabación
├── ai/        # la compu y el consejo (puro): heurísticas, deducción, Monte Carlo, perfiles, torneos
└── scripts/
    └── torneo.mjs   # node games/domino/scripts/torneo.mjs — torneos entre perfiles de la compu
```

Usa los módulos `random` y `choice`.

**Estado:** fase 1 de docs/ARCHITECTURE.md §8. `engine/` y `ai/` están copiados de myDomino sin cambios de lógica (solo cambian las rutas de `random` y `choice`) y pasan sus pruebas (`tests/games/domino/`). Todavía no hay `index.js` con el contrato ni interfaz: eso es la fase 2.

Pruebas que se quedaron en myDomino por depender de `app/` y `services/` (llegan con las fases 3 a 5): `record.test.js`, `ai-worker.test.js` y la parte de `profiles.test.js` que revisa `botProfileOf`.
