# Geografía

Juego de geografía de 1 a 4 personas, por turnos (también en el mismo aparato) o contra la compu. Cuatro modos, que se juegan por separado o mezclados:

| Modo | Pregunta | Cómo se contesta |
|---|---|---|
| 🌎 Continentes | ¿En qué continente está este país? | Seis botones o tocar el mapa de colores |
| 🗺️ Siluetas | ¿De qué país es esta forma? | Opciones o escribiendo el nombre |
| 📍 Ubica en el mapa | Clava un pin donde está el país | Mapa con zoom; con o sin división política |
| 🚩 Banderas | ¿De quién es esta bandera? | Opciones o escribiendo el nombre |

**Niveles:** Fácil (60 países conocidos, 4 opciones), Medio (~125, 4 opciones), Difícil (197, 6 opciones parecidas) y Experto (197, se escribe el nombre con lista de ayuda). **Regiones:** mundo, África, América, Asia, Europa u Oceanía. **Preguntas por jugador:** 5, 10, 20 o 30.

**Puntos:** hasta 100 por pregunta; +10 por cada acierto seguido desde el segundo (tope +50); con reloj hasta +25 por rapidez; usar la pista reduce el acierto a la mitad. En el pin, los puntos bajan con la distancia (`100·e^(−(d−tolerancia)/escala)`, la escala depende del nivel) y cuenta como acierto con 60 o más.

Los seis continentes son los de América: Centroamérica y el Caribe van con Norteamérica. Los países en dos continentes (Rusia, Turquía, Kazajistán, Egipto, Georgia, Armenia, Azerbaiyán, Chipre) aceptan los dos. Banderas casi idénticas (Indonesia/Mónaco, Rumania/Chad) nunca salen juntas y, al escribir, vale cualquiera de las dos. La lista tiene los 193 miembros de la ONU más Vaticano, Palestina, Kosovo y Taiwán (197).

## Estructura

- `engine/` (puro): `geo.js` (geometría decodificada, punto en polígono, distancia, proyecciones Tierra Igual y acimutal de Lambert), `catalog.js` (países, niveles, regiones, buscador de nombres), `index.js` (reglas conforme al contrato).
- `ai/`: tres estilos de compu (aprendiz, viajero, geógrafo) que conocen más o menos países.
- `ui/`: `index.js` (la mesa), `world.js` (el mapa en canvas), `art.js` (siluetas y banderas), `sound.js` (sonidos sintetizados con `modules/sfx`).
- `data/world.js` y `assets/flags/`: generados (ver abajo). No se cargan desde el portal, solo al abrir el juego.

## Los datos

El mapa se guarda comprimido por país (pasos de 0,005°, varint con zigzag en base64, ~290 KiB); `scripts/geografia-datos.mjs` lo genera a mano (no es un paso de compilación):

```
node scripts/geografia-datos.mjs <world-atlas> <countries.json> <flags/4x3> games/geografia
```

(con `SVGO=<ruta a svgo-node.js>` comprime las banderas). Fuentes y licencias: [Natural Earth](https://www.naturalearthdata.com/) 50 m (dominio público; Tuvalu, del de 10 m) vía `world-atlas` (ISC); nombres en español, regiones y centros de `world-countries` (ODbL); banderas de `flag-icons` 4×3 (MIT).

## Pruebas

`npm test` (`tests/games/geografia/engine.test.js`: datos, geometría, proyecciones, catálogo, reglas, pista, compu y partidas completas) y `python3 tests/browser/geografia.py` (navegador de verdad: los cuatro modos, pista, escribir, sonido, ventanas, teclado, dos personas en un aparato y el final).
