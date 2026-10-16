# La Pata

La Pata (variante familiar de la canasta) para 2 a 6 jugadores, migrada de [myPata](https://github.com/gcarrerap/myPata). El reglamento, los modos y la compu están descritos en el README de ese repositorio.

```
games/pata/
├── manifest.js   # id, nombre, jugadores, modos (2, 3, 4 individual o en parejas, 6 en parejas o en equipos de 3)
├── index.js      # La Pata conforme al contrato: setup, legalActions, apply, view, la compu, el reloj, equipos
├── engine/       # reglas (puro): cartas, patas, bajarse, jugadas, puntos, tiempo, registro por ronda
├── ai/           # la compu (3 niveles) y el consejo (puro)
├── ui/           # la mesa: patas por equipo, mazo y pozo, tu mano, tu bajada, ver el pozo, resultado, consejo y registro
└── styles/       # paño y cartas (los colores compartidos están en platform/styles/)
```

**Acciones:** las del motor (`draw`, `peek`, `pickup`, `meld`, `add`, `discard`; ver `engine/moves.js`), más `next` (repartir la siguiente ronda, cualquier asiento) y `timeout` (el reloj roba si hace falta y descarta).

**Vista:** mientras se juega se ocultan como `"?"` las manos ajenas, todos los montones sin abrir (también los propios), el mazo y las cartas que otros robaron. El pozo, las patas, lo que se levanta del pozo y los pares que se enseñan se ven. La compu decide con esa vista; `tests/games/pata/contract.test.js` comprueba en los tres niveles que decide lo mismo que con el estado completo.

Usa los módulos `random` y `choice` (la votación del descarte; `tests/games/pata/vote.test.js` comprueba que escoge lo mismo que en myPata).

**Estado:** completo. Práctica contra la compu y mesas en línea, de 2 a 6 jugadores. Las llamadas de voz y video de myPata ahora son de la plataforma (`modules/call`): sirven en la mesa en línea de cualquier juego.
