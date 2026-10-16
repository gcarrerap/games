# Notas para Claude

Sitio de juegos familiares: una plataforma compartida (`platform/`), módulos reutilizables que los juegos escogen usar (`modules/<nombre>/`) y un módulo por juego (`games/<id>/`). Lee `docs/ARCHITECTURE.md` antes de cambiar la estructura.

- Si algo que escribes para un juego no sabe nada de ese juego, o un segundo juego lo necesita, va en `modules/` (criterio en ARCHITECTURE.md §3). Si solo *podría* servir, se queda en el juego y se anota en el inventario de §3.
- Un módulo se usa solo por `index.js` / `ui.js`, y no hace entrada/salida: recibe el almacenamiento como parámetro.
- `tests/architecture.test.js` hace cumplir las dependencias; no lo relajes para que pase un cambio. La lista `DEBT` solo puede bajar.

- Módulos ES nativos, sin bundler ni dependencias en tiempo de ejecución. No agregues un paso de compilación.
- Respeta las reglas de dependencia de docs/ARCHITECTURE.md §2: `platform/` nunca importa código interno de un juego; un juego nunca importa a otro; la UI nunca toca `services/`.
- `engine/` y `ai/` son puros: sin DOM, sin `Date.now()`, sin `Math.random()` (usa `ctx.now`, `ctx.rnd`).
- Estado y acciones de los juegos son JSON simple.
- Pruebas: `npm test` (node:test). Cada cambio de reglas lleva su prueba.
- Documentación y comentarios en español; nombres de código en inglés.
- Fuente de dominó para migrar: https://github.com/gcarrerap/myDomino
