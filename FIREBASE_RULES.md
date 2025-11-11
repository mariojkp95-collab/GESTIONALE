# 🔥 Configurazione Regole Firebase

## ⚠️ ERRORE ATTUALE
```
FirebaseError: Missing or insufficient permissions
```

Questo significa che le **regole di sicurezza Firestore** non sono configurate correttamente.

---

## ✅ SOLUZIONE: Configura le Regole Firestore

### 1. Vai su Firebase Console
https://console.firebase.google.com/

### 2. Seleziona il progetto
`gestionale-manutenzioni`

### 3. Menu laterale → **Firestore Database**

### 4. Tab **Regole** (Rules) in alto

### 5. Sostituisci tutto il contenuto con queste regole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permetti accesso solo a utenti autenticati
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Clicca **Pubblica** (Publish)

---

## 📦 Configura anche Firebase Storage (per le foto)

### 1. Menu laterale → **Storage**

### 2. Tab **Rules**

### 3. Sostituisci con:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /machine-photos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

### 4. Clicca **Pubblica**

---

## 🔑 Verifica Authentication

### 1. Menu laterale → **Authentication**

### 2. Tab **Sign-in method**

### 3. Verifica che **Email/Password** sia abilitato ✅

---

## ✅ Dopo aver configurato:

1. Ricarica il sito
2. Fai login
3. Prova ad aggiungere un macchinario
4. Ora dovrebbe funzionare! 🎉

---

## 📝 Cosa fanno queste regole:

- ✅ Solo utenti autenticati (loggati) possono leggere/scrivere dati
- ✅ Nessun utente anonimo può accedere
- ✅ Ogni utente loggato può fare tutto (per ora)

Se vuoi separare i dati per utente in futuro, possiamo modificare le regole!
