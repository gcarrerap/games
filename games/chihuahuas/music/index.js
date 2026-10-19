// Las canciones de fondo de la carrera (el pool que toca modules/music). Para agregar una: soltar el .mp3 en esta
// carpeta (128 kbps, ver el README del juego), añadir su línea aquí y anotar su origen y licencia en el README.
const song = (file) => new URL(`./${file}`, import.meta.url).href;

export const SONGS = [
  // Marimba Jaroche, de Guillermo, hecha con la versión gratuita de Suno: puede tener restricciones de uso comercial
  // (ver el README del juego)
  song("marimba-jaroche.mp3"),
];
