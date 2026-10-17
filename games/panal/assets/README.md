# Banco de imágenes de Panal

Aquí viven las imágenes que reemplazan a los dibujos SVG de `ui/art.js`. Mientras `bank.js` esté vacío, la mesa usa
esos dibujos; cada bicho que se agregue al banco se ve con su imagen y los demás siguen con su dibujo.

| Llave | Bicho | Archivo sugerido |
|---|---|---|
| `reina` | Abeja reina | `reina.webp` |
| `mayate` | Mayate (escarabajo) | `mayate.webp` |
| `chapulin` | Chapulín | `chapulin.webp` |
| `hormiga` | Hormiga | `hormiga.webp` |
| `arana` | Araña | `arana.webp` |

**Formato:** WebP con fondo transparente, cuadrado de 512 × 512, el bicho visto desde arriba con la cabeza hacia
arriba y centrado dentro de un círculo de radio 230 px (para que quepa en la ficha hexagonal sin tocar las orillas).
Cada archivo debe pesar menos de 60 KB. Se dibuja encima de la ficha clara y de la oscura, así que necesita un
contorno oscuro y colores propios.

**Cómo se agrega:** copia el archivo a esta carpeta y agrega su entrada en `bank.js`:

```js
reina: { href: new URL("./reina.webp", import.meta.url).href, prompt: "el prompt con que se generó", source: "herramienta" },
```

`tests/games/panal/assets.test.js` revisa que cada entrada apunte a un archivo que existe.
