# Cucharas

Juego de reflejos y atención para 3 a 8 jugadores, **sin turnos**: cada quien arma un póker cambiando cartas con la
mesa, y el que se queda sin cuchara pierde ficha. Inspirado en el clásico *Spoons*, con mesa central de espacios en
lugar de pasarse cartas en rueda. Es un juego en tiempo real (`realtime: true`, ver `docs/ARCHITECTURE.md` §4).

## Reglas

- **Cartas:** se juega con `jugadores + 1` pókers (las cuatro cartas de cada número): uno de sobra. Cada quien recibe 4; nadie empieza con póker.
- **Mesa:** `max(6, jugadores + 2)` espacios, boca arriba. Siempre hay 4 cartas en la mesa, así que quedan `espacios − 4` huecos (2 con 3–4 jugadores, 4 con 6, 6 con 8).
- **Cambiar:** primero sueltas una carta en un espacio vacío (te quedas con 3) y luego tomas una de otro espacio. Nunca más de 4, y no puedes tomar la que acabas de soltar (otro sí).
- **Ritmo** (opción de la mesa): *Normal* — si no cambias en 6 s, o no tomas en 3 s después de soltar, la mesa cambia por ti (suelta tu carta más sola y toma una al azar). *Rápido* — 4 s y 2 s. *Tranquilo* — sin límite. Con póker nadie cambia por ti.
- **Cucharas:** `jugadores − 1`, chicas y a un lado de la mesa. Con póker tomas una. Después de la primera, cualquiera puede tomar aunque no tenga póker. Al tomarla tu mano se congela. **Nadie anuncia nada**: las cucharas solo desaparecen.
- **Fichas:** cada quien empieza con 3. El que se queda sin cuchara pierde una. El primero en tomar cuchara gana una si tenía póker (sin pasar de 3) y pierde una si no. Con 0 quedas fuera; la siguiente ronda se reparte con los que quedan. Gana el último con fichas.
- **Caso raro:** con dos jugadores, si el primero tomó sin póker y el otro se queda sin cuchara, los dos perderían la última ficha; en ese caso siguen los dos con 1.

```
games/cucharas/
├── manifest.js   # id, nombre, 3–8 jugadores, realtime, opción de ritmo
├── index.js      # conforme al contrato; el "reloj" son los límites del ritmo (timing → tick)
├── engine/       # reglas (puro): reparto, soltar/tomar, cucharas, fichas, ritmo, la vista
├── ai/           # la compu: distraída, normal y atenta (qué tan rápido nota que faltan cucharas)
├── ui/           # la mesa: jugadores, espacios, cucharas a la orilla, tu mano; rules.js
└── styles/
```

## Decisiones de diseño

- **Que no se note cuándo tomar cuchara:** las cucharas están chicas y pálidas en la orilla, mientras la acción está en la mesa y en tu mano. No hay sonido ni aviso al tomar una, y en la lista de jugadores no aparece quién la tiene. El ritmo obliga a seguir cambiando.
- **La vista no dice quién tomó cuchara** ni si el primero tenía póker: eso solo se revela al terminar la ronda, con las manos de todos.
- **Tope de 3 fichas:** sin él, ganar y perder fichas se compensa y la partida casi nunca termina (con 8 compus, más de 100 rondas).
- **La compu nunca blufea:** solo toma la primera cuchara con póker.

## Pendiente

- **Amague** (hacer como que tomas cuchara): se dejó fuera para mantenerlo simple.
- **En línea:** como Memoria Veloz, cada toque es una escritura en Firestore sobre la misma mesa (ver su README).
- **Arte:** cartas de `modules/cards` y cucharas con emoji; se pueden cambiar por imágenes de Petra sin tocar las reglas.
