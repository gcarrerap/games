# Notas para Claude

Sitio de juegos familiares: una plataforma compartida (`platform/`) y un módulo por juego (`games/<id>/`). Lee `docs/ARCHITECTURE.md` antes de cambiar la estructura.

- Módulos ES nativos, sin bundler ni dependencias en tiempo de ejecución. No agregues un paso de compilación.
- Respeta las reglas de dependencia de docs/ARCHITECTURE.md §2: `platform/` nunca importa código interno de un juego; un juego nunca importa a otro; la UI nunca toca `services/`.
- `engine/` y `ai/` son puros: sin DOM, sin `Date.now()`, sin `Math.random()` (usa `ctx.now`, `ctx.rnd`).
- Estado y acciones de los juegos son JSON simple.
- Pruebas: `npm test` (node:test). Cada cambio de reglas lleva su prueba.
- Documentación y comentarios en español; nombres de código en inglés.
- Fuente de dominó para migrar: https://github.com/gcarrerap/myDomino
