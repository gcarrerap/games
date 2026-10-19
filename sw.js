// Service worker del sitio (heredado de myDomino #19). Para los archivos del propio sitio, pide siempre primero al servidor y obliga a
// confirmar que el archivo sigue igual (cache: "no-cache"), así el navegador nunca se queda con una versión vieja.
// Guarda una copia de cada archivo para usarla solo si no hay conexión (la práctica contra la compu funciona sin internet).
// Firebase, Google y cualquier otro sitio no pasan por aquí. La música tampoco: el <audio> la pide por pedazos
// (Range → 206) y una respuesta parcial no se puede guardar. Los efectos (…/sfx/*.mp3) sí: se piden enteros, son
// chicos, y así la práctica los tiene sin conexión.
const PREFIX = "juegos-";
const CACHE = PREFIX + "v1"; // distinto de los de Noli, La Pata y myDomino: viven en el mismo dominio

// Decide qué hacer con una petición; devuelve una promesa de respuesta, o null para no intervenir
function handle(request, origin) {
  if (request.method !== "GET") return null;
  if (new URL(request.url).origin !== origin) return null;
  if (isMedia(request)) return null;
  return networkFirst(request);
}

function isSfx(request) {
  return /\/sfx\/[^/?#]+\.mp3(\?|$)/i.test(new URL(request.url).pathname);
}

function isMedia(request) {
  const range = request.headers && typeof request.headers.get === "function" && request.headers.get("range");
  if (range) return true;
  if (isSfx(request)) return false;
  return request.destination === "audio" || request.destination === "video" || /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(request.url);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response && response.status === 200) await cache.put(request, response.clone()).catch(() => {}); // sin copia, pero la respuesta sigue
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
