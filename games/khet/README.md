# Láser de los Faraones

Versión del juego de láser **Khet 2.0** para 2. Tablero de 10 × 8, Plata abajo y Rojo arriba. En tu turno mueves
una pieza a una casilla vecina (también en diagonal) o la giras 90°; después tu esfinge dispara. El láser rebota en
los espejos y destruye la primera pieza que pega en un lado sin espejo, sea de quien sea. Gana quien le da al faraón
del otro.

**Piezas** (13 por color): esfinge (el láser; no se mueve, solo gira), faraón, 2 anubis (escudo al frente),
2 escarabajos (espejo de dos caras, nunca se rompen, se intercambian con una pirámide o un anubis vecino de cualquier
color) y 7 pirámides (un espejo). **Casillas reservadas:** la columna izquierda, I1 e I8 son de Rojo; la derecha, B1 y
B8 de Plata. **Empate:** la misma posición tres veces, o 300 jugadas.

## Opciones de la mesa

- **Acomodo** (`config.setup`): Clásico (el del juego original), y dos variantes de la casa, Muralla y Asalto.
- **Segundos por turno** (`config.secs`): 20, 40, 60 (por omisión) o 120. Solo cuenta "Con reloj". Al vencerse, la
  compu mueve por ti algo que no te haga perder.

## Cómo se juega

- **En línea:** cada quien en su teléfono, como cualquier mesa. Rojo ve el tablero volteado (su lado abajo).
- **En el mismo aparato:** en el lobby, en "En este aparato", escoger **Persona (este aparato)** en el asiento del
  otro jugador (`hotseat: true` en el manifiesto; la plataforma juega por quien le toca).
- **La tele:** como Monitor (📺) muestra el tablero enorme con los dos bandos a los lados, lo que perdió cada uno y la
  bitácora, sin botones. También se puede **jugar en la tele** (o la computadora) en modo Teléfono: con pantalla
  acostada los bandos van a los lados y el tablero ocupa toda la altura; con el control remoto o el teclado, las
  flechas mueven el cursor, OK/Enter escoge y mueve, OK sobre la pieza escogida pasa a girar (← →, OK), Q/E giran y
  Esc suelta.

```
games/khet/
├── manifest.js   # id, nombre, 2 jugadores, hotseat, opciones (acomodo, segundos)
├── index.js      # conforme al contrato: setup, reloj, la compu (espera lo que dura la animación)
├── engine/       # reglas (puro): tablero en enteros, láser, jugadas, fin
├── ai/           # la compu: fácil (1 jugada), normal (2), difícil (3), alfa-beta
├── ui/           # mesa: art.js (piezas SVG), board.js, fx.js (láser y explosiones en canvas), sound.js, table.js
├── sfx/          # voz del narrador (Fish Audio); los efectos se sintetizan
└── styles/
```

**Estado:** `board` es una lista de 80 enteros (`tipo·16 + dueño·4 + orientación`, 0 vacía) para que la compu copie
tableros rápido y Firestore guarde poco. `last.beam.path` trae el recorrido del láser en unidades de casilla, y la
mesa lo dibuja tal cual. **Acciones:** `{ type: "move", from, to }` y `{ type: "rotate", at, dir: 1 | -1 }`.

**La compu:** la difícil le gana a la normal y a la fácil casi siempre; tarda ~0.3 s por jugada (va al hilo aparte).
