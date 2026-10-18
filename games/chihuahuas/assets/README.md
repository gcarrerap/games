# Banco de imágenes de la Carrera de Chihuahuas

Aquí viven las ilustraciones de la carrera. Las diseñó **Petra** (issue #33); Claude escogió e integró (issue #34, ver
[`docs/disenos/chihuahuas/`](../../../docs/disenos/chihuahuas/)); la tele usa las mismas en alta resolución (issue #35, abajo). Si una llave está en `bank.js`, la mesa dibuja su imagen; si no,
un respaldo provisional de colores y emoji (`ui/art.js`).

Chia y Oreo son los perros de la familia: foto de referencia en
[`docs/disenos/chihuahuas/referencia/`](../../../docs/disenos/chihuahuas/referencia/).

| Llave | Qué es | Teléfono | Máximo | Estado |
|---|---|---|---|---|
| `dog-chia`, `dog-oreo`, `dog-chocolate`, `dog-gustavo`, `dog-catrina` | El perro corriendo, de lado, mirando a la derecha, transparente; los cinco con el mismo recorte (patas en la orilla de abajo; Catrina ocupa menos ancho porque es la más chiquita) | 512 × 456 | 80 KB | listos · 36–61 KB |
| `face-chia`, … `face-catrina` | Su cara, para el círculo de su color (boletos, dados, cartas), transparente | 256 × 256 | 80 KB | listas · 14–18 KB |
| `hueso`, `aspiradora` | Los dos lados del tapete, transparentes | 256 × 256 | 80 KB | listos · 17 y 13 KB |
| `tazon` | El tazón de donde salen los dados, transparente | 768 × 384 | 80 KB | listo · 34 KB |
| `croqueta` | La moneda del juego, transparente | 256 × 256 | 80 KB | lista · 18 KB |
| `cell`, `cell-meta` | Casilla de tierra y la de salida/meta, vista desde arriba | 256 × 256 | 80 KB | listas · 17 y 15 KB |
| `infield` | El pasto del centro de la pista | 768 × 768 | 200 KB | lista · 147 KB |
| `fondo` | Fondo de la página en el teléfono (la mesa le pone un velo para que se lean los botones) | 1080 × 2340 | 300 KB | listo · 123 KB |
| `portada` | Portada (arriba de las reglas) | 1280 × 720 | 300 KB | lista · por capas (#44), elegida `portada-7` |

**Para la tele** (#35): las mismas, sacadas de los maestros en alta. Solo las pide la mesa de la tele (`ui/art.js`,
`useTv`); el teléfono nunca las baja.

| Llave | Archivo | Tamaño | Máximo |
|---|---|---|---|
| `dog-chia@tv`, … `dog-catrina@tv` | `dog-*-tele.webp`, mismo recorte que los del teléfono | 1024 × 912 | 160 KB |
| `face-chia@tv`, … `face-catrina@tv` | `face-*-tele.webp` | 512 × 512 | 80 KB |
| `fondo-tele` | `fondo-tele-1`, el fondo de la mesa en la tele | 3840 × 2160 | 600 KB |
| `portada@tv` | `portada-tele.webp` (`portada-7`), fondo de la espera de la tele (`manifest.tvCover`) | 1920 × 1080 | 300 KB |

Los maestros que entrega Petra son grandes (2048 px los perros, 3840 × 2160 el fondo de la tele, …); de ellos se sacan
estos tamaños. Prompts, guía de estilo y formato completo: issue #33.

**Cómo se agrega:** copia el archivo a esta carpeta y agrega su entrada en `bank.js`:

```js
"dog-chia": { href: new URL("./dog-chia.webp", import.meta.url).href, prompt: "el prompt exacto", source: "herramienta", candidate: "dog-chia-2" },
```

`tests/games/chihuahuas/assets.test.js` revisa que cada llave sea una de `ui/art.js` (`KEYS`), que su archivo exista y
que no pase su máximo.
