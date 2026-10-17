# La Viuda

Juego de cartas para 2 a 8 jugadores, versión póker de 5 cartas: además de las manos se reparte una mano extra en la mesa, la viuda, y en tu turno cambias cartas con ella. Solo pierde la peor mano.

En la mesa, el botón **Reglas** abre estas reglas en cualquier momento (también están en el menú de la partida).

## Reglas

- **Fichas:** 3 cada quien. Solo la peor mano pierde una ficha. El primero que se queda sin fichas recibe una extra, **la viuda**, una sola vez por partida. Quien se queda sin fichas después sale. Gana el último con fichas.
- **Reparto:** rota cada mano. Parte el de la izquierda de quien reparte y empieza el de su derecha (el turno pasa a la derecha, al siguiente asiento). 5 cartas a cada quien y 5 boca abajo: la viuda.
- **Comodín al partir:** si la carta que queda a la vista al partir es comodín, se la queda quien partió y recibe solo 4 más.
- **Primera ronda, viuda tapada:** tomas las 5 a ciegas (tu mano queda boca arriba como la nueva viuda) o pasas. Si todos pasan, la mano se acaba y se comparan las manos repartidas. En cuanto alguien la toma, se juega normal.
- **Viuda abierta:** cambias una, cambias las 5 o tocas. No se puede pasar.
- **Después de tocar:** cada uno de los demás tiene un último turno: cambiar una, cambiar las 5 o pasar. Luego se muestran las manos.
- **Comodín:** la mano 1 no tiene; la 2 es el As, la 3 el 2… la 14 el K y la 15 vuelve al As.
- **Jugadas, de mayor a menor:** flor imperial (con comodín se vale; la limpia gana), quintilla (cinco iguales, con comodín), flor corrida, póker, full, color, corrida, tercia, dos pares, par, carta alta. El As vale alto y bajo en corridas.
- **Desempates:** carta más alta y las siguientes una por una; luego la mano limpia (menos comodines); luego el palo de la carta más alta: ♠ > ♥ > ♦ > ♣. Si aun así empatan del todo, pierden todas las empatadas.

```
games/viuda/
├── manifest.js   # id, nombre, jugadores, modos (de 2 a 8 jugadores)
├── index.js      # La Viuda conforme al contrato: setup, legalActions, apply, view, la compu, el reloj
├── engine/       # reglas (puro): index.js la mano y las fichas; hands.js el valor de una mano con comodines
├── ai/           # la compu: prudente, normal y arriesgada (puro)
├── ui/           # la mesa: jugadores con fichas, la viuda, tu mano, botones y la ventana de reglas
└── styles/       # paño, cartas y fichas
```

**Acciones:** `all` (tomar las 5; a ciegas en la primera ronda), `swap` (`give`, `take`: cambiar una), `knock` (tocar), `pass` (pasar) y `next` (siguiente mano). El reloj, al vencerse, pasa a ciegas, toca con la viuda abierta y pasa después de que tocaron.

**Vista:** ves tu mano; de los demás, cuántas cartas tienen. La viuda tapada no se ve. Al terminar la mano, todas las manos quedan en `showdown`.

**La compu:** toma la viuda a ciegas con carta alta (la arriesgada, también con un par bajo). Con la viuda abierta toca cuando su mano llega a su límite (prudente: par alto; normal: dos pares; arriesgada: tercia) y si no, hace el cambio que más la mejora; ese límite baja conforme pasan las vueltas. Después de que tocaron, cambia solo si mejora.

**Cartas:** la baraja, revolver y el dibujo vienen de `modules/cards` (notación `"KH0"`: número, palo y baraja; aquí siempre baraja 0).
