# Voz del locutor

Hecha con **Fish Audio** (voz "Narrator" de la cuenta de Guillermo), flujo `FishBatchTextToSpeech` de
`gcarrerap/api-access`, modelo `s2.1-pro`, temperatura 0.7; recortada e igualada a −16 LUFS con el mismo ffmpeg de
`games/yatzi/sfx/README.md`. Los efectos (dados, campanitas, monedas, fanfarria) se sintetizan en el navegador.

| Archivo | Texto | Cuándo suena |
|---|---|---|
| `voz-inicio.mp3` | ¡A cazar piojos! | Al empezar una partida |
| `voz-sin-piojos.mp3` | ¡Sin piojos! Se fue todo. | Un tiro sin piojos |
| `voz-cinco.mp3` | ¡Cinco piojos! Tira los cinco otra vez. | Se apartan los cinco |
| `voz-ases.mp3` | ¡Puros ases! | Tres ases o más en un tiro |
| `voz-arriesgas.mp3` | ¿Te arriesgas? | A una persona que lleva 50 o más en el turno (no seguido) |
| `voz-planta.mp3` | Se planta. | Al plantarse |
| `voz-casi.mp3` | ¡Ya casi llega a la meta! | Quien se planta queda a 60 o menos de la meta |
| `voz-tu-turno.mp3` | Tu turno. | En línea, en tu teléfono |
| `voz-siguiente.mp3` | Pásale los dados al siguiente. | En el mismo aparato, al cambiar de turno |
| `voz-gana.mp3` | ¡Tenemos ganador! | Al terminar |

Para regenerar una línea: `FishBatchTextToSpeech` con
`[{"f": "piojos/<llave>.mp3", "t": "<texto>", "v": "d4fd850650464e8fa6d8bfce6f187374"}]`.
