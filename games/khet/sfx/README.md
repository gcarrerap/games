# Voz del narrador

Los efectos del Láser (zumbido, rebotes, escudo, explosión, mover, girar, fanfarria) se sintetizan en el navegador
con Web Audio (`ui/sound.js`): no hay archivos. Lo único grabado es la voz del narrador, en español, hecha con
**Fish Audio** (voz "Narrator" de la cuenta de Guillermo) con el flujo `FishBatchTextToSpeech` de
`gcarrerap/api-access`, modelo `s2.1-pro`. Luego se recortó el silencio, se igualó el volumen (−16 LUFS) y se le dio
un eco corto de templo con ffmpeg:

```
ffmpeg -i in.mp3 -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,aecho=0.8:0.6:60|120:0.18|0.10,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.15" -ac 1 -b:a 64k voz-<llave>.mp3
```

| Archivo | Texto | Cuándo suena |
|---|---|---|
| `voz-inicio.mp3` | Que comience el duelo de los faraones. | Al abrir una partida nueva |
| `voz-turno-plata.mp3`, `voz-turno-rojo.mp3` | Turno de Plata. / Turno de Rojo. | En la tele y en el mismo aparato, al cambiar de turno |
| `voz-tu-turno.mp3` | Tu turno. | En línea, en tu teléfono, cuando te toca |
| `voz-destruida.mp3` | ¡Pieza destruida! | El láser rompe una pieza del otro |
| `voz-fuego-propio.mp3` | ¡Cuidado! Fuego amigo. | El láser rompe una pieza propia |
| `voz-anubis.mp3` | ¡Anubis resiste! | El escudo detiene el láser (tele, mismo aparato y práctica) |
| `voz-faraon-cae.mp3` | ¡El faraón ha caído! | Fin de la partida |
| `voz-gana-plata.mp3`, `voz-gana-rojo.mp3`, `voz-empate.mp3` | ¡Victoria para Plata! … | Resultado |

Para regenerar una línea: correr `FishBatchTextToSpeech` con
`[{"f": "khet/<llave>.mp3", "t": "<texto>", "v": "d4fd850650464e8fa6d8bfce6f187374"}]`, bajarla de la rama
`audio-temp` y pasarla por el ffmpeg de arriba.
