import { database } from './firebase-config.js';
import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';

// Vordefinierte Benutzer (können später in Firebase verwaltet werden)
const USERS = {
    'Felix': 'admin',
    'Rolf': 'admin'
};

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    // Benutzer validieren
    if (USERS[username] && USERS[username] === password) {
        // Login erfolgreich
        sessionStorage.setItem('currentUser', username);
        sessionStorage.setItem('isLoggedIn', 'true');
        
        // Speichere Login-Zeitpunkt für Änderungsverfolgung
        try {
            const userLastLoginRef = ref(database, `userLastLogin/${username}`);
            await set(userLastLoginRef, new Date().toISOString());
        } catch (error) {
            console.error('Fehler beim Speichern des Login-Zeitpunkts:', error);
        }
        
        window.location.href = 'overview.html';
    } else {
        // Login fehlgeschlagen
        errorMessage.textContent = 'Ungültiger Benutzername oder Passwort';
        errorMessage.classList.add('show');
        
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 3000);
    }
});

