// Gestionale Manutenzioni

// ==================== VERSION LOG ====================
const APP_VERSION = '2.1.3';
const LAST_UPDATE = '2025-11-13 - Fix UX e Performance';

console.log('%c┌─────────────────────────────────────────────┐', 'color: #8b0000; font-weight: bold;');
console.log('%c│   🔧 GESTIONALE MANUTENZIONI RJ             │', 'color: #8b0000; font-weight: bold;');
console.log('%c├─────────────────────────────────────────────┤', 'color: #8b0000; font-weight: bold;');
console.log(`%c│   Version: ${APP_VERSION.padEnd(30)} │`, 'color: #66bb6a; font-weight: bold;');
console.log(`%c│   Updated: ${LAST_UPDATE.padEnd(30)} │`, 'color: #ffa726; font-weight: bold;');
console.log(`%c│   Loaded:  ${new Date().toLocaleString('it-IT').padEnd(30)} │`, 'color: #2196f3; font-weight: bold;');
console.log('%c└─────────────────────────────────────────────┘', 'color: #8b0000; font-weight: bold;');
console.log('%c✅ App caricata con successo!', 'color: #66bb6a; font-size: 14px; font-weight: bold;');

const STORAGE_KEYS = {
    machines: 'gestionale_machines',
    interventions: 'gestionale_interventions',
    components: 'gestionale_components',
    machinePhotos: 'gestionale_machine_photos',
    shiftNotes: 'shiftNotes'
};

const FIREBASE_COLLECTIONS = {
    machines: 'machines',
    interventions: 'interventions',
    components: 'components',
    machinePhotos: 'machinePhotos',
    shiftNotes: 'shiftNotes'
};

let machines = [];
let interventions = [];
let components = [];
let machinePhotos = [];
let addMachineModal;
let addInterventionModal;
let machineDetailsModal;
let addComponentModal;
let addPhotoModal;
let loginModal;
let dayModal;
let firebaseInitialized = false;
let currentUser = null;
let currentMachineId = null;
let currentCalendarDate = new Date();


// ==================== AUTHENTICATION FUNCTIONS ====================

function initAuth() {
    if (!window.firebaseAuth || !window.authModules) {
        alert('Errore: Firebase Authentication non è caricato. Ricarica la pagina.');
        return;
    }
    
    const { onAuthStateChanged } = window.authModules;
    
    onAuthStateChanged(window.firebaseAuth, (user) => {
        currentUser = user;
        
        if (user) {
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('logout-btn').style.display = 'inline-block';
            hideLoginModal();
            initFirebase();
        } else {
            document.getElementById('user-email').textContent = '';
            document.getElementById('logout-btn').style.display = 'none';
            showLoginModal();
            updateSyncStatus(false);
        }
    });
}

function showLoginModal() {
    if (loginModal) {
        loginModal.show();
    }
}

function hideLoginModal() {
    if (loginModal) {
        loginModal.hide();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const { signInWithEmailAndPassword } = window.authModules;
        await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        errorDiv.classList.add('d-none');
        document.getElementById('login-form').reset();
    } catch (error) {
        errorDiv.textContent = getAuthErrorMessage(error.code);
        errorDiv.classList.remove('d-none');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    if (password !== passwordConfirm) {
        errorDiv.textContent = 'Le password non corrispondono';
        errorDiv.classList.remove('d-none');
        successDiv.classList.add('d-none');
        return;
    }
    
    try {
        const { createUserWithEmailAndPassword } = window.authModules;
        await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        errorDiv.classList.add('d-none');
        successDiv.textContent = 'Account creato! Accedi per continuare.';
        successDiv.classList.remove('d-none');
        document.getElementById('register-form').reset();
        
        // Passa al tab login dopo 2 secondi
        setTimeout(() => {
            document.getElementById('login-tab').click();
            successDiv.classList.add('d-none');
        }, 2000);
    } catch (error) {
        errorDiv.textContent = getAuthErrorMessage(error.code);
        errorDiv.classList.remove('d-none');
        successDiv.classList.add('d-none');
    }
}

async function logout() {
    try {
        const { signOut } = window.authModules;
        await signOut(window.firebaseAuth);
    } catch (error) {}
}

function getAuthErrorMessage(code) {
    const errors = {
        'auth/email-already-in-use': 'Email già registrata',
        'auth/invalid-email': 'Email non valida',
        'auth/operation-not-allowed': 'Operazione non permessa',
        'auth/weak-password': 'Password troppo debole',
        'auth/user-disabled': 'Account disabilitato',
        'auth/user-not-found': 'Utente non trovato',
        'auth/wrong-password': 'Password errata',
        'auth/invalid-credential': 'Credenziali non valide'
    };
    return errors[code] || 'Errore di autenticazione';
}

// ==================== FIREBASE FUNCTIONS ====================

async function initFirebase() {
    if (!window.firebaseDb || !currentUser) {
        console.log('%c⚠️  Firebase non inizializzato - modalità offline', 'color: #ffa726; font-weight: bold;');
        updateSyncStatus(false);
        return false;
    }
    
    try {
        console.log('%c🔥 Firebase connesso - modalità online', 'color: #66bb6a; font-weight: bold;');
        setupFirebaseListeners();
        firebaseInitialized = true;
        updateSyncStatus(true);
        loadData();
        return true;
    } catch (error) {
        console.error('%c❌ Errore connessione Firebase:', 'color: #c62828; font-weight: bold;', error);
        updateSyncStatus(false);
        return false;
    }
}

function updateSyncStatus(connected) {
    const statusBadge = document.getElementById('sync-status');
    if (connected) {
        statusBadge.className = 'badge bg-success ms-2';
        statusBadge.style.fontSize = '0.7rem';
        statusBadge.textContent = '🌐 Cloud';
        statusBadge.title = 'Sincronizzazione cloud attiva';
    } else {
        statusBadge.className = 'badge bg-warning ms-2';
        statusBadge.style.fontSize = '0.7rem';
        statusBadge.textContent = '💾 Local';
        statusBadge.title = 'Solo storage locale';
    }
}

function setupFirebaseListeners() {
    const { onSnapshot, collection } = window.firebaseModules;
    const db = window.firebaseDb;
    
    // Listener per macchinari
    onSnapshot(collection(db, FIREBASE_COLLECTIONS.machines), (snapshot) => {
        machines = [];
        snapshot.forEach((doc) => {
            machines.push({ id: doc.id, ...doc.data() });
        });
        renderMachinesTable();
        updateMachineSelect();
        updateDashboard();
        populateFilterDropdowns(); // Aggiunto
    });
    
    // Listener per interventi
    onSnapshot(collection(db, FIREBASE_COLLECTIONS.interventions), (snapshot) => {
        interventions = [];
        snapshot.forEach((doc) => {
            interventions.push({ id: doc.id, ...doc.data() });
        });
        renderInterventionsTable();
        renderDeadlinesTable();
        updateDashboard();
        populateFilterDropdowns(); // Aggiunto
    });
    
    // Listener per componenti
    onSnapshot(collection(db, FIREBASE_COLLECTIONS.components), (snapshot) => {
        components = [];
        snapshot.forEach((doc) => {
            components.push({ id: doc.id, ...doc.data() });
        });
        if (currentMachineId) {
            renderMachineComponents(currentMachineId);
        }
        renderMachinesTable();
        renderWarehouseTable();
        updateDashboard();
    });
    
    // Listener per foto
    onSnapshot(collection(db, FIREBASE_COLLECTIONS.machinePhotos), (snapshot) => {
        machinePhotos = [];
        snapshot.forEach((doc) => {
            machinePhotos.push({ id: doc.id, ...doc.data() });
        });
        if (currentMachineId) {
            renderMachinePhotos(currentMachineId);
        }
        renderMachinesTable();
    });
    
    // Listener per note turno
    onSnapshot(collection(db, FIREBASE_COLLECTIONS.shiftNotes), (snapshot) => {
        shiftNotes = [];
        snapshot.forEach((doc) => {
            shiftNotes.push({ id: doc.id, ...doc.data() });
        });
        // Salva in localStorage per compatibilità
        localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
        updateShiftNotes();
    });
}

async function saveToFirebase(collectionName, data) {
    if (!firebaseInitialized || !window.firebaseDb) {
        const storageKey = STORAGE_KEYS[collectionName];
        if (!storageKey) return;
        
        const existingData = loadFromStorage(storageKey);
        const index = existingData.findIndex(item => item.id === data.id);
        
        if (index >= 0) {
            existingData[index] = data;
        } else {
            existingData.push(data);
        }
        
        saveToStorage(storageKey, existingData);
        updateGlobalArray(collectionName, existingData);
        return;
    }
    
    try {
        const { setDoc, doc } = window.firebaseModules;
        const db = window.firebaseDb;
        await setDoc(doc(db, FIREBASE_COLLECTIONS[collectionName], data.id), data);
    } catch (error) {
        const storageKey = STORAGE_KEYS[collectionName];
        const existingData = loadFromStorage(storageKey);
        const index = existingData.findIndex(item => item.id === data.id);
        
        if (index >= 0) {
            existingData[index] = data;
        } else {
            existingData.push(data);
        }
        
        saveToStorage(storageKey, existingData);
        updateGlobalArray(collectionName, existingData);
    }
}

// Aggiorna array globali dopo salvataggio localStorage
function updateGlobalArray(collectionName, data) {
    switch(collectionName) {
        case 'machines':
            machines = data;
            break;
        case 'interventions':
            interventions = data;
            break;
        case 'components':
            components = data;
            break;
        case 'machinePhotos':
            machinePhotos = data;
            break;
    }
}

async function deleteFromFirebase(collectionName, id) {
    if (!firebaseInitialized) return;
    
    try {
        const { deleteDoc, doc } = window.firebaseModules;
        const db = window.firebaseDb;
        await deleteDoc(doc(db, FIREBASE_COLLECTIONS[collectionName], id));
    } catch (error) {}
}

// ==================== GESTIONE LOCALSTORAGE ====================

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Genera ID univoco
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// ==================== INIZIALIZZAZIONE ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Inizializza i modal di Bootstrap
    addMachineModal = new bootstrap.Modal(document.getElementById('addMachineModal'));
    addInterventionModal = new bootstrap.Modal(document.getElementById('addInterventionModal'));
    machineDetailsModal = new bootstrap.Modal(document.getElementById('machineDetailsModal'));
    addComponentModal = new bootstrap.Modal(document.getElementById('addComponentModal'));
    addPhotoModal = new bootstrap.Modal(document.getElementById('addPhotoModal'));
    loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
    
    // Imposta la data di oggi come default
    document.getElementById('intervention-date').valueAsDate = new Date();
    
    // Inizializza tema salvato
    initTheme();
    
    // Aggiorna ora ogni minuto nel dashboard
    setInterval(updateCurrentDateTime, 60000);
    
    // Inizializza autenticazione
    initAuth();
});

// ==================== THEME MANAGEMENT ====================
// Forza solo tema dark
function initTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    console.log('%c🎨 Tema: DARK (fisso)', 'color: #8b0000; font-weight: bold;');
}

function loadData() {
    if (!firebaseInitialized) {
        machines = loadFromStorage(STORAGE_KEYS.machines);
        interventions = loadFromStorage(STORAGE_KEYS.interventions);
        components = loadFromStorage(STORAGE_KEYS.components);
        machinePhotos = loadFromStorage(STORAGE_KEYS.machinePhotos);
        console.log(`%c📦 Dati caricati da localStorage - Macchinari: ${machines.length}, Interventi: ${interventions.length}, Componenti: ${components.length}`, 'color: #ffa726; font-weight: bold;');
    } else {
        console.log('%c📡 Dati sincronizzati con Firebase', 'color: #66bb6a; font-weight: bold;');
    }
    
    renderMachinesTable();
    renderInterventionsTable();
    renderDeadlinesTable();
    updateMachineSelect();
    updateDashboard();
    
    // Inizializza menu mobile
    initMobileMenu();
}

// ==================== MENU MOBILE ====================
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar-menu');
    
    if (!menuBtn || !sidebar) return;
    
    // Toggle menu
    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('show');
        document.body.classList.toggle('menu-open');
    });
    
    // Chiudi quando clicchi fuori
    document.addEventListener('click', function(e) {
        if (sidebar.classList.contains('show') && 
            !sidebar.contains(e.target) && 
            !menuBtn.contains(e.target)) {
            sidebar.classList.remove('show');
            document.body.classList.remove('menu-open');
        }
    });
    
    // Chiudi menu dopo selezione sezione
    const menuItems = sidebar.querySelectorAll('.list-group-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            sidebar.classList.remove('show');
            document.body.classList.remove('menu-open');
        });
    });
}

// ==================== RENDERING TABELLE ====================

function formatDuration(hours, minutes) {
    const h = hours || 0;
    const m = minutes || 0;
    if (!h && !m) return '-';
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

function getMachineName(machineId) {
    const machine = machines.find(m => m.id === machineId);
    return machine ? machine.name : 'Sconosciuto';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT');
}

function sortByDateDesc(items) {
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getStatusBadge(status) {
    return status === 'effettuato' 
        ? '<span class="badge bg-success">Effettuato</span>'
        : '<span class="badge bg-warning text-dark">Programmato</span>';
}

function emptyTableRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="text-center text-muted">${message}</td></tr>`;
}

function renderMachinesTable() {
    const tbody = document.getElementById('machines-table');
    
    if (machines.length === 0) {
        tbody.innerHTML = emptyTableRow(5, 'Nessun macchinario presente');
        return;
    }
    
    const searchText = document.getElementById('searchMachine')?.value || '';
    const filterType = document.getElementById('filterMachineType')?.value || '';
    const filterLocation = document.getElementById('filterMachineLocation')?.value || '';
    
    if (searchText || filterType || filterLocation) {
        filterMachines();
        return;
    }
    
    tbody.innerHTML = machines.map(machine => {
        const lastIntervention = getLastIntervention(machine.id);
        const lastDate = lastIntervention ? new Date(lastIntervention.date).toLocaleDateString('it-IT') : 'Mai';
        const photosCount = machinePhotos.filter(p => p.machine_id === machine.id).length;
        
        return `
            <tr style="cursor: pointer;" onclick="openMachineDetails('${machine.id}')">
                <td>
                    <strong>${machine.name}</strong>
                    ${photosCount > 0 ? `<span class="badge bg-info ms-2">${photosCount} foto</span>` : ''}
                </td>
                <td>${machine.type || '-'}</td>
                <td>${machine.location || '-'}</td>
                <td>${lastDate}</td>
                <td class="text-end" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-danger" onclick="deleteMachine('${machine.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Rendering tabella interventi
function renderInterventionsTable() {
    const tbody = document.getElementById('interventions-table');
    
    if (interventions.length === 0) {
        tbody.innerHTML = emptyTableRow(7, 'Nessun intervento registrato');
        return;
    }
    
    const filterMachine = document.getElementById('filterIntervMachine')?.value || '';
    const filterType = document.getElementById('filterIntervType')?.value || '';
    const filterDateFrom = document.getElementById('filterIntervDateFrom')?.value || '';
    const filterDateTo = document.getElementById('filterIntervDateTo')?.value || '';
    
    if (filterMachine || filterType || filterDateFrom || filterDateTo) {
        filterInterventions();
        return;
    }
    
    const sortedInterventions = sortByDateDesc([...interventions]);
    
    tbody.innerHTML = sortedInterventions.map(intervention => {
        const machineName = getMachineName(intervention.machine_id);
        const date = formatDate(intervention.date);
        const statusBadge = getStatusBadge(intervention.status);
        const durationText = formatDuration(intervention.hours, intervention.minutes);
        
        const statusButton = intervention.status === 'programmato'
            ? `<button class="btn btn-sm btn-secondary" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="markAsCompleted('${intervention.id}')" title="Segna come effettuato">Conferma</button>`
            : '';
        
        return `
            <tr>
                <td>${date}</td>
                <td>${machineName}</td>
                <td><span class="badge bg-secondary">${intervention.type}</span></td>
                <td>${statusBadge}</td>
                <td>${intervention.description}</td>
                <td>${durationText}</td>
                <td class="text-end">
                    ${statusButton}
                    <button class="btn btn-sm btn-secondary" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="editIntervention('${intervention.id}')">Modifica</button>
                    <button class="btn btn-sm btn-secondary ms-1" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="deleteIntervention('${intervention.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Rendering tabella scadenze
function renderDeadlinesTable() {
    const tbody = document.getElementById('deadlines-table');
    if (!tbody) return;
    
    const deadlines = calculateDeadlines();
    
    if (deadlines.length === 0) {
        tbody.innerHTML = emptyTableRow(4, 'Nessuna scadenza programmata');
        return;
    }
    
    const activeFilter = document.querySelector('input[name="filterDeadline"]:checked')?.value || 'all';
    
    if (activeFilter !== 'all') {
        filterDeadlines();
        return;
    }
    
    tbody.innerHTML = deadlines.map(deadline => {
        let statusClass = 'status-ok';
        let statusText = 'OK';
        
        if (deadline.daysRemaining < 0) {
            statusClass = 'status-danger';
            statusText = 'SCADUTO';
        } else if (deadline.daysRemaining <= 7) {
            statusClass = 'status-danger';
            statusText = 'URGENTE';
        } else if (deadline.daysRemaining <= 30) {
            statusClass = 'status-warning';
            statusText = 'IN SCADENZA';
        }
        
        return `
            <tr>
                <td><strong>${deadline.machineName}</strong></td>
                <td>${deadline.nextDate}</td>
                <td>${deadline.daysRemaining} giorni</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// ==================== CALCOLI E UTILITY ====================

function calculateDeadlines() {
    const deadlines = [];
    const today = new Date();
    
    machines.forEach(machine => {
        const lastIntervention = getLastIntervention(machine.id);
        if (lastIntervention && lastIntervention.next_maintenance_days) {
            const lastDate = new Date(lastIntervention.date);
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + parseInt(lastIntervention.next_maintenance_days));
            
            const daysRemaining = Math.floor((nextDate - today) / (1000 * 60 * 60 * 24));
            
            deadlines.push({
                machineId: machine.id,
                machineName: machine.name,
                nextDate: nextDate.toLocaleDateString('it-IT'),
                daysRemaining: daysRemaining,
                lastIntervention: lastIntervention.date,
                interventionType: lastIntervention.type,
                interventionDescription: lastIntervention.description
            });
        }
    });
    
    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function getLastIntervention(machineId) {
    const machineInterventions = interventions.filter(i => 
        i.machine_id === machineId && i.status === 'effettuato'
    );
    if (machineInterventions.length === 0) return null;
    return sortByDateDesc(machineInterventions)[0];
}

let machineTimeChart, interventionTypeChart, monthlyTrendChart, topComponentsChart;

// Sistema note turno - salvate in localStorage
let shiftNotes = JSON.parse(localStorage.getItem('shiftNotes') || '[]');

function updateDashboard() {
    updateCurrentDateTime();
    updatePrioritiesAndAttentions();
    updateShiftNotes();
    updateWeekSchedule();
}

function updateCurrentDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('current-datetime');
    if (el) el.textContent = `${dateStr} - ${timeStr}`;
}

// Funzione unificata per priorità e attenzioni
function updatePrioritiesAndAttentions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlines = calculateDeadlines();
    
    // Interventi programmati scaduti (status=programmato con data passata)
    const overdueScheduled = interventions.filter(i => {
        if (i.status === 'programmato' && i.date) {
            const intervDate = new Date(i.date);
            intervDate.setHours(0, 0, 0, 0);
            return intervDate < today;
        }
        return false;
    });
    
    // Scadenze manutenzione
    const overdueDeadlines = deadlines.filter(d => d.daysRemaining < 0);
    
    // Combina i due tipi di scaduti
    const totalOverdue = overdueScheduled.length + overdueDeadlines.length;
    
    // Interventi oggi/domani
    const todayTomorrow = deadlines.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 1);
    
    // Componenti sotto scorta
    const lowStock = components.filter(c => c.quantity <= 2);
    
    // Aggiorna contatori
    document.getElementById('overdue-count').textContent = totalOverdue;
    document.getElementById('today-tomorrow-count').textContent = todayTomorrow.length;
    document.getElementById('low-stock-count').textContent = lowStock.length;
    
    // Aggiorna lista interventi scaduti
    const overdueList = document.getElementById('overdue-list');
    if (totalOverdue === 0) {
        overdueList.innerHTML = '<small class="text-muted">Nessun intervento in ritardo</small>';
    } else {
        let html = '<ul class="list-unstyled mb-0">';
        
        // Mostra interventi programmati scaduti con dettagli completi
        overdueScheduled.slice(0, 3).forEach(i => {
            const machineName = getMachineName(i.machine_id);
            const intervDate = new Date(i.date);
            const daysPast = Math.floor((today - intervDate) / (1000 * 60 * 60 * 24));
            const duration = i.hours || i.minutes ? `${i.hours || 0}h ${i.minutes || 0}m` : 'N/D';
            html += `<li class="mb-2" style="color: #ffffff;">
                <small>
                    <strong>${machineName}</strong> - ${i.type}<br>
                    <span class="text-danger">Scaduto ${daysPast}gg fa</span> (${formatDate(i.date)})<br>
                    ${i.description || 'Nessuna descrizione'} - Durata: ${duration}
                </small>
            </li>`;
        });
        
        // Mostra scadenze manutenzione
        overdueDeadlines.slice(0, 3).forEach(d => {
            html += `<li class="mb-2" style="color: #ffffff;">
                <small>
                    <strong>${d.machineName}</strong> - Manutenzione programmata<br>
                    <span class="text-danger">Scaduto ${Math.abs(d.daysRemaining)}gg fa</span><br>
                    Ultimo: ${d.interventionType} il ${d.lastIntervention}
                </small>
            </li>`;
        });
        
        if (totalOverdue > 6) {
            html += `<li><small class="text-muted">...e altri ${totalOverdue - 6}</small></li>`;
        }
        html += '</ul>';
        overdueList.innerHTML = html;
    }
    
    // Aggiorna lista interventi oggi/domani
    const todayTomorrowList = document.getElementById('today-tomorrow-list');
    const todayTomorrowSection = document.getElementById('today-tomorrow-section');
    
    if (todayTomorrow.length === 0) {
        todayTomorrowSection.style.display = 'none';
    } else {
        todayTomorrowSection.style.display = 'block';
        let html = '<ul class="list-unstyled mb-0">';
        todayTomorrow.forEach(d => {
            const when = d.daysRemaining === 0 ? 'OGGI' : 'DOMANI';
            const badgeClass = d.daysRemaining === 0 ? 'bg-danger' : 'bg-warning';
            html += `<li class="mb-1" style="color: #ffffff;"><small><span class="badge ${badgeClass}">${when}</span> <strong>${d.machineName}</strong></small></li>`;
        });
        html += '</ul>';
        todayTomorrowList.innerHTML = html;
    }
    
    // Aggiorna lista componenti sotto scorta
    const lowStockList = document.getElementById('low-stock-list');
    if (lowStock.length === 0) {
        lowStockList.innerHTML = '<small class="text-muted">Scorte sufficienti</small>';
    } else {
        let html = '<ul class="list-unstyled mb-0" style="color: var(--text-primary);">';
        lowStock.slice(0, 5).forEach(c => {
            const status = c.quantity === 0 ? 'ESAURITO' : `${c.quantity} pz`;
            const statusClass = c.quantity === 0 ? 'text-danger' : 'text-warning';
            html += `<li class="mb-1"><small>• <strong>${c.name}</strong> <span class="${statusClass}">(${status})</span></small></li>`;
        });
        if (lowStock.length > 5) {
            html += `<li><small class="text-muted">...e altri ${lowStock.length - 5}</small></li>`;
        }
        html += '</ul>';
        lowStockList.innerHTML = html;
    }
}

function updateShiftNotes() {
    const notesDiv = document.getElementById('shift-notes');
    
    console.log('📝 Note turno caricate:', shiftNotes.length, shiftNotes);
    
    if (shiftNotes.length === 0) {
        notesDiv.innerHTML = '<p class="text-muted">Nessuna nota dal turno precedente</p>';
    } else {
        let html = '';
        // Mostra ultime 10 note, le più recenti prima
        shiftNotes.slice(-10).reverse().forEach((note, index) => {
            const noteDate = new Date(note.timestamp);
            const dateStr = noteDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const isImportant = note.important ? ' border-warning' : '';
            const icon = note.important ? '[!]' : '';
            
            html += `<div class="card mb-2${isImportant}">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <small class="text-muted">${icon} ${dateStr} - ${note.author}</small>
                            <p class="mb-0 mt-1" style="color: var(--text-primary);">${note.text}</p>
                            ${note.photoUrl ? `<img src="${note.photoUrl}" class="img-fluid mt-2 rounded" style="max-height: 200px;" alt="Foto nota">` : ''}
                        </div>
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteShiftNote(${shiftNotes.length - 1 - index})" title="Elimina">×</button>
                    </div>
                </div>
            </div>`;
        });
        notesDiv.innerHTML = html;
    }
}

function addShiftNote() {
    // Pulisci campi
    document.getElementById('shift-note-text').value = '';
    document.getElementById('shift-note-photo').value = '';
    document.getElementById('shift-note-important').checked = false;
    
    // Apri modal
    const modal = new bootstrap.Modal(document.getElementById('shift-note-modal'));
    modal.show();
}

function saveShiftNote() {
    const userEmail = document.getElementById('user-email').textContent || 'Anonimo';
    const text = document.getElementById('shift-note-text').value.trim();
    const important = document.getElementById('shift-note-important').checked;
    const photoInput = document.getElementById('shift-note-photo');
    
    if (text) {
        const note = {
            text: text,
            author: userEmail,
            timestamp: new Date().toISOString(),
            important: important
        };
        
        // Se c'è una foto, convertila in base64
        if (photoInput.files && photoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                note.photoUrl = e.target.result;
                
                // Salva su Firebase se disponibile
                if (firebaseInitialized && window.firebaseDb) {
                    const { addDoc, collection } = window.firebaseModules;
                    try {
                        await addDoc(collection(window.firebaseDb, FIREBASE_COLLECTIONS.shiftNotes), note);
                        console.log('✅ Nota salvata su Firebase con foto');
                    } catch (error) {
                        console.error('❌ Errore salvataggio nota Firebase:', error);
                        // Fallback su localStorage
                        shiftNotes.push(note);
                        localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
                        updateShiftNotes();
                    }
                } else {
                    // Solo localStorage se Firebase non disponibile
                    shiftNotes.push(note);
                    localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
                    updateShiftNotes();
                }
                
                bootstrap.Modal.getInstance(document.getElementById('shift-note-modal')).hide();
            };
            reader.readAsDataURL(photoInput.files[0]);
        } else {
            // Salva su Firebase se disponibile
            if (firebaseInitialized && window.firebaseDb) {
                const { addDoc, collection } = window.firebaseModules;
                addDoc(collection(window.firebaseDb, FIREBASE_COLLECTIONS.shiftNotes), note)
                    .then(() => {
                        console.log('✅ Nota salvata su Firebase');
                        bootstrap.Modal.getInstance(document.getElementById('shift-note-modal')).hide();
                    })
                    .catch((error) => {
                        console.error('❌ Errore salvataggio nota Firebase:', error);
                        // Fallback su localStorage
                        shiftNotes.push(note);
                        localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
                        updateShiftNotes();
                        bootstrap.Modal.getInstance(document.getElementById('shift-note-modal')).hide();
                    });
            } else {
                // Solo localStorage se Firebase non disponibile
                shiftNotes.push(note);
                localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
                updateShiftNotes();
                bootstrap.Modal.getInstance(document.getElementById('shift-note-modal')).hide();
            }
        }
    } else {
        alert('Inserisci un testo per la nota');
    }
}

function deleteShiftNote(index) {
    if (confirm('Eliminare questa nota?')) {
        const noteToDelete = shiftNotes[index];
        
        // Elimina da Firebase se disponibile
        if (firebaseInitialized && window.firebaseDb && noteToDelete.id) {
            const { deleteDoc, doc } = window.firebaseModules;
            deleteDoc(doc(window.firebaseDb, FIREBASE_COLLECTIONS.shiftNotes, noteToDelete.id))
                .then(() => {
                    console.log('✅ Nota eliminata da Firebase');
                })
                .catch((error) => {
                    console.error('❌ Errore eliminazione nota Firebase:', error);
                    // Fallback: elimina da localStorage
                    shiftNotes.splice(index, 1);
                    localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
                    updateShiftNotes();
                });
        } else {
            // Solo localStorage se Firebase non disponibile
            shiftNotes.splice(index, 1);
            localStorage.setItem('shiftNotes', JSON.stringify(shiftNotes));
            updateShiftNotes();
        }
    }
}

function updateWeekSchedule() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlines = calculateDeadlines();
    
    // Prossimi 7 giorni (esclusi oggi che è già in priorità)
    const nextWeek = deadlines.filter(d => d.daysRemaining > 1 && d.daysRemaining <= 7);
    
    // Aggiungi interventi programmati nei prossimi 7 giorni
    const scheduledInterventions = interventions.filter(i => {
        if (i.status === 'programmato' && i.date) {
            const intervDate = new Date(i.date);
            intervDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((intervDate - today) / (1000 * 60 * 60 * 24));
            return diffDays > 1 && diffDays <= 7;
        }
        return false;
    });
    
    const scheduleDiv = document.getElementById('week-schedule');
    
    if (nextWeek.length === 0 && scheduledInterventions.length === 0) {
        scheduleDiv.innerHTML = '<p class="text-muted">Nessun intervento programmato nei prossimi 7 giorni</p>';
    } else {
        // Raggruppa per giorno
        const byDay = {};
        
        // Aggiungi scadenze manutenzione
        nextWeek.forEach(d => {
            const key = d.daysRemaining;
            if (!byDay[key]) byDay[key] = [];
            byDay[key].push({ type: 'scadenza', text: d.machineName });
        });
        
        // Aggiungi interventi programmati nei prossimi 7 giorni
        scheduledInterventions.forEach(i => {
            const intervDate = new Date(i.date);
            intervDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((intervDate - today) / (1000 * 60 * 60 * 24));
            if (!byDay[diffDays]) byDay[diffDays] = [];
            const machineName = getMachineName(i.machine_id);
            const duration = i.hours || i.minutes ? `${i.hours || 0}h ${i.minutes || 0}m` : 'N/D';
            byDay[diffDays].push({ 
                type: 'programmato', 
                text: `${machineName} - ${i.type}`,
                description: i.description || 'Nessuna descrizione',
                duration: duration
            });
        });
        
        let html = '';
        Object.keys(byDay).sort((a, b) => a - b).forEach(days => {
            const items = byDay[days];
            const date = new Date(today);
            date.setDate(date.getDate() + parseInt(days));
            const dateStr = date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
            
            html += `<div class="mb-2">
                <h6 class="mb-1">${dateStr} (tra ${days}gg)</h6>
                <ul class="list-unstyled ms-3 mb-0">`;
            
            items.forEach(item => {
                if (item.type === 'scadenza') {
                    html += `<li style="color: #ffffff;"><small><span class="badge bg-info">Scadenza</span> ${item.text}</small></li>`;
                } else {
                    html += `<li class="mb-2" style="color: #ffffff;">
                        <small>
                            <span class="badge bg-primary">Programmato</span> <strong>${item.text}</strong><br>
                            ${item.description} - Durata: ${item.duration}
                        </small>
                    </li>`;
                }
            });
            
            html += `</ul></div>`;
        });
        
        scheduleDiv.innerHTML = html;
    }
}

function updateReportStats() {
    const totalHours = interventions.reduce((sum, i) => sum + (i.hours || 0) + (i.minutes || 0) / 60, 0);
    document.getElementById('total-hours').textContent = Math.round(totalHours);
    document.getElementById('total-interventions').textContent = interventions.length;
    document.getElementById('active-machines').textContent = machines.length;
    document.getElementById('total-components').textContent = components.length;
    
    // Genera grafici
    generateMachineTimeChart();
    generateInterventionTypeChart();
    generateMonthlyTrendChart();
    generateTopComponentsChart();
    generateStatsTable();
}

// Helper per ottenere il colore del tema corrente
function getThemeColor(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

// Grafico: Tempo interventi per macchinario
function generateMachineTimeChart() {
    const canvas = document.getElementById('machineTimeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const textColor = getThemeColor('--text-primary');
    const gridColor = getThemeColor('--border-color');
    
    // Calcola ore per macchinario
    const machineHours = {};
    interventions.forEach(i => {
        const hours = (i.hours || 0) + (i.minutes || 0) / 60;
        machineHours[i.machine_id] = (machineHours[i.machine_id] || 0) + hours;
    });
    
    const sorted = Object.entries(machineHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(([machineId]) => getMachineName(machineId));
    
    const data = sorted.map(([, hours]) => Math.round(hours * 10) / 10);
    
    // Colori diversi per ogni barra - gradiente dal rosso all'arancio
    const colors = [
        '#c62828', '#d32f2f', '#e53935', '#f44336',
        '#e57373', '#ef5350', '#ff5252', '#ff6b6b',
        '#ff7043', '#ffa726'
    ];
    
    if (machineTimeChart) machineTimeChart.destroy();
    
    machineTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ore di Manutenzione',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Ore', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

// Grafico: Distribuzione tipi di intervento
function generateInterventionTypeChart() {
    const canvas = document.getElementById('interventionTypeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const textColor = getThemeColor('--text-primary');
    const bgColor = getThemeColor('--bg-secondary');
    
    // Conta per tipo
    const typeCounts = {};
    interventions.forEach(i => {
        typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
    });
    
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    
    // Colori vivaci e distinti
    const colors = [
        '#8b0000', // rosso scuro
        '#ff6b6b', // rosso chiaro
        '#ffa726', // arancio
        '#66bb6a', // verde
        '#42a5f5', // blu
        '#ab47bc', // viola
        '#fdd835', // giallo
        '#26c6da'  // ciano
    ];
    
    if (interventionTypeChart) interventionTypeChart.destroy();
    
    interventionTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: bgColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor }
                }
            }
        }
    });
}

// Grafico: Trend interventi ultimi 6 mesi
function generateMonthlyTrendChart() {
    const canvas = document.getElementById('monthlyTrendChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const textColor = getThemeColor('--text-primary');
    const gridColor = getThemeColor('--border-color');
    
    // Ultimi 6 mesi
    const months = [];
    const counts = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
        months.push(monthName);
        
        const count = interventions.filter(interv => {
            const intervDate = new Date(interv.date);
            return intervDate.getMonth() === d.getMonth() && intervDate.getFullYear() === d.getFullYear();
        }).length;
        
        counts.push(count);
    }
    
    if (monthlyTrendChart) monthlyTrendChart.destroy();
    
    monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Interventi',
                data: counts,
                borderColor: '#42a5f5',
                backgroundColor: 'rgba(66, 165, 245, 0.2)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#42a5f5',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: textColor },
                    grid: { color: gridColor },
                    title: { display: true, text: 'N° Interventi', color: textColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}
// Grafico: Componenti più utilizzati (basato su quantità bassa = molto usato)
function generateTopComponentsChart() {
    const canvas = document.getElementById('topComponentsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const textColor = getThemeColor('--text-primary');
    const gridColor = getThemeColor('--border-color');
    
    // Ordina per quantità crescente (più usati = meno disponibili)
    const sorted = [...components]
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8);
    
    const labels = sorted.map(c => c.name);
    const data = sorted.map(c => c.quantity);
    
    // Colori diversi per ogni componente - gradiente dal verde al rosso
    const colors = [
        '#ef5350', // rosso chiaro
        '#ff7043', // arancio-rosso
        '#ffa726', // arancio
        '#ffca28', // giallo-arancio
        '#9ccc65', // verde chiaro
        '#66bb6a', // verde
        '#26a69a', // turchese
        '#42a5f5'  // blu
    ];
    
    if (topComponentsChart) topComponentsChart.destroy();
    
    topComponentsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantità Rimanente',
                data: data,
                backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                borderColor: '#000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { 
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Quantità', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

// Genera tabella statistiche dettagliate
function generateStatsTable() {
    const tbody = document.getElementById('stats-table');
    if (!tbody) return;
    
    if (machines.length === 0) {
        tbody.innerHTML = emptyTableRow(5, 'Nessun dato disponibile');
        return;
    }
    
    const stats = machines.map(machine => {
        const machineInterventions = interventions.filter(i => i.machine_id === machine.id);
        const totalHours = machineInterventions.reduce((sum, i) => sum + (i.hours || 0) + (i.minutes || 0) / 60, 0);
        const avgHours = machineInterventions.length > 0 ? totalHours / machineInterventions.length : 0;
        const lastInterv = machineInterventions.length > 0 
            ? new Date(Math.max(...machineInterventions.map(i => new Date(i.date)))).toLocaleDateString('it-IT')
            : 'Mai';
        
        return {
            name: machine.name,
            count: machineInterventions.length,
            totalHours: Math.round(totalHours * 10) / 10,
            avgHours: Math.round(avgHours * 10) / 10,
            lastDate: lastInterv
        };
    }).sort((a, b) => b.totalHours - a.totalHours);
    
    tbody.innerHTML = stats.map(s => `
        <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.count}</td>
            <td>${s.totalHours}h</td>
            <td>${s.avgHours}h</td>
            <td>${s.lastDate}</td>
        </tr>
    `).join('');
}

// Export PDF Report Mensile
function exportMonthlyReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const today = new Date();
    const monthName = today.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    
    // Titolo
    doc.setFontSize(18);
    doc.text('Report Manutenzioni', 20, 20);
    doc.setFontSize(12);
    doc.text(monthName, 20, 30);
    
    // Statistiche generali
    doc.setFontSize(14);
    doc.text('Statistiche Generali', 20, 45);
    doc.setFontSize(10);
    
    const totalHours = interventions.reduce((sum, i) => sum + (i.hours || 0) + (i.minutes || 0) / 60, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthInterventions = interventions.filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    let y = 55;
    doc.text(`Totale Ore Manutenzione: ${Math.round(totalHours)}h`, 20, y);
    y += 7;
    doc.text(`Interventi Totali: ${interventions.length}`, 20, y);
    y += 7;
    doc.text(`Interventi Questo Mese: ${monthInterventions.length}`, 20, y);
    y += 7;
    doc.text(`Macchinari Gestiti: ${machines.length}`, 20, y);
    y += 7;
    doc.text(`Componenti in Inventario: ${components.length}`, 20, y);
    
    // Tabella interventi recenti
    y += 15;
    doc.setFontSize(14);
    doc.text('Ultimi 10 Interventi', 20, y);
    y += 10;
    
    doc.setFontSize(9);
    const recent = sortByDateDesc([...interventions]).slice(0, 10);
    
    recent.forEach(interv => {
        const machineName = getMachineName(interv.machine_id);
        const date = formatDate(interv.date);
        const duration = formatDuration(interv.hours, interv.minutes);
        
        doc.text(`${date} - ${machineName} - ${interv.type} - ${duration}`, 20, y);
        y += 6;
        
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });
    
    // Salva PDF
    doc.save(`report-manutenzioni-${today.toISOString().split('T')[0]}.pdf`);
    showAlert('Report PDF generato con successo!', 'success');
}

// Aggiorna select macchinari
function updateMachineSelect() {
    const select = document.getElementById('intervention-machine');
    select.innerHTML = '<option value="">Seleziona macchinario</option>' +
        machines.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

// ==================== GESTIONE SEZIONI ====================

function showSection(section) {
    // Nascondi tutte le sezioni
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    
    // Mostra la sezione selezionata
    document.getElementById(`${section}-section`).style.display = 'block';
    
    // Aggiorna menu attivo
    document.querySelectorAll('.list-group-item').forEach(item => item.classList.remove('active'));
    event.target.classList.add('active');
    
    // Renderizza calendario quando si apre quella sezione
    if (section === 'calendario') {
        renderCalendar();
    }
    
    // Renderizza report e grafici quando si apre quella sezione
    if (section === 'report') {
        updateReportStats();
    }
    
    // Renderizza magazzino quando si apre quella sezione
    if (section === 'magazzino') {
        renderWarehouseTable();
    }
}

// ==================== GESTIONE MACCHINARI ====================

function showAddMachineModal() {
    document.getElementById('add-machine-form').reset();
    addMachineModal.show();
}

async function saveMachine() {
    const name = document.getElementById('machine-name').value.trim();
    const type = document.getElementById('machine-type').value.trim();
    const location = document.getElementById('machine-location').value.trim();
    const notes = document.getElementById('machine-notes').value.trim();
    
    if (!name) {
        showAlert('Inserisci il nome del macchinario', 'warning');
        return;
    }
    
    const newMachine = {
        id: generateId(),
        name,
        type,
        location,
        notes,
        created_at: new Date().toISOString()
    };
    
    await saveToFirebase('machines', newMachine);
    
    if (!firebaseInitialized) {
        renderMachinesTable();
        updateMachineSelect();
        updateDashboard();
    }
    
    addMachineModal.hide();
    document.getElementById('add-machine-form').reset();
    showAlert('Macchinario aggiunto con successo!', 'success');
}

function deleteMachine(id) {
    if (!confirm('Sei sicuro di voler eliminare questo macchinario? Verranno eliminati anche tutti gli interventi, foto e componenti associati.')) return;
    
    // Elimina da Firebase
    deleteFromFirebase('machines', id);
    
    // Elimina interventi, componenti e foto associati
    interventions.filter(i => i.machine_id === id).forEach(i => deleteFromFirebase('interventions', i.id));
    components.filter(c => c.machine_id === id).forEach(c => deleteFromFirebase('components', c.id));
    machinePhotos.filter(p => p.machine_id === id).forEach(p => deleteFromFirebase('machinePhotos', p.id));
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        machines = machines.filter(m => m.id !== id);
        interventions = interventions.filter(i => i.machine_id !== id);
        components = components.filter(c => c.machine_id !== id);
        machinePhotos = machinePhotos.filter(p => p.machine_id !== id);
        
        saveToStorage(STORAGE_KEYS.machines, machines);
        saveToStorage(STORAGE_KEYS.interventions, interventions);
        saveToStorage(STORAGE_KEYS.components, components);
        saveToStorage(STORAGE_KEYS.machinePhotos, machinePhotos);
        
        renderMachinesTable();
        renderInterventionsTable();
        renderDeadlinesTable();
        updateMachineSelect();
        updateDashboard();
    }
    
    showAlert('Macchinario eliminato', 'success');
}

function viewMachine(id) {
    const machine = machines.find(m => m.id === id);
    if (!machine) return;
    
    const machineInterventions = interventions.filter(i => i.machine_id === id);
    
    let html = `
        <h5>${machine.name}</h5>
        <p><strong>Tipo:</strong> ${machine.type || '-'}</p>
        <p><strong>Ubicazione:</strong> ${machine.location || '-'}</p>
        <p><strong>Note:</strong> ${machine.notes || '-'}</p>
        <hr>
        <h6>Storico Interventi (${machineInterventions.length})</h6>
    `;
    
    if (machineInterventions.length > 0) {
        html += '<ul class="list-group">';
        sortByDateDesc(machineInterventions).forEach(i => {
            html += `
                <li class="list-group-item">
                    <strong>${formatDate(i.date)}</strong> - ${i.type}<br>
                    <small>${i.description}</small>
                </li>
            `;
        });
        html += '</ul>';
    } else {
        html += '<p class="text-muted">Nessun intervento registrato</p>';
    }
    
    showAlert(html, 'info', 10000);
}

// ==================== GESTIONE INTERVENTI ====================

function showAddInterventionModal() {
    if (machines.length === 0) {
        showAlert('Aggiungi prima almeno un macchinario', 'warning');
        return;
    }
    
    // Reset form e rimuovi ID hidden (modalità aggiungi)
    document.getElementById('add-intervention-form').reset();
    const hiddenId = document.getElementById('intervention-id');
    if (hiddenId) hiddenId.remove();
    
    document.getElementById('intervention-date').valueAsDate = new Date();
    document.querySelector('#addInterventionModal .modal-title').textContent = 'Registra Intervento';
    
    // Reset componenti container
    const container = document.getElementById('intervention-components-container');
    container.innerHTML = `
        <div class="row mb-2">
            <div class="col-8">
                <select class="form-select component-select">
                    <option value="">Seleziona componente</option>
                </select>
            </div>
            <div class="col-3">
                <input type="number" class="form-control component-quantity" min="1" value="1" placeholder="Qt">
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btn-success" onclick="addComponentRow()">+</button>
            </div>
        </div>
    `;
    
    // Popola select componenti
    populateComponentsSelect();
    
    addInterventionModal.show();
}

function editIntervention(id) {
    const intervention = interventions.find(i => i.id === id);
    if (!intervention) return;
    
    // Cambia titolo modal
    document.querySelector('#addInterventionModal .modal-title').textContent = 'Modifica Intervento';
    
    // Aggiungi campo hidden con ID
    let hiddenId = document.getElementById('intervention-id');
    if (!hiddenId) {
        hiddenId = document.createElement('input');
        hiddenId.type = 'hidden';
        hiddenId.id = 'intervention-id';
        document.getElementById('add-intervention-form').appendChild(hiddenId);
    }
    hiddenId.value = id;
    
    // Popola form
    document.getElementById('intervention-machine').value = intervention.machine_id;
    document.getElementById('intervention-date').value = intervention.date;
    document.getElementById('intervention-type').value = intervention.type;
    document.getElementById('intervention-status').value = intervention.status;
    document.getElementById('intervention-description').value = intervention.description;
    document.getElementById('intervention-hours').value = intervention.hours || '';
    document.getElementById('intervention-minutes').value = intervention.minutes || '';
    document.getElementById('intervention-next-days').value = intervention.next_maintenance_days || '';
    
    // Popola componenti usati
    const container = document.getElementById('intervention-components-container');
    if (intervention.used_components && intervention.used_components.length > 0) {
        container.innerHTML = intervention.used_components.map((uc, index) => `
            <div class="row mb-2">
                <div class="col-8">
                    <select class="form-select component-select">
                        <option value="">Seleziona componente</option>
                    </select>
                </div>
                <div class="col-3">
                    <input type="number" class="form-control component-quantity" min="1" value="${uc.quantity}" placeholder="Qt">
                </div>
                <div class="col-1">
                    <button type="button" class="btn btn-sm ${index === 0 ? 'btn-success" onclick="addComponentRow()">+' : 'btn-danger" onclick="this.closest(\'.row\').remove()">-'}</button>
                </div>
            </div>
        `).join('');
        
        // Imposta valori select
        populateComponentsSelect();
        intervention.used_components.forEach((uc, index) => {
            const selects = container.querySelectorAll('.component-select');
            if (selects[index]) selects[index].value = uc.componentId;
        });
    } else {
        container.innerHTML = `
            <div class="row mb-2">
                <div class="col-8">
                    <select class="form-select component-select">
                        <option value="">Seleziona componente</option>
                    </select>
                </div>
                <div class="col-3">
                    <input type="number" class="form-control component-quantity" min="1" value="1" placeholder="Qt">
                </div>
                <div class="col-1">
                    <button type="button" class="btn btn-sm btn-success" onclick="addComponentRow()">+</button>
                </div>
            </div>
        `;
        populateComponentsSelect();
    }
    
    addInterventionModal.show();
}

function populateComponentsSelect() {
    const selects = document.querySelectorAll('.component-select');
    const options = '<option value="">Seleziona componente</option>' + 
        components.map(c => `<option value="${c.id}">${c.name} (Disponibili: ${c.quantity})</option>`).join('');
    
    selects.forEach(select => select.innerHTML = options);
}

function addComponentRow() {
    const container = document.getElementById('intervention-components-container');
    const rowCount = container.querySelectorAll('.row').length;
    
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2';
    newRow.innerHTML = `
        <div class="col-8">
            <select class="form-select component-select">
                <option value="">Seleziona componente</option>
            </select>
        </div>
        <div class="col-3">
            <input type="number" class="form-control component-quantity" min="1" value="1" placeholder="Qt">
        </div>
        <div class="col-1">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.row').remove()">-</button>
        </div>
    `;
    
    container.appendChild(newRow);
    populateComponentsSelect();
}

async function saveIntervention() {
    const machineId = document.getElementById('intervention-machine').value;
    const date = document.getElementById('intervention-date').value;
    const type = document.getElementById('intervention-type').value;
    const status = document.getElementById('intervention-status').value;
    const description = document.getElementById('intervention-description').value.trim();
    const hours = document.getElementById('intervention-hours').value;
    const minutes = document.getElementById('intervention-minutes').value;
    const nextDays = document.getElementById('intervention-next-days').value;
    
    // Raccogli componenti utilizzati
    const usedComponents = [];
    const componentRows = document.querySelectorAll('#intervention-components-container .row');
    
    for (const row of componentRows) {
        const selectEl = row.querySelector('.component-select');
        const qtyEl = row.querySelector('.component-quantity');
        
        if (selectEl && selectEl.value && qtyEl && qtyEl.value) {
            const componentId = selectEl.value;
            const quantity = parseInt(qtyEl.value);
            
            // Verifica disponibilità
            const component = components.find(c => c.id === componentId);
            if (component && component.quantity < quantity) {
                showAlert(`Quantità insufficiente per ${component.name}. Disponibili: ${component.quantity}`, 'warning');
                return;
            }
            
            usedComponents.push({ componentId, quantity });
        }
    }
    
    if (!machineId || !date || !type || !status || !description) {
        showAlert('Compila tutti i campi obbligatori', 'warning');
        return;
    }
    
    // Verifica se è modifica o nuovo
    const hiddenId = document.getElementById('intervention-id');
    const isEdit = hiddenId && hiddenId.value;
    
    let interventionData;
    let oldIntervention;
    
    if (isEdit) {
        // Modifica intervento esistente
        oldIntervention = interventions.find(i => i.id === hiddenId.value);
        interventionData = {
            ...oldIntervention,
            machine_id: machineId,
            date,
            type,
            status,
            description,
            hours: hours ? parseInt(hours) : 0,
            minutes: minutes ? parseInt(minutes) : 0,
            next_maintenance_days: nextDays ? parseInt(nextDays) : null,
            used_components: usedComponents
        };
        
        // Ripristina componenti vecchi al magazzino
        if (oldIntervention.used_components) {
            for (const { componentId, quantity } of oldIntervention.used_components) {
                await adjustComponentStock(componentId, quantity);
            }
        }
    } else {
        // Nuovo intervento
        interventionData = {
            id: generateId(),
            machine_id: machineId,
            date,
            type,
            status,
            description,
            hours: hours ? parseInt(hours) : 0,
            minutes: minutes ? parseInt(minutes) : 0,
            next_maintenance_days: nextDays ? parseInt(nextDays) : null,
            used_components: usedComponents,
            created_at: new Date().toISOString()
        };
    }
    
    // Scala nuovi componenti dal magazzino
    for (const { componentId, quantity } of usedComponents) {
        await adjustComponentStock(componentId, -quantity);
    }
    
    // Salva su Firebase
    await saveToFirebase('interventions', interventionData);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        if (isEdit) {
            const index = interventions.findIndex(i => i.id === hiddenId.value);
            if (index !== -1) interventions[index] = interventionData;
        } else {
            interventions.push(interventionData);
        }
        saveToStorage(STORAGE_KEYS.interventions, interventions);
        renderInterventionsTable();
        renderDeadlinesTable();
        updateDashboard();
    }
    
    addInterventionModal.hide();
    document.getElementById('add-intervention-form').reset();
    showAlert(isEdit ? 'Intervento modificato con successo!' : 'Intervento registrato con successo!', 'success');
}

function deleteIntervention(id) {
    if (!confirm('Sei sicuro di voler eliminare questo intervento?')) return;
    
    // Elimina da Firebase
    deleteFromFirebase('interventions', id);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        interventions = interventions.filter(i => i.id !== id);
        saveToStorage(STORAGE_KEYS.interventions, interventions);
        renderInterventionsTable();
        renderDeadlinesTable();
        updateDashboard();
    }
    
    showAlert('Intervento eliminato', 'success');
}

async function markAsCompleted(id) {
    const intervention = interventions.find(i => i.id === id);
    if (!intervention) return;
    
    intervention.status = 'effettuato';
    
    // Aggiorna su Firebase
    await saveToFirebase('interventions', intervention);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        saveToStorage(STORAGE_KEYS.interventions, interventions);
        renderInterventionsTable();
        renderCalendar();
        updateDashboard();
    }
    
    showAlert('Intervento segnato come effettuato!', 'success');
}

// ==================== GESTIONE DETTAGLI MACCHINARIO ====================

function openMachineDetails(machineId) {
    currentMachineId = machineId;
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;
    
    // Aggiorna titolo modal
    document.getElementById('machine-details-title').textContent = machine.name;
    
    // Renderizza foto
    renderMachinePhotos(machineId);
    
    // Renderizza componenti
    renderMachineComponents(machineId);
    
    // Mostra modal
    machineDetailsModal.show();
}

function renderMachinePhotos(machineId) {
    const photos = machinePhotos.filter(p => p.machine_id === machineId);
    const container = document.getElementById('machine-photos-container');
    
    if (photos.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nessuna foto caricata</p>';
        return;
    }
    
    container.innerHTML = photos.map(photo => `
        <div class="col-md-4 mb-3">
            <div class="card h-100">
                <img src="${photo.url || photo.dataUrl}" 
                     class="card-img-top" 
                     alt="Foto macchinario" 
                     style="height: 200px; object-fit: cover; cursor: pointer;"
                     onclick="openPhotoGallery('${photo.id}')">
                <div class="card-body p-2 text-center">
                    <small class="text-muted">${formatDate(photo.created_at)}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function renderMachineComponents(machineId) {
    const machineComponents = components.filter(c => c.machine_id === machineId);
    const tbody = document.getElementById('machine-components-table');
    
    if (machineComponents.length === 0) {
        tbody.innerHTML = emptyTableRow(4, 'Nessun componente registrato');
        return;
    }
    
    tbody.innerHTML = machineComponents.map(comp => {
        let stockClass = '';
        if (comp.quantity <= comp.minStock) stockClass = 'text-danger fw-bold';
        else if (comp.quantity <= comp.minStock * 2) stockClass = 'text-warning fw-bold';
        
        return `
            <tr>
                <td><strong>${comp.name}</strong></td>
                <td class="${stockClass}">${comp.quantity}</td>
                <td>${comp.minStock || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="adjustComponentStock('${comp.id}', 1)">+1</button>
                    <button class="btn btn-sm btn-warning" onclick="adjustComponentStock('${comp.id}', -1)">-1</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteComponent('${comp.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== GESTIONE FOTO ====================

function showAddPhotoModal() {
    if (!currentMachineId) return;
    document.getElementById('photo-upload-input').value = '';
    document.getElementById('photo-preview').innerHTML = '';
    addPhotoModal.show();
}

let photoGalleryModal;
let currentGalleryPhotos = [];
let currentGalleryIndex = 0;

function showAddPhotoModal() {
    if (!currentMachineId) return;
    document.getElementById('photo-upload-input').value = '';
    document.getElementById('photo-preview').innerHTML = '';
    addPhotoModal.show();
}

function previewPhoto(input) {
    const preview = document.getElementById('photo-preview');
    preview.innerHTML = '';
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" class="img-fluid" style="max-height: 300px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Funzione per comprimere immagine
async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calcola nuove dimensioni mantenendo aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converti in blob
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function savePhoto() {
    const input = document.getElementById('photo-upload-input');
    
    if (!input.files || !input.files[0]) {
        showAlert('Seleziona una foto', 'warning');
        return;
    }
    
    const file = input.files[0];
    
    // Verifica che ci sia un macchinario selezionato
    if (!currentMachineId) {
        showAlert('Errore: nessun macchinario selezionato', 'danger');
        return;
    }
    
    showAlert('Compressione e caricamento foto...', 'info', 3000);
    
    try {
        const compressedBlob = await compressImage(file);
        
        // Converti blob compresso in base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const newPhoto = {
                id: generateId(),
                machine_id: currentMachineId,
                dataUrl: e.target.result,
                created_at: new Date().toISOString()
            };
            
            await saveToFirebase('machinePhotos', newPhoto);
            
            if (!firebaseInitialized) {
                renderMachinePhotos(currentMachineId);
                renderMachinesTable();
            }
            
            addPhotoModal.hide();
            input.value = '';
            document.getElementById('photo-preview').innerHTML = '';
            showAlert('Foto caricata con successo!', 'success');
        };
        reader.readAsDataURL(compressedBlob);
    } catch (error) {
        showAlert('Errore durante il caricamento della foto: ' + error.message, 'danger');
    }
}

async function deletePhoto(photoId) {
    if (!confirm('Eliminare questa foto?')) return;
    
    try {
        // Elimina da Firestore
        await deleteFromFirebase('machinePhotos', photoId);
        
        // Fallback localStorage
        if (!firebaseInitialized) {
            machinePhotos = machinePhotos.filter(p => p.id !== photoId);
            saveToStorage(STORAGE_KEYS.machinePhotos, machinePhotos);
            renderMachinePhotos(currentMachineId);
            renderMachinesTable();
        }
        
        showAlert('Foto eliminata', 'success');
    } catch (error) {
        showAlert('Errore durante l\'eliminazione', 'danger');
    }
}

// Galleria foto con zoom
function openPhotoGallery(photoId) {
    currentGalleryPhotos = machinePhotos.filter(p => p.machine_id === currentMachineId);
    currentGalleryIndex = currentGalleryPhotos.findIndex(p => p.id === photoId);
    
    if (!photoGalleryModal) {
        photoGalleryModal = new bootstrap.Modal(document.getElementById('photoGalleryModal'));
    }
    
    updateGalleryImage();
    photoGalleryModal.show();
}

function updateGalleryImage() {
    if (currentGalleryPhotos.length === 0) return;
    
    const photo = currentGalleryPhotos[currentGalleryIndex];
    const img = document.getElementById('gallery-main-image');
    img.src = photo.url || photo.dataUrl;
    
    document.getElementById('gallery-counter').textContent = 
        `${currentGalleryIndex + 1} / ${currentGalleryPhotos.length}`;
    
    // Disabilita pulsanti se necessario
    document.getElementById('gallery-prev').disabled = currentGalleryIndex === 0;
    document.getElementById('gallery-next').disabled = currentGalleryIndex === currentGalleryPhotos.length - 1;
}

function galleryNavigate(direction) {
    currentGalleryIndex += direction;
    if (currentGalleryIndex < 0) currentGalleryIndex = 0;
    if (currentGalleryIndex >= currentGalleryPhotos.length) currentGalleryIndex = currentGalleryPhotos.length - 1;
    updateGalleryImage();
}

function deleteCurrentPhoto() {
    if (currentGalleryPhotos.length === 0) return;
    
    const photo = currentGalleryPhotos[currentGalleryIndex];
    deletePhoto(photo.id);
    
    // Chiudi galleria se era l'ultima foto
    if (currentGalleryPhotos.length === 1) {
        photoGalleryModal.hide();
    } else {
        // Aggiorna indice dopo eliminazione
        if (currentGalleryIndex >= currentGalleryPhotos.length - 1) {
            currentGalleryIndex = currentGalleryPhotos.length - 2;
        }
    }
}

// ==================== GESTIONE COMPONENTI ====================

function showAddComponentModal() {
    if (!currentMachineId) return;
    document.getElementById('add-component-form').reset();
    addComponentModal.show();
}

async function saveComponent() {
    const code = document.getElementById('component-code').value.trim();
    const name = document.getElementById('component-name').value.trim();
    const quantity = parseInt(document.getElementById('component-quantity').value);
    const minStock = parseInt(document.getElementById('component-min-stock').value) || 0;
    const notes = document.getElementById('component-notes').value.trim();
    
    if (!name || isNaN(quantity)) {
        showAlert('Compila i campi obbligatori', 'warning');
        return;
    }
    
    const newComponent = {
        id: generateId(),
        code,
        name,
        quantity,
        minStock,
        notes,
        created_at: new Date().toISOString()
    };
    
    // Salva su Firebase
    await saveToFirebase('components', newComponent);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        components.push(newComponent);
        saveToStorage(STORAGE_KEYS.components, components);
        renderWarehouseTable();
        updateDashboard();
    }
    
    addComponentModal.hide();
    document.getElementById('add-component-form').reset();
    showAlert('Componente aggiunto con successo!', 'success');
}

async function adjustComponentStock(componentId, adjustment) {
    const component = components.find(c => c.id === componentId);
    if (!component) return;
    
    const newQuantity = component.quantity + adjustment;
    if (newQuantity < 0) {
        showAlert('Quantità non può essere negativa', 'warning');
        return;
    }
    
    component.quantity = newQuantity;
    
    // Aggiorna su Firebase
    await saveToFirebase('components', component);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        saveToStorage(STORAGE_KEYS.components, components);
        renderWarehouseTable();
        updateDashboard();
    }
    
    if (adjustment < 0) {
        // Non mostrare alert se chiamato da saveIntervention
    } else {
        showAlert(`Aggiunto 1 ${component.name}. Totale: ${newQuantity}`, 'success', 2000);
    }
}

function deleteComponent(componentId) {
    if (!confirm('Eliminare questo componente?')) return;
    
    // Elimina da Firebase
    deleteFromFirebase('components', componentId);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        components = components.filter(c => c.id !== componentId);
        saveToStorage(STORAGE_KEYS.components, components);
        renderWarehouseTable();
        updateDashboard();
    }
    
    showAlert('Componente eliminato', 'success');
}

// ==================== GESTIONE MAGAZZINO ====================

function renderWarehouseTable() {
    const tbody = document.getElementById('warehouse-table');
    if (!tbody) return;
    
    let filtered = [...components];
    
    // Filtro ricerca
    const searchTerm = document.getElementById('searchComponent')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(searchTerm) ||
            (c.code && c.code.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtro scorta bassa
    const lowStockOnly = document.getElementById('filterLowStock')?.checked || false;
    if (lowStockOnly) {
        filtered = filtered.filter(c => c.quantity <= c.minStock);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = emptyTableRow(6, 'Nessun componente trovato');
        return;
    }
    
    tbody.innerHTML = filtered.map(comp => {
        const isLowStock = comp.quantity <= comp.minStock;
        const statusBadge = isLowStock 
            ? '<span class="badge bg-danger">Scorta Bassa</span>' 
            : '<span class="badge bg-success">OK</span>';
        
        return `
            <tr>
                <td>${comp.code || '-'}</td>
                <td>${comp.name}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="adjustComponentStock('${comp.id}', -1)">-</button>
                        <strong>${comp.quantity}</strong>
                        <button class="btn btn-sm btn-outline-secondary" onclick="adjustComponentStock('${comp.id}', 1)">+</button>
                    </div>
                </td>
                <td>${comp.minStock}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-danger" onclick="deleteComponent('${comp.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterWarehouse() {
    renderWarehouseTable();
}

function showAddComponentModal() {
    document.getElementById('add-component-form').reset();
    addComponentModal.show();
}

// ==================== EXPORT DATI ====================

function exportData() {
    const data = {
        machines,
        interventions,
        components,
        machinePhotos,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gestionale-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showAlert('Dati esportati con successo!', 'success');
}

// ==================== FILTRI E RICERCA ====================

// Filtra macchinari
function filterMachines() {
    const searchText = document.getElementById('searchMachine')?.value.toLowerCase() || '';
    const filterType = document.getElementById('filterMachineType')?.value || '';
    const filterLocation = document.getElementById('filterMachineLocation')?.value || '';
    
    const tbody = document.getElementById('machines-table');
    
    const filtered = machines.filter(machine => {
        const matchSearch = !searchText || 
            machine.name.toLowerCase().includes(searchText) ||
            machine.type.toLowerCase().includes(searchText) ||
            machine.location.toLowerCase().includes(searchText);
        
        const matchType = !filterType || machine.type === filterType;
        const matchLocation = !filterLocation || machine.location === filterLocation;
        
        return matchSearch && matchType && matchLocation;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = emptyTableRow(5, 'Nessun macchinario trovato');
        return;
    }
    
    tbody.innerHTML = filtered.map(machine => {
        const lastIntervention = getLastIntervention(machine.id);
        const lastDate = lastIntervention ? new Date(lastIntervention.date).toLocaleDateString('it-IT') : 'Mai';
        const machineComponents = components.filter(c => c.machine_id === machine.id);
        const photosCount = machinePhotos.filter(p => p.machine_id === machine.id).length;
        
        return `
            <tr style="cursor: pointer;" onclick="openMachineDetails('${machine.id}')">
                <td>
                    <strong>${machine.name}</strong>
                    ${photosCount > 0 ? `<span class="badge bg-info ms-2">${photosCount} foto</span>` : ''}
                </td>
                <td>${machine.type || '-'}</td>
                <td>${machine.location || '-'}</td>
                <td>${lastDate}</td>
                <td onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-danger" onclick="deleteMachine('${machine.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtra interventi
function filterInterventions() {
    const filterMachine = document.getElementById('filterIntervMachine')?.value || '';
    const filterType = document.getElementById('filterIntervType')?.value || '';
    const filterDateFrom = document.getElementById('filterIntervDateFrom')?.value || '';
    const filterDateTo = document.getElementById('filterIntervDateTo')?.value || '';
    
    const tbody = document.getElementById('interventions-table');
    
    const filtered = interventions.filter(intervention => {
        const matchMachine = !filterMachine || intervention.machine_id === filterMachine;
        const matchType = !filterType || intervention.type === filterType;
        
        const intervDate = new Date(intervention.date);
        const matchDateFrom = !filterDateFrom || intervDate >= new Date(filterDateFrom);
        const matchDateTo = !filterDateTo || intervDate <= new Date(filterDateTo);
        
        return matchMachine && matchType && matchDateFrom && matchDateTo;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = emptyTableRow(7, 'Nessun intervento trovato');
        return;
    }
    
    const sortedInterventions = sortByDateDesc([...filtered]);
    
    tbody.innerHTML = sortedInterventions.map(intervention => {
        const machineName = getMachineName(intervention.machine_id);
        const date = formatDate(intervention.date);
        const statusBadge = getStatusBadge(intervention.status);
        const durationText = formatDuration(intervention.hours, intervention.minutes);
        
        const statusButton = intervention.status === 'programmato'
            ? `<button class="btn btn-sm btn-secondary" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="markAsCompleted('${intervention.id}')" title="Segna come effettuato">Conferma</button>`
            : '';
        
        return `
            <tr>
                <td>${date}</td>
                <td>${machineName}</td>
                <td><span class="badge bg-secondary">${intervention.type}</span></td>
                <td>${statusBadge}</td>
                <td>${intervention.description}</td>
                <td>${durationText}</td>
                <td>
                    ${statusButton}
                    <button class="btn btn-sm btn-secondary" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="editIntervention('${intervention.id}')">Modifica</button>
                    <button class="btn btn-sm btn-secondary ms-1" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="deleteIntervention('${intervention.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtra componenti (solo scorta bassa)
function filterComponents() {
    const showLowStock = document.getElementById('filterLowStock')?.checked || false;
    
    if (!currentMachineId) return;
    
    const tbody = document.getElementById('machine-components-table');
    const machineComponents = components.filter(c => c.machineId === currentMachineId);
    
    const filtered = showLowStock 
        ? machineComponents.filter(c => c.quantity <= c.minStock)
        : machineComponents;
    
    if (filtered.length === 0) {
        const msg = showLowStock 
            ? 'Nessun componente con scorta bassa' 
            : 'Nessun componente registrato';
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${msg}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(component => {
        const isLowStock = component.quantity <= component.minStock;
        const stockClass = isLowStock ? 'text-danger fw-bold' : '';
        
        return `
            <tr>
                <td>${component.name}</td>
                <td class="${stockClass}">${component.quantity}</td>
                <td>${component.minStock}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="adjustComponentStock('${component.id}', 1)" title="Aggiungi">+1</button>
                    <button class="btn btn-sm btn-warning" onclick="adjustComponentStock('${component.id}', -1)" title="Rimuovi">-1</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteComponent('${component.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtra scadenze per stato
function filterDeadlines() {
    const filterType = document.querySelector('input[name="filterDeadline"]:checked')?.value || 'all';
    
    const tbody = document.getElementById('deadlines-table');
    const allDeadlines = calculateDeadlines();
    
    let filtered = allDeadlines;
    
    if (filterType === 'overdue') {
        filtered = allDeadlines.filter(d => d.daysRemaining < 0);
    } else if (filterType === 'upcoming') {
        filtered = allDeadlines.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 30);
    } else if (filterType === 'ok') {
        filtered = allDeadlines.filter(d => d.daysRemaining > 30);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = emptyTableRow(4, 'Nessuna scadenza trovata');
        return;
    }
    
    tbody.innerHTML = filtered.map(deadline => {
        let statusClass = 'status-ok';
        let statusText = 'OK';
        
        if (deadline.daysRemaining < 0) {
            statusClass = 'status-danger';
            statusText = 'SCADUTO';
        } else if (deadline.daysRemaining <= 7) {
            statusClass = 'status-danger';
            statusText = 'URGENTE';
        } else if (deadline.daysRemaining <= 30) {
            statusClass = 'status-warning';
            statusText = 'IN SCADENZA';
        }
        
        return `
            <tr>
                <td><strong>${deadline.machineName}</strong></td>
                <td>${deadline.nextDate}</td>
                <td>${deadline.daysRemaining} giorni</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// Popola dropdown filtri dinamicamente
function populateFilterDropdowns() {
    // Tipi macchinari
    const types = [...new Set(machines.map(m => m.type))].sort();
    const typeSelect = document.getElementById('filterMachineType');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">Tutti i tipi</option>' + 
            types.map(type => `<option value="${type}">${type}</option>`).join('');
    }
    
    // Ubicazioni macchinari
    const locations = [...new Set(machines.map(m => m.location))].sort();
    const locationSelect = document.getElementById('filterMachineLocation');
    if (locationSelect) {
        locationSelect.innerHTML = '<option value="">Tutte le ubicazioni</option>' + 
            locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    }
    
    // Macchinari per filtro interventi
    const machineSelect = document.getElementById('filterIntervMachine');
    if (machineSelect) {
        machineSelect.innerHTML = '<option value="">Tutti i macchinari</option>' + 
            machines.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    }
}

// ==================== ALERT ====================

function showAlert(message, type = 'info', duration = 3000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '500px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, duration);
}

// ==================== CALENDARIO ====================

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Aggiorna titolo
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
    
    // Calcola primo e ultimo giorno
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // 0=Dom, 1=Lun... convertito in Lun=0, Mar=1...
    const firstDayOfWeek = firstDay.getDay();
    const startingDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Giorni del mese precedente
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const grid = document.getElementById('calendar-grid');
    let html = '';
    
    // Header settimana
    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    weekDays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });
    
    // Giorni mese precedente
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">
            <span class="calendar-day-number">${prevMonthDays - i}</span>
        </div>`;
    }
    
    // Giorni mese corrente
    const today = new Date();
    const todayStr = today.toDateString();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const isToday = currentDate.toDateString() === todayStr;
        const dateKey = formatDateKey(currentDate);
        const events = getEventsForDate(currentDate);
        
        let eventsHTML = '';
        const maxVisible = 2;
        events.slice(0, maxVisible).forEach(event => {
            eventsHTML += `<div class="calendar-event ${event.className}">${event.title}</div>`;
        });
        
        if (events.length > maxVisible) {
            eventsHTML += `<div class="calendar-more">+${events.length - maxVisible} altro</div>`;
        }
        
        html += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="showDayDetails('${dateKey}')">
            <span class="calendar-day-number">${day}</span>
            <div class="calendar-events">${eventsHTML}</div>
        </div>`;
    }
    
    // Giorni mese successivo
    const totalCells = startingDayOfWeek + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">
            <span class="calendar-day-number">${day}</span>
        </div>`;
    }
    
    grid.innerHTML = html;
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getEventsForDate(date) {
    const events = [];
    const dateKey = formatDateKey(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Solo interventi (programmati ed effettuati)
    interventions.forEach(intervention => {
        const intervDate = new Date(intervention.date);
        intervDate.setHours(0, 0, 0, 0); // Normalizza a mezzanotte
        const intervKey = formatDateKey(intervDate);
        
        if (intervKey === dateKey) {
            const machineName = getMachineName(intervention.machine_id);
            let className = '';
            
            if (intervention.status === 'effettuato') {
                className = 'event-completed';
            } else {
                const daysUntil = Math.floor((intervDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysUntil < 0) {
                    className = 'event-overdue';
                } else if (daysUntil <= 7) {
                    className = 'event-upcoming';
                } else {
                    className = 'event-scheduled';
                }
            }
            
            events.push({
                type: 'intervention',
                title: machineName,
                className: className,
                data: intervention
            });
        }
    });
    
    return events;
}

function showDayDetails(dateKey) {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(year, parseInt(month) - 1, day);
    const events = getEventsForDate(date);
    
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    
    document.getElementById('dayModalTitle').textContent = 
        `${dayNames[date.getDay()]} ${day} ${monthNames[date.getMonth()]} ${year}`;
    
    const body = document.getElementById('dayModalBody');
    
    if (events.length === 0) {
        body.innerHTML = '<p class="text-muted text-center">Nessun evento per questa giornata</p>';
    } else {
        let html = '<div class="day-event-list">';
        
        events.forEach(event => {
            if (event.type === 'deadline') {
                let badgeClass = 'bg-success';
                let statusText = 'OK';
                if (event.data.daysRemaining < 0) {
                    badgeClass = 'bg-danger';
                    statusText = 'SCADUTO';
                } else if (event.data.daysRemaining <= 7) {
                    badgeClass = 'bg-danger';
                    statusText = 'URGENTE';
                } else if (event.data.daysRemaining <= 30) {
                    badgeClass = 'bg-warning';
                    statusText = 'IN SCADENZA';
                }
                
                html += `<div class="day-event-item">
                    <h6>Scadenza Manutenzione</h6>
                    <span class="badge ${badgeClass} mb-2">${statusText}</span>
                    <p class="mb-1"><strong>Macchina:</strong> ${event.data.machineName}</p>
                    <p class="mb-1"><strong>Tipo intervento previsto:</strong> ${event.data.interventionType}</p>
                    <p class="mb-1"><strong>Descrizione:</strong> ${event.data.interventionDescription || 'N/A'}</p>
                    <p class="mb-1"><strong>Data scadenza:</strong> ${event.data.nextDate}</p>
                    <p class="mb-1"><strong>Giorni rimanenti:</strong> ${event.data.daysRemaining}</p>
                    <p class="mb-0"><strong>Ultimo intervento:</strong> ${formatDate(event.data.lastIntervention)}</p>
                </div>`;
            } else {
                const machineName = getMachineName(event.data.machine_id);
                const duration = formatDuration(event.data.hours, event.data.minutes);
                
                html += `<div class="day-event-item">
                    <h6>🔧 Intervento Effettuato</h6>
                    <span class="badge mb-2" style="background-color: #8b0000;">${event.data.type}</span>
                    <p class="mb-1"><strong>Macchina:</strong> ${machineName}</p>
                    <p class="mb-1"><strong>Data:</strong> ${formatDate(event.data.date)}</p>
                    <p class="mb-1"><strong>Descrizione:</strong> ${event.data.description || 'Nessuna descrizione'}</p>
                    <p class="mb-1"><strong>Durata:</strong> ${duration}</p>
                    ${event.data.next_maintenance_days ? `<p class="mb-0"><strong>Prossima manutenzione tra:</strong> ${event.data.next_maintenance_days} giorni</p>` : ''}
                </div>`;
            }
        });
        
        html += '</div>';
        body.innerHTML = html;
    }
    
    if (!dayModal) {
        dayModal = new bootstrap.Modal(document.getElementById('dayModal'));
    }
    dayModal.show();
}

function previousMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

