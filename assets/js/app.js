import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
let currentCalendarDate = new Date();

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

// Hamburger menu mobile
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger-btn');
    const nav = document.getElementById('main-nav');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenu = document.getElementById('user-menu');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            nav.classList.toggle('open');
            // Close user menu if open
            if (userMenu) userMenu.classList.remove('show');
        });

        // Close menu when clicking nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    hamburger.classList.remove('active');
                    nav.classList.remove('open');
                }
            });
        });
    }

    // User menu toggle
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
            // Close nav if open
            if (nav) nav.classList.remove('open');
            if (hamburger) hamburger.classList.remove('active');
        });

        // Close user menu when clicking outside
        document.addEventListener('click', () => {
            userMenu.classList.remove('show');
        });

        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});

async function loadDashboard() {
    if (!currentUser) return;

    const qManutenzioni = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));
    const snapshotManutenzioni = await getDocs(qManutenzioni);
    const qComponenti = query(collection(db, 'componenti'), where('userId', '==', currentUser.uid));
    const snapshotComponenti = await getDocs(qComponenti);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in7giorni = new Date(now);
    in7giorni.setDate(in7giorni.getDate() + 7);

    let scaduti = 0;
    let inScadenza = 0;
    let totaleInterventi = 0;
    let componentiScarsi = 0;

    const interventiCritici = [];

    for (const docSnap of snapshotManutenzioni.docs) {
        const data = docSnap.data();
        totaleInterventi++;

        if (data.stato !== 'completata') {
            const dataIntervento = new Date(data.data);
            dataIntervento.setHours(0, 0, 0, 0);
            const diffTime = dataIntervento - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                scaduti++;
                let macchinarioNome = 'N/A';
                if (data.macchinarioId) {
                    const maccDoc = await getDoc(doc(db, 'macchinari', data.macchinarioId));
                    if (maccDoc.exists()) {
                        macchinarioNome = maccDoc.data().nome;
                    }
                }
                interventiCritici.push({
                    data: data.data,
                    macchinario: macchinarioNome,
                    descrizione: data.descrizione,
                    stato: data.stato,
                    giorni: diffDays
                });
            } else if (diffDays <= 7) {
                inScadenza++;
                let macchinarioNome = 'N/A';
                if (data.macchinarioId) {
                    const maccDoc = await getDoc(doc(db, 'macchinari', data.macchinarioId));
                    if (maccDoc.exists()) {
                        macchinarioNome = maccDoc.data().nome;
                    }
                }
                interventiCritici.push({
                    data: data.data,
                    macchinario: macchinarioNome,
                    descrizione: data.descrizione,
                    stato: data.stato,
                    giorni: diffDays
                });
            }
        }
    }

    interventiCritici.sort((a, b) => a.giorni - b.giorni);

    const componentiCritici = [];
    snapshotComponenti.forEach(docSnap => {
        const data = docSnap.data();
        const quantita = parseInt(data.quantita) || 0;
        const scortaMin = parseInt(data.scortaMin) || 0;

        if (quantita <= scortaMin) {
            componentiScarsi++;
            const status = quantita === 0 ? 'ESAURITO' : (quantita <= scortaMin ? 'SCARSO' : 'OK');
            componentiCritici.push({
                codice: data.codice,
                nome: data.nome,
                quantita: quantita,
                scortaMin: scortaMin,
                status: status
            });
        }
    });

    componentiCritici.sort((a, b) => a.quantita - b.quantita);

    const interventiList = document.getElementById('dash-interventi-list');
    const interventiContainer = interventiList.parentElement.parentElement;
    interventiList.innerHTML = '';

    // Remove existing mobile cards
    interventiContainer.querySelectorAll('.mobile-card').forEach(card => card.remove());

    if (interventiCritici.length === 0) {
        interventiList.innerHTML = '<tr><td colspan="5">Nessun intervento in scadenza</td></tr>';
    } else {
        interventiCritici.forEach(item => {
            const giornoLabel = item.giorni < 0 ? `${Math.abs(item.giorni)} giorni fa` : `tra ${item.giorni} giorni`;
            const statoClass = item.stato === 'in-attesa' ? 'in-attesa' : (item.stato === 'in-corso' ? 'in-corso' : 'completata');

            // Desktop table row
            const row = `<tr>
                <td>${formatDate(item.data)}</td>
                <td>${item.macchinario}</td>
                <td>${item.descrizione}</td>
                <td><span class="stato-badge ${statoClass}">${item.stato.replace('-', ' ').toUpperCase()}</span></td>
                <td>${giornoLabel}</td>
            </tr>`;
            interventiList.innerHTML += row;

            // Mobile card
            const card = document.createElement('div');
            card.className = 'mobile-card';
            card.innerHTML = `
                <div class="mobile-card-row"><span class="mobile-card-label">Data:</span><span class="mobile-card-value">${formatDate(item.data)}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Macchinario:</span><span class="mobile-card-value">${item.macchinario}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Descrizione:</span><span class="mobile-card-value">${item.descrizione}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Stato:</span><span class="mobile-card-value"><span class="stato-badge ${statoClass}">${item.stato.replace('-', ' ').toUpperCase()}</span></span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Scadenza:</span><span class="mobile-card-value">${giornoLabel}</span></div>
            `;
            interventiContainer.appendChild(card);
        });
    }

    const componentiList = document.getElementById('dash-componenti-list');
    const componentiContainer = componentiList.parentElement.parentElement;
    componentiList.innerHTML = '';

    // Remove existing mobile cards
    componentiContainer.querySelectorAll('.mobile-card').forEach(card => card.remove());

    if (componentiCritici.length === 0) {
        componentiList.innerHTML = '<tr><td colspan="5">Nessun componente sotto scorta</td></tr>';
    } else {
        componentiCritici.forEach(item => {
            const statusClass = item.status === 'ESAURITO' ? 'esaurito' : 'scarso';

            // Desktop table row
            const row = `<tr>
                <td>${item.codice}</td>
                <td>${item.nome}</td>
                <td>${item.quantita}</td>
                <td>${item.scortaMin}</td>
                <td><span class="stato-badge ${statusClass}">${item.status}</span></td>
            </tr>`;
            componentiList.innerHTML += row;

            // Mobile card
            const card = document.createElement('div');
            card.className = 'mobile-card';
            card.innerHTML = `
                <div class="mobile-card-row"><span class="mobile-card-label">Codice:</span><span class="mobile-card-value">${item.codice}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Nome:</span><span class="mobile-card-value">${item.nome}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Quantità:</span><span class="mobile-card-value">${item.quantita}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Scorta Min:</span><span class="mobile-card-value">${item.scortaMin}</span></div>
                <div class="mobile-card-row"><span class="mobile-card-label">Stato:</span><span class="mobile-card-value"><span class="stato-badge ${statusClass}">${item.status}</span></span></div>
            `;
            componentiContainer.appendChild(card);
        });
    }
}

async function loadMacchinari() {
    if (!currentUser) return;
    const q = query(collection(db, 'macchinari'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const tbody = document.getElementById('macchinari-table');
    const container = tbody.parentElement.parentElement;
    tbody.innerHTML = '';

    // Remove existing mobile cards
    container.querySelectorAll('.mobile-card').forEach(card => card.remove());

    snapshot.forEach(docSnap => {
        const data = docSnap.data();

        // Desktop table row
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = '<td>' + data.nome + '</td><td>' + data.modello + '</td><td>' + data.matricola + '</td>';

        const accordionRow = document.createElement('tr');
        accordionRow.className = 'accordion-row';
        accordionRow.innerHTML = `
            <td colspan="3">
                <div class="accordion-content">
                    <div class="accordion-menu">
                        <button onclick="editMacchinario('${docSnap.id}')" class="btn-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button onclick="deleteMacchinario('${docSnap.id}')" class="btn-icon delete"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        
                        <div style="position: relative; display: flex; align-items: center; gap: 10px;">
                            <button class="btn-plus" onclick="toggleSubMenu(this)">+</button>
                            <div class="sub-menu-container">
                                <button class="btn-secondary" onclick="alert('Manuale: Funzionalità in arrivo')">Manuale</button>
                                <button class="btn-secondary" onclick="openPhotoGallery('${docSnap.id}')">Foto</button>
                                <button class="btn-secondary" onclick="alert('Ricette: Funzionalità in arrivo')">Ricette</button>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        `;

        tr.addEventListener('click', () => {
            const isShown = accordionRow.classList.contains('show');
            // Close all other accordions
            document.querySelectorAll('.accordion-row').forEach(row => {
                row.classList.remove('show');
                // Reset plus buttons
                const plusBtn = row.querySelector('.btn-plus');
                if (plusBtn) plusBtn.classList.remove('active');
                const subMenu = row.querySelector('.sub-menu-container');
                if (subMenu) subMenu.classList.remove('show');
            });
            // Toggle current
            if (!isShown) {
                accordionRow.classList.add('show');
            }
        });

        tbody.appendChild(tr);
        tbody.appendChild(accordionRow);

        // Mobile card
        const card = document.createElement('div');
        card.className = 'mobile-card clickable-row';
        card.innerHTML = `
            <div class="mobile-card-row"><span class="mobile-card-label">Nome:</span><span class="mobile-card-value">${data.nome}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Modello:</span><span class="mobile-card-value">${data.modello}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Matricola:</span><span class="mobile-card-value">${data.matricola}</span></div>
            <div class="accordion-row" style="background: transparent;">
                <div class="accordion-actions" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
                    <div style="display: flex; gap: 10px;">
                        <button onclick="event.stopPropagation(); editMacchinario('${docSnap.id}')" class="btn-icon" style="flex: 1;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button onclick="event.stopPropagation(); deleteMacchinario('${docSnap.id}')" class="btn-icon delete" style="flex: 1;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                        <button class="btn-plus" onclick="event.stopPropagation(); toggleSubMenu(this)">+</button>
                    </div>
                    <div class="sub-menu-container" style="justify-content: center; flex-wrap: wrap;">
                        <button class="btn-secondary" onclick="event.stopPropagation(); alert('Manuale: Funzionalità in arrivo')">Manuale</button>
                        <button class="btn-secondary" onclick="event.stopPropagation(); openPhotoGallery('${docSnap.id}')">Foto</button>
                        <button class="btn-secondary" onclick="event.stopPropagation(); alert('Ricette: Funzionalità in arrivo')">Ricette</button>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            const accordion = card.querySelector('.accordion-row');
            const isShown = accordion.style.display === 'block';

            // Close all other mobile accordions
            document.querySelectorAll('.mobile-card .accordion-row').forEach(row => {
                row.style.display = 'none';
                // Reset plus buttons
                const plusBtn = row.querySelector('.btn-plus');
                if (plusBtn) plusBtn.classList.remove('active');
                const subMenu = row.querySelector('.sub-menu-container');
                if (subMenu) subMenu.classList.remove('show');
            });

            if (!isShown) {
                accordion.style.display = 'block';
            }
        });

        container.appendChild(card);
    });
}

window.toggleSubMenu = (btn) => {
    const container = btn.nextElementSibling || btn.parentElement.nextElementSibling;
    btn.classList.toggle('active');
    container.classList.toggle('show');
};

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
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const tbody = document.getElementById('manutenzioni-table');
    const container = tbody.parentElement.parentElement;
    tbody.innerHTML = '';

    // Remove existing mobile cards
    container.querySelectorAll('.mobile-card').forEach(card => card.remove());

    const manutenzioniArray = [];
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
        manutenzioniArray.push({
            id: docSnap.id,
            data: data,
            macchinarioNome: macchinarioNome
        });
    }

    manutenzioniArray.sort((a, b) => new Date(b.data.data) - new Date(a.data.data));

    manutenzioniArray.forEach(item => {
        // Desktop table row
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + formatDate(item.data.data) + '</td><td>' + item.data.descrizione + '</td><td>' + item.macchinarioNome + '</td><td><span class="badge">' + item.data.stato + '</span></td><td><button onclick="editManutenzione(\'' + item.id + '\')" class="btn-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button onclick="deleteManutenzione(\'' + item.id + '\')" class="btn-icon delete"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></td>';
        tbody.appendChild(tr);

        // Mobile card
        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.innerHTML = `
            <div class="mobile-card-row"><span class="mobile-card-label">Data:</span><span class="mobile-card-value">${formatDate(item.data.data)}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Descrizione:</span><span class="mobile-card-value">${item.data.descrizione}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Macchinario:</span><span class="mobile-card-value">${item.macchinarioNome}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Stato:</span><span class="mobile-card-value"><span class="badge">${item.data.stato}</span></span></div>
            <div class="mobile-card-actions">
                <button onclick="editManutenzione('${item.id}')" class="btn-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                <button onclick="deleteManutenzione('${item.id}')" class="btn-icon delete"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.showAddModal = () => {
    currentEditId = null;
    componentiUsati = [];
    document.getElementById('manutenzione-data').value = '';
    document.getElementById('manutenzione-desc').value = '';
    document.getElementById('manutenzione-macchinario').value = '';
    document.getElementById('manutenzione-tipo').value = '';
    document.getElementById('manutenzione-stato').value = '';
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
    const dataValue = document.getElementById('manutenzione-data').value;
    const descrizioneValue = document.getElementById('manutenzione-desc').value;
    const macchinarioValue = document.getElementById('manutenzione-macchinario').value;

    if (!dataValue || !descrizioneValue || !macchinarioValue) {
        alert('Compila tutti i campi obbligatori (Data, Macchinario, Descrizione)');
        return;
    }

    const data = {
        userId: currentUser.uid,
        data: dataValue,
        descrizione: descrizioneValue,
        macchinarioId: macchinarioValue,
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
    const container = tbody.parentElement.parentElement;
    tbody.innerHTML = '';

    // Remove existing mobile cards
    container.querySelectorAll('.mobile-card').forEach(card => card.remove());

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

        // Desktop table row
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (data.codice || 'N/D') + '</td><td>' + data.nome + '</td><td>' + quantita + '</td><td>' + scortaMin + '</td><td><span class="badge">' + statoText + '</span></td><td><button onclick="editComponente(\'' + docSnap.id + '\')" class="btn-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button onclick="deleteComponente(\'' + docSnap.id + '\')" class="btn-icon delete"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></td>';
        tbody.appendChild(tr);

        // Mobile card
        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.innerHTML = `
            <div class="mobile-card-row"><span class="mobile-card-label">Codice:</span><span class="mobile-card-value">${data.codice || 'N/D'}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Nome:</span><span class="mobile-card-value">${data.nome}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Quantità:</span><span class="mobile-card-value">${quantita}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Scorta Min:</span><span class="mobile-card-value">${scortaMin}</span></div>
            <div class="mobile-card-row"><span class="mobile-card-label">Stato:</span><span class="mobile-card-value"><span class="badge">${statoText}</span></span></div>
            <div class="mobile-card-actions">
                <button onclick="editComponente('${docSnap.id}')" class="btn-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                <button onclick="deleteComponente('${docSnap.id}')" class="btn-icon delete"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
        `;
        container.appendChild(card);
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
    if (!currentUser) return;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    document.getElementById('current-month').textContent = monthNames[month] + ' ' + year;
    const q = query(collection(db, 'manutenzioni'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const manutenzioniByDate = {};
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const dateKey = data.data;
        if (!manutenzioniByDate[dateKey]) {
            manutenzioniByDate[dateKey] = [];
        }
        let macchinarioNome = 'N/D';
        if (data.macchinarioId) {
            const maccDoc = await getDoc(doc(db, 'macchinari', data.macchinarioId));
            if (maccDoc.exists()) {
                const maccData = maccDoc.data();
                macchinarioNome = maccData.nome;
            }
        }
        manutenzioniByDate[dateKey].push({
            descrizione: data.descrizione,
            macchinario: macchinarioNome,
            stato: data.stato
        });
    }
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
    const adjustedFirstDay = firstDay === 0 ? 0 : firstDay;
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = '<div class="calendar-day-number">' + (daysInPrevMonth - i) + '</div>';
        grid.appendChild(day);
    }
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            day.classList.add('today');
        }
        const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
        let eventsHtml = '<div class="calendar-day-number">' + i + '</div>';
        if (manutenzioniByDate[dateKey]) {
            manutenzioniByDate[dateKey].forEach(event => {
                eventsHtml += '<div class="calendar-event ' + event.stato + '" title="' + event.macchinario + ' - ' + event.descrizione + '">' + event.macchinario + '</div>';
            });
        }
        day.innerHTML = eventsHtml;
        grid.appendChild(day);
    }
    const totalCells = adjustedFirstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = '<div class="calendar-day-number">' + i + '</div>';
        grid.appendChild(day);
    }
}

window.previousMonth = () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    loadCalendar();
};

window.nextMonth = () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    loadCalendar();
};

async function loadStats() {
    const container = document.getElementById('statistiche-section');
    container.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>🚧 Work in Progress 🚧</h2><p>Sezione in sviluppo</p></div>';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

window.openPhotoGallery = async (macchinarioId) => {
    currentMacchinarioId = macchinarioId;
    const docSnap = await getDoc(doc(db, 'macchinari', macchinarioId));
    if (docSnap.exists()) {
        document.getElementById('photo-modal-title').textContent = 'Foto: ' + docSnap.data().nome;
    }
    document.getElementById('photo-modal').classList.add('show');
    await loadFolders();
    loadPhotos();
};

// Load folders for current machinery
async function loadFolders() {
    if (!currentMacchinarioId) return;
    const select = document.getElementById('photo-category');

    // Get unique folders from photos
    const q = query(collection(db, 'macchinari_photos'), where('macchinarioId', '==', currentMacchinarioId));
    const snapshot = await getDocs(q);

    const folders = new Set();
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.category) {
            folders.add(data.category);
        }
    });

    // Populate select
    select.innerHTML = '<option value="">Tutte le foto</option>';
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        select.appendChild(option);
    });
}

// Create new folder
window.createFolder = () => {
    const input = document.getElementById('new-folder-name');
    const folderName = input.value.trim();

    if (!folderName) {
        alert('Inserisci un nome per la cartella');
        return;
    }

    // Add to select
    const select = document.getElementById('photo-category');
    const option = document.createElement('option');
    option.value = folderName;
    option.textContent = folderName;
    select.appendChild(option);
    select.value = folderName;

    input.value = '';
    alert(`Cartella "${folderName}" creata! Ora puoi caricare foto in questa cartella.`);
};

window.closePhotoModal = () => {
    document.getElementById('photo-modal').classList.remove('show');
    document.getElementById('new-photo-file').value = '';
};

async function loadPhotos() {
    if (!currentMacchinarioId) return;
    const grid = document.getElementById('photo-grid');
    const categorySelect = document.getElementById('photo-category');
    const selectedCategory = categorySelect.value;

    grid.innerHTML = '<p>Caricamento...</p>';

    let q = query(collection(db, 'macchinari_photos'), where('macchinarioId', '==', currentMacchinarioId));
    const snapshot = await getDocs(q);

    grid.innerHTML = '';

    // Filter by category
    const photos = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!selectedCategory || data.category === selectedCategory) {
            photos.push({ id: docSnap.id, data });
        }
    });

    if (photos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Nessuna foto presente</p>';
        return;
    }

    photos.forEach(({ id, data }) => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.photoId = id;
        card.dataset.category = data.category || '';

        card.innerHTML = `
            <div class="photo-checkbox-wrapper"></div>
            <img src="${data.url}" alt="Foto Macchinario" onerror="this.src='https://via.placeholder.com/150?text=Errore'">
        `;

        grid.appendChild(card);
    });

    // Setup Apple Photos style selection
    setupPhotoSelection(grid);
}

// Apple Photos style selection
let isDraggingCheckbox = false;
let lastSelectionState = false;
let dragStarted = false;
let initialTouchCard = null;

function setupPhotoSelection(grid) {
    // Mouse events
    grid.addEventListener('mousedown', (e) => {
        const checkbox = e.target.classList.contains('photo-checkbox-wrapper') ? e.target : e.target.closest('.photo-checkbox-wrapper');
        if (checkbox) {
            e.preventDefault();
            e.stopPropagation();
            isDraggingCheckbox = true;
            dragStarted = false;
            const card = checkbox.closest('.photo-card');
            lastSelectionState = !card.classList.contains('selected');
        }
    });

    grid.addEventListener('mousemove', (e) => {
        if (isDraggingCheckbox && !dragStarted) {
            dragStarted = true;
            const checkbox = e.target.classList.contains('photo-checkbox-wrapper') ? e.target : e.target.closest('.photo-checkbox-wrapper');
            if (checkbox) {
                const card = checkbox.closest('.photo-card');
                togglePhotoSelection(card, lastSelectionState);
            }
        }

        if (isDraggingCheckbox && dragStarted) {
            const card = e.target.closest('.photo-card');
            if (card) {
                const checkbox = card.querySelector('.photo-checkbox-wrapper');
                if (checkbox) {
                    togglePhotoSelection(card, lastSelectionState);
                }
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDraggingCheckbox) {
            if (!dragStarted) {
                const checkbox = e.target.classList.contains('photo-checkbox-wrapper') ? e.target : e.target.closest('.photo-checkbox-wrapper');
                if (checkbox) {
                    const card = checkbox.closest('.photo-card');
                    togglePhotoSelection(card);
                }
            }
            isDraggingCheckbox = false;
            dragStarted = false;
        }
    });

    // Touch events for mobile
    grid.addEventListener('touchstart', (e) => {
        const checkbox = e.target.classList.contains('photo-checkbox-wrapper') ? e.target : e.target.closest('.photo-checkbox-wrapper');
        if (checkbox) {
            e.preventDefault(); // Prevent scrolling
            e.stopPropagation();
            isDraggingCheckbox = true;
            dragStarted = false;
            initialTouchCard = checkbox.closest('.photo-card');
            lastSelectionState = !initialTouchCard.classList.contains('selected');
        }
    }, { passive: false });

    grid.addEventListener('touchmove', (e) => {
        if (isDraggingCheckbox) {
            e.preventDefault(); // Prevent scrolling
            
            if (!dragStarted) {
                dragStarted = true;
                // Toggle the initial card immediately when drag starts
                if (initialTouchCard) {
                    togglePhotoSelection(initialTouchCard, lastSelectionState);
                }
            }

            // Find element under finger
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const card = element?.closest('.photo-card');
            
            if (card) {
                const checkbox = card.querySelector('.photo-checkbox-wrapper');
                if (checkbox) {
                    togglePhotoSelection(card, lastSelectionState);
                }
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (isDraggingCheckbox) {
            if (!dragStarted && initialTouchCard) {
                // Just a tap
                togglePhotoSelection(initialTouchCard);
            }
            isDraggingCheckbox = false;
            dragStarted = false;
            initialTouchCard = null;
        }
    });

    // Click on photo (not checkbox) opens lightbox
    grid.addEventListener('click', (e) => {
        const checkbox = e.target.classList.contains('photo-checkbox-wrapper') ? e.target : e.target.closest('.photo-checkbox-wrapper');
        const card = e.target.closest('.photo-card');

        if (!checkbox && card) {
            const img = card.querySelector('img');
            if (img) {
                openLightbox(img.src);
            }
        }
    });
}

function togglePhotoSelection(card, forceState = null) {
    const checkbox = card.querySelector('.photo-checkbox-wrapper');

    if (forceState === null) {
        // Toggle
        card.classList.toggle('selected');
        checkbox.classList.toggle('checked');
    } else {
        // Force state
        if (forceState) {
            card.classList.add('selected');
            checkbox.classList.add('checked');
        } else {
            card.classList.remove('selected');
            checkbox.classList.remove('checked');
        }
    }
}

window.addPhoto = async () => {
    const fileInput = document.getElementById('new-photo-file');
    const categorySelect = document.getElementById('photo-category');
    const files = fileInput.files;

    if (files.length === 0) {
        alert('Seleziona almeno un file');
        return;
    }

    const category = categorySelect.value;
    if (!category) {
        alert('Seleziona o crea una cartella prima di caricare le foto');
        return;
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = async function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize logic
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    try {
                        await addDoc(collection(db, 'macchinari_photos'), {
                            macchinarioId: currentMacchinarioId,
                            url: dataUrl,
                            category: category,
                            createdAt: new Date().toISOString(),
                            userId: currentUser.uid
                        });
                        resolve();
                    } catch (error) {
                        alert('Errore durante il salvataggio: ' + error.message);
                        resolve();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    fileInput.value = '';
    loadPhotos();
};

// Delete selected photos
window.deleteSelectedPhotos = async () => {
    const selectedCards = document.querySelectorAll('.photo-card.selected');
    if (selectedCards.length === 0) {
        alert('Seleziona almeno una foto da eliminare');
        return;
    }

    if (!confirm(`Sei sicuro di voler eliminare ${selectedCards.length} foto?`)) {
        return;
    }

    try {
        for (const card of selectedCards) {
            const photoId = card.dataset.photoId;
            await deleteDoc(doc(db, 'macchinari_photos', photoId));
        }
        loadPhotos();
    } catch (error) {
        alert('Errore durante l\'eliminazione: ' + error.message);
    }
};

// Move selected photos
window.moveSelectedPhotos = async () => {
    const selectedCards = document.querySelectorAll('.photo-card.selected');
    if (selectedCards.length === 0) {
        alert('Seleziona almeno una foto da spostare');
        return;
    }

    // Get all folders
    const q = query(collection(db, 'macchinari_photos'), where('macchinarioId', '==', currentMacchinarioId));
    const snapshot = await getDocs(q);
    const folders = new Set();
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.category) {
            folders.add(data.category);
        }
    });

    if (folders.size === 0) {
        alert('Non ci sono cartelle disponibili. Crea prima una cartella.');
        return;
    }

    // Populate move dialog
    const select = document.getElementById('move-destination-folder');
    select.innerHTML = '<option value="">Seleziona una cartella...</option>';
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        select.appendChild(option);
    });

    // Show dialog
    document.getElementById('move-dialog').classList.add('show');
};

window.closeMoveDialog = () => {
    document.getElementById('move-dialog').classList.remove('show');
};

window.confirmMovePhotos = async () => {
    const newFolder = document.getElementById('move-destination-folder').value;

    if (!newFolder) {
        alert('Seleziona una cartella di destinazione');
        return;
    }

    const selectedCards = document.querySelectorAll('.photo-card.selected');

    try {
        for (const card of selectedCards) {
            const photoId = card.dataset.photoId;
            await updateDoc(doc(db, 'macchinari_photos', photoId), {
                category: newFolder
            });
        }
        await loadFolders();
        loadPhotos();
        closeMoveDialog();
        alert(`${selectedCards.length} foto spostate in "${newFolder}"`);
    } catch (error) {
        alert('Errore durante lo spostamento: ' + error.message);
    }
};

// Lightbox functions
window.openLightbox = (imageUrl) => {
    const lightbox = document.getElementById('lightbox-modal');
    const lightboxImage = document.getElementById('lightbox-image');
    lightboxImage.src = imageUrl;
    lightbox.classList.add('show');
};

window.closeLightbox = () => {
    const lightbox = document.getElementById('lightbox-modal');
    lightbox.classList.remove('show');
};

// Category change listener
document.addEventListener('DOMContentLoaded', () => {
    const categorySelect = document.getElementById('photo-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            if (currentMacchinarioId) {
                loadPhotos();
            }
        });
    }
});
