import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAK9qdjGwz6xs86_H2-d6VLe4FKeHZxJeA",
    authDomain: "gestionale-manutenzioni.firebaseapp.com",
    projectId: "gestionale-manutenzioni",
    storageBucket: "gestionale-manutenzioni.firebasestorage.app",
    messagingSenderId: "857041989069",
    appId: "1:857041989069:web:9c8b5e4f3d2a1b0c7e8f9a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentEditId = null;
let currentMacchinarioId = null;
let currentComponenteId = null;
let componentiUsati = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('user-email').textContent = user.email;
        loadDashboard();
        loadManutenzioni();
    } else {
        currentUser = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});

window.switchTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
};

window.handleLogin = async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
        showError('Inserisci email e password');
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showError(error.message);
    }
};

window.handleRegister = async () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    if (!email || !password) {
        showError('Inserisci email e password');
        return;
    }
    if (password.length < 6) {
        showError('La password deve essere di almeno 6 caratteri');
        return;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showError(error.message);
    }
};

window.handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        showError(error.message);
    }
};

function showError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 3000);
}

window.showSection = (sectionName) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(sectionName + '-section').classList.add('active');
    event.target.classList.add('active');
    if (sectionName === 'dashboard') loadDashboard();
    if (sectionName === 'macchinari') loadMacchinari();
    if (sectionName === 'manutenzioni') loadManutenzioni();
    if (sectionName === 'magazzino') loadMagazzino();
    if (sectionName === 'calendario') loadCalendar();
    if (sectionName === 'statistiche') loadStats();
};

async function loadDashboard() {
    if (!currentUser) return;
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const total = snapshot.size;
    let pending = 0;
    let completed = 0;
    let thisMonth = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.stato === 'in-attesa') pending++;
        if (data.stato === 'completata') completed++;
        const manutenzioneDate = new Date(data.data);
        if (manutenzioneDate.getMonth() === currentMonth && manutenzioneDate.getFullYear() === currentYear) {
            thisMonth++;
        }
    });
    document.getElementById('total-manutenzioni').textContent = total;
    document.getElementById('pending-manutenzioni').textContent = pending;
    document.getElementById('completed-manutenzioni').textContent = completed;
    document.getElementById('month-manutenzioni').textContent = thisMonth;
}

async function loadMacchinari() {
    if (!currentUser) return;
    const q = query(collection(db, 'macchinari'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const tbody = document.getElementById('macchinari-table');
    tbody.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + data.nome + '</td><td>' + data.modello + '</td><td>' + data.matricola + '</td><td><button onclick="editMacchinario(\'' + docSnap.id + '\')" class="btn-secondary">Modifica</button><button onclick="deleteMacchinario(\'' + docSnap.id + '\')" class="btn-secondary">Elimina</button></td>';
        tbody.appendChild(tr);
    });
}

window.showAddMacchinarioModal = () => {
    currentMacchinarioId = null;
    document.getElementById('macchinario-nome').value = '';
    document.getElementById('macchinario-modello').value = '';
    document.getElementById('macchinario-matricola').value = '';
    document.getElementById('macchinario-note').value = '';
    document.getElementById('macchinario-modal').classList.add('show');
};

window.closeMacchinarioModal = () => {
    document.getElementById('macchinario-modal').classList.remove('show');
};

window.saveMacchinario = async () => {
    const data = {
        userId: currentUser.uid,
        nome: document.getElementById('macchinario-nome').value,
        modello: document.getElementById('macchinario-modello').value,
        matricola: document.getElementById('macchinario-matricola').value,
        note: document.getElementById('macchinario-note').value,
        createdAt: new Date().toISOString()
    };
    try {
        if (currentMacchinarioId) {
            await updateDoc(doc(db, 'macchinari', currentMacchinarioId), data);
        } else {
            await addDoc(collection(db, 'macchinari'), data);
        }
        closeMacchinarioModal();
        loadMacchinari();
    } catch (error) {
        alert('Errore: ' + error.message);
    }
};

window.editMacchinario = async (id) => {
    currentMacchinarioId = id;
    const docSnap = await getDoc(doc(db, 'macchinari', id));
    const data = docSnap.data();
    document.getElementById('macchinario-nome').value = data.nome;
    document.getElementById('macchinario-modello').value = data.modello;
    document.getElementById('macchinario-matricola').value = data.matricola;
    document.getElementById('macchinario-note').value = data.note || '';
    document.getElementById('macchinario-modal').classList.add('show');
};

window.deleteMacchinario = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo macchinario?')) {
        await deleteDoc(doc(db, 'macchinari', id));
        loadMacchinari();
    }
};

async function loadMacchinariSelect() {
    if (!currentUser) return;
    const q = query(collection(db, 'macchinari'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const select = document.getElementById('manutenzione-macchinario');
    select.innerHTML = '<option value="">Seleziona Macchinario</option>';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const option = document.createElement('option');
        option.value = docSnap.id;
        option.textContent = data.nome + ' - ' + data.modello;
        select.appendChild(option);
    });
}

async function loadComponentiSelect() {
    if (!currentUser) return;
    const q = query(collection(db, 'componenti'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const select = document.getElementById('componente-select');
    select.innerHTML = '<option value="">Seleziona Componente</option>';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const option = document.createElement('option');
        option.value = docSnap.id;
        option.textContent = data.nome + ' (Disp: ' + data.quantita + ')';
        option.dataset.quantita = data.quantita;
        option.dataset.nome = data.nome;
        select.appendChild(option);
    });
}

window.addComponenteToList = () => {
    const select = document.getElementById('componente-select');
    const quantitaInput = document.getElementById('componente-quantita-usata');
    if (!select.value || !quantitaInput.value) {
        alert('Seleziona un componente e inserisci la quantità');
        return;
    }
    const selectedOption = select.options[select.selectedIndex];
    const quantitaDisponibile = parseInt(selectedOption.dataset.quantita);
    const quantitaUsata = parseInt(quantitaInput.value);
    if (quantitaUsata > quantitaDisponibile) {
        alert('Quantità non disponibile in magazzino!');
        return;
    }
    componentiUsati.push({
        id: select.value,
        nome: selectedOption.dataset.nome,
        quantita: quantitaUsata
    });
    updateComponentiList();
    select.value = '';
    quantitaInput.value = '';
};

window.removeComponenteFromList = (index) => {
    componentiUsati.splice(index, 1);
    updateComponentiList();
};

function updateComponentiList() {
    const container = document.getElementById('componenti-list');
    if (componentiUsati.length === 0) {
        container.innerHTML = '<p style="font-size: 13px; color: #999;">Nessun componente aggiunto</p>';
        return;
    }
    container.innerHTML = componentiUsati.map((comp, index) => 
        '<div class="componente-item"><span class="componente-item-text">' + comp.nome + ' x ' + comp.quantita + '</span><button onclick="removeComponenteFromList(' + index + ')" class="btn-secondary">Rimuovi</button></div>'
    ).join('');
}

async function loadManutenzioni() {
    if (!currentUser) return;
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid), orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    const tbody = document.getElementById('manutenzioni-table');
    tbody.innerHTML = '';
    
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let macchinarioNome = 'N/D';
        if (data.macchinarioId) {
            const maccDoc = await getDoc(doc(db, 'macchinari', data.macchinarioId));
            if (maccDoc.exists()) {
                const maccData = maccDoc.data();
                macchinarioNome = maccData.nome + ' - ' + maccData.modello;
            }
        }
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + formatDate(data.data) + '</td><td>' + data.descrizione + '</td><td>' + macchinarioNome + '</td><td><span class="badge">' + data.stato + '</span></td><td><button onclick="editManutenzione(\'' + docSnap.id + '\')" class="btn-secondary">Modifica</button><button onclick="deleteManutenzione(\'' + docSnap.id + '\')" class="btn-secondary">Elimina</button></td>';
        tbody.appendChild(tr);
    }
}

window.showAddModal = () => {
    currentEditId = null;
    componentiUsati = [];
    document.getElementById('manutenzione-data').value = '';
    document.getElementById('manutenzione-desc').value = '';
    document.getElementById('manutenzione-macchinario').value = '';
    document.getElementById('manutenzione-stato').value = 'in-attesa';
    document.getElementById('manutenzione-note').value = '';
    document.getElementById('componente-quantita-usata').value = '';
    updateComponentiList();
    loadMacchinariSelect();
    loadComponentiSelect();
    document.getElementById('add-modal').classList.add('show');
};

window.closeModal = () => {
    document.getElementById('add-modal').classList.remove('show');
};

window.saveManutenzione = async () => {
    const data = {
        userId: currentUser.uid,
        data: document.getElementById('manutenzione-data').value,
        descrizione: document.getElementById('manutenzione-desc').value,
        macchinarioId: document.getElementById('manutenzione-macchinario').value,
        stato: document.getElementById('manutenzione-stato').value,
        note: document.getElementById('manutenzione-note').value,
        componentiUsati: componentiUsati,
        createdAt: new Date().toISOString()
    };
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'manutenzioni', currentEditId), data);
        } else {
            await addDoc(collection(db, 'manutenzioni'), data);
            for (const comp of componentiUsati) {
                const compDoc = await getDoc(doc(db, 'componenti', comp.id));
                if (compDoc.exists()) {
                    const compData = compDoc.data();
                    const nuovaQuantita = parseInt(compData.quantita) - parseInt(comp.quantita);
                    await updateDoc(doc(db, 'componenti', comp.id), {
                        quantita: nuovaQuantita
                    });
                }
            }
        }
        closeModal();
        loadManutenzioni();
        loadDashboard();
        if (componentiUsati.length > 0) {
            loadMagazzino();
        }
    } catch (error) {
        alert('Errore: ' + error.message);
    }
};

window.editManutenzione = async (id) => {
    currentEditId = id;
    const docSnap = await getDoc(doc(db, 'manutenzioni', id));
    const data = docSnap.data();
    document.getElementById('manutenzione-data').value = data.data;
    document.getElementById('manutenzione-desc').value = data.descrizione;
    document.getElementById('manutenzione-stato').value = data.stato;
    document.getElementById('manutenzione-note').value = data.note || '';
    await loadMacchinariSelect();
    document.getElementById('manutenzione-macchinario').value = data.macchinarioId || '';
    document.getElementById('add-modal').classList.add('show');
};

window.deleteManutenzione = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questa manutenzione?')) {
        await deleteDoc(doc(db, 'manutenzioni', id));
        loadManutenzioni();
        loadDashboard();
    }
};

async function loadMagazzino() {
    if (!currentUser) return;
    const q = query(collection(db, 'componenti'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const tbody = document.getElementById('magazzino-table');
    tbody.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const quantita = parseInt(data.quantita) || 0;
        const scortaMin = parseInt(data.scortaMin) || 0;
        let statoText = 'OK';
        if (quantita === 0) {
            statoText = 'ESAURITO';
        } else if (quantita <= scortaMin) {
            statoText = 'SCARSO';
        }
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (data.codice || 'N/D') + '</td><td>' + data.nome + '</td><td>' + quantita + '</td><td>' + scortaMin + '</td><td><span class="badge">' + statoText + '</span></td><td><button onclick="editComponente(\'' + docSnap.id + '\')" class="btn-secondary">Modifica</button><button onclick="deleteComponente(\'' + docSnap.id + '\')" class="btn-secondary">Elimina</button></td>';
        tbody.appendChild(tr);
    });
}

window.showAddComponenteModal = () => {
    currentComponenteId = null;
    document.getElementById('componente-codice').value = '';
    document.getElementById('componente-nome').value = '';
    document.getElementById('componente-quantita').value = '';
    document.getElementById('componente-scorta-min').value = '';
    document.getElementById('componente-note').value = '';
    document.getElementById('componente-modal').classList.add('show');
};

window.closeComponenteModal = () => {
    document.getElementById('componente-modal').classList.remove('show');
};

window.saveComponente = async () => {
    const data = {
        userId: currentUser.uid,
        codice: document.getElementById('componente-codice').value,
        nome: document.getElementById('componente-nome').value,
        quantita: parseInt(document.getElementById('componente-quantita').value) || 0,
        scortaMin: parseInt(document.getElementById('componente-scorta-min').value) || 0,
        note: document.getElementById('componente-note').value,
        createdAt: new Date().toISOString()
    };
    try {
        if (currentComponenteId) {
            await updateDoc(doc(db, 'componenti', currentComponenteId), data);
        } else {
            await addDoc(collection(db, 'componenti'), data);
        }
        closeComponenteModal();
        loadMagazzino();
    } catch (error) {
        alert('Errore: ' + error.message);
    }
};

window.editComponente = async (id) => {
    currentComponenteId = id;
    const docSnap = await getDoc(doc(db, 'componenti', id));
    const data = docSnap.data();
    document.getElementById('componente-codice').value = data.codice || '';
    document.getElementById('componente-nome').value = data.nome;
    document.getElementById('componente-quantita').value = data.quantita;
    document.getElementById('componente-scorta-min').value = data.scortaMin;
    document.getElementById('componente-note').value = data.note || '';
    document.getElementById('componente-modal').classList.add('show');
};

window.deleteComponente = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo componente?')) {
        await deleteDoc(doc(db, 'componenti', id));
        loadMagazzino();
    }
};

async function loadCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '<p>Calendario in costruzione...</p>';
}

async function loadStats() {
    const container = document.querySelector('.chart-container');
    container.innerHTML = '<p>Statistiche in costruzione...</p>';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}
