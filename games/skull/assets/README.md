# Banco de imágenes de Skull

Aquí viven las imágenes de los discos, con temática de catrinas y Día de Muertos. Si una cara está en `bank.js`, la
mesa la dibuja con su imagen; si no, sigue con el dibujo SVG de `ui/disc.js`.

**Diseño:** Petra (Grok Bot), issue #25. **Elección:** Claude, issue #26, con hojas de contacto a 26, 34 y 50 px
sobre el paño y sobre tarjetas claras y oscuras, en color y en gris.

| Llave | Cara | Archivo | Candidato | Estado |
|---|---|---|---|---|
| `flower` | Flor | `flower.webp` | `flower-2`: cempasúchil naranja sobre turquesa, borde magenta | lista · 57.0 KB |
| `skull` | Calavera | `skull.webp` | `skull-4`: catrina blanca sobre magenta, borde morado | lista · 36.6 KB |
| `back` | Reverso | `back.webp` | `back-3`: retícula de papel picado morada, borde turquesa | lista · 56.6 KB |

**Por qué estas tres:** a 26 px (el tamaño en los tapetes de los demás) se distinguen al instante y también en gris:
naranja contra magenta con blanco contra morado parejo, con tres luminosidades distintas. El detalle, con las hojas de
contacto, los 12 candidatos y sus prompts, está en `docs/disenos/skull-catrinas/`.

**Formato:** WebP con fondo transparente, 512 × 512, el disco es un círculo centrado de radio 240 px que llena la
imagen. Menos de 60 KB por archivo. Cada disco trae su propio borde oscuro, porque se dibuja sobre el paño morado y
sobre tarjetas claras y oscuras.

**Guía de estilo** (al final de cada prompt; los prompts completos están en `bank.js`):

> Style guide: Mexican Día de Muertos folk-art illustration, hand-painted Talavera ceramic look, bold clean shapes, thick dark outline, flat colors with subtle painted texture, limited palette of marigold orange, magenta, turquoise, deep purple, bone white and black. Original illustration, not a copy of any existing artwork. Front view, perfectly centered, fills a circle, readable as a tiny icon at 26 pixels. Isolated on a plain flat pure white background. No text, no letters, no watermark, no frame outside the circle.

El modelo dibujó cada disco sobre blanco plano (1024 × 576); el fondo y todo lo de fuera del círculo se quitaron
después y se recortó a 512 × 512.

**Cómo se cambia una cara:** copia el archivo a esta carpeta y cambia su entrada en `bank.js`:

```js
skull: { href: new URL("./skull.webp", import.meta.url).href, candidate: "…", prompt: "…", source: "…" },
```

`tests/games/skull/assets.test.js` revisa que cada entrada apunte a un archivo que existe y pese menos de 60 KB.
