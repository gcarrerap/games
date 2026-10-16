# random

Azar reproducible, sin dependencias. Sirve para pruebas, simulaciones y para que la compu tome siempre la misma decisión ante la misma situación cuando así se quiere.

| Función | Qué hace |
|---|---|
| `seededRandom(seed)` | Generador con semilla (mulberry32). `seed` es número o texto. Devuelve `rnd()` con valores en [0, 1), siempre la misma sucesión para la misma semilla. |
| `hash32(text)` | Hash de texto a entero de 32 bits (FNV-1a). |
| `unitFor(key)` | Número fijo en [0, 1) para una clave: el mismo cada vez. Útil para "¿este bot recuerda este evento?" sin guardar estado. |

**Lo usan:** dominó (memoria de la compu, torneos).
