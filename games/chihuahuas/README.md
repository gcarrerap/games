# Carrera de Chihuahuas

Juego de apuestas en una carrera de perros, estilo Camel Up, para 2 a 8 jugadores. Nadie tiene perro: cada quien
apuesta croquetas 🍪 a los chihuahuas. Las reglas completas están en el botón **Reglas** de la mesa (`ui/rules.js`).

- **Perros:** Chia (rojo) y Oreo (azul) son los perros de la familia (foto de referencia en
  [`docs/disenos/chihuahuas/referencia/`](../../docs/disenos/chihuahuas/referencia/)); Chocolate (verde), Nacho
  (amarillo) y Frijol (morado) son inventados.
- **Jugadas:** sacudir el tazón (un perro corre 1–3 y ganas 1 🍪), boleto de etapa (5, 3, 2), tapete de hueso (+1) o
  aspiradora (−1), y apuesta secreta al ganador o al último.
- **La compu** (`ai/`): recorre todas las formas en que pueden salir los dados que quedan en la etapa para saber
  quién acaba primero y segundo, y simula carreras completas para las apuestas finales. Tres estilos: prudente,
  normal y atrevido. El mismo cálculo da el **consejo** ("¿Qué me conviene?").
- **Mesa** (`ui/`): por ahora solo para teléfono. La pista es un cuadro de 5 × 5 con las 16 casillas alrededor y el
  tazón en el pasto del centro.
- **Imágenes** (`assets/`): banco de imágenes como en Panal y Skull, con las ilustraciones de Petra (#33; elección en
  [`docs/disenos/chihuahuas/`](../../docs/disenos/chihuahuas/)). Si falta una, la mesa usa un respaldo con colores y
  emoji (`ui/art.js`).

| Archivo | Qué hace |
|---|---|
| `engine/index.js` | Reglas puras: salida, apilar y cargar, tapetes, boletos, fin de etapa, apuestas finales, vista |
| `ai/index.js` | La compu y el consejo (probabilidades exactas de la etapa y carreras simuladas) |
| `ui/table.js` | La mesa del teléfono |
| `ui/art.js` | Imágenes del banco o su respaldo; lista de llaves (`KEYS`) |
| `ui/text.js` | Lo que dice la burbuja después de cada jugada |
| `assets/` | Banco de imágenes (ver su README) |
