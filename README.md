# Quest Conquestus

Web app statica per facilitare i playtest di **Quest Conquestus** su un solo dispositivo.

## Uso locale

Apri `index.html` nel browser oppure avvia un server statico:

```bash
python3 -m http.server 8000
```

poi visita `http://localhost:8000`.

## GitHub Pages

Il progetto non richiede build. Per pubblicarlo:

1. fai push sul branch `main`;
2. in GitHub apri `Settings > Pages`;
3. scegli `Deploy from a branch`;
4. seleziona `main` e cartella `/root`.

L'URL previsto e' `https://ninvitto.github.io/questconquestus/`.

## Formato sessione

Le sessioni esportate usano `version: 1` e includono giocatori, posizioni sulla mappa, inventari, effetti attivi, log eventi e note di playtest.

