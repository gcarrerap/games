# prompts.md — candidatos #41 (Gustavo y Catrina)

Herramienta: GenerateImage de Grok Bot (salida 1280×720; pide 1:1 pero siempre entrega 16:9, por eso se recorta).
Fotos de referencia: `docs/disenos/chihuahuas/referencia/` en main. Referencia de estilo: candidatos del #33.

**Escalado:** Real-ESRGAN (`realesrgan-ncnn-vulkan`, modelo `realesr-animevideov3`, ×2, CPU con Mesa lavapipe) → 2560×1440, y luego Lanczos al tamaño final.
**Recorte Gustavo (magenta #ff00ff):** alfa por distancia al color de fondo con rampa suave, erosión 5 px + difuminado 1.5 px, se quita la mezcla del fondo en semitransparentes y despill del magenta en una franja de borde de ~31 px.
**Recorte Catrina (gris #808080):** fondo = saturación baja Y valor cercano al gris medido en los bordes (distancia RGB al gris + penalización por saturación, rampa 14→40), así el blanco/crema no se borra; huecos interiores grandes sí se recortan, motitas cerradas pequeñas se conservan; erosión 5 px + difuminado 1.5 px y quitar la mezcla del gris. Revisado sobre fondo blanco y oscuro.
**Encuadre:** perros 2048×2048, patas al 85 % de la altura, Gustavo 80 % del ancho, Catrina 62 % centrada. Caras 1024×1024 (cuando el generador dio cuerpo completo, se recortó a cabeza y pecho). Portadas 2560×1440 sin recorte. WebP calidad 92.

## dog-catrina-1.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `6a380b927a3ae7d6dbe51921fd6234b9a6108ade23e706f0053c32cf2c1ea84f.jpg`
- Referencias: catrina-1.jpg, catrina-2.jpg, dog-chocolate-1 (#33, estilo)
- Recorte: gris
- Prompt:

> A full-body side view of a tiny female chihuahua with a hugely round, plump barrel-shaped body like a balloon on four very thin stick-like legs, a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, adorably cross-eyed with both eyes looking inward, a slightly crooked lopsided face and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 62 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-catrina-2.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `c51e4f3594917ecdd9606324ffe209f90478752fbf3de9f5610bea62b56a1895.jpg`
- Referencias: catrina-1.jpg, catrina-2.jpg, dog-chia-1 (#33, estilo)
- Recorte: gris
- Prompt:

> A full-body side view of a tiny female chihuahua with a hugely round, plump barrel-shaped body like a balloon on four very thin stick-like legs, a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, with a tiny head on a huge round body, adorably cross-eyed with both eyes looking inward, a slightly crooked lopsided face and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 62 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-catrina-3.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `66aae1fa0c259acde24b9b27ea7ac2559ca41b25d69916f659ff2a4fdc14af88.jpg`
- Referencias: catrina-1.jpg, catrina-2.jpg, dog-chocolate-1 (#33, estilo)
- Recorte: gris
- Prompt:

> A full-body side view of a tiny female chihuahua with a hugely round, plump barrel-shaped body like a balloon on four very thin stick-like legs, a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, adorably cross-eyed with both eyes looking inward, a slightly crooked lopsided face and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, the sweater stretched tight over her round belly, no bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 62 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-1.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `01172813c4bb7801c5947b70ef7f62267462ca7de735c51b94b11f0640b46645.jpg`
- Referencias: gustavo-1.jpg, gustavo-3.jpg, dog-chocolate-1 (#33, estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a hilariously lopsided crooked face with a twisted underbite snarl showing tiny teeth and slightly mismatched eyes, like a comically rabid little guard dog, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-2.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `124016146395939846f019a64435379cbc0cd7adeba1bbd5a40733c4d8e553e3.jpg`
- Referencias: gustavo-2.jpg, gustavo-3.jpg, dog-chocolate-1 (#33, estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a hilariously lopsided crooked face with a twisted underbite snarl showing tiny teeth and slightly mismatched eyes, with a round pot belly and one ear folded over at the tip, like a comically rabid little guard dog, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-3.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `e1c81b9587a492f9051428e327796f0a8eac0992a9f6f78812a2fa1e6270c93b.jpg`
- Referencias: gustavo-1.jpg, gustavo-2.jpg, dog-chocolate-1 (#33, estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a hilariously lopsided crooked face with a twisted underbite snarl showing tiny crooked teeth with the tongue tip poking out sideways and slightly mismatched eyes, like a comically rabid little guard dog, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-catrina-1.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `9b5c37a5efeb81de4720d90a94cfb78d82c507a74937fc479ec4f64ae66c7c03.jpg`
- Referencias: dog-catrina-1 (generado arriba), catrina-1.jpg
- Recorte: gris
- Prompt:

> A front-facing head-and-shoulders portrait of a tiny female chihuahua with a hugely round, plump barrel-shaped body like a balloon on four very thin stick-like legs, a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, adorably cross-eyed with both eyes looking inward, a slightly crooked lopsided face and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Same character design as the reference image. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-catrina-2.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `909a3c676b77e18b230ae9874a5f6faf7bf517960af5536931da9a42835ca19c.jpg`
- Referencias: dog-catrina-2 (generado arriba), catrina-1.jpg
- Recorte: gris
- Prompt:

> A front-facing head-and-shoulders portrait of a tiny female chihuahua with a hugely round, plump barrel-shaped body like a balloon on four very thin stick-like legs, a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, with a tiny head on a huge round body, adorably cross-eyed with both eyes looking inward, a slightly crooked lopsided face and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Same character design as the reference image. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-catrina-3.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `9a95e385d7c3dc1811140d30ff9fa5eee81fd8697cedd21435496ac947f9d409.jpg`
- Referencias: dog-catrina-3 (generado arriba), catrina-1.jpg
- Recorte: gris
- Prompt:

> A front-facing head-and-shoulders portrait of a tiny female chihuahua with a hugely round, plump barrel-shaped body like a balloon on four very thin stick-like legs, a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, adorably cross-eyed with both eyes looking inward, a slightly crooked lopsided face and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, the sweater stretched tight over her round belly, no bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Same character design as the reference image. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-1.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `bf88e5d45f924627709b42fc120f88777560d5c5ad30a4defff8924f49841c7a.jpg`
- Referencias: dog-gustavo-1 (generado arriba), gustavo-1.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a hilariously lopsided crooked face with a twisted underbite snarl showing tiny teeth and slightly mismatched eyes, like a comically rabid little guard dog, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-2.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `c44e9723b09f7d337db3219cb512a45a4e09b634c8bb3794f4208d05d2ebe9be.jpg`
- Referencias: dog-gustavo-2 (generado arriba), gustavo-1.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a hilariously lopsided crooked face with a twisted underbite snarl showing tiny teeth and slightly mismatched eyes, with a round pot belly and one ear folded over at the tip, like a comically rabid little guard dog, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-3.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `87b4239faef084bfdd1253777ae2b64aecb2a42c69534509eee295cb9efb5260.jpg`
- Referencias: dog-gustavo-3 (generado arriba), gustavo-1.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a hilariously lopsided crooked face with a twisted underbite snarl showing tiny crooked teeth with the tongue tip poking out sideways and slightly mismatched eyes, like a comically rabid little guard dog, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## portada-3.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `5a95483a5d1421cc8d864873dc0e28e533072293821001b11e6326114673b84e.jpg`
- Referencias: dog-chia-1, dog-oreo-1, dog-chocolate-1 (#33), dog-gustavo-1, dog-catrina-1
- Recorte: ninguno (opaca)
- Prompt:

> The five chihuahuas described above racing toward the camera down a backyard dirt track, chaotic and hilarious: one riding on another's back, one tripping, kibbles flying, a big shiny bone at the finish line, a cheering crowd of garden gnomes, papel picado overhead, the left third of the image calmer for a title. The five chihuahuas: a fluffy apricot-cream long-haired one in a red bandana, a white long-haired one with black patches and black ears in a blue bandana, a chubby chocolate-brown one in a green bandana, a stocky short-haired mostly black one with a white chest, a crooked snarling face and a yellow bandana, and the tiniest one, a white balloon-round little dog on thin legs in a rainbow-striped knitted sweater with a purple neck band, rolling along like a balloon. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## portada-4.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `ec4164451cdcfe76132d52ef7b34423f4e9f8f0ee5b7d297aa416c99ba790d5c.jpg`
- Referencias: dog-chia-1, dog-oreo-1, dog-chocolate-1 (#33), dog-gustavo-2, dog-catrina-3
- Recorte: ninguno (opaca)
- Prompt:

> The five chihuahuas described above racing toward the camera down a backyard dirt track, chaotic and hilarious: one riding on another's back, one tripping, kibbles flying, a big shiny bone at the finish line, a cheering crowd of garden gnomes, papel picado overhead, the left third of the image calmer for a title. The five chihuahuas: a fluffy apricot-cream long-haired one in a red bandana, a white long-haired one with black patches and black ears in a blue bandana, a chubby chocolate-brown one in a green bandana, a stocky short-haired mostly black one with a white chest, a crooked snarling face and a yellow bandana, and the tiniest one, a white balloon-round little dog on thin legs in a rainbow-striped knitted sweater with a purple neck band, rolling along like a balloon. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.


---

# Tanda 3 (feedback del 18 de octubre): Gustavo amigable, Catrina rabiosa y bizca, caras de frente, portada continua

Mismo proceso que la tanda anterior: GenerateImage de Grok Bot (entrega 1280×720), luego Real-ESRGAN `realesr-animevideov3` ×2 y Lanczos al tamaño final; recorte de Gustavo sobre magenta y de Catrina sobre gris como arriba; WebP q92. Las caras salieron de cuerpo entero, así que se recortaron a cabeza y pecho (corte horizontal abajo, que queda escondido por el círculo).

## dog-gustavo-4.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `0940b06db4dd19353eb32f6dca4d005718f5006b725e8734d522ef93f37fcb0d.jpg`
- Referencias: dog-gustavo-5 de esta tanda (2.º intento; el 1.º enseñaba dientes), gustavo-2.jpg, #33 dog-chocolate-1 (estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a sweet friendly face with soft happy eyes and a big goofy open-mouth smile with the tip of his tongue out, a lovable gentle buddy (not angry, no snarl, no teeth showing), wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Absolutely no teeth or fangs visible: soft rounded gums, only a pink tongue in the smile. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-5.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `a12e02c6e3eb797304d37314fcc8873aa749343e89d09755ec8d37f70557ebfa.jpg`
- Referencias: #41 dog-gustavo-3, gustavo-1.jpg, #33 dog-chocolate-1 (estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a sweet friendly face with soft happy eyes and a big goofy open-mouth smile with the tip of his tongue out, an extra round pot belly, a lovable gentle buddy (not angry, no snarl, no teeth showing), wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-6.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `2ca675c108d8173db2320586d0fbc196849041712816b03120c686a189ead401.jpg`
- Referencias: su propio 1.er intento (que enseñaba dientes), gustavo-3.jpg, #33 dog-chocolate-1 (estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a sweet friendly face with soft happy half-closed blissful eyes and a big goofy open-mouth smile with the tip of his tongue out, a lovable gentle buddy (not angry, no snarl, no teeth showing), wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Absolutely no teeth or fangs visible: soft rounded gums, only a pink tongue in the smile. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-4.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `d6100520ce8801e0e32656bba232012286a616fcc36e1b9ad962066dd71474c6.jpg`
- Referencias: dog-gustavo-4, gustavo-2.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a sweet friendly face with soft happy eyes and a big goofy open-mouth smile with the tip of his tongue out, a lovable gentle buddy (not angry, no snarl, no teeth showing), wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-5.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `4ab89a70a4761e2e4759928182ff4f5e85b32f97616e21d65ee9df4057623df1.jpg`
- Referencias: dog-gustavo-5, gustavo-2.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a sweet friendly face with soft happy eyes and a big goofy open-mouth smile with the tip of his tongue out, an extra round pot belly, a lovable gentle buddy (not angry, no snarl, no teeth showing), wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-6.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `d86f74ffb10ab8737af69b9d0a42c265335b1d6e2d0f21542c251faf43ea1a29.jpg`
- Referencias: dog-gustavo-6, gustavo-3.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a stocky, chubby short-haired male chihuahua with a smooth short coat that is mostly black: black back, sides and hips, a white chest, white belly and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, black upright ears with one ear slightly bent, a sweet friendly face with soft happy half-closed blissful eyes and a big goofy open-mouth smile with the tip of his tongue out, a lovable gentle buddy (not angry, no snarl, no teeth showing), wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-catrina-4.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `5f5e6bfd369b746972f3c9c3915a48486bbaba8ea135f0282e0d14251b00709b.jpg`
- Referencias: catrina-1.jpg, catrina-2.jpg, #33 dog-chocolate-1 (estilo)
- Recorte: gris
- Prompt:

> A full-body side view of a tiny female chihuahua whose torso is hugely round and plump like a balloon on four very thin stick-like legs, while her head and neck stay small, slim and bony (no chubby cheeks, no fat neck, a narrow little face), a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, an ugly-funny scruffy face like a comically rabid little dog: wild strongly crossed eyes pointing in different directions with one eye higher than the other, a crooked lopsided snarl showing tiny uneven teeth, a twitchy furious expression, a crooked head tilt and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 62 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-catrina-5.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `4fe529ac9d252da95dfa1f01012c4fbe68143354a3b95d8a7f6494535d20df9b.jpg`
- Referencias: catrina-1.jpg, catrina-2.jpg, #33 dog-chocolate-1 (estilo)
- Recorte: gris
- Prompt:

> A full-body side view of a tiny female chihuahua whose torso is hugely round and plump like a balloon on four very thin stick-like legs, while her head and neck stay small, slim and bony (no chubby cheeks, no fat neck, a narrow little face), a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, an ugly-funny scruffy face like a comically rabid little dog: huge bulging googly eyes that are extremely crossed, pointing in different directions with one eye higher than the other, a crooked lopsided snarl showing tiny uneven teeth, a twitchy furious expression, a crooked head tilt and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 62 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-catrina-6.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `b0caa8d96c377b7b769c1a6ee2afbc4237d32ab1eccab4f643b911a7a7e1ea96.jpg`
- Referencias: catrina-1.jpg, catrina-2.jpg, #33 dog-oreo-1 (estilo)
- Recorte: gris
- Prompt:

> A full-body side view of a tiny female chihuahua whose torso is hugely round and plump like a balloon on four very thin stick-like legs, while her head and neck stay small, slim and bony (no chubby cheeks, no fat neck, a narrow little face), a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, an ugly-funny scruffy face like a comically rabid little dog: wild strongly crossed eyes pointing in different directions with one eye higher than the other, a crooked lopsided snarl showing tiny uneven teeth, a twitchy furious expression with a wrinkled nose and one ear flopped sideways, a crooked head tilt and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, joyful race-day energy, centered, the dog fills about 62 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-catrina-4.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `124e7a0ff17155ea517219513da3cdd2ced8aef4edddcd9b75da5a900c3bf782.jpg`
- Referencias: dog-catrina-4 + face-catrina-5 (2.º intento; el 1.º salió de perfil)
- Recorte: gris
- Prompt:

> A front-facing head-and-shoulders portrait of a tiny female chihuahua whose torso is hugely round and plump like a balloon on four very thin stick-like legs, while her head and neck stay small, slim and bony (no chubby cheeks, no fat neck, a narrow little face), a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, an ugly-funny scruffy face like a comically rabid little dog: wild strongly crossed eyes pointing in different directions with one eye higher than the other, a crooked lopsided snarl showing tiny uneven teeth, a twitchy furious expression, a crooked head tilt and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-catrina-5.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `37a524757c4989db680efd15f5c7cd40ba70bb0c75610dd687405fbd28c50063.jpg`
- Referencias: dog-catrina-5, catrina-1.jpg
- Recorte: gris
- Prompt:

> A front-facing head-and-shoulders portrait of a tiny female chihuahua whose torso is hugely round and plump like a balloon on four very thin stick-like legs, while her head and neck stay small, slim and bony (no chubby cheeks, no fat neck, a narrow little face), a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, an ugly-funny scruffy face like a comically rabid little dog: huge bulging googly eyes that are extremely crossed, pointing in different directions with one eye higher than the other, a crooked lopsided snarl showing tiny uneven teeth, a twitchy furious expression, a crooked head tilt and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-catrina-6.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `4a20b305b7e8e86f9f73cc5dff3ca5da53953359cf4994b3d5c84248d8f75670.jpg`
- Referencias: dog-catrina-6, catrina-1.jpg
- Recorte: gris
- Prompt:

> A front-facing head-and-shoulders portrait of a tiny female chihuahua whose torso is hugely round and plump like a balloon on four very thin stick-like legs, while her head and neck stay small, slim and bony (no chubby cheeks, no fat neck, a narrow little face), a short smooth white coat with light cream patches on her big pointy upright ears and around one eye, an ugly-funny scruffy face like a comically rabid little dog: wild strongly crossed eyes pointing in different directions with one eye higher than the other, a crooked lopsided snarl showing tiny uneven teeth, a twitchy furious expression with a wrinkled nose and one ear flopped sideways, a crooked head tilt and a wobbly tilted gait, wearing a chunky hand-knitted sweater with bright rainbow stripes (red, yellow, green, blue, purple) that covers her round body, with a purple (#8a52c9) ribbed neck band, her short thin tail raised, no bandana, looking straight at the viewer with a funny, expressive face, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid neutral mid-gray (#808080) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## portada-5.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `8b1793cc50f1cb1cbaaed8fde21cf4ef6f0639ced14ecfa4f58116320e265cfe.jpg`
- Referencias: #33 dog-chia-1, dog-oreo-1, dog-chocolate-1 + dog-gustavo-4 + dog-catrina-5
- Recorte: ninguno (opaca)
- Prompt:

> Five chihuahuas racing toward the camera down a backyard dirt track, chaotic and hilarious: one riding on another's back, one tripping, kibbles flying, a big shiny bone at the finish line, a cheering crowd of garden gnomes, papel picado overhead, the left third of the image calmer for a title. One continuous seamless scene from edge to edge, the grass and dirt track blending naturally across the whole width, no split panel, no hard vertical edge. Exactly five dogs, all clearly visible: (1) a fluffy apricot-cream long-haired one in a red bandana, (2) a white long-haired one with black patches and black ears in a blue bandana, (3) a chubby chocolate-brown one in a green bandana, (4) a stocky short-haired mostly black one with a white chest, a friendly big smile with tongue out and a yellow bandana, (5) the tiniest one, much smaller than the others, a white balloon-round little dog on thin legs with a small slim head, crazy crossed eyes and a funny snarl, in a rainbow-striped knitted sweater with a purple neck band, rolling along like a balloon. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## portada-6.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `289bea5ee0f57a26c251f6c4926a81457e97c3d8331d3752962e9fe09b2500dd.jpg`
- Referencias: #33 dog-chia-1, dog-oreo-1, dog-chocolate-1 + dog-gustavo-5 + dog-catrina-6 (3.er intento: el 1.º tenía un bloque liso a la izquierda y el 2.º solo traía 4 perros)
- Recorte: ninguno (opaca)
- Prompt:

> Five chihuahuas racing toward the camera down a backyard dirt track, chaotic and hilarious: one riding on another's back, one tripping, kibbles flying, a big shiny bone at the finish line, a cheering crowd of garden gnomes, papel picado overhead, the left third of the image calmer for a title. One continuous seamless scene from edge to edge, the grass and dirt track blending naturally across the whole width, no split panel, no hard vertical edge. Exactly five dogs, all clearly visible: (1) a fluffy apricot-cream long-haired one in a red bandana, (2) a white long-haired one with black patches and black ears in a blue bandana, (3) a chubby chocolate-brown one in a green bandana, (4) a stocky short-haired mostly black one with a white chest, a friendly big smile with tongue out and a yellow bandana, (5) the tiniest one, much smaller than the others, a white balloon-round little dog on thin legs with a small slim head, crazy crossed eyes and a funny snarl, in a rainbow-striped knitted sweater with a purple neck band, rolling along like a balloon. The calm left third is still fully painted backyard: the wooden fence, sky, trees, flowers and lawn continue there with the same detail and lighting, no blank color block, no blurred panel. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.


---

# Tanda 4 (feedback del 18 de octubre, tarde): Gustavo delgado, cabeza de manzana, boca cerrada y serio

Mismo proceso: GenerateImage de Grok Bot (1280×720), Real-ESRGAN `realesr-animevideov3` ×2 + Lanczos, recorte sobre magenta (alfa suave por distancia, erosión 5 px, difuminado 1.5 px, se quita la mezcla del fondo y despill en una franja de borde), WebP q92. Las caras salieron como busto sentado y se recortaron al 80 % superior (cabeza + paliacate).

## dog-gustavo-7.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `a56772e99af3d9e3247d4e502d5f64c7d10ca967c7678fc35ac2cde88f2a338d.jpg`
- Referencias: gustavo-2.jpg, gustavo-3.jpg, #33 dog-chocolate-1 (estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a slim, lean short-haired male chihuahua with a slender athletic body, narrow waist and tucked-up belly (not fat, no belly), a smooth short coat that is mostly black: black back, sides and hips, a white chest and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, a classic apple-head chihuahua skull: round domed apple-shaped head with a short little muzzle, black upright ears with one ear slightly bent, a calm serious composed expression with his mouth closed, no smile, no teeth, no tongue visible, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-7.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `0c252df9c2738fb8da223ef6edce1441b2fee4edbdcbd1658f438ebfa3126382.jpg`
- Referencias: dog-gustavo-7, gustavo-2.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a slim, lean short-haired male chihuahua with a slender athletic body, narrow waist and tucked-up belly (not fat, no belly), a smooth short coat that is mostly black: black back, sides and hips, a white chest and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, a classic apple-head chihuahua skull: round domed apple-shaped head with a short little muzzle, black upright ears with one ear slightly bent, a calm serious composed expression with his mouth closed, no smile, no teeth, no tongue visible, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-8.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `5a6c52104858d1b4d41e0f84bab0d3dc84ed883c5d7acf13fb26355089facf52.jpg`
- Referencias: gustavo-1.jpg, gustavo-3.jpg, #33 dog-chocolate-1 (estilo). 2.º intento: el 1.º (con #33 dog-oreo-1 de estilo) salió de pelo largo, parecido a Oreo
- Recorte: magenta
- Prompt:

> A full-body side view of a slim, lean short-haired male chihuahua with a slender athletic body, narrow waist and tucked-up belly (not fat, no belly), a smooth short coat that is mostly black: black back, sides and hips, a white chest and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, a classic apple-head chihuahua skull: round domed apple-shaped head with a short little muzzle, black upright ears with one ear slightly bent, a calm serious composed expression with his mouth closed, a slightly stern dignified look, no smile, no teeth, no tongue visible, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Sleek smooth short coat everywhere, no long fur, no fluffy tail or ear fringes. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-8.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `10254108e09a527c5176c12adcadbbaf8859827cfce92096ac819ca446cfb393.jpg`
- Referencias: dog-gustavo-8, gustavo-1.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a slim, lean short-haired male chihuahua with a slender athletic body, narrow waist and tucked-up belly (not fat, no belly), a smooth short coat that is mostly black: black back, sides and hips, a white chest and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, a classic apple-head chihuahua skull: round domed apple-shaped head with a short little muzzle, black upright ears with one ear slightly bent, a calm serious composed expression with his mouth closed, a slightly stern dignified look, no smile, no teeth, no tongue visible, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## dog-gustavo-9.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `8a0c73354cc7bdb839690faa4ff782d856a0136cbb6cbc15f6bfba6b4b40fdc6.jpg`
- Referencias: gustavo-3.jpg, gustavo-2.jpg, #33 dog-chia-1 (estilo)
- Recorte: magenta
- Prompt:

> A full-body side view of a slim, lean short-haired male chihuahua with a slender athletic body, narrow waist and tucked-up belly (not fat, no belly), a smooth short coat that is mostly black: black back, sides and hips, a white chest and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, a classic apple-head chihuahua skull: round domed apple-shaped head with a short little muzzle, black upright ears with one ear slightly bent, a calm serious composed expression with his mouth closed, alert focused eyes and a determined look, no smile, no teeth, no tongue visible, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, running at full gallop toward the right, mid-stride with all four paws visible, ears flapping in the wind, race-day energy, centered, the dog fills about 80 percent of the width and its paws rest on an invisible line at 85 percent of the height, no ground, no shadow. Match the art style of the cartoon chihuahua style reference image; the dog's markings follow the photo references. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.

## face-gustavo-9.webp

- Herramienta: GenerateImage (Grok Bot)
- Original: `2c479d5b782936bf73ec12476df9857e2a4eae898e3af85306b9620ff9580c94.jpg`
- Referencias: dog-gustavo-9, gustavo-2.jpg
- Recorte: magenta
- Prompt:

> A front-facing head-and-shoulders portrait of a slim, lean short-haired male chihuahua with a slender athletic body, narrow waist and tucked-up belly (not fat, no belly), a smooth short coat that is mostly black: black back, sides and hips, a white chest and white paws, a white blaze down the middle of his face, small tan eyebrow dots and tan cheeks, a classic apple-head chihuahua skull: round domed apple-shaped head with a short little muzzle, black upright ears with one ear slightly bent, a calm serious composed expression with his mouth closed, alert focused eyes and a determined look, no smile, no teeth, no tongue visible, wearing only a bright yellow (#f2b51f) racing bandana around the neck, no diaper, no clothes, no collar, looking straight at the viewer, centered, the head fills a circle of about 90 percent of the image, no body below the chest. No circle, no frame, no disc behind the head. Strict symmetrical frontal view, nose pointing straight at the camera, both ears and both eyes fully visible, not three-quarter, not profile. Same character design as the reference image. Isolated on a plain flat solid magenta (#ff00ff) background. Style guide: polished cartoon illustration for a family mobile game, like a still from a high-end animated feature film: soft painterly shading, rich saturated colors, clean bold readable silhouettes with a thin dark brown outline (#3a2a1c), warm sunny backyard light from the top left, playful and funny, exaggerated cute proportions (big head, big expressive eyes, short legs). Original character design, not a copy of any existing brand, film, mascot or game. Highly detailed, crisp edges, ultra high resolution, must stay sharp when shown large on a 4K TV and still read clearly as a small icon on a phone. No text, no letters, no numbers, no watermark, no logo.
