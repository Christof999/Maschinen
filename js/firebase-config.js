// Firebase Konfiguration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';

// Ihre Firebase Konfiguration
const firebaseConfig = {
    databaseURL: "https://uvvuebersicht-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };

