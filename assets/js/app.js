// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAWHbe9lm-QomnZnrWYKWPCy_0GYBR8vQE",
    authDomain: "gestionale-manutenzioni.firebaseapp.com",
    projectId: "gestionale-manutenzioni",
    storageBucket: "gestionale-manutenzioni.firebasestorage.app",
    messagingSenderId: "913584711851",
    appId: "1:913584711851:web:f5d05d39ea4c22c7d562c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentEditId = null;

// Auth State
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

// Login/Register Functions
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
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showError(error.message);
    }
};

window.handleRegister = async () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
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

// Navigation
window.showSection = (sectionName) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(sectionName + '-section').classList.add('active');
    event.target.classList.add('active');
    
    if (sectionName === 'dashboard') loadDashboard();
    if (sectionName === 'manutenzioni') loadManutenzioni();
    if (sectionName === 'calendario') loadCalendar();
    if (sectionName === 'statistiche') loadStats();
};

// Dashboard
async function loadDashboard() {
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    
    const total = snapshot.size;
    let pending = 0;
    let completed = 0;
    let thisMonth = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    snapshot.forEach(doc => {
        const data = doc.data();
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

// Manutenzioni
async function loadManutenzioni() {
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid), orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    
    const tbody = document.getElementById('manutenzioni-table');
    tbody.innerHTML = '';
    
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = \
            <td>\</td>
            <td>\</td>
            <td>\</td>
            <td><span class="badge">\</span></td>
            <td>
                <button onclick="editManutenzione('\')" class="btn-secondary">Modifica</button>
                <button onclick="deleteManutenzione('\')" class="btn-secondary">Elimina</button>
            </td>
        \;
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
    const docSnap = await getDocs(doc(db, 'manutenzioni', id));
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

// Calendar
async function loadCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '<p>Calendario in costruzione...</p>';
}

// Stats
async function loadStats() {
    const container = document.querySelector('.chart-container');
    container.innerHTML = '<p>Statistiche in costruzione...</p>';
}

// Utilities
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}
