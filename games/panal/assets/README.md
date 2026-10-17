# Banco de imágenes de Panal

Aquí viven las imágenes que reemplazan a los dibujos SVG de `ui/art.js`. Si un bicho está en `bank.js`, la mesa lo
dibuja con su imagen; si no, sigue con el dibujo SVG.

| Llave | Bicho | Archivo | Estado |
|---|---|---|---|
| `reina` | Abeja reina | `reina.webp` | lista · 22.8 KB |
| `mayate` | Mayate (escarabajo) | `mayate.webp` | lista · 22.1 KB |
| `chapulin` | Chapulín | `chapulin.webp` | lista · 22.4 KB |
| `hormiga` | Hormiga | `hormiga.webp` | lista · 23.4 KB |
| `arana` | Araña | `arana.webp` | lista · 26.2 KB |

**Formato:** WebP con fondo transparente, cuadrado de 512 × 512, el bicho visto desde arriba con la cabeza hacia
arriba y centrado dentro de un círculo de radio 230 px (para que quepa en la ficha hexagonal sin tocar las orillas).
Cada archivo debe pesar menos de 60 KB. Se dibuja encima de la ficha clara y de la oscura, así que necesita un
contorno oscuro y colores propios.

Las cinco ilustraciones se generaron con el prompt de cada bicho seguido de la guía de estilo. En esa guía, la frase
«no background, transparent background» se cambió por «isolated on a plain flat pure white background»: el modelo
dibujó cada bicho aislado sobre un blanco plano y el fondo se quitó después (relleno desde los bordes, con un borde
suave), para no comerse las zonas claras de adentro, como las alas celestes de la reina o la mancha crema de la araña.

**Cómo se agrega:** copia el archivo a esta carpeta y agrega su entrada en `bank.js`:

```js
reina: { href: new URL("./reina.webp", import.meta.url).href, prompt: "el prompt con que se generó", source: "herramienta" },
```

`tests/games/panal/assets.test.js` revisa que cada entrada apunte a un archivo que existe.
