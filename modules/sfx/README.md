# sfx

Efectos de sonido cortos para cualquier juego: cada llave es un archivo, pueden sonar varios a la vez, y el silencio
y el volumen se recuerdan en el aparato con su propia llave (`"sfx"`), sin tocar la de la música (`"music"`).

| Función (`index.js`, puro) | Qué hace |
|---|---|
| `DEFAULTS`, `PREF_KEY` | Efectos encendidos y volumen 0.6; se guarda bajo la llave `"sfx"`. |
| `DEFAULT_GAP_MS` | Mínimo entre dos veces del mismo efecto (120 ms) si el juego no dice otra cosa. |
| `clampVolume(v)` | Volumen entre 0 y 1. |
| `readSettings(store, key?)`, `saveSettings(store, { muted, volume }, key?)` | Lee y guarda en un almacenamiento con `getJSON`/`setJSON` (como `ctx.prefs`). |
| `clipOf(catalog, key)` | La url de esa llave, o `null` si no está. |
| `canRepeat(lastAt, now, gapMs?)` | Si ya pasó el mínimo desde la última vez. |
| `createGate(gapFor?)` | `allow(key, now)` deja sonar o no, y apunta la hora. `gapFor(key)` puede dar un mínimo distinto por llave. |

| Interfaz (`ui.js`) | Qué hace |
|---|---|
| `createSfx({ clips, prefs, gapFor? })` | El reproductor con Web Audio: precarga los buffers después del primer toque, mezcla varios a la vez. `play(key, at?)`, `playAll(cues)`, `cancel()`, `unlock()`, `toggle()`, `setMuted(on)`, `setVolume(v)`, `destroy()`; `muted`, `volume`, `unlocked`, `audible`, `hasClips`. `at` es el retraso en milisegundos. |
| `armOnGesture(target, sfx)` | Espera el primer toque o tecla para desbloquear el audio. Los toques en los controles de efectos no cuentan. Devuelve cómo dejar de esperar. |
| `sfxButton(s)`, `sfxControls(s)` | El botón 🔔/🔕 y el deslizador de volumen (0–100) con su botón. Vacíos si no hay efectos. |
| `wireSfx(root, s, { setDragging? })` | Conecta los controles dibujados dentro de `root`. Con `ctx.setDragging`, la mesa no se redibuja mientras el dedo mueve el deslizador. |
| `SFX_STYLES` | La hoja de estilos de los controles. El juego la agrega a su `loadStyles`. |

**Cosas del navegador:**

- Si el navegador rechaza el audio, o falta un archivo, no hay error: ese efecto no suena.
- En iPhone el volumen por código no siempre se respeta. El silencio sí: no arranca sonidos y corta los que estén
  sonando, en vez de bajar la ganancia a 0. Volumen 0 tampoco arranca nada.
- El mismo efecto no se repite más rápido que su mínimo (`createGate`), para que los pasitos no se amontonen.
- Los efectos se piden enteros (`fetch`) y el service worker los guarda: son chicos y la práctica funciona sin
  conexión. La música no: el `<audio>` la pide por pedazos y una respuesta parcial no se puede guardar.

**Uso:** crear el reproductor al montar la mesa con el catálogo del juego (`{ llave: url }`) y `ctx.prefs`,
`armOnGesture(document, sfx)`, poner `sfxButton`/`sfxControls` junto a los de la música, `wireSfx` después de dibujar
y `destroy()` al desmontar. Qué llave suena en cada jugada lo decide el juego, y solo cuando pasa algo nuevo (no al
redibujar). Con la tele como tablero, el juego elige en qué aparato suena cada cosa para que no se oiga doble.

**Lo usa:** la Carrera de Chihuahuas.
