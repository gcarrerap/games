// Mesas en Firestore. Una colección para todos los juegos; cada mesa dice de qué juego es (campo `game`).
// El documento guarda la mesa completa como texto JSON (Firestore no acepta listas dentro de listas) más code,
// game, created y updated para ordenar y filtrar. La forma de la mesa está en platform/app/table.js.
//
// La colección NO es "mesas": esa es de myDomino, que vive en el mismo proyecto de Firebase. Si las dos
// compartieran colección, los teléfonos con myDomino verían (y su limpieza borraría) las mesas de aquí.
export const TABLES = "juegos-mesas";

export const SKIP = {}; // un cambio que al final no hace falta guardar

// Adaptador sobre Firestore (SDK compat). now: reloj, para poder probarlo.
export function makeDb(fs, now = () => Date.now()) {
  // updated: cuándo se guardó por última vez (ms), para saber cuánto lleva sin cambios
  const wrap = (snap) => ({ exists: snap.exists, data: () => (snap.exists ? JSON.parse(snap.data().json) : undefined), updated: snap.exists ? snap.data().updated : undefined });
  const pack = (t) => ({ json: JSON.stringify(t), code: t.code, game: t.game, created: t.created || now(), updated: now() });
  const docApi = (ref) => ({
    _ref: ref,
    onSnapshot: (ok, bad) => ref.onSnapshot((s) => ok(wrap(s)), bad),
    get: async () => wrap(await ref.get()),
    set: (t) => ref.set(pack(t)),
    delete: () => ref.delete(),
  });
  return {
    fs, pack, wrap, now,
    doc: (path) => docApi(fs.doc(path)),
    collection: (name) => {
      const q = (query) => ({
        orderBy: (f, d) => q(query.orderBy(f, d)),
        limit: (n) => q(query.limit(n)),
        onSnapshot: (ok, bad) => query.onSnapshot((snap) => ok({ docs: snap.docs.map(wrap) }), bad),
      });
      return q(fs.collection(name));
    },
  };
}

// Las mesas más recientes de un juego. Se filtra por juego aquí y no en Firestore: filtrar por `game` y ordenar
// por `created` a la vez pide un índice compuesto, que hay que crear a mano en la consola. Con pocas mesas
// abiertas a la vez, traer las últimas `scan` y filtrar alcanza.
// onList(list, updated): mesas de ese juego y, por código, cuándo se guardó cada una (ms). Devuelve cómo dejar de escuchar.
export function watchTableList(db, gameId, onList, onError, { scan = 50 } = {}) {
  return db.collection(TABLES).orderBy("created", "desc").limit(scan).onSnapshot((snap) => {
    const list = [], updated = {};
    for (const d of snap.docs) { const t = d.data(); if (t && t.game === gameId) { list.push(t); updated[t.code] = d.updated; } }
    onList(list, updated);
  }, onError);
}

// Una mesa. onTable recibe la mesa, o null si ya no existe; devuelve cómo dejar de escuchar.
export function watchTable(db, code, onTable, onError) {
  return db.doc(`${TABLES}/${code}`).onSnapshot((snap) => onTable(snap.exists ? snap.data() : null), onError);
}

export function saveNewTable(db, table) {
  if (!table.code || !table.game) throw new Error("La mesa necesita code y game");
  return db.doc(`${TABLES}/${table.code}`).set(table);
}

// Aplica un cambio a la mesa en una transacción: lee lo último, aplica fn y guarda.
// fn recibe una copia de la mesa y devuelve la nueva, null para borrarla, o SKIP para no guardar.
// Devuelve true si no hubo que guardar (SKIP). Truena si la mesa no existe, si fn truena o si Firestore rechaza el cambio.
export async function updateTable(db, code, fn) {
  const ref = db.fs.doc(`${TABLES}/${code}`);
  let skipped = false;
  await db.fs.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Esta mesa ya no existe.");
    const next = fn(structuredClone(JSON.parse(snap.data().json)));
    if (next === SKIP) { skipped = true; return; }
    if (next === null) tx.delete(ref); else tx.set(ref, db.pack(next));
  });
  return skipped;
}
