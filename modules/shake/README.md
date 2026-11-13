# shake

Agitar el aparato para hacer algo (en Yatzi, tirar los dados). No sabe nada de ningún juego.

| Función (`index.js`, puro) | Qué hace |
|---|---|
| `DEFAULTS` | Umbral (11 m/s² sin gravedad), sacudidas para empezar (3 en 450 ms), silencio para terminar (320 ms), duración mínima para que cuente (350 ms). |
| `createShakeDetector(opts?)` | `feed({ x, y, z, t })` con cada lectura (con gravedad, en m/s², `t` en ms). Devuelve `null` o un evento: `{ type: "start" }`, `{ type: "shake", power }` mientras sigue, y `{ type: "end", throw, ms, power }` al parar. `throw` dice si duró lo suficiente; `power` (0–1) es la fuerza promedio. `reset()`, `shaking`. |

| Interfaz (`ui.js`) | Qué hace |
|---|---|
| `shakeSupported()` | El navegador conoce `DeviceMotionEvent`. |
| `needsPermission()` | Hay que pedir permiso con un toque (iPhone/iPad, iOS 13+). |
| `requestShake()` | Pide el permiso; llamarlo dentro de un toque. `Promise<boolean>`. |
| `listenShake(onEvent, opts?)` | Escucha `devicemotion` y pasa los eventos del detector. `{ stop(), reset(), alive }`; `alive` dice si ya llegó alguna lectura (en una computadora el evento existe pero no llega). |

**Cosas del navegador:** solo con https (GitHub Pages ya lo es; `localhost` también cuenta). En iPhone el permiso se
pide una vez por sitio, siempre desde un toque; si se niega, hay que borrar los datos del sitio en Ajustes para que se
vuelva a preguntar. El juego decide si recuerda que la persona lo activó (por ejemplo en `ctx.prefs`).

**Lo usa:** Yatzi (agitar para tirar, con los dados sonando mientras agitas).
