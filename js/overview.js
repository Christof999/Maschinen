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
let herstellerOptions = [];
let abteilungOptions = [];
let currentEditId = null;

// Datenbank Referenzen
const machinesRef = ref(database, 'machines');
const herstellerOptionsRef = ref(database, 'options/hersteller');
const abteilungOptionsRef = ref(database, 'options/abteilung');
const changesRef = ref(database, 'changes');
const userLastLoginRef = ref(database, 'userLastLogin');

// Initialisierung
init();

async function init() {
    await loadHerstellerOptions();
    await loadAbteilungOptions();
    await loadMachines();
    setupEventListeners();
    
    // Prüfe auf Änderungen seit letztem Login
    await checkForChangesSinceLastLogin();
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
    ['filter-fega-nr', 'filter-hersteller', 'filter-model', 'filter-abteilung', 'filter-art-kundendienst', 'filter-betr-std', 'filter-uvv-status', 'filter-kommentar'].forEach(id => {
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

    // Hersteller hinzufügen
    document.getElementById('add-hersteller-btn').addEventListener('click', () => {
        document.getElementById('option-field-type').value = 'hersteller';
        document.getElementById('add-option-title').textContent = 'Neuer Hersteller';
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

    // Changes Modal schließen
    document.querySelectorAll('.close-changes-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('changes-modal');
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
            machines = Object.entries(snapshot.val()).map(([id, data]) => {
                // Migration: Falls altes "typ" Feld existiert aber kein "hersteller", verwende "typ" als "hersteller"
                if (data.typ && !data.hersteller) {
                    data.hersteller = data.typ;
                }
                
                return {
                    id,
                    ...data
                };
            });
        } else {
            machines = [];
        }
        renderTable();
    } catch (error) {
        console.error('Fehler beim Laden der Maschinen:', error);
    }
}

async function loadHerstellerOptions() {
    try {
        const snapshot = await get(herstellerOptionsRef);
        if (snapshot.exists()) {
            herstellerOptions = snapshot.val();
        } else {
            herstellerOptions = ['Magaziner'];
            await set(herstellerOptionsRef, herstellerOptions);
        }
        updateHerstellerSelect();
    } catch (error) {
        console.error('Fehler beim Laden der Hersteller-Optionen:', error);
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

function updateHerstellerSelect() {
    const select = document.getElementById('hersteller');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Bitte wählen...</option>';
    herstellerOptions.forEach(option => {
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
    const machineCountElement = document.getElementById('machine-count');
    const machinesToRender = filteredMachines !== null ? filteredMachines : machines;

    tbody.innerHTML = '';

    // Counter aktualisieren
    machineCountElement.textContent = machinesToRender.length;

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
            <td>${machine.hersteller || '-'}</td>
            <td>${machine.model || '-'}</td>
            <td>${machine.abteilung}</td>
            <td>${machine.artKundendienst || '-'}</td>
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
        hersteller: document.getElementById('filter-hersteller').value.toLowerCase(),
        model: document.getElementById('filter-model').value.toLowerCase(),
        abteilung: document.getElementById('filter-abteilung').value.toLowerCase(),
        artKundendienst: document.getElementById('filter-art-kundendienst').value.toLowerCase(),
        betrStd: document.getElementById('filter-betr-std').value.toLowerCase(),
        uvvStatus: document.getElementById('filter-uvv-status').value,
        kommentar: document.getElementById('filter-kommentar').value.toLowerCase()
    };

    const filtered = machines.filter(machine => {
        if (filters.fegaNr && !machine.fegaNr.toString().includes(filters.fegaNr)) return false;
        if (filters.hersteller && machine.hersteller && !machine.hersteller.toLowerCase().includes(filters.hersteller)) return false;
        if (filters.model && machine.model && !machine.model.toLowerCase().includes(filters.model)) return false;
        if (filters.abteilung && !machine.abteilung.toLowerCase().includes(filters.abteilung)) return false;
        if (filters.artKundendienst && machine.artKundendienst && !machine.artKundendienst.toLowerCase().includes(filters.artKundendienst)) return false;
        if (filters.betrStd && machine.betrStd && !machine.betrStd.toString().includes(filters.betrStd)) return false;
        if (filters.uvvStatus && getUVVStatus(machine.uvvPsa) !== filters.uvvStatus) return false;
        if (filters.kommentar && machine.kommentar && !machine.kommentar.toLowerCase().includes(filters.kommentar)) return false;
        
        return true;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('filter-fega-nr').value = '';
    document.getElementById('filter-hersteller').value = '';
    document.getElementById('filter-model').value = '';
    document.getElementById('filter-abteilung').value = '';
    document.getElementById('filter-art-kundendienst').value = '';
    document.getElementById('filter-betr-std').value = '';
    document.getElementById('filter-uvv-status').value = '';
    document.getElementById('filter-kommentar').value = '';
    renderTable();
}

// CRUD Operationen

window.editMachine = function(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) return;
    
    document.getElementById('modal-title').textContent = 'Eintrag bearbeiten';
    document.getElementById('fega-nr').value = machine.fegaNr;
    document.getElementById('fega-nr').disabled = true;
    // Fallback: Falls hersteller leer ist, verwende typ (für alte Daten)
    document.getElementById('hersteller').value = machine.hersteller || machine.typ || '';
    document.getElementById('model').value = machine.model || '';
    document.getElementById('abteilung').value = machine.abteilung;
    document.getElementById('art-kundendienst').value = machine.artKundendienst || '';
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
        // Hole Maschinendaten vor dem Löschen für die Verfolgung
        const machine = machines.find(m => m.id === id);
        
        await remove(ref(database, `machines/${id}`));
        
        // Verfolge Löschung
        if (machine) {
            await trackChange('deleted', id, machine);
        }
        
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
        if (fieldType === 'hersteller') {
            if (!herstellerOptions.includes(newValue)) {
                herstellerOptions.push(newValue);
                await set(herstellerOptionsRef, herstellerOptions);
                updateHerstellerSelect();
                document.getElementById('hersteller').value = newValue;
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

// Änderungsverfolgung
async function trackChange(type, machineId, machineData, oldData = null) {
    try {
        const changeData = {
            type: type, // 'created', 'updated', 'status_changed'
            machineId: machineId,
            machineData: machineData,
            oldData: oldData,
            user: currentUser,
            timestamp: new Date().toISOString()
        };
        
        const changeKey = `${Date.now()}_${currentUser}`;
        await set(ref(database, `changes/${changeKey}`), changeData);
    } catch (error) {
        console.error('Fehler beim Verfolgen der Änderung:', error);
    }
}

async function checkForChangesSinceLastLogin() {
    try {
        // Hole alle Maschinen mit Status gelb oder rot und sortiere sie (rot zuerst, dann gelb)
        const machinesWithYellowOrRedStatus = machines
            .filter(machine => {
                const status = getUVVStatus(machine.uvvPsa);
                return status === 'yellow' || status === 'red';
            })
            .sort((a, b) => {
                const statusA = getUVVStatus(a.uvvPsa);
                const statusB = getUVVStatus(b.uvvPsa);
                // Rot kommt vor Gelb
                if (statusA === 'red' && statusB === 'yellow') return -1;
                if (statusA === 'yellow' && statusB === 'red') return 1;
                return 0;
            });
        
        // Hole letzten Login-Zeitpunkt des aktuellen Nutzers
        const lastLoginSnapshot = await get(ref(database, `userLastLogin/${currentUser}`));
        let lastLoginTime = null;
        
        if (lastLoginSnapshot.exists()) {
            lastLoginTime = new Date(lastLoginSnapshot.val());
        }
        
        // Hole alle Änderungen seit dem letzten Login (für zusätzliche Info über Statuswechsel)
        const changesSnapshot = await get(changesRef);
        let recentStatusChanges = [];
        
        if (lastLoginTime && changesSnapshot.exists()) {
            const allChanges = changesSnapshot.val();
            const changesArray = Object.entries(allChanges).map(([key, change]) => ({
                key,
                ...change
            }));
            
            // Filtere Statuswechsel seit dem letzten Login
            recentStatusChanges = changesArray.filter(change => {
                const changeTime = new Date(change.timestamp);
                const isAfterLastLogin = changeTime > lastLoginTime;
                const isStatusChange = change.type === 'status_changed';
                
                return isAfterLastLogin && isStatusChange;
            });
            
            // Sortiere nach Zeitstempel (neueste zuerst)
            recentStatusChanges.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        // Debug: Log alle gefundenen Maschinen
        console.log('=== LOGIN POP-UP DEBUG ===');
        console.log('Aktueller Nutzer:', currentUser);
        console.log('Maschinen mit gelb/rot Status:', machinesWithYellowOrRedStatus.length);
        console.log('Statuswechsel seit letztem Login:', recentStatusChanges.length);
        console.log('================================');
        
        // Zeige Pop-up wenn Maschinen mit gelb/rot Status vorhanden sind
        if (machinesWithYellowOrRedStatus.length > 0) {
            showChangesModal(machinesWithYellowOrRedStatus, recentStatusChanges);
        }
        
    } catch (error) {
        console.error('Fehler beim Prüfen der Änderungen:', error);
    }
}

function showChangesModal(machinesWithYellowOrRed, recentStatusChanges = []) {
    const modal = document.getElementById('changes-modal');
    const changesList = document.getElementById('changes-list');
    
    changesList.innerHTML = '';
    
    // Zeige Anzahl der Maschinen im Header
    const modalTitle = modal.querySelector('h2');
    modalTitle.textContent = `Maschinen mit Status Gelb oder Rot (${machinesWithYellowOrRed.length})`;
    
    // Zeige alle Maschinen mit gelb/rot Status
    machinesWithYellowOrRed.forEach(machine => {
        const status = getUVVStatus(machine.uvvPsa);
        const statusText = {
            'yellow': 'Gelb',
            'red': 'Rot'
        };
        const statusClass = status === 'red' ? 'change-status-red' : 'change-status-yellow';
        
        // Prüfe ob es einen kürzlichen Statuswechsel für diese Maschine gab
        const recentChange = recentStatusChanges.find(change => 
            change.machineData && change.machineData.fegaNr === machine.fegaNr
        );
        
        const changeItem = document.createElement('div');
        changeItem.className = 'change-item';
        
        let changeText = `${machine.fegaNr} - Status: ${statusText[status]}`;
        if (machine.hersteller || machine.model) {
            changeText += ` (${machine.hersteller || ''} ${machine.model || ''})`.trim();
        }
        
        // Wenn es einen kürzlichen Statuswechsel gab, zeige das zusätzlich an
        if (recentChange) {
            const oldStatus = recentChange.oldData.status;
            const newStatus = recentChange.machineData.status;
            const statusTextMap = {
                'green': 'Grün',
                'yellow': 'Gelb', 
                'red': 'Rot'
            };
            changeText += ` - Statuswechsel: ${statusTextMap[oldStatus]} → ${statusTextMap[newStatus]}`;
        }
        
        changeItem.innerHTML = `
            <div class="change-content">
                <div class="change-text ${statusClass}">${changeText}</div>
                ${recentChange ? `
                    <div class="change-meta">
                        <span class="change-user">${recentChange.user}</span>
                        <span class="change-time">Statuswechsel: ${new Date(recentChange.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                ` : ''}
            </div>
        `;
        
        changesList.appendChild(changeItem);
    });
    
    modal.style.display = 'flex';
}

// Erweiterte CRUD Operationen mit Änderungsverfolgung
async function handleSaveEntry(e) {
    e.preventDefault();
    
    const fegaNr = document.getElementById('fega-nr').value.trim().toUpperCase();
    const hersteller = document.getElementById('hersteller').value;
    const model = document.getElementById('model').value;
    const abteilung = document.getElementById('abteilung').value;
    const artKundendienst = document.getElementById('art-kundendienst').value;
    const betrStd = parseFloat(document.getElementById('betr-std').value) || null;
    const uvvPsa = document.getElementById('uvv-psa').value;
    const kommentar = document.getElementById('kommentar').value;
    
    const editId = document.getElementById('edit-fega-nr').value;
    const isEdit = editId !== '';
    
    // Validiere Fega Nr.
    if (!fegaNr) {
        alert('Bitte geben Sie eine Fega Nr. ein!');
        return;
    }
    
    // Check ob Fega Nr. bereits existiert (nur bei neuem Eintrag)
    if (!isEdit && machines.some(m => m.fegaNr.toString().toUpperCase() === fegaNr)) {
        alert('Diese Fega Nr. existiert bereits!');
        return;
    }
    
    const machineData = {
        fegaNr,
        hersteller,
        model,
        abteilung,
        artKundendienst,
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
            // Update - prüfe auf Statuswechsel und normale Updates
            const oldMachine = machines.find(m => m.id === editId);
            const oldStatus = getUVVStatus(oldMachine.uvvPsa);
            const newStatus = getUVVStatus(uvvPsa);
            
            await update(ref(database, `machines/${editId}`), machineData);
            
            // Verfolge NUR wichtige Statuswechsel (Grün→Gelb, Gelb→Rot)
            if (oldStatus !== newStatus && (oldStatus === 'green' && newStatus === 'yellow' || oldStatus === 'yellow' && newStatus === 'red')) {
                await trackChange('status_changed', editId, { ...machineData, status: newStatus }, { status: oldStatus });
            }
            // Normale Updates werden nicht mehr getrackt
        } else {
            // Create - Verwende fegaNr als ID (bereinigt für Firebase-Key)
            const firebaseKey = fegaNr.replace(/[.#$\[\]]/g, '_');
            await set(ref(database, `machines/${firebaseKey}`), machineData);
            
            // Verfolge neue Erstellung
            await trackChange('created', firebaseKey, machineData);
        }
        
        hideModal('entry-modal');
        await loadMachines();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern: ' + error.message);
    }
}

