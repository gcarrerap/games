# Cucharas

Juego de reflejos y atención para 2 a 10 jugadores, **sin turnos**: cada quien arma un póker cambiando cartas con la
mesa, y el que se queda sin cuchara pierde ficha. Inspirado en el clásico *Spoons*, con mesa central de espacios en
lugar de pasarse cartas en rueda. Es un juego en tiempo real (`realtime: true`, ver `docs/ARCHITECTURE.md` §4).

## Reglas

- **Cartas:** pókers de sobra según cuántos juegan: 1 con 2–4, 2 con 5–8, 3 con 9–10. Cada quien recibe 4 (nadie empieza con póker). Hasta 10 jugadores porque 10 + 3 = 13, todos los números de la baraja.
- **Mesa:** las cartas de sobra, una por espacio. No hay huecos.
- **Cartas de la mesa** (opción al crear la mesa): *Abiertas* (boca arriba, escoges cuál tomar) o *Tapadas* (boca abajo, tomas a ciegas).
- **Cambiar:** tocas una carta tuya y luego la carta de la mesa que quieres; se intercambian en su lugar (la nueva queda donde estaba la tuya). Ni tu mano ni la mesa se reordenan. **No hay límite de tiempo.**
- **Cucharas:** `jugadores − 1`, cada una en su lugar alrededor de la mesa. Cambian de lugar cada ronda y están repartidas por toda la orilla (el borde se parte en tramos, una por tramo), así que hay que buscar dónde queda alguna. Con póker tomas una; después de la primera, cualquiera puede tomar aunque no tenga póker. Al tomarla tu mano se congela. **Nadie anuncia nada**: solo queda su lugar vacío.
- **Fichas:** cada quien empieza con 3. El que se queda sin cuchara pierde una. El primero en tomar cuchara gana una si tenía póker (sin pasar de 3) y pierde una si no. Con 0 quedas fuera; la siguiente ronda se reparte con los que quedan. Gana el último con fichas.
- **Caso raro:** con dos jugadores, si el primero tomó sin póker y el otro se queda sin cuchara, los dos perderían la última ficha; en ese caso siguen los dos con 1.

```
games/cucharas/
├── manifest.js   # id, nombre, 2–10 jugadores, realtime, opción de cartas abiertas o tapadas
├── index.js      # conforme al contrato; sin reloj
├── engine/       # reglas (puro): reparto, cambio en su lugar, lugares de las cucharas, fichas, la vista
├── ai/           # la compu: distraída, normal y atenta (qué tan rápido nota que faltan cucharas)
├── ui/           # la mesa: jugadores, cartas, anillo de cucharas en la orilla, tu mano; rules.js
└── styles/
```

## Decisiones de diseño

- **Que no se note cuándo tomar cuchara:** las cucharas están repartidas por la orilla, lejos de donde está la acción (la mesa y tu mano). No hay sonido ni aviso al tomar una, y en la lista de jugadores no aparece quién la tiene.
- **La vista no dice quién tomó cuchara** ni si el primero tenía póker: eso solo se revela al terminar la ronda, con las manos de todos.
- **Tope de 3 fichas:** sin él, ganar y perder fichas se compensa y la partida casi nunca termina (con 8 compus, más de 100 rondas).
- **La compu nunca blufea:** solo toma la primera cuchara con póker.
- **Mesa tapada es mucho más lenta:** en simulaciones con la compu, una ronda con la mesa abierta se resuelve en menos de 2 cambios por jugador; tapada, en cientos o miles, porque tomar a ciegas casi nunca trae la carta que buscas.

## Pendiente

- **Amague** (hacer como que tomas cuchara): se dejó fuera para mantenerlo simple.
- **En línea:** como Memoria Veloz, cada toque es una escritura en Firestore sobre la misma mesa (ver su README).
- **Arte:** cartas de `modules/cards` y cucharas con emoji; se pueden cambiar por imágenes de Petra sin tocar las reglas.
