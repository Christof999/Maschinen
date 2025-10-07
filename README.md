# Maschinen Übersicht - Webapp

Eine Webanwendung zur Verwaltung und Überwachung von Maschinen mit UVV/PSA-Prüfungen.

## Features

- ✅ Login-System mit zwei Benutzern
- ✅ Übersichtstabelle mit allen Maschineneinträgen
- ✅ Dynamische Filter für alle Felder
- ✅ CRUD-Operationen (Erstellen, Lesen, Bearbeiten, Löschen)
- ✅ Dropdown-Felder mit Möglichkeit neue Optionen hinzuzufügen
- ✅ UVV/PSA Farbcodierung nach Datum:
  - 🟢 Grün: Noch gültig (mehr als 1 Monat)
  - 🟡 Gelb: Bald fällig (aktueller Monat)
  - 🔴 Rot: Überfällig (bereits abgelaufen)
- ✅ Logging von Änderungen (Benutzer + Zeitstempel)
- ✅ Firebase Realtime Database als Backend

## Installation

### 1. Firebase Konfiguration

Sie müssen in Ihrer Firebase Console folgende Schritte durchführen:

1. Gehen Sie zu: https://console.firebase.google.com/
2. Wählen Sie Ihr Projekt aus
3. Gehen Sie zu **Realtime Database** → **Regeln**
4. Setzen Sie die Regeln auf:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**WICHTIG:** Diese Regeln sind für Entwicklung/Test gedacht. Für Produktion sollten Sie Sicherheitsregeln implementieren!

### 2. Webapp starten

Da die App nur HTML, CSS und JavaScript verwendet, benötigen Sie einen lokalen Webserver:

#### Option A: Mit Python (empfohlen)

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Dann öffnen Sie: http://localhost:8000

#### Option B: Mit Node.js (http-server)

```bash
npx http-server -p 8000
```

#### Option C: Mit VS Code

Installieren Sie die Extension "Live Server" und klicken Sie auf "Go Live"

## Login-Daten

Die Anwendung hat zwei vordefinierte Benutzer:

- **Felix**
  - Benutzername: `Felix`
  - Passwort: `admin`

- **Rolf**
  - Benutzername: `Rolf`
  - Passwort: `admin`

## Verwendung

### Einträge erstellen

1. Klicken Sie auf "Neuer Eintrag"
2. Füllen Sie alle Pflichtfelder aus:
   - Fega Nr. (Primary Key, eindeutig)
   - Typ (auswählbar aus Dropdown)
   - Abteilung (auswählbar aus Dropdown)
   - UVV/PSA Datum (Monat/Jahr)
3. Optional: Betr. Std. (Betriebsstunden) und Kommentar
4. Klicken Sie auf "Speichern"

### Neue Dropdown-Optionen hinzufügen

1. Beim Erstellen/Bearbeiten eines Eintrags
2. Klicken Sie auf "+ Neu" neben Typ oder Abteilung
3. Geben Sie die neue Option ein
4. Die Option wird gespeichert und steht ab sofort zur Verfügung

### Einträge bearbeiten

1. Klicken Sie auf "Bearbeiten" in der gewünschten Zeile
2. Ändern Sie die Daten
3. Benutzer und Zeitstempel werden automatisch geloggt
4. Klicken Sie auf "Speichern"

### Filter verwenden

1. Klicken Sie auf "Filter anzeigen/ausblenden"
2. Geben Sie in die gewünschten Felder Ihre Suchkriterien ein
3. Die Tabelle wird automatisch gefiltert
4. Filter nach UVV/PSA-Status: Wählen Sie Grün/Gelb/Rot
5. "Filter zurücksetzen" löscht alle Filter

### UVV/PSA Farbcodierung

Die Farbe der UVV/PSA-Spalte ändert sich automatisch basierend auf dem heutigen Datum:

- **Grün**: Der Prüftermin liegt in der Zukunft (mehr als 1 Monat)
- **Gelb**: Der Prüftermin ist im aktuellen Monat (Warnung)
- **Rot**: Der Prüftermin ist abgelaufen (Überfällig)

## Struktur

```
Felix_Übersicht/
├── index.html          # Login-Seite
├── overview.html       # Hauptübersicht
├── css/
│   └── styles.css     # Alle Styles
├── js/
│   ├── firebase-config.js  # Firebase Konfiguration
│   ├── login.js            # Login-Logik
│   └── overview.js         # Hauptfunktionalität
└── README.md          # Diese Datei
```

## Technologien

- HTML5
- CSS3 (mit modernem Flexbox/Grid Layout)
- Vanilla JavaScript (ES6 Modules)
- Firebase Realtime Database
- Firebase JavaScript SDK 10.13.0

## Hinweise für Produktion

Für den produktiven Einsatz sollten Sie:

1. **Firebase Security Rules** implementieren
2. **Echte Authentifizierung** mit Firebase Auth einrichten
3. **HTTPS** verwenden
4. **Passwörter** sicher hashen
5. **Backup-Strategie** für die Datenbank einrichten

## Support

Bei Fragen oder Problemen kontaktieren Sie den Administrator.

