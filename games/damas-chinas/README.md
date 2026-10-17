# Damas chinas

El juego de canicas en un tablero de estrella de seis puntas, para 2, 3, 4 o 6 jugadores. Cada quien lleva sus 10
canicas de su punta a la de enfrente, avanzando un paso o saltando sobre otras canicas.

## Reglas

- **Tablero:** estrella de 121 hoyos: un hexágono de 61 en el centro y seis puntas de 10.
- **Jugadores:** con 2, puntas de frente; con 3, puntas alternas (cada quien va a una punta vacía); con 4, dos parejas
  de puntas de frente; con 6, todas.
- **Turno:** mueves una canica un paso a un hoyo vecino vacío, **o** saltas sobre una canica vecina (de quien sea) a
  un hoyo vacío justo detrás, y puedes seguir saltando las veces que quieras. No se mezclan pasos y saltos; no se
  comen canicas.
- **Puntas ajenas:** se puede pasar saltando por ellas, pero la jugada no puede terminar en una punta que no sea la
  tuya ni la de tu meta.
- **En la meta:** una canica que ya entró a tu meta no vuelve a salir (sí se acomoda adentro).
- **Gana** quien mete sus 10 canicas en su meta. **Contra el bloqueo:** si en tu meta quedan canicas de otro que ya no
  se pueden mover y todos los demás hoyos son tuyos, también ganas.
- **Sin jugada:** se pasa.
- **Tope:** 200 jugadas por persona (`RULES.maxMovesPerSeat`). Si se llega, gana quien tenga más canicas en su meta y,
  si empatan, quien esté más cerca de terminar. En la práctica no pasa: la compu siempre termina antes.

```
games/damas-chinas/
├── manifest.js   # id, nombre, jugadores, modos (2, 3, 4 o 6 jugadores)
├── index.js      # conforme al contrato: setup, legalActions, apply, view, la compu, el reloj
├── engine/
│   ├── board.js  # la estrella: hoyos, vecinos, saltos, puntas, distancias (constante, se calcula al cargar)
│   └── index.js  # reglas (puro)
├── ai/           # la compu: fácil, normal y difícil (puro)
├── ui/           # la mesa: jugadores, tablero en SVG (tu punta siempre abajo), reglas
└── styles/       # tablero, canicas y colores por asiento
```

**Hoyos:** coordenadas cúbicas de una rejilla hexagonal (`x + y + z = 0`); el número de un hoyo es su lugar en
`CELLS`. **Acciones:** `{ type: "move", path: [desde, …, hasta] }` (un paso, o el hoyo donde cae cada salto) y
`{ type: "pass" }` solo si no hay jugada. El reloj, al vencerse, mueve la canica que más se acerca a su meta.

**Vista:** no hay nada oculto; todos ven el tablero.

**La compu:** califica cada jugada por cuánto acerca la canica al vértice de su meta, con un premio por mover las
rezagadas (el grupo avanza junto y deja puentes para saltar), otro por acercarse a un hoyo libre de la meta al final, y
un castigo por deshacer su jugada anterior. La difícil además mira su siguiente jugada. En 60 partidas de 2: la normal
le gana a la fácil 85% de las veces y la difícil a la normal 78%.

**Pendiente posible:** en partidas de 3 o más, seguir jugando por el segundo y tercer lugar en vez de terminar con el
primero.
