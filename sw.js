// Service worker del sitio (heredado de myDomino #19). Para los archivos del propio sitio, pide siempre primero al servidor y obliga a
// confirmar que el archivo sigue igual (cache: "no-cache"), así el navegador nunca se queda con una versión vieja.
// Guarda una copia de cada archivo para usarla solo si no hay conexión (la práctica contra la compu funciona sin internet).
// Firebase, Google y cualquier otro sitio no pasan por aquí.
const PREFIX = "juegos-";
const CACHE = PREFIX + "v1"; // distinto de los de Noli, La Pata y myDomino: viven en el mismo dominio

// Decide qué hacer con una petición; devuelve una promesa de respuesta, o null para no intervenir
function handle(request, origin) {
  if (request.method !== "GET") return null;
  if (new URL(request.url).origin !== origin) return null;
  return networkFirst(request);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  // Borra SOLO cachés viejos de este sitio y toma control de las pestañas abiertas. Los cachés son por dominio, y en
  // gcarrerap.github.io viven también Noli, La Pata y myDomino: borrar todo lo que no sea CACHE les quitaría su copia
  // para jugar sin conexión.
  for (const key of await caches.keys()) if (key !== CACHE && key.startsWith(PREFIX)) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (event) => {
  const p = handle(event.request, self.location.origin);
  if (p) event.respondWith(p);
});

// Para las pruebas en Node
if (typeof module !== "undefined") module.exports = { handle, networkFirst, CACHE, PREFIX };
