# Dominó

Dominó doble seis para 2 a 4 jugadores, migrado de [myDomino](https://github.com/gcarrerap/myDomino). Las reglas, modos y la compu están descritos en el README de ese repositorio.

```
games/domino/
├── manifest.js   # id, nombre, jugadores, modos (lo que el portal lista sin cargar el juego)
├── index.js      # el dominó conforme al contrato: setup, legalActions, apply, view, la compu, el reloj
├── engine/       # reglas (puro): fichas, modos, mesa, jugadas, puntos, tiempo, registro por mano
├── ai/           # la compu y el consejo (puro): heurísticas, deducción, Monte Carlo, perfiles, huella de estilo
├── ui/           # la mesa: tu mano, la cadena, los jugadores, resultado, consejo y registro
├── styles/       # paño, fichas y la mesa (los colores compartidos están en platform/styles/)
└── scripts/
    └── torneo.mjs   # node games/domino/scripts/torneo.mjs — fuerza y estilo de los perfiles de la compu
```

**Acciones** (`index.js`): `play` (`tile`, `side`: `L`, `R` o `X` para salir), `draw`, `pass`, `next` (repartir la siguiente mano; cualquier asiento, entre manos) y `timeout` (se acabó el tiempo: el reloj juega por ese asiento).

**Vista:** mientras se juega, las fichas ajenas y las del pozo se ven como `"?"` (se sabe cuántas son); al terminar la mano se destapan. La compu decide con esa vista; `tests/games/domino/contract.test.js` comprueba que decide lo mismo que con el estado completo.

Usa los módulos `random`, `choice`, `tournament` y `recording`.

**Estado:** fase 4 de docs/ARCHITECTURE.md §8. Se juega en práctica contra la compu, con reloj, consejo, registro de fichas, notas y "ver manos". Mesas en línea: fase 5.

Pruebas que se quedaron en myDomino por depender de `app/` y `services/` (llegan con las fases 3 a 5): `record.test.js`, `ai-worker.test.js` y la parte de `profiles.test.js` que revisa `botProfileOf`.
