# Panal

Juego de colmena para 2, sin tablero: cada quien pone y mueve bichos hexagonales hasta rodear a la abeja reina del
rival. Juego abstracto de la misma familia que los juegos de colmena de mesa, con nombre, bichos y dibujos propios.

## Reglas

- **Bichos de cada jugador (11):** 1 abeja reina, 2 mayates, 3 chapulines, 3 hormigas y 2 arañas. Fichas claras y oscuras.
- **Turno:** pones un bicho de tu reserva o mueves uno tuyo que esté encima de la colmena.
- **Poner:** la primera ficha va al centro y la segunda junto a ella. Después, una ficha nueva solo toca fichas de tu color.
- **La reina:** a más tardar en tu 4.ª ficha; no puedes mover nada hasta ponerla.
- **Colmena única:** nunca puede quedar partida, ni a medio movimiento.
- **Caber:** una ficha que se desliza no pasa entre dos fichas que le cierran el paso.
- **Movimientos:** reina, un paso · mayate, un paso y puede subirse a la colmena (tapa lo que pisa) · chapulín, salta en
  línea recta hasta el primer hueco · hormiga, cualquier número de pasos por la orilla · araña, exactamente tres.
- **Gana** quien rodea por los seis lados a la reina rival. Las dos a la vez, o 240 jugadas sin ganador: empate.
- **Sin jugadas,** pasas.

```
games/panal/
├── manifest.js   # id, nombre, 2 jugadores
├── index.js      # Panal conforme al contrato: setup, legalActions, apply, view, la compu, el reloj, el consejo
├── engine/       # reglas (puro). hex.js: casillas "q,r" en coordenadas axiales, colmena unida, puntos de corte
├── ai/           # la compu: fácil, normal y difícil (puro)
├── ui/           # la mesa (table.js), la colmena y las reservas (board.js), los bichos (art.js), las reglas (rules.js)
│                 # y el tutorial: tutorial.js (la ventana) y lessons.js (las lecciones, puras y probadas)
├── assets/       # banco de imágenes (bank.js) que reemplaza a los dibujos cuando se llena; ver assets/README.md
└── styles/       # mesa de madera y fichas
```

**Acciones:** `{ type: "place", kind, to }`, `{ type: "move", from, to }` y `{ type: "pass" }` (solo sin jugadas).
Casillas como texto `"q,r"`; la colmena es `cells: { "q,r": [{ p, k }, …] }`, de abajo hacia arriba.

**Vista:** no hay nada oculto; todos ven la colmena y las reservas.

**La compu:** califica la posición por los lados ocupados de cada reina (la propia pesa más), las fichas que se
pueden mover (las que no unen dos partes de la colmena; la hormiga y el mayate valen más) y un mayate encima de la
reina rival. Fácil y Normal miran una jugada adelante con más o menos dudas (`modules/choice`); Difícil mira además la
mejor respuesta del rival a sus 12 mejores jugadas. Siempre cierra una jugada que gana. El consejo es lo que haría
la difícil. Al vencerse el reloj se juega lo que haría la normal.

**Tutorial:** el botón **Aprender** de la mesa (y "Aprender paso a paso" en las reglas) abre 11 lecciones cortas. En
cada una hay una colmena chica armada a mano y una tarea: rodear a la reina, poner un bicho, la reina en la 4.ª ficha,
cómo se mueve cada bicho, colmena única y caber por un hueco; la última da consejos para empezar. Se juega con las
reglas de verdad: si tocas una ficha que no se puede mover, dice por qué. "Muéstrame" marca la jugada. Cada lección
tiene su solución, y `tests/games/panal/lessons.test.js` revisa que se pueda cumplir con las reglas actuales. El
botón Aprender llama la atención hasta que se abre una vez (preferencia `juegos.panal.tutorial`).

**Arte:** los bichos son dibujos SVG propios (`ui/art.js`). Las imágenes del banco (`assets/`) los reemplazan uno
por uno cuando existen.
