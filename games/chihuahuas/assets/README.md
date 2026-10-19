# Banco de imágenes de la Carrera de Chihuahuas

Aquí viven las ilustraciones de la carrera. Las diseñó **Petra** (issue #33); Claude escogió e integró (issue #34, ver
[`docs/disenos/chihuahuas/`](../../../docs/disenos/chihuahuas/)); la tele usa las mismas en alta resolución (issue #35, abajo). Si una llave está en `bank.js`, la mesa dibuja su imagen; si no,
un respaldo provisional de colores y emoji (`ui/art.js`).

Chia y Oreo son los perros de la familia: foto de referencia en
[`docs/disenos/chihuahuas/referencia/`](../../../docs/disenos/chihuahuas/referencia/).

| Llave | Qué es | Teléfono | Máximo | Estado |
|---|---|---|---|---|
| `dog-chia`, `dog-oreo`, `dog-chocolate`, `dog-gustavo`, `dog-catrina` | El perro corriendo, de lado, mirando a la derecha, transparente; los cinco con el mismo recorte (patas en la orilla de abajo; Catrina ocupa menos ancho porque es la más chiquita) | 512 × 456 | 80 KB | listos · 36–61 KB |
| `dog-chia-up`, … `dog-catrina-up` | Corriendo hacia arriba, **de espaldas** (#49), mismo lienzo, misma altura y línea de patas que el de lado | 512 × 456 | 80 KB | listos · 20–36 KB |
| `dog-chia-down`, … `dog-catrina-down` | Corriendo hacia abajo, **de frente** (#49), igual | 512 × 456 | 80 KB | listos · 26–40 KB |
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
| `dog-chia-up@tv`, `dog-chia-down@tv`, … | `dog-*-up-tele.webp`, `dog-*-down-tele.webp` | 1024 × 912 | 160 KB |
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

**Hacia dónde mira el perro** (#49, `ui/facing.js`): casillas 1–4 a la derecha (de lado), 5–8 hacia arriba
(`-up`, de espaldas), 9–12 a la izquierda (de lado en espejo), 13–16 y la meta hacia abajo (`-down`, de frente). Cuando
la aspiradora lo regresa, en ese brinco usa la vista contraria. Elección de las vistas: `docs/disenos/chihuahuas/eleccion/vistas.md`.

## Animaciones

Animaciones de los perros, la carrera y dos fondos. **No están en `bank.js`**, así que `assets.test.js` no las revisa
y no se bajan con la mesa. La fiesta del ganador (`ui/party.js`, #71) usa el `festejo-*` del perro que ganó la carrera,
con su sombra. `tropiezo-catrina` no se usa hoy. Solo las pide la tele o la mesa sin tele, y solo cuando arranca la fiesta. El
teléfono de una mesa con tele no las baja: ahí la fiesta es confeti y el nombre. Siguen pesando más que el máximo del
banco (cerca de 1 MB cada una).

| Archivo | Qué muestra | Tamaño | Cuadros | Duración | Peso |
|---|---|---|---|---|---|
| `festejo-oreo.webp` | Oreo levanta la pata trasera como si hiciera pipí y la vuelve a bajar | 324 × 282 | 121 | 5.04 s | 1.6 MB |
| `festejo-chia.webp` | Chia festeja, se tira y queda boca arriba con la lengua de fuera | 448 × 284 | 121 | 5.04 s | 1.6 MB |
| `festejo-gustavo.webp` | Gustavo pone su cara de bravo con los dientes de abajo de fuera y sacude la cabeza | 322 × 282 | 121 | 5.04 s | 1.1 MB |
| `festejo-chocolate.webp` | Chocolate aplaude parado en las patas de atrás y le rebota la panza | 252 × 312 | 121 | 5.04 s | 1.2 MB |
| `festejo-catrina.webp` | Catrina baila parada en las patas de atrás, con su suéter de rayas, y da una vuelta completa | 272 × 310 | 116 | 4.83 s | 0.9 MB |
| `tropiezo-catrina.webp` | Catrina brinca, se tropieza, rueda y queda boca arriba, mareada | 460 × 316 | 145 | 6.04 s | 1.1 MB |
| `festejo-*-sombra.webp`, `tropiezo-catrina-sombra.webp` | La sombra de cada una (ver abajo) | igual que su perro | igual | igual | 60–94 KB |
| `carrera-5-perros.webp` | Los cinco corren hacia la cámara por la calle; hay cambios de punta y Chia gana por poquito | 960 × 540 | 96 | 4.0 s | 1.1 MB |
| `carrera-5-perros.mp4` | La misma carrera en video (H.264), con un temblor leve de cámara | 1280 × 720 | 96 | 4.0 s | 2.1 MB |
| `fondo-carrera.jpg` | La calle de la carrera, sin perros | 1280 × 720 | — | — | 0.4 MB |
| `fondo-patio.jpg` | El patio con piso donde se pararon los perros de los festejos | 1280 × 720 | — | — | 0.4 MB |

Todas las WebP son animadas, a 24 cuadros por segundo, y se repiten sin fin. La carrera en WebP no tiene el temblor
de cámara para que pese poco; es la misma carrera que el video.

**Perros transparentes y su sombra.** Cada perro viene solo, con fondo transparente y sin sombra; la sombra va en su
propio archivo `-sombra.webp`, con **el mismo lienzo, los mismos cuadros y la misma duración**. Para usarla, pon las
dos en el mismo lugar y del mismo tamaño, y dibuja la sombra **debajo** del perro; arrancan juntas. La sombra se
ensancha cuando el perro se acuesta y se achica y aclara cuando brinca.

**Misma escala.** Todos los perros de las animaciones están a la misma escala que en el patio (`fondo-patio.jpg`
reducido a 960 × 540): si pones dos perros en el mismo lugar, las patas quedan a la misma altura. Cada lienzo es un
recorte de ese cuadro de 960 × 540; la línea del piso está en y = 513 del cuadro completo:

| Archivo | Esquina del recorte en 960 × 540 | Piso dentro del lienzo |
|---|---|---|
| `festejo-oreo` | (320, 240) | y = 273 |
| `festejo-chia` | (248, 241) | y = 272 |
| `festejo-gustavo` | (329, 242) | y = 271 |
| `festejo-chocolate` | (365, 211) | y = 302 |
| `festejo-catrina` | (356, 221) | y = 292 |
| `tropiezo-catrina` | (253, 210) | y = 303 |

Debajo del piso quedan pocos píxeles (9 a 18), así que la orilla de abajo de la sombra se desvanece en las últimas
4 filas del lienzo para no cortarse en seco.
