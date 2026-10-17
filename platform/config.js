// Configuración de Firebase. Proyecto propio de este sitio: gcarrerap-games (antes compartía dominomx con Noli,
// La Pata y myDomino). Para usar tu propio proyecto, reemplaza estos valores (ver "Firebase" en el README).
// La apiKey no es secreta: termina en el navegador de todos modos. La protegen las reglas de firestore.rules y la
// restricción por sitio web en Google Cloud (README).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzm1KFNCIQANotSk9u4ZHEW5-X9OKD9UQ",
  authDomain: "gcarrerap-games.firebaseapp.com",
  projectId: "gcarrerap-games",
  storageBucket: "gcarrerap-games.firebasestorage.app",
  messagingSenderId: "864715191838",
  appId: "1:864715191838:web:ab6bf0023e2134145a200f"
};

// Servidor TURN para las llamadas de voz y video (opcional). Sin él se usa solo STUN: funciona en la mayoría de las
// redes, pero no detrás de algunos firewalls. Ver scripts/turn-worker.js en myPata.
window.TURN_URL = "";
