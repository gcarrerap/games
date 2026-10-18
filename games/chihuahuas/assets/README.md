# Banco de imágenes de la Carrera de Chihuahuas

Aquí viven las ilustraciones de la carrera. Las diseña **Petra** (issue #33); Claude escoge e integra (issue #34); la
tele usa las mismas en alta resolución (issue #35). Si una llave está en `bank.js`, la mesa dibuja su imagen; si no,
un respaldo provisional de colores y emoji (`ui/art.js`).

Chia y Oreo son los perros de la familia: foto de referencia en
[`docs/disenos/chihuahuas/referencia/`](../../../docs/disenos/chihuahuas/referencia/).

| Llave | Qué es | Teléfono | Máximo | Estado |
|---|---|---|---|---|
| `dog-chia`, `dog-oreo`, `dog-chocolate`, `dog-nacho`, `dog-frijol` | El perro corriendo, de lado, mirando a la derecha, transparente | 512 × 512 | 80 KB | pendiente |
| `face-chia`, … `face-frijol` | Su cara, para el círculo de su color (boletos, dados, cartas), transparente | 256 × 256 | 80 KB | pendiente |
| `hueso`, `aspiradora` | Los dos lados del tapete, transparentes | 256 × 256 | 80 KB | pendiente |
| `tazon` | El tazón de donde salen los dados, transparente | 768 × 384 | 80 KB | pendiente |
| `croqueta` | La moneda del juego, transparente | 256 × 256 | 80 KB | pendiente |
| `cell`, `cell-meta` | Casilla de tierra y la de salida/meta, vista desde arriba | 256 × 256 | 80 KB | pendiente |
| `infield` | El pasto del centro de la pista | 768 × 768 | 200 KB | pendiente |
| `fondo` | Fondo de la página en el teléfono | 1080 × 2340 | 300 KB | pendiente |
| `portada` | Portada (arriba de las reglas) | 1280 × 720 | 300 KB | pendiente |

Los maestros que entrega Petra son grandes (2048 px los perros, 3840 × 2160 el fondo de la tele, …); de ellos se sacan
estos tamaños. Prompts, guía de estilo y formato completo: issue #33.

**Cómo se agrega:** copia el archivo a esta carpeta y agrega su entrada en `bank.js`:

```js
"dog-chia": { href: new URL("./dog-chia.webp", import.meta.url).href, prompt: "el prompt exacto", source: "herramienta", candidate: "dog-chia-2" },
```

`tests/games/chihuahuas/assets.test.js` revisa que cada llave sea una de `ui/art.js` (`KEYS`), que su archivo exista y
que no pase su máximo.
