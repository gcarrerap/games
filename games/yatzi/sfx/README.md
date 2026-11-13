# Voz del locutor

Los efectos de Yatzi (dados, campanitas, fanfarria) se sintetizan en el navegador (`ui/sound.js`). Lo grabado es la
voz del locutor, en español, hecha con **Fish Audio** (voz "Narrator" de la cuenta de Guillermo) con el flujo
`FishBatchTextToSpeech` de `gcarrerap/api-access`, modelo `s2.1-pro`, temperatura 0.7. Luego se recortó el silencio y
se igualó el volumen (−16 LUFS):

```
ffmpeg -i in.mp3 -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.15" -ac 1 -b:a 64k voz-<llave>.mp3
```

| Archivo | Texto | Cuándo suena |
|---|---|---|
| `voz-inicio.mp3` | ¡A rodar los dados! | Al empezar una partida |
| `voz-yatzi.mp3` | ¡Yatzi! | Caen cinco iguales |
| `voz-yatzi-extra.mp3` | ¡Otro Yatzi! ¡Cien puntos extra! | Se anota un Yatzi extra con bono |
| `voz-escalera-grande.mp3`, `voz-escalera-chica.mp3`, `voz-full.mp3`, `voz-poker.mp3`, `voz-tercia.mp3` | ¡Escalera grande! … | Cae esa combinación y su casilla está libre (una vez por turno) |
| `voz-ultimo-tiro.mp3` | Último tiro. | Te queda un tiro y no salió nada que anunciar |
| `voz-tacha.mp3` | Ni modo... a tachar. | A veces, al anotar 0 |
| `voz-bono.mp3` | ¡Bono! Treinta y cinco puntos más. | Se completa el bono de arriba |
| `voz-tu-turno.mp3` | Tu turno. | En línea, en tu teléfono |
| `voz-siguiente.mp3` | Pásale los dados al siguiente. | En el mismo aparato, al cambiar de turno |
| `voz-gana.mp3`, `voz-empate.mp3`, `voz-record.mp3`, `voz-fin.mp3` | ¡Tenemos ganador! … | Al terminar |

Para regenerar una línea: correr `FishBatchTextToSpeech` con
`[{"f": "yatzi/<llave>.mp3", "t": "<texto>", "v": "d4fd850650464e8fa6d8bfce6f187374"}]`, bajarla de la rama
`audio-temp` y pasarla por el ffmpeg de arriba.
