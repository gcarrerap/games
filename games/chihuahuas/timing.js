// Cuánto tarda en verse el arranque de una partida: la portada (#56) y luego la salida de los perros (ui/fx.js). Vive
// aparte de ui/ porque también lo usa el adaptador (index.js): el primer turno cuenta este tiempo de más, para que la
// compu no juegue con la portada encima y el primer jugador no pierda tiempo de su reloj. Puro: solo números.

// La portada a pantalla completa, con su entrada y salida suaves incluidas
export const COVER_MS = 3000;
// Si la imagen de la portada tarda más que esto en cargar, se salta y se va directo al tablero
export const COVER_WAIT_MS = 1000;

// La salida: cada perro entra a su casilla, uno tras otro
export const INTRO = { gap: 420, run: 650 };
export const introMs = (n) => n * INTRO.gap + INTRO.run + 300;

// Lo más que tarda el arranque completo de una partida de n perros (esperar la imagen, la portada y la salida)
export const startMs = (n) => COVER_WAIT_MS + COVER_MS + introMs(n);
