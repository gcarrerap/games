# cards

Baraja francesa para cualquier juego de cartas: notación, varias barajas con jokers, revolver con el azar del juego,
sacar cartas de una lista y dibujarlas. Lo que vale cada carta, qué es comodín y cómo se ordena lo decide cada juego.

**Notación:** cada carta es un texto de 3 caracteres, número + palo + baraja: `"KH3"` (rey de corazones de la baraja 3),
`"TS0"` (10 de espadas), `"XR2"` (joker rojo de la baraja 2). Números `A 2 … 9 T J Q K` y `X` para el joker; palos
`S H D C` (los jokers usan `R` o `B`). Así cada carta es única aunque se juegue con varias barajas, y el estado sigue
siendo JSON simple.

| Función (`index.js`, puro) | Qué hace |
|---|---|
| `RANKS`, `SUITS` | Los números y palos. |
| `rankOf(c)`, `suitOf(c)`, `deckOf(c)`, `isJoker(c)`, `isRed(c)` | Partes y color de una carta. |
| `rankName(r)`, `SUIT_SYMBOL`, `cardName(c)`, `cardWords(c)` | `"10♠"`, `"Joker"`; `"As de corazones"` para lectores de pantalla. |
| `fullDeck(decks, { jokers = 2 })` | `decks` barajas de 52 con sus jokers. |
| `shuffle(cards, rnd)` | Copia revuelta con el azar que se le pase (`ctx.rnd`). |
| `removeCards(list, cards, msg?)` | Quita cartas por id; truena con `msg` si alguna no está. |

| Interfaz (`ui.js`) | Qué hace |
|---|---|
| `cardSVG(c, w, h)`, `backSVG(w, h)` | La cara y el reverso en SVG. |
| `cardChip(c)` | La carta chica en texto, con su color. |
| `CARD_STYLES` | La hoja de estilos (colores de cara, reverso y palos; `.cchip`). El juego la agrega a su `loadStyles`. |

**Lo usan:** La Pata y el Continental.
