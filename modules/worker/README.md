# worker

Correr funciones pesadas en un hilo aparte (Web Worker) para que la pantalla no se congele, con plan B automático: si el navegador no puede crear el worker o el worker falla, se calcula en el hilo principal. Ningún pedido se queda esperando.

```js
// archivo del worker
import { createHost, serve } from "../../modules/worker/index.js";
export const FNS = { pensar: (x) => /* … */ x };
serve(createHost(FNS));

// en la página
import { createClient } from "../../modules/worker/index.js";
import { FNS } from "./mi-worker.js";
const hilo = createClient({ url: new URL("./mi-worker.js", import.meta.url), local: FNS });
const r = await hilo.call("pensar", 42);
```

| Función | Qué hace |
|---|---|
| `createHost(fns)` | Atiende `{ id, fn, args }` y devuelve `{ id, result }` o `{ id, error }`. Las funciones pueden ser `async`. |
| `serve(handle)` | Conecta `handle` a los mensajes, solo si corre dentro de un worker (en la página o en Node no hace nada; así el mismo archivo sirve de plan B). |
| `createClient({ url, local, WorkerImpl, onFallback })` | `call(fn, ...args)` → promesa. Pasa al plan B una vez y para siempre si el worker falla; lo que estaba pendiente se calcula aquí. |

Argumentos y resultados viajan entre hilos: deben ser datos simples (JSON). Por eso la compu recibe una **semilla** y no una función `rnd`.

**Lo usa:** la plataforma (`platform/app/ai-worker.js`): un solo worker para la compu de todos los juegos.
