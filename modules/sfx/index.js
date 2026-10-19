// Efectos de sonido para cualquier juego: silencio y volumen propios (aparte de la música), y el pase de una llave
// al archivo que le toca. Puro: el almacenamiento entra como parámetro (un objeto con getJSON/setJSON, como
// ctx.prefs) y el reloj también. Lo que suena de verdad está en ui.js.

export const DEFAULTS = Object.freeze({ muted: false, volume: 0.6 });
export const PREF_KEY = "sfx";
// Por debajo de esto, repetir la misma llave no suena (pasitos y pagos se espacian en el juego).
export const DEFAULT_GAP_MS = 120;

// Volumen entre 0 y 1; lo que no sea número queda en el de por omisión
export function clampVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULTS.volume;
  return Math.min(1, Math.max(0, n));
}

// Lo guardado, o lo de por omisión si no hay nada o está mal. La llave por omisión es "sfx": no toca la de "music".
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

// La url del efecto, o null si esa llave no está (o no es un archivo). Sin archivo no hay error: no suena.
export function clipOf(catalog, key) {
  const v = catalog && catalog[key];
  return typeof v === "string" && v ? v : null;
}

// ¿Ya pasó suficiente desde la última vez que sonó esta llave? lastAt null = nunca ha sonado.
export function canRepeat(lastAt, now, gapMs = DEFAULT_GAP_MS) {
  if (lastAt == null || !Number.isFinite(now)) return true;
  const gap = Number.isFinite(gapMs) ? Math.max(0, gapMs) : DEFAULT_GAP_MS;
  return now - lastAt >= gap;
}

// Apunta la hora de cada llave. now lo pone quien llama (la interfaz pasa el reloj). gapFor(llave) da el mínimo
// en milisegundos; si no es función, es el mismo para todas.
export function createGate(gapFor = () => DEFAULT_GAP_MS) {
  const last = new Map();
  const gapOf = (key) => {
    const g = typeof gapFor === "function" ? gapFor(key) : gapFor;
    return Number.isFinite(g) ? Math.max(0, g) : DEFAULT_GAP_MS;
  };
  return {
    allow(key, now) {
      const prev = last.has(key) ? last.get(key) : null;
      if (!canRepeat(prev, now, gapOf(key))) return false;
      last.set(key, now);
      return true;
    },
    reset() { last.clear(); },
  };
}
