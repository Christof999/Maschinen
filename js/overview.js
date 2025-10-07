import { database } from './firebase-config.js';
import { ref, get, set, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';

// Session Check
if (!sessionStorage.getItem('isLoggedIn')) {
    window.location.href = 'index.html';
}

const currentUser = sessionStorage.getItem('currentUser');
document.getElementById('current-user').textContent = `Angemeldet als: ${currentUser}`;

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
});

// Globale Variablen
let machines = [];
let typOptions = [];
let abteilungOptions = [];
let currentEditId = null;

// Datenbank Referenzen
const machinesRef = ref(database, 'machines');
const typOptionsRef = ref(database, 'options/typ');
const abteilungOptionsRef = ref(database, 'options/abteilung');

// Initialisierung
init();

async function init() {
    await loadTypOptions();
    await loadAbteilungOptions();
    await loadMachines();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    // Toggle Filter
    document.getElementById('toggle-filters-btn').addEventListener('click', () => {
        const filtersContainer = document.getElementById('filters-container');
        filtersContainer.style.display = filtersContainer.style.display === 'none' ? 'block' : 'none';
    });

    // Filter zurücksetzen
    document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);

    // Filter Inputs
    ['filter-fega-nr', 'filter-typ', 'filter-abteilung', 'filter-betr-std', 'filter-uvv-status', 'filter-kommentar'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyFilters);
    });

    // Neuer Eintrag
    document.getElementById('add-entry-btn').addEventListener('click', () => {
        currentEditId = null;
        document.getElementById('modal-title').textContent = 'Neuer Eintrag';
        document.getElementById('entry-form').reset();
        document.getElementById('edit-fega-nr').value = '';
        document.getElementById('fega-nr').disabled = false;
        showModal('entry-modal');
    });

    // Modal schließen
    document.querySelector('.close-modal').addEventListener('click', () => {
        hideModal('entry-modal');
    });

    document.getElementById('cancel-entry-btn').addEventListener('click', () => {
        hideModal('entry-modal');
    });

    // Formular speichern
    document.getElementById('entry-form').addEventListener('submit', handleSaveEntry);

    // Typ hinzufügen
    document.getElementById('add-typ-btn').addEventListener('click', () => {
        document.getElementById('option-field-type').value = 'typ';
        document.getElementById('add-option-title').textContent = 'Neuer Typ';
        showModal('add-option-modal');
    });

    // Abteilung hinzufügen
    document.getElementById('add-abteilung-btn').addEventListener('click', () => {
        document.getElementById('option-field-type').value = 'abteilung';
        document.getElementById('add-option-title').textContent = 'Neue Abteilung';
        showModal('add-option-modal');
    });

    // Option Modal schließen
    document.querySelectorAll('.close-add-option-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('add-option-modal');
        });
    });

    // Neue Option hinzufügen
    document.getElementById('add-option-form').addEventListener('submit', handleAddOption);
}

// Daten laden
async function loadMachines() {
    try {
        const snapshot = await get(machinesRef);
        if (snapshot.exists()) {
            machines = Object.entries(snapshot.val()).map(([id, data]) => ({
                id,
                ...data
            }));
        } else {
            machines = [];
        }
        renderTable();
    } catch (error) {
        console.error('Fehler beim Laden der Maschinen:', error);
    }
}

async function loadTypOptions() {
    try {
        const snapshot = await get(typOptionsRef);
        if (snapshot.exists()) {
            typOptions = snapshot.val();
        } else {
            typOptions = ['Magaziner'];
            await set(typOptionsRef, typOptions);
        }
        updateTypSelect();
    } catch (error) {
        console.error('Fehler beim Laden der Typ-Optionen:', error);
    }
}

async function loadAbteilungOptions() {
    try {
        const snapshot = await get(abteilungOptionsRef);
        if (snapshot.exists()) {
            abteilungOptions = snapshot.val();
        } else {
            abteilungOptions = ['Lager'];
            await set(abteilungOptionsRef, abteilungOptions);
        }
        updateAbteilungSelect();
    } catch (error) {
        console.error('Fehler beim Laden der Abteilungs-Optionen:', error);
    }
}

function updateTypSelect() {
    const select = document.getElementById('typ');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Bitte wählen...</option>';
    typOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
    if (currentValue) select.value = currentValue;
}

function updateAbteilungSelect() {
    const select = document.getElementById('abteilung');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Bitte wählen...</option>';
    abteilungOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
    if (currentValue) select.value = currentValue;
}

// Tabelle rendern
function renderTable(filteredMachines = null) {
    const tbody = document.getElementById('machines-tbody');
    const noDataMessage = document.getElementById('no-data-message');
    const machinesToRender = filteredMachines !== null ? filteredMachines : machines;

    tbody.innerHTML = '';

    if (machinesToRender.length === 0) {
        noDataMessage.style.display = 'block';
        return;
    }

    noDataMessage.style.display = 'none';

    machinesToRender.forEach(machine => {
        const row = document.createElement('tr');
        
        const uvvStatus = getUVVStatus(machine.uvvPsa);
        const uvvDate = formatUVVDate(machine.uvvPsa);
        
        row.innerHTML = `
            <td>${machine.fegaNr}</td>
            <td>${machine.typ}</td>
            <td>${machine.abteilung}</td>
            <td>${machine.betrStd || '-'}</td>
            <td><span class="uvv-status ${uvvStatus}">${uvvDate}</span></td>
            <td>${machine.kommentar || '-'}</td>
            <td>
                ${machine.lastChange ? `
                    <div class="last-change">
                        <div class="last-change-user">${machine.lastChange.user}</div>
                        <div>${new Date(machine.lastChange.timestamp).toLocaleString('de-DE')}</div>
                    </div>
                ` : '-'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editMachine('${machine.id}')">Bearbeiten</button>
                    <button class="btn btn-danger" onclick="deleteMachine('${machine.id}')">Löschen</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// UVV/PSA Status berechnen
function getUVVStatus(uvvDate) {
    console.log('getUVVStatus aufgerufen mit:', uvvDate, 'Typ:', typeof uvvDate);
    
    if (!uvvDate) {
        console.log('Kein Datum vorhanden -> ROT');
        return 'red';
    }
    
    let year, month;
    
    // Unterstütze beide Formate: "YYYY-MM" und "MM/YYYY"
    if (uvvDate.includes('-')) {
        // Format: "YYYY-MM" (vom input type="month")
        const parts = uvvDate.split('-');
        console.log('Datum gesplittet (YYYY-MM):', parts);
        
        if (parts.length !== 2) {
            console.log('Falsches Format -> ROT');
            return 'red';
        }
        
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
    } else if (uvvDate.includes('/')) {
        // Format: "MM/YYYY" (altes Format aus Datenbank)
        const parts = uvvDate.split('/');
        console.log('Datum gesplittet (MM/YYYY):', parts);
        
        if (parts.length !== 2) {
            console.log('Falsches Format -> ROT');
            return 'red';
        }
        
        month = parseInt(parts[0]);
        year = parseInt(parts[1]);
    } else {
        console.log('Unbekanntes Format -> ROT');
        return 'red';
    }
    
    console.log('Jahr:', year, 'Monat:', month);
    
    // Das eingegebene Datum ist das PRÜFDATUM
    const pruefDatum = new Date(year, month - 1, 1);
    
    const today = new Date();
    const currentDateObj = new Date(today.getFullYear(), today.getMonth(), 1);
    
    console.log('Prüfdatum Objekt:', pruefDatum);
    console.log('Heute Objekt:', currentDateObj);
    
    // Berechne wie viele Monate seit dem Prüfdatum vergangen sind
    const monthsSincePruefung = (currentDateObj.getFullYear() - pruefDatum.getFullYear()) * 12 + 
                                 (currentDateObj.getMonth() - pruefDatum.getMonth());
    
    console.log('Prüfdatum:', uvvDate, 'Monate seit Prüfung:', monthsSincePruefung);
    
    // Logik:
    // - Weniger als 11 Monate seit Prüfung → GRÜN
    // - Genau 11 Monate seit Prüfung → GELB
    // - 12 Monate oder mehr seit Prüfung → ROT
    
    let result;
    if (monthsSincePruefung >= 12) {
        result = 'red'; // Überfällig (12+ Monate)
        console.log('-> ROT (12+ Monate)');
    } else if (monthsSincePruefung === 11) {
        result = 'yellow'; // Warnung (11 Monate)
        console.log('-> GELB (11 Monate)');
    } else {
        result = 'green'; // Noch gültig (< 11 Monate)
        console.log('-> GRÜN (< 11 Monate)');
    }
    
    return result;
}

function formatUVVDate(uvvDate) {
    if (!uvvDate) return '-';
    
    // Unterstütze beide Formate
    if (uvvDate.includes('-')) {
        // Format: "YYYY-MM" → zu "MM/YYYY" konvertieren
        const parts = uvvDate.split('-');
        if (parts.length !== 2) return uvvDate;
        
        const year = parts[0];
        const month = parts[1];
        return `${month}/${year}`;
    } else if (uvvDate.includes('/')) {
        // Format: "MM/YYYY" → bereits richtig formatiert
        return uvvDate;
    }
    
    return uvvDate;
}

// Filter
function applyFilters() {
    const filters = {
        fegaNr: document.getElementById('filter-fega-nr').value.toLowerCase(),
        typ: document.getElementById('filter-typ').value.toLowerCase(),
        abteilung: document.getElementById('filter-abteilung').value.toLowerCase(),
        betrStd: document.getElementById('filter-betr-std').value.toLowerCase(),
        uvvStatus: document.getElementById('filter-uvv-status').value,
        kommentar: document.getElementById('filter-kommentar').value.toLowerCase()
    };

    const filtered = machines.filter(machine => {
        if (filters.fegaNr && !machine.fegaNr.toString().includes(filters.fegaNr)) return false;
        if (filters.typ && !machine.typ.toLowerCase().includes(filters.typ)) return false;
        if (filters.abteilung && !machine.abteilung.toLowerCase().includes(filters.abteilung)) return false;
        if (filters.betrStd && machine.betrStd && !machine.betrStd.toString().includes(filters.betrStd)) return false;
        if (filters.uvvStatus && getUVVStatus(machine.uvvPsa) !== filters.uvvStatus) return false;
        if (filters.kommentar && machine.kommentar && !machine.kommentar.toLowerCase().includes(filters.kommentar)) return false;
        
        return true;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('filter-fega-nr').value = '';
    document.getElementById('filter-typ').value = '';
    document.getElementById('filter-abteilung').value = '';
    document.getElementById('filter-betr-std').value = '';
    document.getElementById('filter-uvv-status').value = '';
    document.getElementById('filter-kommentar').value = '';
    renderTable();
}

// CRUD Operationen
async function handleSaveEntry(e) {
    e.preventDefault();
    
    const fegaNr = parseInt(document.getElementById('fega-nr').value);
    const typ = document.getElementById('typ').value;
    const abteilung = document.getElementById('abteilung').value;
    const betrStd = parseFloat(document.getElementById('betr-std').value) || null;
    const uvvPsa = document.getElementById('uvv-psa').value;
    const kommentar = document.getElementById('kommentar').value;
    
    const editId = document.getElementById('edit-fega-nr').value;
    const isEdit = editId !== '';
    
    // Check ob Fega Nr. bereits existiert (nur bei neuem Eintrag)
    if (!isEdit && machines.some(m => m.fegaNr === fegaNr)) {
        alert('Diese Fega Nr. existiert bereits!');
        return;
    }
    
    const machineData = {
        fegaNr,
        typ,
        abteilung,
        betrStd,
        uvvPsa,
        kommentar,
        lastChange: {
            user: currentUser,
            timestamp: new Date().toISOString()
        }
    };
    
    try {
        if (isEdit) {
            // Update
            await update(ref(database, `machines/${editId}`), machineData);
        } else {
            // Create - Verwende fegaNr als ID
            await set(ref(database, `machines/${fegaNr}`), machineData);
        }
        
        hideModal('entry-modal');
        await loadMachines();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern: ' + error.message);
    }
}

window.editMachine = function(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) return;
    
    document.getElementById('modal-title').textContent = 'Eintrag bearbeiten';
    document.getElementById('fega-nr').value = machine.fegaNr;
    document.getElementById('fega-nr').disabled = true;
    document.getElementById('typ').value = machine.typ;
    document.getElementById('abteilung').value = machine.abteilung;
    document.getElementById('betr-std').value = machine.betrStd || '';
    document.getElementById('uvv-psa').value = machine.uvvPsa;
    document.getElementById('kommentar').value = machine.kommentar || '';
    document.getElementById('edit-fega-nr').value = id;
    
    showModal('entry-modal');
}

window.deleteMachine = async function(id) {
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
        return;
    }
    
    try {
        await remove(ref(database, `machines/${id}`));
        await loadMachines();
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Fehler beim Löschen: ' + error.message);
    }
}

async function handleAddOption(e) {
    e.preventDefault();
    
    const fieldType = document.getElementById('option-field-type').value;
    const newValue = document.getElementById('new-option-value').value.trim();
    
    if (!newValue) return;
    
    try {
        if (fieldType === 'typ') {
            if (!typOptions.includes(newValue)) {
                typOptions.push(newValue);
                await set(typOptionsRef, typOptions);
                updateTypSelect();
                document.getElementById('typ').value = newValue;
            }
        } else if (fieldType === 'abteilung') {
            if (!abteilungOptions.includes(newValue)) {
                abteilungOptions.push(newValue);
                await set(abteilungOptionsRef, abteilungOptions);
                updateAbteilungSelect();
                document.getElementById('abteilung').value = newValue;
            }
        }
        
        hideModal('add-option-modal');
        document.getElementById('add-option-form').reset();
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Option:', error);
        alert('Fehler beim Hinzufügen: ' + error.message);
    }
}

// Modal Hilfsfunktionen
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Modal schließen bei Klick außerhalb
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

