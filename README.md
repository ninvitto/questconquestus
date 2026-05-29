# Quest Conquestus Playtest Web App

Web app statica per facilitare i playtest di **Quest Conquestus**, un boardgame fantasy in sviluppo.

L'obiettivo della versione attuale e' aiutare un facilitatore a gestire una sessione su un solo dispositivo: giocatori, classi, vita, statistiche, mappa a zone, lanci di dado, inventario, effetti, log eventi e note di playtest.

Questa non e' ancora una conversione digitale completa del gioco da tavolo. Le parti non definite nel regolamento, soprattutto combattimento dettagliato, danni, carte e vittoria, restano intenzionalmente manuali e vengono tracciate nel log.

## Stato Del Progetto

- Repo GitHub: `ninvitto/questconquestus`
- Branch principale: `main`
- Stack: HTML, CSS e JavaScript vanilla
- Build: nessuna
- Backend: nessuno
- Persistenza: `localStorage`
- Hosting previsto: GitHub Pages da branch `main`, cartella `/root`
- URL Pages previsto: `https://ninvitto.github.io/questconquestus/`

## Come Avviare

Apri direttamente `index.html` nel browser oppure usa un server statico locale:

```bash
python3 -m http.server 8000
```

Poi visita:

```text
http://localhost:8000
```

Non servono `npm install`, bundler, database o variabili d'ambiente.

## File Principali

- `index.html`: struttura semantica della dashboard.
- `styles.css`: layout responsive, tema visivo, componenti UI.
- `app.js`: dati di gioco normalizzati, stato sessione, rendering, eventi, import/export.
- `.nojekyll`: evita trasformazioni Jekyll su GitHub Pages.
- `.gitignore`: esclusioni minime per file locali.

In questa fase i dati di gioco sono dentro `app.js` in `GAME_DATA`. Se il progetto cresce, il prossimo refactor consigliato e' separare i dati in `data.js` e lasciare in `app.js` solo logica e rendering.

## Funzionalita Attuali

- Creazione sessione locale per 1-6 giocatori.
- Scelta classe iniziale tra le otto classi derivate dai biomi.
- Inizializzazione automatica di vita, velocita, forza e intelligenza.
- Mappa semplice a zone:
  - Cerchio 1: otto zone iniziali.
  - Cerchio 2: quattro zone avanzate.
  - Cerchio 3: citta e portale finale.
- Movimento manuale dei token cliccando una zona o usando il selettore zona.
- Strumenti di playtest:
  - d10 movimento.
  - calcolo nuoto: meta' del risultato, massimo 5.
  - calcolo fuga: complementare della velocita, cioe `10 - velocita`.
  - modifica manuale di vita e statistiche.
  - inventario con oggetti e pozioni.
  - effetti attivi con turni residui.
  - log manuale per combattimenti, tesori, dubbi e decisioni.
  - note di sessione.
- Persistenza automatica su browser tramite `localStorage`.
- Export sessione JSON.
- Import sessione JSON.
- Export log e note in Markdown.

## Dati Di Gioco Inclusi

La prima normalizzazione deriva dal file regole originale, ma il file RTF non deve essere committato nel repo pubblico.

Sono gia inclusi:

- biomi e zone dei tre cerchi;
- miniboss e boss/finale dove indicati;
- classi/personaggi iniziali;
- statistiche base delle classi;
- armi principali;
- pozioni e cure;
- effetti di invisibilita, fortuna e teletrasporto;
- regole rapide di movimento, nuoto, fuga e vincoli.

Correzioni editoriali leggere sono accettabili, ma non cambiare il senso delle regole senza segnare la decisione in README o nel log di implementazione.

## Formato Sessione V1

Le sessioni esportate usano `version: 1`.

Struttura concettuale:

```json
{
  "version": 1,
  "createdAt": "2026-05-29T10:00:00.000Z",
  "updatedAt": "2026-05-29T10:30:00.000Z",
  "activePlayerId": "player-...",
  "players": [],
  "lastRoll": null,
  "log": [],
  "notes": ""
}
```

Ogni giocatore contiene:

```json
{
  "id": "player-...",
  "name": "Nome",
  "classId": "foresta-1",
  "className": "Fauno",
  "origin": "Foresta 1",
  "zoneId": "foresta-elisir",
  "color": "#2f7d58",
  "hp": 70,
  "maxHp": 70,
  "baseStats": {
    "velocita": 6,
    "vita": 70,
    "forza": 3,
    "intelligenza": 19
  },
  "stats": {
    "velocita": 6,
    "forza": 3,
    "intelligenza": 19
  },
  "inventory": [],
  "effects": []
}
```

Regola importante per agenti AI: mantenere compatibilita con `version: 1` finche non viene introdotta una migrazione esplicita. Se il formato cambia, aggiungere una funzione di migrazione e documentarla qui.

## Guida Per Agenti AI

Prima di modificare codice:

```bash
git status --short --branch
```

Se ci sono modifiche non tue, non sovrascriverle. Leggi prima i file interessati e lavora con lo stato esistente.

Principi da rispettare:

- mantenere l'app statica e pubblicabile su GitHub Pages;
- evitare dipendenze, build step e backend finche non vengono richiesti esplicitamente;
- non committare il regolamento RTF originale o asset privati;
- mantenere UI e testo in italiano;
- preferire feature da playtest rispetto a simulazioni complesse non supportate dalle regole;
- lasciare manuali le regole non ancora definite, ma rendere semplice tracciarle nel log;
- non rompere import/export JSON esistente;
- mantenere accessibili i controlli anche senza drag and drop;
- verificare desktop e mobile prima di pushare.

Quando aggiungi una feature, aggiorna anche:

- questa documentazione;
- eventuale schema o note sul formato sessione;
- regole rapide se cambia il comportamento al tavolo;
- test manuali sotto "Checklist Di Verifica".

## Roadmap Consigliata

Priorita alta:

1. Separare `GAME_DATA` in un file dedicato, ad esempio `data.js`.
2. Aggiungere una vista "mazzi/casse" con pesca manuale e log automatico.
3. Migliorare inventario con quantita, ricerca e filtri per bioma/cerchio.
4. Aggiungere un pannello "combattimento manuale" con HP nemico, note e risultato.
5. Aggiungere export CSV del log per analisi playtest.

Priorita media:

1. Aggiungere salvataggi multipli nel browser.
2. Aggiungere modalita pass-and-play locale.
3. Aggiungere editor dati per correggere nomi, quantita e regole durante i test.
4. Aggiungere riepilogo finale sessione con durata, eventi chiave e problemi emersi.
5. Aggiungere stampa rapida schede giocatore.

Priorita futura:

1. Tabellone piu fedele con caselle reali.
2. Automazione del combattimento solo dopo definizione completa delle regole.
3. Sincronizzazione online solo se viene scelto un backend o servizio esterno.
4. PWA/offline installabile.

## Regole Di Implementazione

Per una modifica piccola:

1. leggere il file interessato;
2. modificare solo il necessario;
3. testare localmente;
4. aggiornare README se cambia uso, dati o deploy;
5. committare con messaggio breve e chiaro.

Per una modifica grande:

1. descrivere obiettivo e criteri di successo;
2. identificare quali parti del formato sessione cambiano;
3. mantenere una migrazione se cambia `version`;
4. dividere il lavoro in commit coerenti;
5. testare import/export con una sessione reale.

Convenzioni:

- JavaScript vanilla, senza framework.
- CSS vanilla, con layout responsive e controlli a dimensione stabile.
- Nomi dati in `camelCase`.
- ID dati in kebab-case, stabili nel tempo.
- Testo UI in italiano.
- Commenti solo quando aiutano a capire logica non ovvia.

## Checklist Di Verifica

Esegui almeno questi controlli prima di pushare:

```bash
python3 -m http.server 8000
```

Poi verifica nel browser:

- la pagina si carica senza errori console;
- si puo aggiungere un giocatore;
- classe e statistiche iniziali sono corrette;
- il giocatore attivo appare nella mappa;
- cliccare una zona sposta il token e scrive nel log;
- d10, nuoto e fuga scrivono nel log;
- inventario: aggiungere, usare e rimuovere oggetti funziona;
- effetti: aggiungere, scalare turni e rimuovere funziona;
- note playtest persistono dopo refresh;
- export JSON produce una sessione valida;
- import JSON ripristina la sessione;
- export log produce un Markdown leggibile;
- layout leggibile su desktop;
- layout leggibile su mobile stretto.

Comandi utili usati finora:

```bash
curl -sSI http://127.0.0.1:8000/
curl -sSI http://127.0.0.1:8000/app.js
curl -sSI http://127.0.0.1:8000/styles.css
```

Smoke test visuale possibile con Firefox headless:

```bash
tmp_profile=$(mktemp -d)
firefox --headless --profile "$tmp_profile" --screenshot /tmp/qc-desktop.png --window-size 1440,1000 http://127.0.0.1:8000/
```

## Deploy Su GitHub Pages

Il progetto non richiede build. Dopo il push su `main`:

1. apri il repo su GitHub;
2. vai in `Settings`;
3. apri `Pages`;
4. scegli `Deploy from a branch`;
5. seleziona branch `main`;
6. seleziona cartella `/root`;
7. salva.

Quando GitHub Pages finisce il deploy, l'app sara disponibile a:

```text
https://ninvitto.github.io/questconquestus/
```

## Git Workflow

Stato:

```bash
git status --short --branch
```

Commit:

```bash
git add README.md index.html styles.css app.js .nojekyll .gitignore
git commit -m "Descrizione breve"
```

Push:

```bash
git push
```

Il remote atteso e':

```text
git@github.com:ninvitto/questconquestus.git
```

## Limiti Noti

- Nessun backend e nessuna sincronizzazione multi-device.
- Nessun controllo automatico di legalita movimento.
- Nessun sistema carte completo.
- Nessuna automazione danni o combattimento.
- Nessuna migrazione oltre `version: 1`.
- Nessun test automatico, per ora solo checklist manuale.

Questi limiti sono intenzionali per mantenere la prima versione rapida, testabile e utile al tavolo.

