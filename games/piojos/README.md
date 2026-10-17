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
├── ui/           # la mesa: marcador con la meta, dados, lo apartado, Tirar / Plantarme
└── styles/       # paño y dados
```

**Acciones:** `roll` (tirar los dados que quedan) y `bank` (plantarse). El reloj, al vencerse, tira si no has tirado y te planta si ya tiraste.

**Vista:** no hay nada oculto; todos ven los dados y los marcadores.

**La compu:** sigue tirando mientras lo que espera ganar con los dados que quedan sea mayor que lo que espera perder (probabilidad de no sacar piojos × lo del turno). Cada estilo mueve ese límite, y se arriesga más si alguien está cerca de ganar. Siempre se planta si con eso gana.
