// Preferencias de este dispositivo en localStorage. Nunca truena: si el navegador bloquea el almacenamiento
// (modo privado, permisos), get devuelve null y set no hace nada.
//
// Todas las claves llevan prefijo: este sitio comparte dominio (gcarrerap.github.io) con myDomino, y por lo tanto
// comparte localStorage. myDomino usa "dom.*"; aquí todo va bajo "juegos." y lo de cada juego bajo "juegos.<id>.".
export const PREFIX = "juegos";

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

// prefs("juegos") para lo del sitio; gamePrefs("domino") para lo de un juego
export function createPrefs(ns) {
  const key = (k) => `${ns}.${k}`;
  const api = {
    ns,
    get(k) { try { const s = store(); return s ? s.getItem(key(k)) : null; } catch { return null; } },
    set(k, v) { try { const s = store(); if (s) s.setItem(key(k), String(v)); } catch {} },
    remove(k) { try { const s = store(); if (s) s.removeItem(key(k)); } catch {} },
    getJSON(k, fallback = null) { const v = api.get(k); if (v === null) return fallback; try { return JSON.parse(v); } catch { return fallback; } },
    setJSON(k, v) { api.set(k, JSON.stringify(v)); },
  };
  return api;
}

export const prefs = createPrefs(PREFIX);
export const gamePrefs = (gameId) => createPrefs(`${PREFIX}.${gameId}`);
