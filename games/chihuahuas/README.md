# Carrera de Chihuahuas

Juego de apuestas en una carrera de perros, estilo Camel Up, para 2 a 8 jugadores. Nadie tiene perro: cada quien
apuesta croquetas 🍪 a los chihuahuas. Las reglas completas están en el botón **Reglas** de la mesa (`ui/rules.js`).

- **Perros:** Chia (rojo), Oreo (azul), Gustavo (amarillo) y Catrina (morada) son los perros de la familia (fotos de
  referencia en [`docs/disenos/chihuahuas/referencia/`](../../docs/disenos/chihuahuas/referencia/)); Chocolate
  (verde) es inventado. Gustavo y Catrina reemplazaron a Nacho y Frijol (#41, #42).
- **Jugadas:** sacudir el tazón (un perro corre 1–3 y ganas 1 🍪), boleto de etapa (5, 3, 2), tapete de hueso (+1) o
  aspiradora (−1), y apuesta secreta al ganador o al último.
- **La compu** (`ai/`): recorre todas las formas en que pueden salir los dados que quedan en la etapa para saber
  quién acaba primero y segundo, y simula carreras completas para las apuestas finales. Tres estilos: prudente,
  normal y atrevido. El mismo cálculo da el **consejo** ("¿Qué me conviene?").
- **Mesa** (`ui/`): la pista es un cuadro de 5 × 5 con las 16 casillas alrededor y el tazón en el pasto del centro.
- **La tele como tablero** (#35, `tv: true`): la tele muestra la pista grande, los jugadores (croquetas, boletos,
  tapete y cuántas apuestas secretas), el tazón y lo que acaba de pasar, sin botones; caben 8 jugadores en 16:9 y en
  pantallas cuadradas. Cada teléfono queda con lo suyo: sus botones, boletos, tapete, apuestas y croquetas; la casilla
  del tapete se escoge con una tira de números. La tele usa las imágenes en alta (`@tv`) y la portada de fondo en la
  espera (`tvCover`); el teléfono nunca las baja.
- **Portada al empezar** (#56, `ui/cover.js`): al empezar una partida nueva (práctica, en línea y revancha) la
  portada de Petra se ve a pantalla completa unos 3 s (`COVER_MS` en `timing.js`), con entrada y salida suaves, y
  luego el tablero con la salida de los perros. Un toque la quita (y arranca la música). En la tele usa `portada@tv`;
  en el teléfono y la mesa de siempre, `portada`. Al reabrir una mesa a medias no aparece, y si la imagen falta o
  tarda más de 1 s en cargar se va directo al tablero. El primer turno cuenta ese tiempo (`turnMs` y la espera de la
  compu), para que nadie pierda reloj ni la compu juegue con la portada encima. La portada también sale arriba de las
  **Reglas** y de fondo en la espera de la tele (`tvCover`).
- **Imágenes** (`assets/`): banco de imágenes como en Panal y Skull, con las ilustraciones de Petra (#33; elección en
  [`docs/disenos/chihuahuas/`](../../docs/disenos/chihuahuas/)). Si falta una, la mesa usa un respaldo con colores y
  emoji (`ui/art.js`).
- **Música de fondo** (`music/`, #53): un pool de canciones `.mp3` que toca `modules/music` en orden barajado, con botón
  🔊/🔇 en la barra y volumen en el menú (en la tele, los dos en la barra). Silencio y volumen se recuerdan en el
  aparato. Empieza con el primer toque en la mesa (los navegadores no dejan sonar antes). Con la tele como tablero,
  suena solo la tele. **Para agregar una canción:** pasarla a 128 kbps
  (`ffmpeg -i original.mp3 -c:a libmp3lame -b:a 128k -ar 44100 -map_metadata 0 nueva.mp3`; unos 2.5 MB por cada 2½
  minutos, el límite es 3.5 MB), soltarla en `music/` y añadir su línea en `music/index.js`.
- **Efectos** (`sfx/`, #69): cada jugada y cada aviso tiene su clip, con `modules/sfx`. El botón 🔔/🔕 y el volumen
  van junto a los de la música (en la barra el botón, en el menú el deslizador; en la tele, los dos en la barra) y se
  recuerdan aparte, en la llave `"sfx"`. Callar la música no calla los efectos, ni al revés. Suenan con el primer
  toque. **Con la tele como tablero no se oye doble:** la tele suena lo de la partida (tirada, ladridos, pasitos,
  tapetes, pagos, meta, fin, turno de la compu, alguien que se sienta o se levanta, y la fiesta) y el teléfono solo
  lo suyo: el clic de sus botones, un error de su jugada, y «te toca» cuando le llega el turno. Quien mira sin asiento
  una mesa con tele tampoco suena lo público. Sin tele, el mismo aparato suena todo. No suena al abrir, al reconectar
  ni al redibujar: solo cuando pasa algo nuevo. **Para regenerar un clip** (no hace falta para jugar):
  `ELEVENLABS_API_KEY=… node games/chihuahuas/sfx/generate.mjs` genera los que falten;
  `node games/chihuahuas/sfx/generate.mjs pasitos` regenera esa llave. La llave de la API no va al repo ni al sitio.
- **Fiesta** (`sfx/celebrate.js`, `ui/party.js`, #71): cuando un perro llega a la meta y se acaba la carrera, ya
  vista la tirada, sale **solo el ganador** festejando (su `festejo-*.webp` con su sombra y sus sonidos), confeti de
  papel picado y su nombre. Al cerrar una etapa no hay fiesta. La hoja final no se abre mientras dura: cuando la
  fiesta termina o se salta, se revelan una por una las últimas apuestas y el resultado, con sus sonidos. La pieza `celebracion-musica` va por el **canal de la música** (si está en silencio,
  no suena, y mientras suena la de fondo baja). Los ladridos, el confeti y el letrero van por el **canal de efectos**.
  El teléfono de una mesa con tele muestra confeti chico y el nombre, sin audio. Se salta con un toque, con Saltar o
  con una tecla, y saltarla lleva directo a la hoja final. El mapeo de cada perro a su sonido está solo en
  `sfx/celebrate.js` (`DOG_SOUNDS`), para poder cambiarlo cuando Petra mande sus clips.

  **Origen y licencia de las canciones, los efectos y la fuente:**

  | Canción | Archivo | Origen | Uso |
  |---|---|---|---|
  | *Marimba Jaroche* | `music/marimba-jaroche.mp3` | Hecha por Guillermo con la versión **gratuita** de [Suno](https://suno.com) (18 oct 2026) | ⚠️ Puede tener restricciones de uso comercial: las canciones del plan gratuito de Suno son, en general, solo para uso no comercial. Está bien para este sitio familiar sin fines de lucro; antes de cualquier uso comercial (vender el juego, anuncios, publicarla aparte) hay que revisar los términos de Suno o reemplazarla. |
  | Efectos de la carrera (35 clips, incluida la pieza de festejo) | `sfx/*.mp3` | Generados con la API de efectos de [ElevenLabs](https://elevenlabs.io) (`POST /v1/sound-generation`, mp3 a 64 kbps, plan **gratuito**, 19 oct 2026). Los prompts están en `sfx/prompts.json`. La pieza `celebracion-musica` (7 s) se toca por el canal de la música; el resto, por el de efectos. `aullido-festejo` y `brinco` están en el catálogo y hoy no se usan (ver `PARKED_CLIPS` en `sfx/celebrate.js`). | ⚠️ El plan gratuito de ElevenLabs permite **solo uso no comercial** y pide **atribución a ElevenLabs**. Está bien para este sitio familiar sin fines de lucro. Antes de cualquier uso comercial hay que pasar a un plan que lo permita o reemplazarlos. Atribución: efectos generados con ElevenLabs. |
  | *Lilita One* | `fonts/LilitaOne-Regular.woff2` | Juan Montoreano, 2011. Nombre reservado «Lilita». Licencia completa en `fonts/OFL.txt`. | [SIL Open Font License 1.1](https://scripts.sil.org/OFL). Se puede usar, estudiar y redistribuir con el programa; no se vende sola ni se le cambia el nombre reservado. El service worker la guarda porque vive en este sitio. Si no carga, el nombre del ganador usa Alfa Slab One. |

  Al agregar una canción o un efecto, anotar aquí de dónde salió y con qué licencia.

| Archivo | Qué hace |
|---|---|
| `engine/index.js` | Reglas puras: salida, apilar y cargar, tapetes, boletos, fin de etapa, apuestas finales, vista |
| `ai/index.js` | La compu y el consejo (probabilidades exactas de la etapa y carreras simuladas) |
| `ui/table.js` | La mesa: completa, la tele (`ctx.display === "tv"`) y el teléfono de una mesa con tele (`"phone"`) |
| `ui/art.js` | Imágenes del banco o su respaldo; lista de llaves (`KEYS`); en la tele, las versiones `@tv` |
| `ui/text.js` | Lo que dice la burbuja después de cada jugada |
| `music/` | Las canciones de fondo y su lista (`music/index.js`) |
| `sfx/` | Los efectos (`prompts.json`, los `.mp3`, `generate.mjs`) y qué llave suena en cada evento (`cues.js`) |
| `assets/` | Banco de imágenes (ver su README) |
