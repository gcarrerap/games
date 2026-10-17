# Continental

El Continental (versión mexicana de la familia) para 2 a 6 jugadores: 7 rondas con contrato y gana quien junte menos
puntos.

| Ronda | Contrato | Cartas |
|---|---|---|
| 1 | 2 tercias | 6 |
| 2 | 1 tercia y 1 escalera | 7 |
| 3 | 2 escaleras | 8 |
| 4 | 3 tercias | 9 |
| 5 | 2 tercias y 1 escalera | 10 |
| 6 | 1 tercia y 2 escaleras | 11 |
| 7 | 3 escaleras | 12 |

- **Tercia:** 3 o más del mismo número. **Escalera:** 4 o más seguidas del mismo palo; el As va abajo o arriba, sin dar
  la vuelta (K-A-2 no).
- **Comodines:** jokers y doses. En cada juego no puede haber más comodines que cartas naturales.
- **Turno:** robar del mazo o tomar el descarte; bajarse con el contrato, todo junto; ya bajado, acomodar cartas en
  cualquier juego y cambiar un comodín por la carta natural de su lugar; descartar. Quien se queda sin cartas cierra
  (puede cerrar acomodando, sin descartar).
- **Comprar** (regla que se escoge al crear la mesa: `config.buy`): con castigo hasta 3 por ronda (`limit`, la de
  siempre), con castigo sin límite (`free`) o no se compra (`none`). Mientras quien sigue no ha robado, los demás
  pueden pedir el descarte; si él lo toma, nadie lo compra; si roba del mazo, se lo lleva el primero que lo pidió en el
  orden de la mesa, con una carta del mazo de castigo. Quien ya se bajó no compra.
- **Puntos de lo que queda en la mano:** joker 50, 2 y As 20, 10 y figuras 10, las demás su número.
- 2 barajas con jokers (108 cartas) hasta con 4 jugadores; 3 barajas (162) con 5 o 6.

```
games/continental/
├── manifest.js   # id, nombre, jugadores, modos (2 a 6) y la opción de compra
├── index.js      # conforme al contrato: setup, legalActions, apply, view, la compu, el reloj
├── engine/       # reglas (puro): cartas, contratos, tercias y escaleras, jugadas, compras, puntos, reloj
├── ai/           # la compu (3 niveles) y el consejo (puro)
├── ui/           # la mesa: jugadores, juegos bajados, mazo y pozo, tu bajada, tu mano, resultado, consejo
└── styles/       # el paño (las cartas vienen de modules/cards)
```

**Comprar fuera de turno y el contrato:** mientras quien sigue no ha robado, `currentSeats` regresa
`[quien tiene el turno, ...quienes pueden comprar]`. Así la plataforma le pregunta a la compu de esos asientos (`buy` o
`pass`) y la persona ve el botón de comprar. Cuando alguien más podría comprar, la compu en turno espera un poco más
antes de robar para que las personas alcancen a pedirlo. El reloj siempre es de quien tiene el turno.

**Vista:** se ocultan como `"?"` las manos ajenas, el mazo, lo que otros robaron del mazo y la carta de castigo de una
compra ajena. La compu decide con esa vista; `tests/games/continental/ai.test.js` comprueba en los tres niveles que
decide lo mismo que con el estado completo.

**La compu:** Fácil (casi siempre roba del mazo, no compra y descarta con dudas), Normal (toma y compra lo que le arma
juegos) y Difícil (mide cuántas cartas le faltan para el contrato para decidir qué tomar, comprar y tirar, y no tira
lo que el siguiente acaba de tomar). En partidas con semilla, Normal le gana a Fácil ~85% de las veces y Difícil a
Normal ~70%.

Usa los módulos `cards` (la baraja y su dibujo), `choice` (las dudas de la compu fácil) y `random`.
