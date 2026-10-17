# Skull

Juego de faroleo para 3 a 6 jugadores. Cada quien tiene 3 flores y 1 calavera; se ponen boca abajo y se apuesta cuántas flores se pueden voltear sin toparse con una calavera.

En la mesa, el botón **Reglas** abre las reglas en cualquier momento (también están en el menú de la partida).

**Tutorial:** diez pasos con una ronda de ejemplo (Tú, Lupe y Beto) y preguntas en los momentos clave: qué disco poner, cuánto apostar, subir o pasar, qué voltear primero, de quién voltear y qué disco perder. Se abre desde el aviso de la primera ronda (sale hasta que lo abres una vez), desde la ventana de Reglas y desde el menú. La ronda se juega con `engine/` (`ui/tutorial-script.js`), así las escenas no se apartan de las reglas; `tests/games/skull/tutorial.test.js` lo revisa.

## Reglas

- **Al empezar la ronda** todos ponen a la vez un disco boca abajo en su tapete.
- **En tu turno** pones otro disco o abres la apuesta. Sin discos en la mano, tienes que apostar.
- **Apuesta:** cada quien sube o pasa; quien pasa ya no vuelve en la ronda. Cuando todos los demás pasaron, o alguien apuesta todos los discos de la mesa, el más alto es el retador.
- **Reto:** el retador voltea primero los suyos, de arriba hacia abajo (todos, o solo los que necesita si apostó menos); luego escoge tapetes ajenos y voltea el de arriba, uno a la vez.
  - Solo flores: gana el reto. Dos retos ganados = gana la partida.
  - Calavera ajena: su dueño le quita al retador un disco al azar sin verlo. Nadie más sabe cuál fue.
  - Su propia calavera: el retador escoge qué disco pierde.
- Quien se queda sin discos sale. El último en pie también gana.
- **Siguiente ronda:** la abre el retador; si salió, el siguiente jugador.
  (Simplificación: en el juego de mesa, si el retador sale por su propia calavera escoge quién abre.)

```
games/skull/
├── manifest.js   # id, nombre, jugadores, modos (de 3 a 6 jugadores)
├── index.js      # Skull conforme al contrato: setup, legalActions, apply, view, la compu, el reloj
├── engine/       # reglas (puro)
├── ai/           # la compu: prudente, normal y atrevida (puro)
├── ui/           # la mesa: tapetes, la apuesta, tus discos, botones, la ventana de reglas y el tutorial
├── assets/       # banco de imágenes de los discos (catrinas); ver assets/README.md
└── styles/       # paño y discos (table.css) y el tutorial (tutorial.css) (colores del dibujo SVG de respaldo)
```

**Acciones:** `place` (`disc`: `"F"` flor o `"S"` calavera), `bid` (`n`), `pass`, `flip` (`seat`: tu tapete primero), `discard` (`disc`: qué pierdes si te topaste con tu calavera) y `next` (siguiente ronda).

**A la vez:** en la fase `place` todos los que no han puesto su primer disco están en `currentSeats`. El reloj, al vencerse, pone una flor por el primero de ellos.

**Vista:** ves tu tapete y tus discos completos; de los demás, cuántos discos tienen y solo los discos ya volteados. Qué disco perdió el retador solo lo sabe él (`outcome.lost`); el registro no lo dice.

**La compu:** cree poder voltear todos los suyos si no puso la calavera (o los que quedaron encima de ella) más una parte de los ajenos según su estilo, con más confianza en quien apostó. Pone la calavera de vez en cuando (más la atrevida) y con ella puesta a veces apuesta bajo o sube de farol para que otro se haga retador. Al voltear, empieza por quienes apostaron. Al perder, conserva la calavera mientras le quede más de una flor.

**Al vencerse el reloj:** pone una flor (o la calavera si no le quedan), pasa en la apuesta (o apuesta 1 si tiene que abrirla), voltea el primer tapete que se pueda y pierde una flor si tiene.

**Discos:** imágenes con temática de catrinas de Petra (`assets/`, elegidas en el #26). Sin banco, la mesa dibuja los discos en SVG (`ui/disc.js`).
