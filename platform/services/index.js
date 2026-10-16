// Todo lo que toca el exterior: Firebase (sesión, mesas, grabaciones), localStorage y el service worker.
// Ningún otro lugar del sitio usa `firebase`, `localStorage` ni `navigator.serviceWorker` directo.
export { PREFIX, createPrefs, prefs, gamePrefs } from "./prefs.js";
export { loadFirebaseSdk, initFirebase, signInWithGoogle, signOut } from "./firebase.js";
export { TABLES, SKIP, makeDb, watchTableList, watchTable, saveNewTable, updateTable } from "./tables-repo.js";
export { RECORDINGS, MAX_RECORDING_CHARS, saveRecording } from "./recordings.js";
export { registerServiceWorker, fetchPublishedVersion } from "./updates.js";
export { CALLS, HEARTBEAT_MS, PEER_TTL_MS, newId, callSignaling, fetchIceServers } from "./call-signaling.js";
