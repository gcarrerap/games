# Club de Monstruos · La fila secreta

Juego de deducción para una persona, estilo Mastermind. Descubre la fila de Pipo, Lola, Taco, Momo, Bibi y Nubo mediante pistas agregadas. Se abre desde el portal, con práctica local o una mesa de un asiento y espectadores usando la plataforma existente.

| Nivel | Lugares | Repeticiones | Intentos |
|---|---:|---|---:|
| Junior | 3 | No | 8 |
| Detective | 4 | No | 10 |
| Experto | 4 | Sí | 10 |

No hay reloj. Una pista ✓ cuenta personajes en su lugar; ↔ cuenta personajes correctos en otro lugar, después de descontar los exactos. Cada aparición cuenta una sola vez. Las pistas no corresponden a posiciones concretas. Ganar en el último intento es válido. Una fila idéntica a otra ya probada se rechaza sin gastar intento.

## Interacción

Selecciona un lugar y después un personaje. Se avanza automáticamente al primer hueco. En niveles sin repetidos, elegir un personaje ya colocado intercambia sus lugares. Borrar vacía el lugar activo. Cada fila del historial tiene un botón para copiarla y editarla. El bloc de sospechosos es una nota local, sin efecto en las reglas ni en el consejo.

Teclado: 1–6 elige personaje; flechas cambian de lugar; Supr/Backspace borra; Enter desde un lugar prueba la fila. Los botones también funcionan con Tab, Enter y Espacio. Hay nombres accesibles, pistas con símbolos y texto, y respeto por `prefers-reduced-motion`.

Pista usa exclusivamente la vista pública, filtra códigos compatibles y propone una prueba que minimiza el grupo de respuestas más grande entre una muestra determinista. La sugerencia no es necesariamente la solución. La compu usa el mismo razonamiento. El motor es puro, el azar entra por `ctx.rnd`, y la plataforma aplica las acciones mediante `modules/recording`.

`view` oculta el secreto hasta terminar (también al Monitor). Como en los demás juegos del sitio, el estado completo existe en el cliente y en Firestore: no es un sistema resistente a inspección con herramientas de desarrollo.

## Arte y animación

`assets/characters.webp`: atlas transparente de 3 columnas × 2 filas, generado a partir del diseño aprobado por Guillermo. Orden: Pipo, Lola, Taco / Momo, Bibi, Nubo. Las celdas se muestran sin recortar el archivo mediante `background-position`; movimiento CSS de reposo, selección y revelación. El atlas completo se carga una sola vez y pesa aproximadamente 267 KiB. No se carga desde el portal.

## Audio

Diez efectos MP3 cortos y una melodía original de marimba/pizzicato, incluidos en el repositorio. Se reproducen con `modules/sfx` y `modules/music`; comienzan tras una interacción y tienen silencio/volumen independientes que se recuerdan por juego. Los reproductores se destruyen al salir. No se envían datos ni se necesitan claves API para jugar.

Los sonidos se regeneran con `python3 games/monstruos/scripts/generate_audio.py` (requiere ffmpeg). No es un paso de compilación del sitio.

Fish Audio **no se ejecutó**: el conector disponible no expone `workflow_dispatch`, el CLI no tiene autenticación y el navegador no tiene sesión iniciada. `audio/fish-lines.json` prepara tres frases con el modelo de voz público Zib de la lista existente en `api-access`. No son clips ya generados ni se solicitan desde la interfaz. Se pueden generar con `FishBatchTextToSpeech` y luego integrar explícitamente; no se incluyeron credenciales.

## Pruebas

- `npm test`: contrato, arquitectura, repeticiones, validación de acciones, privacidad de vistas, reproducción y deducción.
- `python3 tests/browser/monstruos.py`: servidor local propio, navegador real, teclado, cambio de lugares, copia de filas, consejos hasta victoria, revancha, rendición, experto, audio y tamaños 320/390/768/1280.
- `CHROMIUM_PATH=/ruta/chromium` selecciona un navegador instalado; `MONSTRUOS_SHOTS=/ruta` guarda capturas.
- La prueba general del sitio sigue en `tests/browser/smoke.py`.
