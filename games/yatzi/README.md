# Yatzi

El juego de los cinco dados y la tarjeta de 13 casillas, de 1 a 6 jugadores. Solo, juegas contra tu récord (se guarda
en el aparato).

## Reglas

- **Turno:** hasta 3 tiros. Entre tiros apartas los dados que quieras (se van a la repisa). Luego anotas en una casilla
  libre; si no vale nada ahí, se tacha (0).
- **Arriba:** Unos a Seises suman ese número. Con 63 o más, bono de 35.
- **Abajo:** Tercia y Póker (3 y 4 iguales; suman todo), Full (25), Escalera chica (4 seguidos, 30), Escalera grande
  (5 seguidos, 40), Yatzi (5 iguales, 50) y Suerte (suma todo).
- **Yatzi extra:** con 50 en Yatzi, cada Yatzi más da 100. Comodín de las reglas oficiales: va en su casilla de arriba
  si está libre; si no, en cualquiera de abajo a valor completo; si abajo no queda nada, se tacha una de arriba.
- **Gana** quien suma más con las 13 casillas llenas; con empate no hay ganador.

## Cómo se juega

- **Tirar:** el botón «Tirar»; o dejarlo apretado para sacudir los dados en la mano y soltarlo; o **agitar el
  teléfono** (`modules/shake`). En iPhone el permiso de movimiento se pide con el primer toque en la mesa; el botón 📳
  lo enciende y apaga (se recuerda en el aparato, `juegos.yatzi.shake`). En la computadora: R o espacio tiran y 1–5
  apartan.
- **Anotar:** en tu columna de la tarjeta se ven a lápiz los puntos de cada casilla libre; tocas una (se marca con
  marcatextos) y confirmas con «Anotar», o la vuelves a tocar.
- **En el mismo aparato:** en el lobby, «Persona (este aparato)» en los asientos de los demás (`hotseat: true`).
- **La tele:** como Monitor, la caja de dados y la tarjeta lado a lado, grandes, sin botones.

## Lo que se ve y se oye

La caja de dados tiene marco de azulejo y paño cobalto; los dados son cubos 3D de CSS (`ui/dice.js`) que entran
volando, rebotan dos veces girando y caen en su cara (`ui/tray.js`, Web Animations). Al caer se anuncian Yatzi (con
confeti, `ui/fx.js`), escaleras, Full, Póker y Tercias que todavía sirven. La tarjeta es una hoja de cuaderno escrita
con pluma azul (`ui/card.js`).

Los efectos se sintetizan con `createSynth` de `modules/sfx` (castañeteo, botes en madera, campanitas, fanfarria) y el
locutor son mp3 de Fish Audio (`sfx/README.md`). En línea, cada teléfono oye solo lo suyo y la tele, todo.

```
games/yatzi/
├── manifest.js   # id, nombre, 1 a 6 jugadores, hotseat
├── index.js      # conforme al contrato: setup, reloj (45 s por decisión), la compu espera a que caigan los dados
├── engine/       # reglas (puro): puntos, comodín, bonos, turnos
├── ai/           # la compu: fácil, normal, experta; qué apartar calculado exacto sobre las 252 manos
├── ui/           # dice.js, tray.js, card.js, fx.js, sound.js, rules.js, table.js
├── sfx/          # voz del locutor (Fish Audio)
└── styles/
```

**Acciones:** `{ type: "roll", keep: [5 × boolean] }` (los apartados viajan en la acción, para que todos vean qué
guardaste) y `{ type: "score", cat }`. **Reloj:** tira si no has tirado; si ya tiraste, anota lo que más da.

**La compu:** valora cada casilla como sus puntos menos lo que esa casilla suele dar en una partida (más un empujón al
bono de arriba), y con eso calcula de atrás para adelante qué apartar en cada tiro. Promedios en partidas solas: fácil
≈ 210, normal ≈ 232, experta ≈ 240 (el juego perfecto da ≈ 254).
