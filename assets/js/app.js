// Gestionale Manutenzioni - LocalStorage Version (GitHub Pages Compatible)

// Chiavi localStorage
const STORAGE_KEYS = {
    machines: 'gestionale_machines',
    interventions: 'gestionale_interventions'
};

// Variabili globali
let machines = [];
let interventions = [];
let addMachineModal;
let addInterventionModal;

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

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza i modal di Bootstrap
    addMachineModal = new bootstrap.Modal(document.getElementById('addMachineModal'));
    addInterventionModal = new bootstrap.Modal(document.getElementById('addInterventionModal'));
    
    // Imposta la data di oggi come default
    document.getElementById('intervention-date').valueAsDate = new Date();
    
    // Carica i dati iniziali
    loadData();
});

// Caricamento dati
function loadData() {
    machines = loadFromStorage(STORAGE_KEYS.machines);
    interventions = loadFromStorage(STORAGE_KEYS.interventions);
    
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
        
        return `
            <tr>
                <td><strong>${machine.name}</strong></td>
                <td>${machine.type || '-'}</td>
                <td>${machine.location || '-'}</td>
                <td>${lastDate}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewMachine('${machine.id}')">Dettagli</button>
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
    
    machines.push(newMachine);
    saveToStorage(STORAGE_KEYS.machines, machines);
    
    renderMachinesTable();
    updateMachineSelect();
    updateDashboard();
    
    addMachineModal.hide();
    showAlert('Macchinario aggiunto con successo!', 'success');
}

function deleteMachine(id) {
    if (!confirm('Sei sicuro di voler eliminare questo macchinario? Verranno eliminati anche tutti gli interventi associati.')) return;
    
    machines = machines.filter(m => m.id !== id);
    interventions = interventions.filter(i => i.machine_id !== id);
    
    saveToStorage(STORAGE_KEYS.machines, machines);
    saveToStorage(STORAGE_KEYS.interventions, interventions);
    
    renderMachinesTable();
    renderInterventionsTable();
    renderDeadlinesTable();
    updateMachineSelect();
    updateDashboard();
    
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
    
    interventions.push(newIntervention);
    saveToStorage(STORAGE_KEYS.interventions, interventions);
    
    renderInterventionsTable();
    renderDeadlinesTable();
    updateDashboard();
    
    addInterventionModal.hide();
    showAlert('Intervento registrato con successo!', 'success');
}

function deleteIntervention(id) {
    if (!confirm('Sei sicuro di voler eliminare questo intervento?')) return;
    
    interventions = interventions.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.interventions, interventions);
    
    renderInterventionsTable();
    renderDeadlinesTable();
    updateDashboard();
    
    showAlert('Intervento eliminato', 'success');
}

// ==================== EXPORT DATI ====================

function exportData() {
    const data = {
        machines,
        interventions,
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
