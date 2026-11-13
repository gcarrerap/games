# Vikingos

Rompecabezas para uno. Una tormenta dejó a los barcos vikingos en medio de los remolinos: hay que llevar cada barco a
la flecha de su color en la orilla, girando las piezas del mar con el barco. Trae los 60 retos del cuadernillo en
cuatro niveles: Inicial (1–15), Junior (16–30), Experto (31–45) y Maestro (46–60).

## Reglas

El mar son 9 piezas redondas en una rejilla de 3 × 3 que se enciman con sus vecinas. Cada pieza tiene dos muescas:
el **remolino** (`C`) en dos lados vecinos y la **corriente** (`X`) en lados opuestos. Los barcos van en las muescas.

- Solo se gira una pieza con un barco en una de sus muescas.
- Una pieza se traba si una vecina tiene su parte llena metida en ella: para girar, cada vecina debe tener su muesca
  hacia ella.
- Al girar, todos los barcos que van en sus muescas giran con ella.
- Se vale girar 90°, 180° o 270°; cada giro es un movimiento. Girar la misma pieza dos veces seguidas cuenta como uno.
- Se gana cuando cada barco está junto a su flecha.

```
games/vikingos/
├── manifest.js   # id, nombre, 1 jugador
├── index.js      # conforme al contrato
├── engine/       # board.js (la geometría y cuándo se gira), index.js (la partida), challenges.js (los 60 retos)
├── ai/           # solve.js (búsqueda a lo ancho: la solución más corta), la compu y el consejo
├── ui/           # el selector de retos, el mar en SVG con sus efectos, el sonido y las reglas
├── sfx/          # voz del narrador (Fish Audio); los efectos se sintetizan
└── styles/
```

**Lentes:** `"h<r><c>"` entre la pieza (r, c) y la de su derecha, `"v<r><c>"` entre (r, c) y la de abajo, y
`"N<c>"`, `"S<c>"`, `"W<r>"`, `"E<r>"` en la orilla. **Acciones:** `{ type: "pick", n }`,
`{ type: "rotate", piece, turns }` (turns 1, 2 o 3 cuartos en el sentido del reloj), `"undo"`, `"reset"` y
`"choose"` (regresar al selector). **Vista:** no hay nada oculto.

**Los retos** se copiaron a mano del cuadernillo: de cada uno se anotaron las lentes abiertas (mar oscuro y barcos),
los barcos y las flechas. Con eso el giro de cada pieza sale solo (en los 60 hay una sola forma de acomodarlas), y
la prueba revisa que cada reto esté bien armado, tenga solución y que su `min` sea el de la búsqueda. Los mínimos van
de 5 movimientos (reto 1) a 32 (retos 30 y 59).

**La compu** (perfil «Vikinga», en el hilo aparte) escoge un reto Inicial y lo resuelve en el mínimo. **El consejo**
dice el siguiente giro de la solución más corta desde donde vas y cuántos movimientos faltan. Los retos más difíciles
tardan alrededor de un segundo en resolverse.

**En la mesa:** tocas una pieza con barco para escogerla (las que se pueden girar tienen la orilla clara) y la giras
con ↺ o ↻; tocarla otra vez la gira a la derecha. Lo resuelto se recuerda en el aparato (`juegos.vikingos.resueltos`),
con ⭐ si fue en el mínimo. «Siguiente reto» empieza otra partida que abre sola el reto que sigue.

**Gráficos:** todo es SVG hecho a mano (`ui/board.js`), sin imágenes. Marco de madera con cordel y escudos, mar con
oleaje que avanza, remolinos con espiral que gira despacio, corrientes que fluyen, drakkars vistos desde arriba
(proa de dragón, escudos, remos y vela a rayas) que se mecen, y banderines que esperan su barco. Al girar una pieza
salen ondas; al llegar un barco, destellos dorados; una pieza trabada tiembla; al ganar cae confeti. Con
`prefers-reduced-motion` todo queda quieto.

**Sonido** (`ui/sound.js`, botón 🔔 y volumen en el menú): los efectos se sintetizan con Web Audio y la voz del
narrador es de Fish Audio (`sfx/README.md`). Cada cosa suena una sola vez, cuando llega la jugada, no al redibujar.
