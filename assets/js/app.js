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
        tr.innerHTML = '<td>' + data.nome + '</td><td>' + data.modello + '</td><td>' + data.matricola + '</td><td>' + data.anno + '</td><td><span class="badge">' + data.stato + '</span></td><td><button onclick="editMacchinario(\'' + docSnap.id + '\')" class="btn-secondary">Modifica</button><button onclick="deleteMacchinario(\'' + docSnap.id + '\')" class="btn-secondary">Elimina</button></td>';
        tbody.appendChild(tr);
    });
}

window.showAddMacchinarioModal = () => {
    currentMacchinarioId = null;
    document.getElementById('macchinario-nome').value = '';
    document.getElementById('macchinario-modello').value = '';
    document.getElementById('macchinario-matricola').value = '';
    document.getElementById('macchinario-anno').value = '';
    document.getElementById('macchinario-stato').value = 'operativo';
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
        anno: document.getElementById('macchinario-anno').value,
        stato: document.getElementById('macchinario-stato').value,
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
    document.getElementById('macchinario-anno').value = data.anno;
    document.getElementById('macchinario-stato').value = data.stato;
    document.getElementById('macchinario-note').value = data.note || '';
    document.getElementById('macchinario-modal').classList.add('show');
};

window.deleteMacchinario = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo macchinario?')) {
        await deleteDoc(doc(db, 'macchinari', id));
        loadMacchinari();
    }
};

async function loadManutenzioni() {
    if (!currentUser) return;
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid), orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    const tbody = document.getElementById('manutenzioni-table');
    tbody.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + formatDate(data.data) + '</td><td>' + data.descrizione + '</td><td>' + data.macchinario + '</td><td><span class="badge">' + data.stato + '</span></td><td><button onclick="editManutenzione(\'' + docSnap.id + '\')" class="btn-secondary">Modifica</button><button onclick="deleteManutenzione(\'' + docSnap.id + '\')" class="btn-secondary">Elimina</button></td>';
        tbody.appendChild(tr);
    });
}

window.showAddModal = () => {
    currentEditId = null;
    document.getElementById('manutenzione-data').value = '';
    document.getElementById('manutenzione-desc').value = '';
    document.getElementById('manutenzione-macchinario').value = '';
    document.getElementById('manutenzione-stato').value = 'in-attesa';
    document.getElementById('manutenzione-note').value = '';
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
        macchinario: document.getElementById('manutenzione-macchinario').value,
        stato: document.getElementById('manutenzione-stato').value,
        note: document.getElementById('manutenzione-note').value,
        createdAt: new Date().toISOString()
    };
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'manutenzioni', currentEditId), data);
        } else {
            await addDoc(collection(db, 'manutenzioni'), data);
        }
        closeModal();
        loadManutenzioni();
        loadDashboard();
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
    document.getElementById('manutenzione-macchinario').value = data.macchinario;
    document.getElementById('manutenzione-stato').value = data.stato;
    document.getElementById('manutenzione-note').value = data.note || '';
    document.getElementById('add-modal').classList.add('show');
};

window.deleteManutenzione = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questa manutenzione?')) {
        await deleteDoc(doc(db, 'manutenzioni', id));
        loadManutenzioni();
        loadDashboard();
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
