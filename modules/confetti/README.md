# confetti

Papelitos de colores en un `<canvas>`: `createConfetti(canvas)` da `burst(x, y, n?, spread?)` (estallido desde un punto,
en fracciones de la pantalla), `rain(n?)` (lluvia desde arriba), `resize()` y `destroy()`. Solo dibuja; el juego pone
el canvas (fijo, encima de todo, `pointer-events: none`) y decide cuándo.

No tiene `index.js`: no hay nada puro que probar, todo es dibujo.

**Lo usan:** Yatzi y Piojos.
