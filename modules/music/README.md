# music

Música de fondo para cualquier juego: una lista (pool) de canciones `.mp3` que suenan una tras otra en orden barajado,
sin repetir la misma dos veces seguidas, con botón de silencio y volumen que se recuerdan en el aparato.

| Función (`index.js`, puro) | Qué hace |
|---|---|
| `DEFAULTS`, `PREF_KEY` | Silencio apagado y volumen 0.4; se guarda bajo la llave `"music"`. |
| `clampVolume(v)` | Volumen entre 0 y 1. |
| `readSettings(store, key?)`, `saveSettings(store, { muted, volume }, key?)` | Lee y guarda en un almacenamiento con `getJSON`/`setJSON` (como `ctx.prefs`). |
| `shuffleOrder(n, rnd, avoidFirst?)` | Los índices revueltos, sin `avoidFirst` al principio. |
| `createPlaylist(songs, rnd)` | `next()` da la siguiente: toda la lista barajada; al acabar se vuelve a barajar sin empezar con la que acaba de sonar. Con una sola canción, la repite. |

| Interfaz (`ui.js`) | Qué hace |
|---|---|
| `createMusic({ songs, prefs, rnd?, fadeMs? })` | El reproductor: un solo `<audio>` con `preload="none"` (nada se baja hasta que suena), entrada y salida suaves (~1 s), pausa con la pestaña oculta. `start()`, `toggle()`, `setMuted(on)`, `setVolume(v)`, `destroy()`; `muted`, `volume`, `playing`, `audible`, `hasSongs`. `playCue(src, { ms?, duck? })` toca un clip corto con el mismo silencio y volumen, y mientras suena baja la música de fondo a esa fracción (`duck`, por omisión 0.22); al terminar vuelve. `stopCue()` lo corta y restaura. Si la música está en silencio o el volumen es 0, el clip no suena. |
| `armOnGesture(target, music)` | Espera el primer toque o tecla para arrancar (los navegadores no dejan sonar antes). Los toques en los controles de música no cuentan. Devuelve cómo dejar de esperar. |
| `musicButton(m)`, `musicControls(m)` | El botón 🔊/🔇 y el deslizador de volumen (0–100) con su botón. Vacíos si no hay canciones. |
| `wireMusic(root, m, { setDragging? })` | Conecta los controles dibujados dentro de `root`. Con `ctx.setDragging`, la mesa no se redibuja mientras el dedo mueve el deslizador. |
| `MUSIC_STYLES` | La hoja de estilos de los controles. El juego la agrega a su `loadStyles`. |

**Cosas del navegador:**

- Si el navegador rechaza el audio (no ha habido toque), no hay error: el botón queda en 🔇 y al tocarlo se intenta de nuevo.
- En iPhone el volumen por código no siempre se respeta. El silencio sí: pausa el audio en vez de bajarlo a 0. Bajar la
  música mientras suena un clip también es volumen: en iPhone puede no notarse, pero el silencio sí corta el clip.
- El clip corto usa otro `<audio>`, así que el service worker no lo guarda si el navegador lo pide por pedazos (igual
  que el resto de la música). El elemento se desbloquea en el primer arranque, para no depender de un toque nuevo.
- El service worker (`sw.js`) deja pasar la música sin guardarla: se pide por pedazos (`Range` → `206`) y una respuesta
  parcial no se puede guardar. Sin conexión no hay música. Los efectos cortos (`modules/sfx`) sí se guardan: se piden enteros.

**Uso** (la Carrera de Chihuahuas, `games/chihuahuas/ui/index.js`): crear el reproductor al montar la mesa con las
canciones del juego y `ctx.prefs`, `armOnGesture(document, music)`, poner `musicButton`/`musicControls` donde quepan,
`wireMusic` después de dibujar y `destroy()` al desmontar. Con la tele como tablero, solo la tele toca música.

**Lo usa:** la Carrera de Chihuahuas.
