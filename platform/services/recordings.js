// Partidas grabadas en Firestore (formato de modules/recording). Un documento por partida, con id fijo: si dos
// teléfonos de la misma mesa graban la misma partida, las reglas de Firestore solo dejan crearlo una vez
// (firestore.rules), así que nunca hay duplicados. Los teléfonos solo crean: no leen, no cambian, no borran.
//
// Colección propia ("juegos-grabaciones"), no la "manos" de myDomino: otro formato, otras reglas.
export const RECORDINGS = "juegos-grabaciones";
export const MAX_RECORDING_CHARS = 900000; // Firestore acepta documentos de hasta 1 MiB

export function saveRecording(db, id, rec) {
  const json = JSON.stringify(rec);
  if (json.length > MAX_RECORDING_CHARS) return Promise.reject(new Error("La grabación es demasiado grande"));
  return db.fs.doc(`${RECORDINGS}/${id}`).set({
    json, game: rec.game, v: rec.v, start: rec.start ?? null, actions: rec.actions.length, created: db.now(),
  });
}
