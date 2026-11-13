# Timbiriche

Puntos y cajas para 2 a 6. En tu turno trazas una raya entre dos puntos vecinos; si cierras una caja es tuya y vuelves
a tirar. Gana quien tenga más cajas cuando ya no quedan rayas; si dos o más empatan arriba, es empate.

## Varios en el mismo aparato

El juego es `hotseat`: en la práctica, el lobby deja poner **Persona (este aparato)** en cualquier asiento (en lugar
de la compu) y el aparato se pasa de mano en mano. Cuando el turno cambia, la mesa dice «Pásale el aparato a …». Se
pueden mezclar personas y compu. En línea cada quien juega desde su teléfono, también de 2 a 6. Cada asiento tiene su
color (rojo, azul, verde, naranja, morado, turquesa) y la inicial de su nombre en las cajas (con nombres repetidos,
como «Jugador 2», el número de asiento).

## Opciones de la mesa

- **Tablero:** 3×3, 4×4 (por omisión), 5×5 o 6×6 cajas (`config.size`).
- **Segundos por raya:** 10, 20 (por omisión), 30 o 60 (`config.secs`). Solo cuenta si la mesa va "Con reloj" (el
  botón de la plataforma, `config.timer`). El reloj vuelve a empezar después de cada raya. Al vencerse, la compu traza
  por ti: cierra una caja si se puede, así que el reloj nunca provoca el castigo.
- **Si dejas pasar una caja:** "Pierdes tu siguiente turno" (por omisión) o "Sin castigo" (`config.penalty`).

## El castigo

Si en tu turno había al menos una raya que cerraba caja y trazaste una que no cierra ninguna, quedas castigado
(`skip[seat]`). El turno pasa al siguiente como siempre; cuando a ti te tocaría, se te salta (y el castigo se consume).
Con 2 jugadores eso es que el otro tira dos veces seguidas. Si todos los demás tienen castigo, vuelve a tirar el mismo;
y si además él tiene el suyo, los castigos se cancelan. Se cuentan en `penalties` y salen en el resultado
(`last.skipped` es la lista de asientos a los que se les saltó el turno).

```
games/timbiriche/
├── manifest.js   # id, nombre, 2 a 6 jugadores, hotseat, opciones (tablero, segundos, castigo)
├── index.js      # conforme al contrato: setup, reloj con config.secs, la compu
├── engine/       # reglas (puro)
├── ai/           # la compu: fácil, normal y difícil (puro)
├── ui/           # la mesa: jugadores, tablero en SVG, reglas
└── styles/
```

**Rayas:** `"h:r:c"` va del punto (r, c) al (r, c+1); `"v:r:c"` del (r, c) al (r+1, c). **Acción:**
`{ type: "line", line }`. **Vista:** no hay nada oculto.

**La compu:** la normal cierra todo lo que puede, si no traza una raya que no regale nada, y al final regala la cadena
más corta. La difícil, sin castigo en la mesa y con solo 2 jugadores, además hace la doble jugada (deja las dos últimas cajas de una cadena
para que el otro tenga que abrir la siguiente); con castigo o con más de 2 jugadores no la hace. En 60 partidas de 5×5 sin castigo, la
difícil le gana a la normal ~80% de las veces; con castigo juegan igual.

**En la mesa:** se toca una raya para escogerla y se vuelve a tocar (o «Trazar») para trazarla, para que un dedazo
no cueste un castigo.

**Pendiente posible:** la doble jugada en ciclos (dejar cuatro cajas) y contar cadenas para decidir cuándo conviene.
