# Voz del narrador

Los efectos de Vikingos (oleaje de fondo, gota al escoger, crujido de madera y remolino al girar, golpe de pieza
trabada, campana de puerto, ola al reiniciar, cuerno vikingo y tambores) se sintetizan en el navegador con Web Audio
(`ui/sound.js`): no hay archivos. Lo único grabado es la voz del narrador, en español, hecha con **Fish Audio** (voz
"Narrator" de la cuenta de Guillermo) con el flujo `FishBatchTextToSpeech` de `gcarrerap/api-access`, modelo
`s2.1-pro`. Luego se recortó el silencio, se igualó el volumen (−16 LUFS) y se le dio un eco corto de fiordo:

```
ffmpeg -i in.mp3 -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,aecho=0.8:0.55:70|140:0.16|0.08,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.15" -ac 1 -b:a 64k voz-<llave>.mp3
```

| Archivo | Texto | Cuándo suena |
|---|---|---|
| `voz-inicio.mp3` | ¡Zarpamos, vikingos! Lleva cada barco a la flecha de su color. | Al empezar un reto (después del cuerno) |
| `voz-llega-rojo.mp3`, `-verde`, `-amarillo`, `-azul` | ¡El barco rojo llegó a puerto! … | Un barco llega a su flecha (si no es el último) |
| `voz-victoria.mp3` | ¡Todos los barcos a salvo! ¡Victoria vikinga! | Reto resuelto |
| `voz-perfecto.mp3` | ¡Perfecto! Lo lograste en el mínimo de movimientos. | Reto resuelto en el mínimo |
| `voz-trabada.mp3` | Esa pieza está trabada. | Tocar una pieza trabada (a lo más cada 6 s) |
| `voz-sin-barco.mp3` | Necesitas un barco para girar esa pieza. | Tocar una pieza sin barco (a lo más cada 6 s) |
| `voz-reiniciar.mp3` | ¡Volvemos a empezar! | Reiniciar |
| `voz-consejo.mp3` | (susurrando) Escucha al mar… | Al llegar un consejo (a lo más cada 90 s) |

Para regenerar una línea: correr `FishBatchTextToSpeech` con
`[{"f": "vikingos/<llave>.mp3", "t": "<texto>", "v": "d4fd850650464e8fa6d8bfce6f187374"}]`, bajarla de la rama
`audio-temp` y pasarla por el ffmpeg de arriba.
