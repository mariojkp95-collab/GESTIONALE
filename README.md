# 🔧 Gestionale Manutenzioni

Sistema web per la gestione delle manutenzioni aziendali - semplice, completo ed efficace.

**🌐 [DEMO LIVE](https://mariojkp95-collab.github.io/GESTIONALE/)**

## Funzionalità

✅ **Gestione Macchinari**: Registra e monitora tutti i macchinari aziendali  
✅ **Registro Interventi**: Traccia tutte le manutenzioni (ordinarie, straordinarie, riparazioni)  
✅ **Calendario Scadenze**: Sistema automatico di alert per le scadenze di manutenzione  
✅ **Dashboard Completa**: Statistiche e overview in tempo reale  
✅ **Salvataggio Locale**: Dati salvati nel browser (localStorage) - nessun server necessario  
✅ **Export Dati**: Scarica backup in formato JSON  
✅ **GitHub Pages Ready**: Funziona direttamente online senza configurazione

## Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript ES6
- **Framework CSS**: Bootstrap 5
- **Storage**: LocalStorage (browser)
- **Hosting**: GitHub Pages
- **Interfaccia**: Completamente responsive e mobile-friendly

## Struttura del Progetto

```
GESTIONALE/
├── index.html              # Pagina principale
├── assets/
│   ├── css/
│   │   └── style.css       # Stili personalizzati
│   ├── js/
│   │   └── app.js          # Logica applicazione
│   └── images/             # Immagini
└── README.md
```

## 🚀 Utilizzo

### Online (GitHub Pages)
Visita semplicemente: **https://mariojkp95-collab.github.io/GESTIONALE/**

### Locale
1. Clona il repository:
```bash
git clone https://github.com/mariojkp95-collab/GESTIONALE.git
```

2. Apri `index.html` nel browser (doppio click o apri con Chrome/Firefox/Edge)

Non serve installare nulla! È tutto pronto all'uso.

## 📖 Come Usarlo

### 1️⃣ Aggiungi Macchinari
- Vai su **"Macchinari"** nel menu laterale
- Clicca **"+ Aggiungi Macchinario"**
- Compila i campi: nome, tipo, ubicazione, note
- Salva

### 2️⃣ Registra Interventi
- Vai su **"Interventi"**
- Clicca **"+ Registra Intervento"**
- Seleziona il macchinario
- Inserisci data, tipo manutenzione e descrizione
- *Opzionale*: Imposta i giorni per la prossima scadenza (es. 90 per una manutenzione trimestrale)

### 3️⃣ Monitora Scadenze
- Vai su **"Scadenze"** per vedere le manutenzioni programmate
- Sistema di alert colorati automatico:
  - 🟢 **Verde (OK)**: Nessuna urgenza
  - 🟡 **Giallo (IN SCADENZA)**: Meno di 30 giorni
  - 🔴 **Rosso (URGENTE)**: Meno di 7 giorni o già scaduto

### 4️⃣ Monitora Dashboard
- La **Dashboard** mostra:
  - Totale macchinari registrati
  - Numero totale interventi
  - Scadenze prossime (entro 30 giorni)
  - Lista ultimi 5 interventi

## 💾 Gestione Dati

### Dove Sono Salvati?
I dati vengono salvati automaticamente nel **localStorage del browser**. Questo significa:
- ✅ Nessun server necessario
- ✅ Funziona offline
- ✅ Completamente gratuito
- ⚠️ I dati sono legati al browser e dispositivo specifico

### Backup & Export
1. Clicca sul pulsante **"📥 Export Dati"** nella barra superiore
2. Verrà scaricato un file JSON con tutti i tuoi dati
3. Conserva questo file come backup

### Import Dati (Manuale)
Per ripristinare dati da un backup:
1. Apri la **Console del browser** (F12 → Console)
2. Incolla questo codice sostituendo `{...}` con il contenuto del tuo file di backup:
```javascript
localStorage.setItem('gestionale_machines', JSON.stringify([...]));
localStorage.setItem('gestionale_interventions', JSON.stringify([...]));
location.reload();
```

## ⚠️ Note Importanti

- **I dati sono salvati solo nel browser**: Se cambi browser o dispositivo, dovrai riportare i dati manualmente usando l'export/import
- **Non cancellare i dati del browser**: La pulizia della cache può eliminare i tuoi dati
- **Fai backup regolari**: Usa la funzione di export periodicamente

## 🚀 Pubblicazione su GitHub Pages

### Setup Iniziale

1. **Crea il repository su GitHub**:
   - Vai su https://github.com/new
   - Nome repository: `GESTIONALE`
   - Lascia pubblico
   - Crea repository

2. **Carica i file**:
```bash
cd "c:\Users\mario\OneDrive\Desktop\GESTIONALE\GESTIONALE"
git init
git add .
git commit -m "Prima versione gestionale manutenzioni"
git branch -M main
git remote add origin https://github.com/mariojkp95-collab/GESTIONALE.git
git push -u origin main
```

3. **Attiva GitHub Pages**:
   - Vai nelle **Settings** del repository
   - Sezione **Pages** (menu laterale)
   - Source: **Deploy from a branch**
   - Branch: **main** → folder: **/ (root)**
   - Clicca **Save**

4. **Attendi 1-2 minuti** e il sito sarà online su:
   ```
   https://mariojkp95-collab.github.io/GESTIONALE/
   ```

### Aggiornamenti Futuri

Per aggiornare il sito dopo modifiche:
```bash
git add .
git commit -m "Descrizione modifiche"
git push
```

GitHub Pages si aggiorna automaticamente in 1-2 minuti.

## 🔧 Personalizzazioni Future

Il sistema è facilmente espandibile per aggiungere:
- 📧 Notifiche email per scadenze
- 📊 Grafici e statistiche avanzate
- 📱 Supporto PWA (app installabile)
- 👥 Sistema multi-utente con login
- 📷 Upload foto/documenti
- 📄 Export PDF/Excel dei report
- 🌐 Supporto multilingua

## 🆘 Supporto & FAQ

### Il sito non carica i dati
- Controlla che JavaScript sia abilitato nel browser
- Verifica la console (F12) per eventuali errori

### Ho perso i dati
- Se non hai fatto backup, i dati non sono recuperabili
- Fai sempre export regolari dei dati

### Posso usarlo su più dispositivi?
- Sì, ma i dati non si sincronizzano automaticamente
- Devi fare export/import manuale tra dispositivi

### È sicuro?
- I dati restano solo sul tuo browser
- Nessun dato viene inviato a server esterni
- Per maggiore sicurezza, usa export per backup esterni

## 📝 Licenza

Questo progetto è libero e open source. Puoi usarlo, modificarlo e distribuirlo liberamente.

## 👨‍💻 Autore

**Mario** - [GitHub](https://github.com/mariojkp95-collab)

---

**Versione**: 2.0.0 (GitHub Pages Edition)  
**Data**: Novembre 2025  
**Tecnologia**: 100% Frontend - No Server Required
