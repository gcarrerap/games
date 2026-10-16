// Aviso de versión nueva (heredado de myDomino #19): mientras el sitio está abierto, revisa cada rato si se publicó
// otra versión. No recarga sola: así no interrumpe a nadie a media partida; la interfaz muestra
// "Hay una versión nueva · Actualizar".
import { VERSION } from "../version.js";
import { fetchPublishedVersion, registerServiceWorker } from "../services/index.js";

export const UPDATE_CHECK_EVERY_MS = 5 * 60 * 1000;

// Devuelve la versión publicada si es distinta de la que corre, o null
export async function checkForUpdate(fetchVersion = fetchPublishedVersion, current = VERSION) {
  const published = await fetchVersion();
  return published && published !== current ? published : null;
}

// Activa el service worker y revisa cada 5 minutos y cada vez que la pestaña vuelve a verse.
// onUpdate(version) se llama una vez, cuando aparece una versión nueva. Devuelve cómo dejar de revisar.
export function startUpdateChecks(onUpdate, { fetchVersion = fetchPublishedVersion } = {}) {
  let found = false;
  const check = async () => { if (found) return; const v = await checkForUpdate(fetchVersion); if (v) { found = true; onUpdate(v); } };
  registerServiceWorker();
  const timer = setInterval(check, UPDATE_CHECK_EVERY_MS);
  const onVisible = () => { if (document.visibilityState === "visible") check(); };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
  return () => { clearInterval(timer); if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible); };
}
