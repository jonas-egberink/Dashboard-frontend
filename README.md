# Dashboard — Deployment Guide

## Stap 1 — Backend: npm install

Open terminal in `Backend-Dashboard/` en run:
```bash
npm install
```

## Stap 2 — Supabase database aanmaken

1. Ga naar **supabase.com** → New project
2. Ga naar **SQL Editor** → New query
3. Plak de inhoud van `models/schema.sql` → Run
4. Ga naar **Settings → API**:
   - Kopieer **Project URL** → wordt `SUPABASE_URL`
   - Kopieer **service_role key** (onder Service Role) → wordt `SUPABASE_SERVICE_KEY`

## Stap 3 — .env aanmaken

Maak `Backend-Dashboard/.env` aan (kopieer `.env.example`):
```
SUPABASE_URL=https://jouwproject.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...
JWT_SECRET=maak_een_lange_willekeurige_string_hier_minimaal_32_tekens
ALLOWED_ORIGINS=https://jouwnaam.github.io
PORT=3000
```

## Stap 4 — Backend lokaal testen

```bash
cd Backend-Dashboard
npm run dev
```

Test in browser: `http://localhost:3000/health` → moet `{"status":"ok"}` tonen.

## Stap 5 — Railway deployment (backend)

1. Ga naar **railway.app** → New Project → Deploy from GitHub repo
2. Selecteer je `dashboard-backend` repo
3. Ga naar **Variables** en voeg toe:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `ALLOWED_ORIGINS` (je GitHub Pages URL)
4. Railway detecteert automatisch Node.js en runt `npm start`
5. Kopieer je Railway URL (bijv. `https://dashboard-backend-production.up.railway.app`)

## Stap 6 — Frontend API_URL instellen

In **elke** `api.js` in de Frontend-Dashboard mappen, verander:
```js
const API_URL = 'https://jouw-backend.railway.app';
```
naar je echte Railway URL.

## Stap 7 — GitHub Pages (frontend)

1. Maak repo `dashboard-frontend` aan op GitHub
2. Upload alles uit `Frontend-Dashboard/`
3. Settings → Pages → Branch: main → Save
4. Je dashboard is live op `https://jouwnaam.github.io/dashboard-frontend/login/login.html`

## Mapstructuur overzicht

```
Frontend-Dashboard/
├── login/
│   ├── login.html       ← startpagina
│   ├── style.css
│   └── api.js
├── home/
│   ├── index.html       ← overzicht
│   ├── style.css
│   ├── api.js
│   └── app.js
├── financieel/
│   ├── financieel.html  ← portfolio + aankopen per aandeel
│   ├── style.css
│   ├── api.js
│   └── app.js
├── transacties/
│   ├── transacties.html ← alle transacties met filters
│   ├── style.css
│   ├── api.js
│   └── app.js
├── watchlist/
│   ├── watchlist.html   ← aandelen om te overwegen
│   ├── style.css
│   ├── api.js
│   └── app.js
└── projecten/
    ├── editor.html      ← drag & drop pagina editor
    ├── style.css
    ├── api.js
    └── app.js

Backend-Dashboard/
├── app.js               ← Express configuratie
├── package.json
├── .env.example
├── .gitignore
├── bin/www
├── lib/
│   ├── supabase.js      ← database connectie
│   └── koersen.js       ← Yahoo Finance, 2 min cache
├── middleware/
│   └── auth.js          ← JWT verificatie
├── models/
│   └── schema.sql       ← plak dit in Supabase SQL Editor
└── routes/
    ├── auth.js          ← POST /api/auth/login|registreer
    ├── portfolio.js     ← GET /api/portfolio (FIFO berekening)
    ├── transacties.js   ← GET|POST|DELETE /api/transacties
    ├── aandelen.js      ← GET|POST|DELETE /api/aandelen + zoek
    └── paginas.js       ← GET|PUT|DELETE /api/paginas/:pagina/:sleutel
```

## Nieuw aandeel toevoegen (workflow)

1. Ga naar **Financieel** pagina
2. Scroll naar "Nieuw Aandeel Toevoegen"
3. Typ de ticker (bijv. `AAPL` of `AMS:ASML`)
4. Klik **Zoeken** → backend haalt naam + exchange op via Yahoo Finance
5. Klik **Toevoegen** → aandeel staat in je lijst
6. Klik op het aandeel in de tabel → zie alle aankopen
7. Gebruik de **+ Transactie** knop om een aankoop toe te voegen

## Project Editor (workflow)

1. Ga naar **Projecten** in de sidebar
2. Sleep blokken vanuit het rechterpaneel naar het canvas
3. Klik een blok → pas eigenschappen aan rechts (positie, grootte, kleuren, tekst)
4. Klik **Opslaan** → layout wordt opgeslagen per gebruiker in Supabase
5. Klik **Kopieer JSON** → plak in Claude met de prompt:
   > "Maak een HTML pagina van deze dashboard layout JSON, gebruik het dark theme"
