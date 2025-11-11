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
let firebaseInitialized = false;
let currentUser = null;

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
    if (!firebaseInitialized) {
        saveToStorage(STORAGE_KEYS[collectionName], data);
        return;
    }
    
    try {
        const { setDoc, doc } = window.firebaseModules;
        const db = window.firebaseDb;
        await setDoc(doc(db, FIREBASE_COLLECTIONS[collectionName], data.id), data);
    } catch (error) {
        console.error('Errore salvataggio Firebase:', error);
        saveToStorage(STORAGE_KEYS[collectionName], data);
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
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nessun intervento registrato</td></tr>';
        return;
    }
    
    const sortedInterventions = [...interventions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sortedInterventions.map(intervention => {
        const machine = machines.find(m => m.id === intervention.machine_id);
        const machineName = machine ? machine.name : 'Sconosciuto';
        const date = new Date(intervention.date).toLocaleDateString('it-IT');
        
        return `
            <tr>
                <td>${date}</td>
                <td>${machineName}</td>
                <td><span class="badge bg-primary">${intervention.type}</span></td>
                <td>${intervention.description}</td>
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
    const deadlines = calculateDeadlines();
    
    if (deadlines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessuna scadenza programmata</td></tr>';
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
                daysRemaining: daysRemaining
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
    document.getElementById('total-machines').textContent = machines.length;
    document.getElementById('total-interventions').textContent = interventions.length;
    
    const deadlines = calculateDeadlines();
    const upcomingDeadlines = deadlines.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 30);
    document.getElementById('upcoming-deadlines').textContent = upcomingDeadlines.length;
    
    // Ultimi interventi
    const recentDiv = document.getElementById('recent-interventions');
    const recent = [...interventions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (recent.length === 0) {
        recentDiv.innerHTML = '<p class="text-muted">Nessun intervento registrato</p>';
    } else {
        recentDiv.innerHTML = '<ul class="list-group">' + recent.map(intervention => {
            const machine = machines.find(m => m.id === intervention.machine_id);
            const machineName = machine ? machine.name : 'Sconosciuto';
            const date = new Date(intervention.date).toLocaleDateString('it-IT');
            return `
                <li class="list-group-item">
                    <strong>${machineName}</strong> - ${date}<br>
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
}

// ==================== GESTIONE MACCHINARI ====================

function showAddMachineModal() {
    document.getElementById('add-machine-form').reset();
    addMachineModal.show();
}

function saveMachine() {
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
    
    // Salva su Firebase
    saveToFirebase('machines', newMachine);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        machines.push(newMachine);
        saveToStorage(STORAGE_KEYS.machines, machines);
        renderMachinesTable();
        updateMachineSelect();
        updateDashboard();
    }
    
    addMachineModal.hide();
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

function saveIntervention() {
    const machineId = document.getElementById('intervention-machine').value;
    const date = document.getElementById('intervention-date').value;
    const type = document.getElementById('intervention-type').value;
    const description = document.getElementById('intervention-description').value.trim();
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
        next_maintenance_days: nextDays ? parseInt(nextDays) : null,
        created_at: new Date().toISOString()
    };
    
    // Salva su Firebase
    saveToFirebase('interventions', newIntervention);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        interventions.push(newIntervention);
        saveToStorage(STORAGE_KEYS.interventions, interventions);
        renderInterventionsTable();
        renderDeadlinesTable();
        updateDashboard();
    }
    
    addInterventionModal.hide();
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

let currentMachineId = null;

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
                <img src="${photo.dataUrl}" class="card-img-top" alt="Foto macchinario" style="height: 200px; object-fit: cover;">
                <div class="card-body p-2">
                    <button class="btn btn-sm btn-danger w-100" onclick="deletePhoto('${photo.id}')">Elimina</button>
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

function savePhoto() {
    const input = document.getElementById('photo-upload-input');
    
    if (!input.files || !input.files[0]) {
        showAlert('Seleziona una foto', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const newPhoto = {
            id: generateId(),
            machine_id: currentMachineId,
            dataUrl: e.target.result,
            created_at: new Date().toISOString()
        };
        
        // Salva su Firebase
        saveToFirebase('machinePhotos', newPhoto);
        
        // Fallback localStorage
        if (!firebaseInitialized) {
            machinePhotos.push(newPhoto);
            saveToStorage(STORAGE_KEYS.machinePhotos, machinePhotos);
            renderMachinePhotos(currentMachineId);
            renderMachinesTable();
        }
        
        addPhotoModal.hide();
        showAlert('Foto aggiunta con successo!', 'success');
    };
    reader.readAsDataURL(input.files[0]);
}

function deletePhoto(photoId) {
    if (!confirm('Eliminare questa foto?')) return;
    
    // Elimina da Firebase
    deleteFromFirebase('machinePhotos', photoId);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        machinePhotos = machinePhotos.filter(p => p.id !== photoId);
        saveToStorage(STORAGE_KEYS.machinePhotos, machinePhotos);
        renderMachinePhotos(currentMachineId);
        renderMachinesTable();
    }
    
    showAlert('Foto eliminata', 'success');
}

// ==================== GESTIONE COMPONENTI ====================

function showAddComponentModal() {
    if (!currentMachineId) return;
    document.getElementById('add-component-form').reset();
    addComponentModal.show();
}

function saveComponent() {
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
    saveToFirebase('components', newComponent);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        components.push(newComponent);
        saveToStorage(STORAGE_KEYS.components, components);
        renderMachineComponents(currentMachineId);
        renderMachinesTable();
    }
    
    addComponentModal.hide();
    showAlert('Componente aggiunto con successo!', 'success');
}

function adjustComponentStock(componentId, adjustment) {
    const component = components.find(c => c.id === componentId);
    if (!component) return;
    
    const newQuantity = component.quantity + adjustment;
    if (newQuantity < 0) {
        showAlert('Quantità non può essere negativa', 'warning');
        return;
    }
    
    component.quantity = newQuantity;
    
    // Aggiorna su Firebase
    saveToFirebase('components', component);
    
    // Fallback localStorage
    if (!firebaseInitialized) {
        saveToStorage(STORAGE_KEYS.components, components);
        renderMachineComponents(currentMachineId);
        renderMachinesTable();
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
