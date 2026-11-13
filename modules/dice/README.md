# dice

Dados en 3D con CSS para cualquier juego: un cubo con sus seis caras que vuela, rebota y cae en su cara, en una
bandeja con paño y una repisa para apartar. Salió de Yatzi; lo usan Yatzi (pips) y Piojos (dados de póker).

| Función (`index.js`, puro) | Qué hace |
|---|---|
| `SHOW`, `FACE_AT` | El giro del cubo que deja cada lugar (1–6) al frente, y dónde va cada cara. Opuestos suman 7. |
| `pickSpots(n, box, d, rnd?)` | Lugares para n dados de tamaño d dentro de la caja, sin encimarse si caben. |

| Interfaz (`ui.js`) | Qué hace |
|---|---|
| `createTray(host, sound, { faces? })` | Arma la bandeja en `host` (le pone `dz-tray`). `faces(lugar)` da el HTML de cada cara (pips por omisión). Da `roll(valores, apartados, { power, onDone, slot })` (los no apartados vuelan; cada bote llama `sound.impact`), `place(valores, apartados, { idle, smooth, slot, dim })`, `startRattle(apartados)` / `setPower(p)` / `stopRattle(regresar, apartados, opciones)` (sacudir en la mano; llama `sound.rattle`), `burst(html, clase)` (destello sobre el paño), `glow(índices)`, `hint(índices)`, `tappable(sí)`, `onTap(fn)`, `stopAll()`, `busy`, `rattling`. Los valores son lugares del cubo (1–6). `slot[i]`: en qué hueco de la repisa va el dado i. |
| `dieHTML(i, faces?)`, `pipFace(v)`, `miniDie(v, tamaño)`, `cubeTransform(x, y)` | El dibujo de un dado; un dado de pips chiquito en SVG. |
| `createDiceSounds(synth)` | Con `createSynth` de `modules/sfx`: `rattle(fuerza)`, `impact(fuerza)`, `hold(apartado)` y `knock(t, fuerza, tono)`. |
| `wireRollButton(botón, { canRoll, press, release, cancel, tap })` | Un toque tira; apretado sacude hasta soltar (`release(fuerza)`, más fuerza cuanto más tiempo). |
| `DICE_STYLES` | La hoja de estilos. Cárgala **antes** que la del juego: el juego pone el marco (fondo de `.dz-tray`), la altura y los colores con las variables `--dz-felt-1..4`, `--dz-wood`, `--dz-ivory`, `--dz-pip`, `--dz-gold`… |

**Por qué los valores son lugares y no caras:** así el módulo no sabe qué hay pintado. Yatzi usa el número como lugar;
Piojos pone el 9 en el lugar 1 y el As en el 6.
