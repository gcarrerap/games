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
- **Imágenes** (`assets/`): banco de imágenes como en Panal y Skull, con las ilustraciones de Petra (#33; elección en
  [`docs/disenos/chihuahuas/`](../../docs/disenos/chihuahuas/)). Si falta una, la mesa usa un respaldo con colores y
  emoji (`ui/art.js`).
- **Música de fondo** (`music/`, #53): un pool de canciones `.mp3` que toca `modules/music` en orden barajado, con botón
  🔊/🔇 en la barra y volumen en el menú (en la tele, los dos en la barra). Silencio y volumen se recuerdan en el
  aparato. Empieza con el primer toque en la mesa (los navegadores no dejan sonar antes). Con la tele como tablero,
  suena solo la tele. **Para agregar una canción:** pasarla a 128 kbps
  (`ffmpeg -i original.mp3 -c:a libmp3lame -b:a 128k -ar 44100 -map_metadata 0 nueva.mp3`; unos 2.5 MB por cada 2½
  minutos, el límite es 3.5 MB), soltarla en `music/` y añadir su línea en `music/index.js`.

| Archivo | Qué hace |
|---|---|
| `engine/index.js` | Reglas puras: salida, apilar y cargar, tapetes, boletos, fin de etapa, apuestas finales, vista |
| `ai/index.js` | La compu y el consejo (probabilidades exactas de la etapa y carreras simuladas) |
| `ui/table.js` | La mesa: completa, la tele (`ctx.display === "tv"`) y el teléfono de una mesa con tele (`"phone"`) |
| `ui/art.js` | Imágenes del banco o su respaldo; lista de llaves (`KEYS`); en la tele, las versiones `@tv` |
| `ui/text.js` | Lo que dice la burbuja después de cada jugada |
| `music/` | Las canciones de fondo y su lista (`music/index.js`) |
| `assets/` | Banco de imágenes (ver su README) |
