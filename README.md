# 🧩 Puslespill.no

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
4. Velg region (europe-west1 anbefalt) og start i **test mode**
5. Gå til **Project Settings → General** og kopier config-verdiene
6. Åpne `src/storage.js` og lim inn dine verdier

### 3. Kjør lokalt

```bash
npm run dev
```

Åpne http://localhost:5173 i nettleseren.

### 4. Deploy til GitHub Pages

Push til GitHub, og GitHub Actions deployer automatisk:

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
