# Agregar un juego

1. **Carpeta.** Crea `games/<id>/` (id en minúsculas, sin espacios) con esta forma:

   ```
   games/<id>/
   ├── manifest.js   # export default { id, name, players: {min, max}, modes }
   ├── index.js      # export default { ...manifest, setup, legalActions, apply, view, … }
   ├── engine/       # reglas puras: estado entra, estado sale
   ├── ai/           # la compu (opcional), solo con view(state, seat)
   ├── ui/           # index.js exporta { mount(el, ctx), unmount() }
   └── styles/
   ```

2. **Reglas primero.** Escribe `engine/` y sus pruebas en `tests/games/<id>/`. Nada de DOM, `Date.now()` ni `Math.random()`: usa `ctx.now` y `ctx.rnd`.

3. **Contrato.** En `index.js` adapta el motor a las funciones del contrato (ver `platform/core/contract.js` y docs/ARCHITECTURE.md §3). Estado y acciones son JSON simple.

4. **Privacidad.** `view(state, seat)` debe ocultar todo lo que ese asiento no puede saber. La interfaz y la compu solo reciben la vista.

5. **Registro.** Agrega el juego a `games/registry.js`:

   ```js
   import pata from "./pata/manifest.js";
   export const GAMES = [ …, { ...pata, load: () => import("./pata/index.js") } ];
   ```

6. **Pruebas.** `npm test` corre la prueba del contrato sobre todos los juegos registrados.

7. **Mesa.** Escribe `ui/` usando los componentes de `platform/ui/` (ventanas, resultado, reloj) y los colores de `platform/styles/tokens.css`. La mesa solo llama a `ctx.act(action)`.

Lo que **no** hace falta escribir: entrar, lobby, mesas en línea, asientos, la compu en mesas en línea, reloj, limpieza, actualizaciones. Todo eso lo pone la plataforma.
