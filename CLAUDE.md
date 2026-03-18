# CLAUDE.md — Puslevenn

## Hva er dette?
En React-app (Puslevenn) der bruker laster opp et bilde, velger vanskelighetsgrad og sender en lenke til en mottaker. Mottaker må pusle bildet for å se det. Når puslespillet er løst, avsløres bildet med en personlig hilsen.

## Teknisk stack
- **Vite** + **React** (JSX, ingen TypeScript)
- Ingen CSS-rammeverk — all styling er inline via style-objekter
- Ingen backend — bildet lagres i Firebase Realtime Database (gratis tier)
- Deployes til **GitHub Pages** via GitHub Actions

## Prosjektstruktur
```
puslespill-no/
├── CLAUDE.md          ← denne filen
├── README.md          ← brukerdokumentasjon
├── package.json
├── vite.config.js
├── index.html         ← Vite entry point
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx       ← React mount
│   ├── App.jsx        ← Hovedapp med routing mellom skjermer
│   ├── storage.js     ← Firebase storage-abstraksjon
│   └── index.css      ← Minimal global CSS
└── .github/
    └── workflows/
        └── deploy.yml ← GitHub Pages deploy
```

## Viktige designbeslutninger
- Puslespillmotoren bruker SVG `<clipPath>` for å klippe brukerens bilde til puslespillformer (bézier-kurver)
- Hver brikke har unike clipPath-IDer (`pc{uid}-{id}`) for å unngå DOM-kollisjoner
- Bildet komprimeres til JPEG 52% kvalitet, maks 680×480px før lagring
- Lenkeformat: `https://brukernavn.github.io/puslespill-no/#p=Xk9mQ2`
- Firebase brukes med `shared: true` scope — alle kan lese puslespill, men bare avsender oppretter

## Kommandoer
```bash
npm install          # Installer avhengigheter
npm run dev          # Start lokal dev-server
npm run build        # Bygg for produksjon
npm run preview      # Forhåndsvis produksjonsbygg
```

## Firebase-oppsett (må gjøres manuelt)
1. Opprett prosjekt på https://console.firebase.google.com
2. Aktiver Realtime Database (start i locked mode)
3. Lim inn reglene fra `database.rules.json` i Firebase Console → Rules
4. Kopier config-verdier inn i `.env` (se `.env.example`)
5. For GitHub Actions deploy: legg verdiene som GitHub Secrets
6. Se README.md for detaljer

## Regler for endringer
- Hold all styling inline — ikke lag separate CSS-filer for komponenter
- Behold norsk språk i all UI-tekst
- Puslespillmotoren (edge map, bézier-kurver, snap-logikk) er godt testet — ikke endre med mindre det er en bug
- Test alltid på mobil (touch events) etter endringer i drag-logikk
