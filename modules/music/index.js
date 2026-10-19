// Música de fondo para cualquier juego: la lista de canciones (pool) en orden barajado sin repetir la misma dos veces
// seguidas, y las preferencias de silencio y volumen. Puro: el azar entra como parámetro y el almacenamiento también
// (un objeto con getJSON/setJSON, como ctx.prefs). Lo que suena de verdad está en ui.js.

export const DEFAULTS = Object.freeze({ muted: false, volume: 0.4 });
export const PREF_KEY = "music";

// Volumen entre 0 y 1; lo que no sea número queda en el de por omisión
export function clampVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULTS.volume;
  return Math.min(1, Math.max(0, n));
}

// Lo guardado, o lo de por omisión si no hay nada o está mal
export function readSettings(store, key = PREF_KEY) {
  const saved = (store && typeof store.getJSON === "function" && store.getJSON(key, null)) || {};
  return {
    muted: typeof saved.muted === "boolean" ? saved.muted : DEFAULTS.muted,
    volume: "volume" in saved ? clampVolume(saved.volume) : DEFAULTS.volume,
  };
}

export function saveSettings(store, { muted, volume }, key = PREF_KEY) {
  if (store && typeof store.setJSON === "function") store.setJSON(key, { muted: !!muted, volume: clampVolume(volume) });
}

// Los índices 0…n-1 revueltos (Fisher-Yates con rnd). Si se da `avoidFirst`, ese no queda primero (cuando hay más de
// uno), para que al volver a barajar no suene dos veces seguidas la misma.
export function shuffleOrder(n, rnd, avoidFirst = -1) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a[0] === avoidFirst) [a[0], a[n - 1]] = [a[n - 1], a[0]];
  return a;
}

// La lista: next() da la siguiente canción. Se toca toda la lista barajada; al acabar se vuelve a barajar sin
// empezar con la que acaba de sonar. Con una sola canción, siempre es esa.
export function createPlaylist(songs, rnd = Math.random) {
  const list = [...(songs || [])].filter((s) => typeof s === "string" && s);
  let order = [], pos = 0, last = -1;
  return {
    size: list.length,
    next() {
      if (!list.length) return null;
      if (pos >= order.length) { order = shuffleOrder(list.length, rnd, last); pos = 0; }
      last = order[pos++];
      return list[last];
    },
  };
}
