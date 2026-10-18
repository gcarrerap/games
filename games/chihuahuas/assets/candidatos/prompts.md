# Carrera de Chihuahuas — candidatos (issue #33)

Herramienta: **GenerateImage de Grok Bot** (Petra). Todas las salidas de la herramienta llegaron en JPG de **1280×720 (16:9)** sin importar la proporción pedida (1:1, 9:16), así que cada maestro se recortó/encuadró y se escaló al tamaño pedido.

Escalado: **Real-ESRGAN** (`realesrgan-ncnn-vulkan` 20220424, modelo `realesr-animevideov3`, ×2/×3/×4 según el destino) corriendo en CPU con Mesa lavapipe (Vulkan por software), y después Lanczos al tamaño exacto. Recorte de transparencia con Python (numpy + OpenCV + Pillow). Salida WebP calidad 92 (con alfa donde aplica).

La guía de estilo del issue va al final de todos los prompts, tal cual. Fondo de recorte: magenta `#ff00ff` en todo, verde `#00ff00` en Frijol (perro y cara). La herramienta pintó un magenta algo rosado (~#e0107a), el recorte toma el color real del borde de cada imagen.

Regeneradas (las primeras versiones se descartaron): `face-chia-1`, `face-oreo-1`, `face-nacho-3`, `face-frijol-2` (venían con un círculo o disco dibujado detrás; se añadió «No circle, no frame…»), `fondo-1` (salió un ajolote) y `fondo-tele-1` (salió un perro con sombrero; se añadió «No characters, no animals, no faces.»).

## `dog-chia-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: recorte de Chia (izquierda) de docs/disenos/chihuahuas/referencia/chia-y-oreo.jpg
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a fluffy long-haired female chihuahua with a shaggy, slightly messy apricot-cream coat that is lighter cream on the face and chest, big round dark eyes, a black button nose, soft fluffy ears, a brown leather collar with a small silver tag, a bright red (#e0473b) racing bandana, happy and determined with the tip of her tongue out, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-chia-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: recorte de Chia (izquierda) de docs/disenos/chihuahuas/referencia/chia-y-oreo.jpg
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a fluffy long-haired female chihuahua with a shaggy, slightly messy apricot-cream coat that is lighter cream on the face and chest, extra wispy tufts on the ears and cheeks, big round dark eyes, a black button nose, soft fluffy ears, a brown leather collar with a small silver tag, a bright red (#e0473b) racing bandana fluttering behind, happy and determined with the tip of her tongue out, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-chia-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: recorte de Chia (izquierda) de docs/disenos/chihuahuas/referencia/chia-y-oreo.jpg
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a fluffy long-haired female chihuahua with a shaggy, slightly messy apricot-cream coat that is lighter cream on the face and chest, a big fluffy plumed tail, big round sparkling dark eyes, a black button nose, soft fluffy ears, a brown leather collar with a small silver tag, a bright red (#e0473b) racing bandana, happy and determined with a wide smile and the tip of her tongue out, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-oreo-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: recorte de Oreo (derecha) de docs/disenos/chihuahuas/referencia/chia-y-oreo.jpg
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a long-haired male chihuahua with a white coat and black patches: black upright ears with grey-cream fringe fur, a black mask around both eyes, two small tan eyebrow dots, a white stripe down the middle of the forehead, a white muzzle, a black patch on the hip, a plumed white tail and a fluffy white chest ruff, a bright blue (#2f7fd8) racing bandana, focused serious athlete face, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-oreo-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: recorte de Oreo (derecha) de docs/disenos/chihuahuas/referencia/chia-y-oreo.jpg
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a long-haired male chihuahua with a white coat and black patches: tall black upright ears with grey-cream fringe fur, a black mask around both eyes, two small tan eyebrow dots, a white stripe down the middle of the forehead, a white muzzle, a black patch on the hip, a long plumed white tail streaming behind and a fluffy white chest ruff, a bright blue (#2f7fd8) racing bandana, focused serious athlete face with narrowed determined eyes, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-oreo-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: recorte de Oreo (derecha) de docs/disenos/chihuahuas/referencia/chia-y-oreo.jpg
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a long-haired male chihuahua with a white coat and black patches: black upright ears with grey-cream fringe fur, a bold black mask around both eyes, two small tan eyebrow dots, a white stripe down the middle of the forehead, a white muzzle, a large black patch on the hip, a plumed white tail and an extra fluffy white chest ruff, a bright blue (#2f7fd8) racing bandana, focused serious athlete face with a tight-lipped confident look, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-chocolate-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a chubby smooth-coat chocolate-brown chihuahua with a huge goofy grin and kibble crumbs on its cheeks, a bright green (#2f9e5a) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-chocolate-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a very chubby round-bellied smooth-coat chocolate-brown chihuahua with a huge goofy open-mouthed grin, its tongue flopping, and lots of kibble crumbs on its cheeks and chin, a bright green (#2f9e5a) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-chocolate-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a chubby smooth-coat chocolate-brown chihuahua with a lighter cocoa muzzle, a huge goofy grin with one kibble still stuck to its lip and crumbs on its cheeks, happy squinting eyes, a bright green (#2f9e5a) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-nacho-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a smooth-coat honey-golden chihuahua with enormous ears and bulging excited eyes, tiny aviator goggles pushed up on its forehead, mouth open shouting with excitement, a bright yellow (#f2b51f) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-nacho-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a skinny smooth-coat honey-golden chihuahua with absolutely enormous satellite-dish ears and huge bulging excited eyes, tiny brown leather aviator goggles with round lenses pushed up on its forehead, mouth wide open shouting with excitement, a bright yellow (#f2b51f) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-nacho-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (magenta): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a smooth-coat honey-golden chihuahua with enormous ears blown back by the wind and bulging wide excited eyes, tiny green-lensed aviator goggles pushed up on its forehead, mouth open yelling a happy battle cry, a bright yellow (#f2b51f) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-frijol-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (verde #00ff00): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a tiny smooth-coat black-and-tan chihuahua with bushy tan eyebrows and a grumpy frown, running flat out anyway, a bright purple (#8a52c9) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid bright green (#00ff00) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-frijol-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (verde #00ff00): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a tiny smooth-coat black-and-tan chihuahua, black back with tan legs, chest and muzzle, very bushy furrowed tan eyebrows and a grumpy scowl showing a little underbite, running flat out anyway, a bright purple (#8a52c9) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid bright green (#00ff00) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `dog-frijol-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma (verde #00ff00): alfa por distancia de croma con rampa suave, des-mezcla del color de fondo en píxeles semitransparentes, despill del tono del fondo en la banda de borde, erosión de 2 px y difuminado 1.5 px. Encuadre: perro al 80 % del ancho, patas en el 85 % de la altura. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A full-body side view of a tiny smooth-coat black-and-tan chihuahua with thick bushy tan eyebrows angled into an angry glare and puffed cheeks, grumpy but running flat out anyway with fierce determination, a bright purple (#8a52c9) racing bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, wearing a small racing bandana around the neck, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Isolated on a plain flat solid bright green (#00ff00) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-chia-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chia-2` (imagen generada, salida 3a920bab6e92…) + recorte de Chia de la foto
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a fluffy long-haired female chihuahua with a shaggy, slightly messy apricot-cream coat that is lighter cream on the face and chest, extra wispy tufts on the ears and cheeks, big round dark eyes, a black button nose, soft fluffy ears, a brown leather collar with a small silver tag, a bright red (#e0473b) racing bandana fluttering behind, happy and determined with the tip of her tongue out, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-chia-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chia-3` (imagen generada, salida 07440631d103…) + recorte de Chia de la foto
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a fluffy long-haired female chihuahua with a shaggy, slightly messy apricot-cream coat that is lighter cream on the face and chest, a big fluffy plumed tail, big round sparkling dark eyes, a black button nose, soft fluffy ears, a brown leather collar with a small silver tag, a bright red (#e0473b) racing bandana, happy and determined with a wide smile and the tip of her tongue out, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-oreo-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-oreo-2` (imagen generada, salida 9a6f9bc682e7…) + recorte de Oreo de la foto
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a long-haired male chihuahua with a white coat and black patches: tall black upright ears with grey-cream fringe fur, a black mask around both eyes, two small tan eyebrow dots, a white stripe down the middle of the forehead, a white muzzle, a black patch on the hip, a long plumed white tail streaming behind and a fluffy white chest ruff, a bright blue (#2f7fd8) racing bandana, focused serious athlete face with narrowed determined eyes, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-oreo-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-oreo-3` (imagen generada, salida eca7727ef5b0…) + recorte de Oreo de la foto
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a long-haired male chihuahua with a white coat and black patches: black upright ears with grey-cream fringe fur, a bold black mask around both eyes, two small tan eyebrow dots, a white stripe down the middle of the forehead, a white muzzle, a large black patch on the hip, a plumed white tail and an extra fluffy white chest ruff, a bright blue (#2f7fd8) racing bandana, focused serious athlete face with a tight-lipped confident look, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-chocolate-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chocolate-2` (imagen generada, salida 40bd08989aec…)
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a very chubby round-bellied smooth-coat chocolate-brown chihuahua with a huge goofy open-mouthed grin, its tongue flopping, and lots of kibble crumbs on its cheeks and chin, a bright green (#2f9e5a) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-chocolate-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chocolate-1` (imagen generada, salida 41672d72ad50…)
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a chubby smooth-coat chocolate-brown chihuahua with a huge goofy grin and kibble crumbs on its cheeks, a bright green (#2f9e5a) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-nacho-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-nacho-1` (imagen generada, salida b259ff19151c…)
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a smooth-coat honey-golden chihuahua with enormous ears and bulging excited eyes, tiny aviator goggles pushed up on its forehead, mouth open shouting with excitement, a bright yellow (#f2b51f) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-chocolate-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chocolate-3` (imagen generada, salida 658ced6decff…)
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a chubby smooth-coat chocolate-brown chihuahua with a lighter cocoa muzzle, a huge goofy grin with one kibble still stuck to its lip and crumbs on its cheeks, happy squinting eyes, a bright green (#2f9e5a) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-nacho-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-nacho-2` (imagen generada, salida 44ab1ce77085…)
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a skinny smooth-coat honey-golden chihuahua with absolutely enormous satellite-dish ears and huge bulging excited eyes, tiny brown leather aviator goggles with round lenses pushed up on its forehead, mouth wide open shouting with excitement, a bright yellow (#f2b51f) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-frijol-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-frijol-1` (imagen generada, salida 7564ec3bf9bf…)
- Recorte y escalado: Mismo recorte por croma (verde); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a tiny smooth-coat black-and-tan chihuahua with bushy tan eyebrows and a grumpy frown, running flat out anyway, a bright purple (#8a52c9) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid bright green (#00ff00) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-frijol-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-frijol-3` (imagen generada, salida 4a87e1b9f43d…)
- Recorte y escalado: Mismo recorte por croma (verde); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a tiny smooth-coat black-and-tan chihuahua with thick bushy tan eyebrows angled into an angry glare and puffed cheeks, grumpy but running flat out anyway with fierce determination, a bright purple (#8a52c9) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. Same character design as the reference image. Isolated on a plain flat solid bright green (#00ff00) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-chia-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chia-1` (imagen generada, salida ccb3c6decd74…) + recorte de Chia de la foto
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a fluffy long-haired female chihuahua with a shaggy, slightly messy apricot-cream coat that is lighter cream on the face and chest, big round dark eyes, a black button nose, soft fluffy ears, a brown leather collar with a small silver tag, a bright red (#e0473b) racing bandana, happy and determined with the tip of her tongue out, looking straight at the viewer with a funny, expressive face, centered, the head fills about 90 percent of the image, no body below the chest. Same character design as the reference image. No circle, no frame, no border, no badge. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-oreo-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-oreo-1` (imagen generada, salida fac9d49ced2b…) + recorte de Oreo de la foto
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a long-haired male chihuahua with a white coat and black patches: black upright ears with grey-cream fringe fur, a black mask around both eyes, two small tan eyebrow dots, a white stripe down the middle of the forehead, a white muzzle, a black patch on the hip, a plumed white tail and a fluffy white chest ruff, a bright blue (#2f7fd8) racing bandana, focused serious athlete face, looking straight at the viewer with a funny, expressive face, centered, the head fills about 90 percent of the image, no body below the chest. Same character design as the reference image. No circle, no frame, no border, no badge. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-nacho-3.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-nacho-3` (imagen generada, salida def1991fbb6e…)
- Recorte y escalado: Mismo recorte por croma (magenta); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a smooth-coat honey-golden chihuahua with enormous ears blown back by the wind and bulging wide excited eyes, tiny green-lensed aviator goggles pushed up on its forehead, mouth open yelling a happy battle cry, a bright yellow (#f2b51f) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills about 90 percent of the image, no body below the chest. Same character design as the reference image. No circle, no frame, no border, no badge, no colored disc behind the head. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `face-frijol-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-frijol-2` (imagen generada, salida 6cbb2564c55b…)
- Recorte y escalado: Mismo recorte por croma (verde); cabeza escalada a ~92 % del cuadro, anclada abajo (el pecho queda cortado por el borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A front-facing head-and-shoulders portrait of a tiny smooth-coat black-and-tan chihuahua, black back with tan legs, chest and muzzle, very bushy furrowed tan eyebrows and a grumpy scowl showing a little underbite, running flat out anyway, a bright purple (#8a52c9) racing bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills about 90 percent of the image, no body below the chest. Same character design as the reference image. No circle, no frame, no border, no badge. Isolated on a plain flat solid bright green (#00ff00) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `hueso-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A big shiny cartoon dog bone lying on a small round patch of grass, seen from three-quarters above, with sparkles around it, irresistible and glowing, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `hueso-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A big shiny cartoon dog bone lying on a small round patch of grass, seen from three-quarters above, with sparkles around it, irresistible and glowing, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `aspiradora-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A small round robot vacuum cleaner with angry cartoon eyes and a swirl of dust behind it, seen from three-quarters above, comically scary for a little dog, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `aspiradora-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A small round robot vacuum cleaner with angry cartoon eyes and a swirl of dust behind it, seen from three-quarters above, comically scary for a little dog, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `tazon-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A wide stainless steel dog food bowl with a red rim, seen from three-quarters above, empty and clean inside so small tokens can sit in it, a few kibbles spilled beside it, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `tazon-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A wide stainless steel dog food bowl with a red rim, seen from three-quarters above, empty and clean inside so small tokens can sit in it, a few kibbles spilled beside it, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `croqueta-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A single crunchy dog kibble shaped like a round coin with a paw print pressed into it, golden brown, seen from the front, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `croqueta-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Recorte por croma magenta como arriba; objeto escalado a ~90 % del cuadro, centrado. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A single crunchy dog kibble shaped like a round coin with a paw print pressed into it, golden brown, seen from the front, centered. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `cell-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Sin transparencia. Recorte cuadrado central de la imagen 16:9 (con margen de 3 % para quitar el marco del borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A square top-down tile of a packed light reddish-tan dirt racing lane with a few small pebbles and faint paw prints, even lighting, calm light center, the texture fills the whole square edge to edge. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `cell-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Sin transparencia. Recorte cuadrado central de la imagen 16:9 (con margen de 3 % para quitar el marco del borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A square top-down tile of a packed light reddish-tan dirt racing lane with a few small pebbles and faint paw prints, even lighting, calm light center, the texture fills the whole square edge to edge. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `infield-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Sin transparencia. Recorte cuadrado central de la imagen 16:9 (con margen de 0 % para quitar el marco del borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A square top-down view of a lush cartoon backyard lawn, a few daisies, a chewed tennis ball and a squeaky toy near the edges, tiny paw prints, the center 60 percent stays plain calm grass. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `infield-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Sin transparencia. Recorte cuadrado central de la imagen 16:9 (con margen de 0 % para quitar el marco del borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A square top-down view of a lush cartoon backyard lawn, a few daisies, a chewed tennis ball and a squeaky toy near the edges, tiny paw prints, the center 60 percent stays plain calm grass. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `fondo-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Sin transparencia. La herramienta solo entrega 16:9: se escaló a 3120 de alto y se recortó una franja central de 1440 de ancho (ampliación efectiva ~4.3×). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×4 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A sunny Mexican backyard behind a white wooden fence, colorful papel picado banners strung across a bright blue sky, potted plants and a lemon tree, softly blurred and low contrast so game buttons can sit on top, vertical composition. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `portada-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: foto chia-y-oreo.jpg completa
- Recorte y escalado: Sin transparencia. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
The five chihuahuas described above racing toward the camera down a backyard dirt track, chaotic and hilarious: one riding on another's back, one tripping, kibbles flying, a big shiny bone at the finish line, a cheering crowd of garden gnomes, papel picado overhead, the left third of the image calmer for a title. The five chihuahuas: a fluffy apricot-cream long-haired one in a red bandana, a white long-haired one with black patches and black ears in a blue bandana, a chubby chocolate-brown one in a green bandana, a honey-golden one with huge ears and aviator goggles in a yellow bandana, and a tiny grumpy black-and-tan one with bushy eyebrows in a purple bandana. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `portada-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `dog-chia-1`, `dog-oreo-1`, `dog-chocolate-1`, `dog-nacho-1`, `dog-frijol-1`
- Recorte y escalado: Sin transparencia. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
The five chihuahuas described above racing toward the camera down a backyard dirt track, chaotic and hilarious: one riding on another's back, one tripping, kibbles flying, a big shiny bone at the finish line, a cheering crowd of garden gnomes, papel picado overhead, the left third of the image calmer for a title. The five chihuahuas: a fluffy apricot-cream long-haired one in a red bandana, a white long-haired one with black patches and black ears in a blue bandana, a chubby chocolate-brown one in a green bandana, a honey-golden one with huge ears and aviator goggles in a yellow bandana, and a tiny grumpy black-and-tan one with bushy eyebrows in a purple bandana. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `fondo-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: ninguna
- Recorte y escalado: Sin transparencia. La herramienta solo entrega 16:9: se escaló a 3120 de alto y se recortó una franja central de 1440 de ancho (ampliación efectiva ~4.3×). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×4 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A sunny Mexican backyard behind a white wooden fence, colorful papel picado banners strung across a bright blue sky, potted plants and a lemon tree, softly blurred and low contrast so game buttons can sit on top, vertical composition. No characters, no animals, no faces. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `cell-meta-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `cell-1`
- Recorte y escalado: Sin transparencia. Recorte cuadrado central de la imagen 16:9 (con margen de 1.2 % para quitar el marco del borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
The same square top-down dirt racing lane tile, with a white chalk line painted along the top edge and a little colorful confetti scattered on the dirt. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `cell-meta-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `cell-2`
- Recorte y escalado: Sin transparencia. Recorte cuadrado central de la imagen 16:9 (con margen de 1.2 % para quitar el marco del borde). Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×2 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
The same square top-down dirt racing lane tile, with a white chalk line painted along the top edge and a little colorful confetti scattered on the dirt. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `fondo-tele-2.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `fondo-2`
- Recorte y escalado: Sin transparencia. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A sunny Mexican backyard behind a white wooden fence, colorful papel picado banners strung across a bright blue sky, potted plants and a lemon tree, softly blurred and low contrast so game buttons can sit on top, wide horizontal composition, the same scene as the reference image. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```

## `fondo-tele-1.webp`

- Herramienta: GenerateImage (Grok Bot)
- Referencias: `fondo-1`
- Recorte y escalado: Sin transparencia. Real-ESRGAN (realesrgan-ncnn-vulkan, modelo realesr-animevideov3, en CPU vía Mesa lavapipe) ×3 sobre el JPG original de 1280×720, luego Lanczos al tamaño final.

Prompt exacto:

```
A sunny Mexican backyard behind a white wooden fence, colorful papel picado banners strung across a bright blue sky, potted plants and a lemon tree, softly blurred and low contrast so game buttons can sit on top, wide horizontal composition, the same scene as the reference image. No characters, no animals, no faces. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
```
