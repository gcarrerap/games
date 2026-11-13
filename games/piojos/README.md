# Piojos

Juego de dados de póker para 2 a 6 jugadores, de la familia del Farkle o "Diez mil": tiras, apartas lo que vale y decides si te plantas o te arriesgas a perder el turno.

## Reglas

- **Material:** 5 dados de póker (9, 10, J, Q, K, As).
- **Piojos:** solo el 9 (5 puntos), el 10 (10) y el As (20) valen. Sin puntos extra por combinaciones.
- **Turno:** tiras los 5 dados. Los piojos que salgan se apartan y se suman a lo del turno. Entonces te plantas (lo del turno pasa a tu marcador) o tiras los dados que quedan.
- **Sin piojos:** si en un tiro no sale ningún piojo, pierdes todo lo del turno y pasa al siguiente.
- **Cinco piojos:** si apartas los 5 dados, vuelves a tirar los 5 sin perder lo que llevas.
- **Gana** quien se planta y llega a 500.

Los valores y la meta están en `RULES` (`engine/index.js`). Se escogieron así porque no se recordaban los originales: con 500, una partida entre dos dura unos 10 turnos por jugador.

```
games/piojos/
├── manifest.js   # id, nombre, jugadores, modos (de 2 a 6 jugadores)
├── index.js      # Piojos conforme al contrato: setup, legalActions, apply, view, la compu, el reloj
├── engine/       # reglas (puro)
├── ai/           # la compu: prudente, normal y arriesgada (puro)
├── ui/           # la mesa: faces.js (caras de póker), sound.js, table.js
├── sfx/          # voz del locutor (Fish Audio)
└── styles/       # marco de talavera verde y ocre, paño vino, cuaderno
```

**Acciones:** `roll` (tirar los dados que quedan) y `bank` (plantarse). El reloj, al vencerse, tira si no has tirado y te planta si ya tiraste.

**Vista:** no hay nada oculto; todos ven los dados y los marcadores.

## La mesa

De la misma familia que Yatzi: la caja de dados de `modules/dice` con marco de talavera verde y ocre y paño color
vino, dados de póker en 3D (el 9 en el lugar 1 del cubo y el As en el 6; los piojos llevan aro dorado). Al caer, los
piojos brillan, suenan uno por uno y se van a la repisa; lo demás se apaga. Sin piojos, todo se apaga con un "ni
modo" y la caja tiembla; al plantarse, lluvia de monedas y "+N" que sube al marcador; con cinco piojos, fanfarria y
confeti. El marcador es una hoja de cuaderno con el camino a la meta (en pluma lo ganado, a lápiz lo del turno).

**En el mismo aparato:** en el lobby, «Persona (este aparato)» en los asientos de los demás (`hotseat: true`).

**Para tirar:** el botón, el botón apretado para sacudir, o agitar el teléfono (`modules/shake`); en la computadora R
o espacio tiran y P te planta. **Sonido:** dados de `modules/dice`, lo demás sintetizado (`ui/sound.js`) y el locutor
con Fish Audio (`sfx/README.md`). En línea, cada teléfono oye solo lo suyo y la tele, todo.

**La compu:** sigue tirando mientras lo que espera ganar con los dados que quedan sea mayor que lo que espera perder (probabilidad de no sacar piojos × lo del turno). Cada estilo mueve ese límite, y se arriesga más si alguien está cerca de ganar. Siempre se planta si con eso gana.
