# La Pata

La Pata (variante familiar de la canasta) para 2 a 6 jugadores, migrada de [myPata](https://github.com/gcarrerap/myPata). El reglamento, los modos y la compu están descritos en el README de ese repositorio.

```
games/pata/
├── manifest.js   # id, nombre, jugadores, modos (2, 3, 4 individual o en parejas, 6 en parejas o en equipos de 3)
├── index.js      # La Pata conforme al contrato: setup, legalActions, apply, view, la compu, el reloj, equipos
├── engine/       # reglas (puro): cartas, patas, bajarse, jugadas, puntos, tiempo, registro por ronda
├── ai/           # la compu (3 niveles) y el consejo (puro)
└── ui/           # la mesa (fase 6b; por ahora un aviso)
```

**Acciones:** las del motor (`draw`, `peek`, `pickup`, `meld`, `add`, `discard`; ver `engine/moves.js`), más `next` (repartir la siguiente ronda, cualquier asiento) y `timeout` (el reloj roba si hace falta y descarta).

**Vista:** mientras se juega se ocultan como `"?"` las manos ajenas, todos los montones sin abrir (también los propios), el mazo y las cartas que otros robaron. El pozo, las patas, lo que se levanta del pozo y los pares que se enseñan se ven. La compu decide con esa vista; `tests/games/pata/contract.test.js` comprueba en los tres niveles que decide lo mismo que con el estado completo.

Usa los módulos `random` y `choice` (la votación del descarte; `tests/games/pata/vote.test.js` comprueba que escoge lo mismo que en myPata).

**Estado:** fase 6a de docs/ARCHITECTURE.md §8. Reglas y compu listas y conformes al contrato; todavía no está en el portal (falta la mesa, fase 6b).
