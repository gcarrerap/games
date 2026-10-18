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
