# 🧩 Puslevenn

Send et bilde som puslespill! Mottakeren må pusle bildet for å se hva det er.

## Slik fungerer det

1. **Last opp** et bilde og skriv en hilsen
2. **Del lenken** via WhatsApp, SMS eller e-post
3. **Mottaker pusler** bildet — med ekte puslespillbrikker og valgfri rotasjon
4. **Bildet avsløres** med din personlige hilsen

## Kom i gang

### 1. Klon og installer

```bash
git clone https://github.com/DITT-BRUKERNAVN/puslespill-no.git
cd puslespill-no
npm install
```

### 2. Sett opp Firebase (gratis)

Du trenger en Firebase Realtime Database for å lagre puslespilldata:

1. Gå til [Firebase Console](https://console.firebase.google.com)
2. Opprett et nytt prosjekt (slå av Google Analytics om ønskelig)
3. Gå til **Build → Realtime Database** → **Create Database**
4. Velg region (europe-west1 anbefalt) og start i **locked mode**
5. Gå til **Realtime Database → Rules** og lim inn innholdet fra `database.rules.json`
6. Gå til **Project Settings → General** og kopier config-verdiene
7. Kopier `.env.example` til `.env` og fyll inn dine Firebase-verdier:

```bash
cp .env.example .env
```

Åpne `.env` og lim inn verdiene fra Firebase Console.

### 3. Kjør lokalt

```bash
npm run dev
```

Åpne http://localhost:5173 i nettleseren.

### 4. Deploy til GitHub Pages

Legg til Firebase-verdiene som **GitHub Secrets** (under repo **Settings → Secrets and variables → Actions**):

| Secret | Beskrivelse |
|--------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API-nøkkel |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth-domene |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase prosjekt-ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender-ID |
| `VITE_FIREBASE_APP_ID` | Firebase app-ID |

Push deretter til GitHub:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

Gå til repo **Settings → Pages** og sett source til **GitHub Actions**.

Appen er nå live på `https://DITT-BRUKERNAVN.github.io/puslespill-no/`

## Vanskelighetsgrader

| Nivå | Brikker | Rotasjon |
|------|---------|----------|
| Lett | 6 (3×2) | Nei |
| Medium | 12 (4×3) | Nei |
| Vanskelig | 12 (4×3) | Ja |
| Ekspert | 20 (5×4) | Ja |

## Teknologi

- React + Vite
- SVG clipPath for puslespillbrikker
- Bézier-kurver for realistiske tapper/innbuktninger
- Firebase Realtime Database (gratis tier: 1 GB lagring)
- GitHub Pages hosting (gratis)

## Lisens

MIT
