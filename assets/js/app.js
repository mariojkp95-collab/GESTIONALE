// Gestionale Manutenzioni - Firebase Cloud Sync Version

// Chiavi localStorage (fallback)
const STORAGE_KEYS = {
    machines: 'gestionale_machines',
    interventions: 'gestionale_interventions',
    components: 'gestionale_components',
    machinePhotos: 'gestionale_machine_photos'
};

// Firebase collections
const FIREBASE_COLLECTIONS = {
    machines: 'machines',
    interventions: 'interventions',
    components: 'components',
    machinePhotos: 'machinePhotos'
};

// Variabili globali
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
        console.error('Firebase Auth non disponibile!');
        alert('Errore: Firebase Authentication non è caricato. Ricarica la pagina.');
        return;
    }
    
    const { onAuthStateChanged } = window.authModules;
    
    onAuthStateChanged(window.firebaseAuth, (user) => {
        currentUser = user;
        
        if (user) {
            // Utente loggato
            console.log('✓ Utente autenticato:', user.email);
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('logout-btn').style.display = 'inline-block';
            hideLoginModal();
            initFirebase();
        } else {
            // Utente non loggato
            console.log('⚠ Utente non autenticato - richiedo login');
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
        console.error('Errore login:', error);
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
        successDiv.textContent = '✓ Account creato! Accedi per continuare.';
        successDiv.classList.remove('d-none');
        document.getElementById('register-form').reset();
        
        // Passa al tab login dopo 2 secondi
        setTimeout(() => {
            document.getElementById('login-tab').click();
            successDiv.classList.add('d-none');
        }, 2000);
    } catch (error) {
        console.error('Errore registrazione:', error);
        errorDiv.textContent = getAuthErrorMessage(error.code);
        errorDiv.classList.remove('d-none');
        successDiv.classList.add('d-none');
    }
}

async function logout() {
    try {
        const { signOut } = window.authModules;
        await signOut(window.firebaseAuth);
    } catch (error) {
        console.error('Errore logout:', error);
    }
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
        console.warn('Firebase non disponibile o utente non autenticato');
        updateSyncStatus(false);
        return false;
    }
    
    try {
        // Setup listeners per sincronizzazione real-time
        setupFirebaseListeners();
        firebaseInitialized = true;
        updateSyncStatus(true);
        console.log('✓ Firebase connesso e sincronizzato');
        
        // Carica dati iniziali
        loadData();
        return true;
    } catch (error) {
        console.error('Errore Firebase:', error);
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
}

async function saveToFirebase(collectionName, data) {
    console.log('saveToFirebase chiamato:', { collectionName, dataId: data.id, firebaseInitialized });
    
    if (!firebaseInitialized || !window.firebaseDb) {
        console.warn('Firebase non disponibile, salvo in localStorage');
        // Fallback localStorage - aggiungi all'array esistente
        const storageKey = STORAGE_KEYS[collectionName];
        
        if (!storageKey) {
            console.error('Storage key non trovata per:', collectionName);
            return;
        }
        
        const existingData = loadFromStorage(storageKey);
        const index = existingData.findIndex(item => item.id === data.id);
        
        if (index >= 0) {
            existingData[index] = data; // Aggiorna esistente
            console.log('Aggiornato in localStorage:', data.id);
        } else {
            existingData.push(data); // Aggiungi nuovo
            console.log('Aggiunto in localStorage:', data.id);
        }
        
        saveToStorage(storageKey, existingData);
        
        // Aggiorna anche l'array globale
        updateGlobalArray(collectionName, existingData);
        return;
    }
    
    try {
        const { setDoc, doc } = window.firebaseModules;
        const db = window.firebaseDb;
        await setDoc(doc(db, FIREBASE_COLLECTIONS[collectionName], data.id), data);
        console.log(`✓ Salvato su Firebase: ${collectionName}/${data.id}`);
    } catch (error) {
        console.error('Errore salvataggio Firebase:', error);
        // Fallback localStorage in caso di errore
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
    if (!firebaseInitialized) {
        return;
    }
    
    try {
        const { deleteDoc, doc } = window.firebaseModules;
        const db = window.firebaseDb;
        await deleteDoc(doc(db, FIREBASE_COLLECTIONS[collectionName], id));
    } catch (error) {
        console.error('Errore eliminazione Firebase:', error);
    }
}

// ==================== GESTIONE LOCALSTORAGE ====================

// Carica dati da localStorage
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        const parsed = JSON.parse(data);
        // Assicurati che sia sempre un array
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Errore caricamento localStorage:', key, error);
        return [];
    }
}

// Salva dati in localStorage
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
    
    // Inizializza autenticazione
    initAuth();
});

// Caricamento dati
function loadData() {
    if (firebaseInitialized) {
        // I dati arrivano già dai listener Firebase
        console.log('Dati caricati da Firebase');
    } else {
        // Fallback localStorage
        machines = loadFromStorage(STORAGE_KEYS.machines);
        interventions = loadFromStorage(STORAGE_KEYS.interventions);
        components = loadFromStorage(STORAGE_KEYS.components);
        machinePhotos = loadFromStorage(STORAGE_KEYS.machinePhotos);
        console.log('Dati caricati da localStorage');
    }
    
    renderMachinesTable();
    renderInterventionsTable();
    renderDeadlinesTable();
    updateMachineSelect();
    updateDashboard();
}

// ==================== RENDERING TABELLE ====================

// Rendering tabella macchinari
function renderMachinesTable() {
    const tbody = document.getElementById('machines-table');
    
    if (machines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nessun macchinario presente</td></tr>';
        return;
    }
    
    // Usa filterMachines() se ci sono filtri attivi, altrimenti mostra tutto
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
        const machineComponents = components.filter(c => c.machine_id === machine.id);
        const photosCount = machinePhotos.filter(p => p.machine_id === machine.id).length;
        
        return `
            <tr style="cursor: pointer;" onclick="openMachineDetails('${machine.id}')">
                <td>
                    <strong>${machine.name}</strong>
                    ${photosCount > 0 ? `<span class="badge bg-info ms-2">📷 ${photosCount}</span>` : ''}
                    ${machineComponents.length > 0 ? `<span class="badge bg-success ms-1">🔧 ${machineComponents.length}</span>` : ''}
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

// Rendering tabella interventi
function renderInterventionsTable() {
    const tbody = document.getElementById('interventions-table');
    
    if (interventions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nessun intervento registrato</td></tr>';
        return;
    }
    
    // Usa filterInterventions() se ci sono filtri attivi
    const filterMachine = document.getElementById('filterIntervMachine')?.value || '';
    const filterType = document.getElementById('filterIntervType')?.value || '';
    const filterDateFrom = document.getElementById('filterIntervDateFrom')?.value || '';
    const filterDateTo = document.getElementById('filterIntervDateTo')?.value || '';
    
    if (filterMachine || filterType || filterDateFrom || filterDateTo) {
        filterInterventions();
        return;
    }
    
    const sortedInterventions = [...interventions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sortedInterventions.map(intervention => {
        const machine = machines.find(m => m.id === intervention.machine_id);
        const machineName = machine ? machine.name : 'Sconosciuto';
        const date = new Date(intervention.date).toLocaleDateString('it-IT');
        
        // Formatta durata
        let durationText = '-';
        if (intervention.hours || intervention.minutes) {
            const h = intervention.hours || 0;
            const m = intervention.minutes || 0;
            if (h > 0 && m > 0) {
                durationText = `${h}h ${m}m`;
            } else if (h > 0) {
                durationText = `${h}h`;
            } else if (m > 0) {
                durationText = `${m}m`;
            }
        }
        
        return `
            <tr>
                <td>${date}</td>
                <td>${machineName}</td>
                <td><span class="badge bg-primary">${intervention.type}</span></td>
                <td>${intervention.description}</td>
                <td>⏱️ ${durationText}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteIntervention('${intervention.id}')">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Rendering tabella scadenze
function renderDeadlinesTable() {
    const tbody = document.getElementById('deadlines-table');
    if (!tbody) return; // Elemento non presente nella DOM (es. calendario attivo)
    
    const deadlines = calculateDeadlines();
    
    if (deadlines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessuna scadenza programmata</td></tr>';
        return;
    }
    
    // Usa filterDeadlines() se c'è un filtro attivo
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

// Calcola scadenze
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

// Ottieni ultimo intervento per macchinario
function getLastIntervention(machineId) {
    const machineInterventions = interventions.filter(i => i.machine_id === machineId);
    if (machineInterventions.length === 0) return null;
    return machineInterventions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

// Aggiorna dashboard
function updateDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Scadenze in Ritardo
    const deadlines = calculateDeadlines();
    const overdueDeadlines = deadlines.filter(d => d.daysRemaining < 0);
    document.getElementById('overdue-deadlines').textContent = overdueDeadlines.length;
    
    // 2. Componenti Sotto Scorta (quantità <= 2)
    const lowStockComponents = components.filter(c => c.quantity <= 2);
    document.getElementById('low-stock-components').textContent = lowStockComponents.length;
    
    // 3. Interventi Questo Mese
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthInterventions = interventions.filter(i => {
        const iDate = new Date(i.date);
        return iDate.getMonth() === currentMonth && iDate.getFullYear() === currentYear;
    });
    document.getElementById('month-interventions').textContent = monthInterventions.length;
    document.getElementById('month-interventions-detail').textContent = 
        monthInterventions.length > 0 ? `${monthInterventions.length} completati` : 'Nessuno';
    
    // 4. Macchinario Più Attivo (con più interventi)
    if (machines.length > 0 && interventions.length > 0) {
        const machineInterventionCount = {};
        interventions.forEach(i => {
            machineInterventionCount[i.machine_id] = (machineInterventionCount[i.machine_id] || 0) + 1;
        });
        
        const mostActiveMachineId = Object.keys(machineInterventionCount).reduce((a, b) => 
            machineInterventionCount[a] > machineInterventionCount[b] ? a : b
        );
        
        const mostActiveMachine = machines.find(m => m.id === mostActiveMachineId);
        const count = machineInterventionCount[mostActiveMachineId];
        
        document.getElementById('most-active-machine').textContent = mostActiveMachine ? mostActiveMachine.name : '-';
        document.getElementById('most-active-count').textContent = `${count} interventi`;
    } else {
        document.getElementById('most-active-machine').textContent = '-';
        document.getElementById('most-active-count').textContent = 'Nessun intervento';
    }
    
    // 5. Prossima Scadenza
    const upcomingDeadlines = deadlines.filter(d => d.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
    if (upcomingDeadlines.length > 0) {
        const nextDeadline = upcomingDeadlines[0];
        const machine = machines.find(m => m.id === nextDeadline.machine_id);
        document.getElementById('next-deadline-machine').textContent = machine ? machine.name : '-';
        document.getElementById('next-deadline-date').textContent = 
            `Tra ${nextDeadline.daysRemaining} giorni (${new Date(nextDeadline.deadline).toLocaleDateString('it-IT')})`;
    } else {
        document.getElementById('next-deadline-machine').textContent = '-';
        document.getElementById('next-deadline-date').textContent = 'Nessuna scadenza';
    }
    
    // 6. Ultima Attività
    if (interventions.length > 0) {
        const lastIntervention = [...interventions].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const machine = machines.find(m => m.id === lastIntervention.machine_id);
        document.getElementById('last-activity-machine').textContent = machine ? machine.name : '-';
        document.getElementById('last-activity-date').textContent = 
            new Date(lastIntervention.date).toLocaleDateString('it-IT');
    } else {
        document.getElementById('last-activity-machine').textContent = '-';
        document.getElementById('last-activity-date').textContent = 'Nessuna attività';
    }
    
    // Ultimi interventi (lista in basso)
    const recentDiv = document.getElementById('recent-interventions');
    const recent = [...interventions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (recent.length === 0) {
        recentDiv.innerHTML = '<p class="text-muted">Nessun intervento registrato</p>';
    } else {
        recentDiv.innerHTML = '<ul class="list-group">' + recent.map(intervention => {
            const machine = machines.find(m => m.id === intervention.machine_id);
            const machineName = machine ? machine.name : 'Sconosciuto';
            const date = new Date(intervention.date).toLocaleDateString('it-IT');
            let durationText = '';
            if (intervention.hours || intervention.minutes) {
                const h = intervention.hours || 0;
                const m = intervention.minutes || 0;
                durationText = ` - ⏱️ ${h}h ${m}m`;
            }
            return `
                <li class="list-group-item">
                    <strong>${machineName}</strong> - ${date}${durationText}<br>
                    <small>${intervention.type}: ${intervention.description}</small>
                </li>
            `;
        }).join('') + '</ul>';
    }
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
    
    console.log('Tentativo salvataggio macchinario:', newMachine);
    
    // Salva su Firebase
    await saveToFirebase('machines', newMachine);
    
    // Se usa localStorage (fallback), renderizza manualmente
    if (!firebaseInitialized) {
        console.log('Rendering manuale dopo salvataggio localStorage');
        renderMachinesTable();
        updateMachineSelect();
        updateDashboard();
    }
    
    addMachineModal.hide();
    document.getElementById('add-machine-form').reset();
    showAlert('Macchinario aggiunto con successo!', 'success');
    
    console.log('Macchinari totali:', machines.length);
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
        machineInterventions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(i => {
            html += `
                <li class="list-group-item">
                    <strong>${new Date(i.date).toLocaleDateString('it-IT')}</strong> - ${i.type}<br>
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
    document.getElementById('add-intervention-form').reset();
    document.getElementById('intervention-date').valueAsDate = new Date();
    addInterventionModal.show();
}

async function saveIntervention() {
    const machineId = document.getElementById('intervention-machine').value;
    const date = document.getElementById('intervention-date').value;
    const type = document.getElementById('intervention-type').value;
    const description = document.getElementById('intervention-description').value.trim();
    const hours = document.getElementById('intervention-hours').value;
    const minutes = document.getElementById('intervention-minutes').value;
    const nextDays = document.getElementById('intervention-next-days').value;
    
    if (!machineId || !date || !type || !description) {
        showAlert('Compila tutti i campi obbligatori', 'warning');
        return;
    }
    
    const newIntervention = {
        id: generateId(),
        machine_id: machineId,
        date,
        type,
        description,
        hours: hours ? parseInt(hours) : 0,
        minutes: minutes ? parseInt(minutes) : 0,
        next_maintenance_days: nextDays ? parseInt(nextDays) : null,
        created_at: new Date().toISOString()
    };
    
    // Salva su Firebase
    await saveToFirebase('interventions', newIntervention);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        interventions.push(newIntervention);
        saveToStorage(STORAGE_KEYS.interventions, interventions);
        renderInterventionsTable();
        renderDeadlinesTable();
        updateDashboard();
    }
    
    addInterventionModal.hide();
    document.getElementById('add-intervention-form').reset();
    showAlert('Intervento registrato con successo!', 'success');
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
                    <small class="text-muted">${new Date(photo.created_at).toLocaleDateString('it-IT')}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function renderMachineComponents(machineId) {
    const machineComponents = components.filter(c => c.machine_id === machineId);
    const tbody = document.getElementById('machine-components-table');
    
    if (machineComponents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessun componente registrato</td></tr>';
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
                    <button class="btn btn-sm btn-danger" onclick="deleteComponent('${comp.id}')">🗑️</button>
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

// ==================== GESTIONE FOTO ====================

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
    
    showAlert('⏳ Compressione e caricamento foto...', 'info', 3000);
    
    try {
        // Comprimi immagine
        const compressedBlob = await compressImage(file);
        console.log('Immagine compressa, dimensione:', compressedBlob.size);
        
        // Converti blob compresso in base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const newPhoto = {
                id: generateId(),
                machine_id: currentMachineId,
                dataUrl: e.target.result, // base64 compresso
                created_at: new Date().toISOString()
            };
            
            console.log('Salvo foto su Firestore...');
            await saveToFirebase('machinePhotos', newPhoto);
            
            if (!firebaseInitialized) {
                renderMachinePhotos(currentMachineId);
                renderMachinesTable();
            }
            
            addPhotoModal.hide();
            input.value = '';
            document.getElementById('photo-preview').innerHTML = '';
            showAlert('✓ Foto caricata con successo!', 'success');
            console.log('Foto salvata correttamente');
        };
        reader.readAsDataURL(compressedBlob);
    } catch (error) {
        console.error('Errore upload foto:', error);
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
        console.error('Errore eliminazione foto:', error);
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
        machine_id: currentMachineId,
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
        renderMachineComponents(currentMachineId);
        renderMachinesTable();
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
        renderMachineComponents(currentMachineId);
        renderMachinesTable();
        updateDashboard();
    }
    
    if (adjustment < 0) {
        showAlert(`Prelevato 1 ${component.name}. Rimanenti: ${newQuantity}`, 'info', 2000);
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
        renderMachineComponents(currentMachineId);
        renderMachinesTable();
        updateDashboard();
    }
    
    showAlert('Componente eliminato', 'success');
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nessun macchinario trovato</td></tr>';
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
                    ${photosCount > 0 ? `<span class="badge bg-info ms-2">📷 ${photosCount}</span>` : ''}
                    ${machineComponents.length > 0 ? `<span class="badge bg-success ms-1">🔧 ${machineComponents.length}</span>` : ''}
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
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nessun intervento trovato</td></tr>';
        return;
    }
    
    const sortedInterventions = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sortedInterventions.map(intervention => {
        const machine = machines.find(m => m.id === intervention.machine_id);
        const machineName = machine ? machine.name : 'Sconosciuto';
        const date = new Date(intervention.date).toLocaleDateString('it-IT');
        
        let durationText = '-';
        if (intervention.hours || intervention.minutes) {
            const h = intervention.hours || 0;
            const m = intervention.minutes || 0;
            if (h > 0 && m > 0) {
                durationText = `${h}h ${m}m`;
            } else if (h > 0) {
                durationText = `${h}h`;
            } else if (m > 0) {
                durationText = `${m}m`;
            }
        }
        
        return `
            <tr>
                <td>${date}</td>
                <td>${machineName}</td>
                <td><span class="badge bg-primary">${intervention.type}</span></td>
                <td>${intervention.description}</td>
                <td>⏱️ ${durationText}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteIntervention('${intervention.id}')">Elimina</button>
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessuna scadenza trovata</td></tr>';
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
    
    // Scadenze
    const deadlines = calculateDeadlines();
    deadlines.forEach(deadline => {
        const deadlineParts = deadline.nextDate.split('/');
        const deadlineKey = `${deadlineParts[2]}-${deadlineParts[1]}-${deadlineParts[0]}`;
        
        if (deadlineKey === dateKey) {
            let className = 'event-ok';
            if (deadline.daysRemaining < 0) className = 'event-overdue';
            else if (deadline.daysRemaining <= 7) className = 'event-urgent';
            else if (deadline.daysRemaining <= 30) className = 'event-upcoming';
            
            events.push({
                type: 'deadline',
                title: deadline.machineName,
                className: className,
                data: deadline
            });
        }
    });
    
    // Interventi
    interventions.forEach(intervention => {
        const intervDate = new Date(intervention.date);
        const intervKey = formatDateKey(intervDate);
        
        if (intervKey === dateKey) {
            const machine = machines.find(m => m.id === intervention.machine_id);
            events.push({
                type: 'intervention',
                title: machine ? machine.name : 'Intervento',
                className: 'event-intervention',
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
                    <h6>📅 Scadenza Manutenzione</h6>
                    <span class="badge ${badgeClass} mb-2">${statusText}</span>
                    <p class="mb-1"><strong>Macchina:</strong> ${event.data.machineName}</p>
                    <p class="mb-1"><strong>Tipo intervento previsto:</strong> ${event.data.interventionType}</p>
                    <p class="mb-1"><strong>Descrizione:</strong> ${event.data.interventionDescription || 'N/A'}</p>
                    <p class="mb-1"><strong>Data scadenza:</strong> ${event.data.nextDate}</p>
                    <p class="mb-1"><strong>Giorni rimanenti:</strong> ${event.data.daysRemaining}</p>
                    <p class="mb-0"><strong>Ultimo intervento:</strong> ${new Date(event.data.lastIntervention).toLocaleDateString('it-IT')}</p>
                </div>`;
            } else {
                const machine = machines.find(m => m.id === event.data.machine_id);
                const durationParts = [];
                if (event.data.hours) durationParts.push(`${event.data.hours}h`);
                if (event.data.minutes) durationParts.push(`${event.data.minutes}m`);
                const duration = durationParts.length > 0 ? durationParts.join(' ') : 'Non specificata';
                
                html += `<div class="day-event-item">
                    <h6>🔧 Intervento Effettuato</h6>
                    <span class="badge mb-2" style="background-color: #8b0000;">${event.data.type}</span>
                    <p class="mb-1"><strong>Macchina:</strong> ${machine ? machine.name : 'N/A'}</p>
                    <p class="mb-1"><strong>Data:</strong> ${new Date(event.data.date).toLocaleDateString('it-IT')}</p>
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

