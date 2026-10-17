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
  siempre), con castigo sin límite (`free`) o no se compra (`none`). Es por turnos, en el orden de la mesa: primero
  decide quien tiene el turno (toma el descarte o roba del mazo); si roba del mazo, se le pregunta al siguiente, y si
  no lo quiere, al siguiente, y así. El primero que diga que sí se lo lleva con una carta del mazo de castigo. No se le
  pregunta a quien lo descartó, a quien ya se bajó ni a quien llegó al límite.
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

**Comprar y el contrato:** mientras se ofrece el descarte la ronda está en la fase `"offer"` y `currentSeats` es el
asiento al que se le pregunta: la compu contesta `buy` o `pass`, la persona ve "¿Compras…?" con Comprar / No lo
quiero, y quien tiene el turno espera. Con reloj, cada quien tiene 20 s para decidir; si se le acaba, no compra.

**Vista:** se ocultan como `"?"` las manos ajenas, el mazo, lo que otros robaron del mazo y la carta de castigo de una
compra ajena. La compu decide con esa vista; `tests/games/continental/ai.test.js` comprueba en los tres niveles que
decide lo mismo que con el estado completo.

**La compu:** Fácil (casi siempre roba del mazo, no compra y descarta con dudas), Normal (toma y compra lo que le arma
juegos) y Difícil (mide cuántas cartas le faltan para el contrato para decidir qué tomar, comprar y tirar, y no tira
lo que el siguiente acaba de tomar). En partidas con semilla, Normal le gana a Fácil ~85% de las veces y Difícil a
Normal ~70%.

Usa los módulos `cards` (la baraja y su dibujo), `choice` (las dudas de la compu fácil) y `random`.
