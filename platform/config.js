// Configuración de Firebase. Para usar tu propio proyecto, reemplaza estos valores
// (ver "Firebase" en el README). Es el mismo proyecto que myDomino; las colecciones son otras (platform/services/).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDb1kqzLYwyZ6PdMQrXjlAGeeJhYlzXObM",
  authDomain: "dominomx.firebaseapp.com",
  projectId: "dominomx",
  storageBucket: "dominomx.firebasestorage.app",
  messagingSenderId: "330194849657",
  appId: "1:330194849657:web:a7d2e3e77c69d02fad69a8"
};

// Servidor TURN para las llamadas de voz y video (opcional). Sin él se usa solo STUN: funciona en la mayoría de las
// redes, pero no detrás de algunos firewalls. Ver scripts/turn-worker.js en myPata.
window.TURN_URL = "";
