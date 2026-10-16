# call

Llamadas de voz y video en una mesa en línea, para **cualquier** juego. De La Pata ([myPata](https://github.com/gcarrerap/myPata)): WebRTC todos con todos (con 2 a 6 jugadores no hace falta un servidor de medios), timbre, micrófono, cámara, altavoz o auricular (iPhone), tres vistas y **sin eco entre teléfonos juntos** (cada teléfono toca una melodía corta al entrar; si otro la oye en vivo, están en el mismo cuarto y dejan de reproducirse entre sí, sin apagar micrófonos).

| Archivo | Qué es |
|---|---|
| `index.js` | API pública (puro, sin red ni DOM). |
| `session.js` | La conexión: quién está, ofertas y respuestas, candidatos ICE, micrófono, cámara, colgar. |
| `controller.js` | El estado de la llamada de la mesa abierta: timbre, vista, salida de audio, teléfonos juntos, preferencias. |
| `near.js` | Detección de teléfonos juntos: la melodía de cada teléfono y cómo encontrarla en el audio que llega (puro). |
| `ui.js` | La barra de la llamada (fuera de `#app`, para que los `<video>` y `<audio>` no se recreen con cada jugada). |
| `ui/audio.js`, `ui/probe.js`, `ui/call.css` | Sonido (Web Audio, altavoz/auricular, quién habla), la prueba de cercanía y los estilos. |

**No hace entrada/salida por su cuenta.** Recibe:
- `signaling`: la señalización de la llamada de una mesa (`platform/services/call-signaling.js`, en Firestore: `juegos-llamadas/{mesa}`).
- `env`: `RTCPeerConnection`, `getUserMedia` y `iceServers()` (STUN, o TURN si `window.TURN_URL` está configurado).
- `prefs`: dónde recordar salida de audio, vista y controles colapsados.

**La usa:** la plataforma (`platform/app/session.js`): al abrir cualquier mesa en línea empieza a escuchar su llamada y al salir cuelga. En práctica no hay llamada.

**Pruebas:** `tests/modules/call/` (dos y tres teléfonos con un WebRTC de mentira, timbre, sonido, teléfonos juntos, y la plataforma abriendo y cerrando la llamada de cada mesa). Lo que no se puede probar aquí: micrófonos y bocinas de verdad, y redes reales.
