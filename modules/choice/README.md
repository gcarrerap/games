# choice

Escoger una opción a partir de puntajes, con un poco de duda humana: la mejor se escoge siempre que sea claramente mejor; cuando varias están cerca, se sortea entre ellas con preferencia por la mejor. Sirve para cualquier compu que califique sus jugadas.

| Función | Qué hace |
|---|---|
| `bestIndex(scores)` | Índice del puntaje más alto (el primero si hay empate). |
| `choiceProbs(scores, azar)` | Probabilidad de escoger cada opción. `azar = { ventana, temperatura, escala }` o `null` (siempre la mejor). Solo entran opciones a `ventana × escala` o menos de la mejor; entre ellas, softmax con `temperatura`. |
| `chooseIndex(scores, azar, rnd)` | Escoge un índice según `choiceProbs`. |
| `SCORE_SCALE` | Escala por defecto si `azar.escala` no viene. |

`escala` es la diferencia típica entre la mejor y la segunda opción para ese jugador (en dominó se mide con torneos), para que "cerca" signifique lo mismo aunque cada perfil puntúe en tamaños distintos.

**Lo usan:** dominó (todos los perfiles de la compu).
