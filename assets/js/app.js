// Firebase Configuration// Firebase Configuration

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';



const firebaseConfig = {const firebaseConfig = {

    apiKey: "AIzaSyAWHbe9lm-QomnZnrWYKWPCy_0GYBR8vQE",    apiKey: "AIzaSyAWHbe9lm-QomnZnrWYKWPCy_0GYBR8vQE",

    authDomain: "gestionale-manutenzioni.firebaseapp.com",    authDomain: "gestionale-manutenzioni.firebaseapp.com",

    projectId: "gestionale-manutenzioni",    projectId: "gestionale-manutenzioni",

    storageBucket: "gestionale-manutenzioni.firebasestorage.app",    storageBucket: "gestionale-manutenzioni.firebasestorage.app",

    messagingSenderId: "913584711851",    messagingSenderId: "913584711851",

    appId: "1:913584711851:web:f5d05d39ea4c22c7d562c0"    appId: "1:913584711851:web:f5d05d39ea4c22c7d562c0"

};};



const app = initializeApp(firebaseConfig);const app = initializeApp(firebaseConfig);

const auth = getAuth(app);const auth = getAuth(app);

const db = getFirestore(app);const db = getFirestore(app);



let currentUser = null;let currentUser = null;

let currentEditId = null;let currentEditId = null;



// Auth State// Auth State

onAuthStateChanged(auth, (user) => {onAuthStateChanged(auth, (user) => {

    if (user) {    if (user) {

        currentUser = user;        currentUser = user;

        document.getElementById('login-screen').style.display = 'none';        document.getElementById('login-screen').style.display = 'none';

        document.getElementById('main-app').style.display = 'flex';        document.getElementById('main-app').style.display = 'flex';

        document.getElementById('user-email').textContent = user.email;        document.getElementById('user-email').textContent = user.email;

        loadDashboard();        loadDashboard();

        loadManutenzioni();        loadManutenzioni();

    } else {    } else {

        currentUser = null;        currentUser = null;

        document.getElementById('login-screen').style.display = 'flex';        document.getElementById('login-screen').style.display = 'flex';

        document.getElementById('main-app').style.display = 'none';        document.getElementById('main-app').style.display = 'none';

    }    }

});});



// Login/Register Functions// Login/Register Functions

window.switchTab = (tab) => {window.switchTab = (tab) => {

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        

    if (tab === 'login') {    if (tab === 'login') {

        document.querySelectorAll('.tab-btn')[0].classList.add('active');        document.querySelectorAll('.tab-btn')[0].classList.add('active');

        document.getElementById('login-form').classList.add('active');        document.getElementById('login-form').classList.add('active');

    } else {    } else {

        document.querySelectorAll('.tab-btn')[1].classList.add('active');        document.querySelectorAll('.tab-btn')[1].classList.add('active');

        document.getElementById('register-form').classList.add('active');        document.getElementById('register-form').classList.add('active');

    }    }

};};



window.handleLogin = async () => {window.handleLogin = async () => {

    const email = document.getElementById('login-email').value;    const email = document.getElementById('login-email').value;

    const password = document.getElementById('login-password').value;    const password = document.getElementById('login-password').value;

        

    if (!email || !password) {    try {

        showError('Inserisci email e password');        await signInWithEmailAndPassword(auth, email, password);

        return;    } catch (error) {

    }        showError(error.message);

        }

    try {};

        await signInWithEmailAndPassword(auth, email, password);

    } catch (error) {window.handleRegister = async () => {

        showError(error.message);    const email = document.getElementById('register-email').value;

    }    const password = document.getElementById('register-password').value;

};    

    try {

window.handleRegister = async () => {        await createUserWithEmailAndPassword(auth, email, password);

    const email = document.getElementById('register-email').value;    } catch (error) {

    const password = document.getElementById('register-password').value;        showError(error.message);

        }

    if (!email || !password) {};

        showError('Inserisci email e password');

        return;window.handleLogout = async () => {

    }    try {

            await signOut(auth);

    if (password.length < 6) {    } catch (error) {

        showError('La password deve essere di almeno 6 caratteri');        showError(error.message);

        return;    }

    }};

    

    try {function showError(message) {

        await createUserWithEmailAndPassword(auth, email, password);    const errorDiv = document.getElementById('auth-error');

    } catch (error) {    errorDiv.textContent = message;

        showError(error.message);    errorDiv.classList.add('show');

    }    setTimeout(() => errorDiv.classList.remove('show'), 3000);

};}



window.handleLogout = async () => {// Navigation

    try {window.showSection = (sectionName) => {

        await signOut(auth);    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    } catch (error) {    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        showError(error.message);    

    }    document.getElementById(sectionName + '-section').classList.add('active');

};    event.target.classList.add('active');

    

function showError(message) {    if (sectionName === 'dashboard') loadDashboard();

    const errorDiv = document.getElementById('auth-error');    if (sectionName === 'manutenzioni') loadManutenzioni();

    errorDiv.textContent = message;    if (sectionName === 'calendario') loadCalendar();

    errorDiv.classList.add('show');    if (sectionName === 'statistiche') loadStats();

    setTimeout(() => errorDiv.classList.remove('show'), 3000);};

}

// Dashboard

// Navigationasync function loadDashboard() {

window.showSection = (sectionName) => {    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));    const snapshot = await getDocs(q);

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));    

        const total = snapshot.size;

    document.getElementById(sectionName + '-section').classList.add('active');    let pending = 0;

    event.target.classList.add('active');    let completed = 0;

        let thisMonth = 0;

    if (sectionName === 'dashboard') loadDashboard();    

    if (sectionName === 'manutenzioni') loadManutenzioni();    const now = new Date();

    if (sectionName === 'calendario') loadCalendar();    const currentMonth = now.getMonth();

    if (sectionName === 'statistiche') loadStats();    const currentYear = now.getFullYear();

};    

    snapshot.forEach(doc => {

// Dashboard        const data = doc.data();

async function loadDashboard() {        if (data.stato === 'in-attesa') pending++;

    if (!currentUser) return;        if (data.stato === 'completata') completed++;

            

    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));        const manutenzioneDate = new Date(data.data);

    const snapshot = await getDocs(q);        if (manutenzioneDate.getMonth() === currentMonth && manutenzioneDate.getFullYear() === currentYear) {

                thisMonth++;

    const total = snapshot.size;        }

    let pending = 0;    });

    let completed = 0;    

    let thisMonth = 0;    document.getElementById('total-manutenzioni').textContent = total;

        document.getElementById('pending-manutenzioni').textContent = pending;

    const now = new Date();    document.getElementById('completed-manutenzioni').textContent = completed;

    const currentMonth = now.getMonth();    document.getElementById('month-manutenzioni').textContent = thisMonth;

    const currentYear = now.getFullYear();}

    

    snapshot.forEach(docSnap => {// Manutenzioni

        const data = docSnap.data();async function loadManutenzioni() {

        if (data.stato === 'in-attesa') pending++;    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid), orderBy('data', 'desc'));

        if (data.stato === 'completata') completed++;    const snapshot = await getDocs(q);

            

        const manutenzioneDate = new Date(data.data);    const tbody = document.getElementById('manutenzioni-table');

        if (manutenzioneDate.getMonth() === currentMonth && manutenzioneDate.getFullYear() === currentYear) {    tbody.innerHTML = '';

            thisMonth++;    

        }    snapshot.forEach(docSnap => {

    });        const data = docSnap.data();

            const tr = document.createElement('tr');

    document.getElementById('total-manutenzioni').textContent = total;        tr.innerHTML = \

    document.getElementById('pending-manutenzioni').textContent = pending;            <td>\</td>

    document.getElementById('completed-manutenzioni').textContent = completed;            <td>\</td>

    document.getElementById('month-manutenzioni').textContent = thisMonth;            <td>\</td>

}            <td><span class="badge">\</span></td>

            <td>

// Manutenzioni                <button onclick="editManutenzione('\')" class="btn-secondary">Modifica</button>

async function loadManutenzioni() {                <button onclick="deleteManutenzione('\')" class="btn-secondary">Elimina</button>

    if (!currentUser) return;            </td>

            \;

    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid), orderBy('data', 'desc'));        tbody.appendChild(tr);

    const snapshot = await getDocs(q);    });

    }

    const tbody = document.getElementById('manutenzioni-table');

    tbody.innerHTML = '';window.showAddModal = () => {

        currentEditId = null;

    snapshot.forEach(docSnap => {    document.getElementById('manutenzione-data').value = '';

        const data = docSnap.data();    document.getElementById('manutenzione-desc').value = '';

        const tr = document.createElement('tr');    document.getElementById('manutenzione-macchinario').value = '';

        tr.innerHTML = `    document.getElementById('manutenzione-stato').value = 'in-attesa';

            <td>${formatDate(data.data)}</td>    document.getElementById('manutenzione-note').value = '';

            <td>${data.descrizione}</td>    document.getElementById('add-modal').classList.add('show');

            <td>${data.macchinario}</td>};

            <td><span class="badge">${data.stato}</span></td>

            <td>window.closeModal = () => {

                <button onclick="editManutenzione('${docSnap.id}')" class="btn-secondary">Modifica</button>    document.getElementById('add-modal').classList.remove('show');

                <button onclick="deleteManutenzione('${docSnap.id}')" class="btn-secondary">Elimina</button>};

            </td>

        `;window.saveManutenzione = async () => {

        tbody.appendChild(tr);    const data = {

    });        userId: currentUser.uid,

}        data: document.getElementById('manutenzione-data').value,

        descrizione: document.getElementById('manutenzione-desc').value,

window.showAddModal = () => {        macchinario: document.getElementById('manutenzione-macchinario').value,

    currentEditId = null;        stato: document.getElementById('manutenzione-stato').value,

    document.getElementById('manutenzione-data').value = '';        note: document.getElementById('manutenzione-note').value,

    document.getElementById('manutenzione-desc').value = '';        createdAt: new Date().toISOString()

    document.getElementById('manutenzione-macchinario').value = '';    };

    document.getElementById('manutenzione-stato').value = 'in-attesa';    

    document.getElementById('manutenzione-note').value = '';    try {

    document.getElementById('add-modal').classList.add('show');        if (currentEditId) {

};            await updateDoc(doc(db, 'manutenzioni', currentEditId), data);

        } else {

window.closeModal = () => {            await addDoc(collection(db, 'manutenzioni'), data);

    document.getElementById('add-modal').classList.remove('show');        }

};        closeModal();

        loadManutenzioni();

window.saveManutenzione = async () => {        loadDashboard();

    const data = {    } catch (error) {

        userId: currentUser.uid,        alert('Errore: ' + error.message);

        data: document.getElementById('manutenzione-data').value,    }

        descrizione: document.getElementById('manutenzione-desc').value,};

        macchinario: document.getElementById('manutenzione-macchinario').value,

        stato: document.getElementById('manutenzione-stato').value,window.editManutenzione = async (id) => {

        note: document.getElementById('manutenzione-note').value,    currentEditId = id;

        createdAt: new Date().toISOString()    const docSnap = await getDocs(doc(db, 'manutenzioni', id));

    };    const data = docSnap.data();

        

    try {    document.getElementById('manutenzione-data').value = data.data;

        if (currentEditId) {    document.getElementById('manutenzione-desc').value = data.descrizione;

            await updateDoc(doc(db, 'manutenzioni', currentEditId), data);    document.getElementById('manutenzione-macchinario').value = data.macchinario;

        } else {    document.getElementById('manutenzione-stato').value = data.stato;

            await addDoc(collection(db, 'manutenzioni'), data);    document.getElementById('manutenzione-note').value = data.note || '';

        }    document.getElementById('add-modal').classList.add('show');

        closeModal();};

        loadManutenzioni();

        loadDashboard();window.deleteManutenzione = async (id) => {

    } catch (error) {    if (confirm('Sei sicuro di voler eliminare questa manutenzione?')) {

        alert('Errore: ' + error.message);        await deleteDoc(doc(db, 'manutenzioni', id));

    }        loadManutenzioni();

};        loadDashboard();

    }

window.editManutenzione = async (id) => {};

    currentEditId = id;

    const docSnap = await getDoc(doc(db, 'manutenzioni', id));// Calendar

    const data = docSnap.data();async function loadCalendar() {

        const container = document.getElementById('calendar-container');

    document.getElementById('manutenzione-data').value = data.data;    container.innerHTML = '<p>Calendario in costruzione...</p>';

    document.getElementById('manutenzione-desc').value = data.descrizione;}

    document.getElementById('manutenzione-macchinario').value = data.macchinario;

    document.getElementById('manutenzione-stato').value = data.stato;// Stats

    document.getElementById('manutenzione-note').value = data.note || '';async function loadStats() {

    document.getElementById('add-modal').classList.add('show');    const container = document.querySelector('.chart-container');

};    container.innerHTML = '<p>Statistiche in costruzione...</p>';

}

window.deleteManutenzione = async (id) => {

    if (confirm('Sei sicuro di voler eliminare questa manutenzione?')) {// Utilities

        await deleteDoc(doc(db, 'manutenzioni', id));function formatDate(dateString) {

        loadManutenzioni();    const date = new Date(dateString);

        loadDashboard();    return date.toLocaleDateString('it-IT');

    }}

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
