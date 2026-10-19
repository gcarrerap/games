// Las canciones de fondo de la carrera (el pool que toca modules/music). Para agregar una: soltar el .mp3 en esta
// carpeta (128 kbps, ver el README del juego) y añadir su línea aquí.
const song = (file) => new URL(`./${file}`, import.meta.url).href;

export const SONGS = [
  song("marimba-jaroche.mp3"), // Marimba Jaroche, de Guillermo (hecha con Suno)
];
