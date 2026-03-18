/*──────────────────────────────────────────────
  STORAGE — Firebase Realtime Database
  
  Sett inn dine Firebase-verdier nedenfor.
  Se README.md for oppsett-instruksjoner.
──────────────────────────────────────────────*/
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let db = null;

function getDb() {
  if (!db) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
}

/*──────────────────────────────────────────────
  ID GENERATOR — pen, kort, uten tvetydige tegn
──────────────────────────────────────────────*/
function genId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/*──────────────────────────────────────────────
  SAVE PUZZLE
  Lagrer bilde (base64), hilsen, avsender og
  vanskelighetsgrad. Returnerer puzzle-ID.
──────────────────────────────────────────────*/
export async function savePuzzle(data) {
  const database = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = genId();
    try {
      const existing = await get(ref(database, `puzzles/${id}`));
      if (existing.exists()) continue;
      await set(ref(database, `puzzles/${id}`), {
        img: data.img,
        msg: String(data.msg || "").slice(0, 200),
        sender: String(data.sender || "").slice(0, 40),
        difficulty: Number(data.difficulty) || 0,
        createdAt: Date.now(),
      });
      return id;
    } catch (e) {
      console.error("Feil ved lagring:", e);
      return null;
    }
  }
  console.error("Kunne ikke generere unik ID etter 5 forsøk");
  return null;
}

/*──────────────────────────────────────────────
  LOAD PUZZLE
  Henter puslespilldata basert på ID.
──────────────────────────────────────────────*/
export async function loadPuzzle(id) {
  try {
    const database = getDb();
    const snapshot = await get(ref(database, `puzzles/${id}`));
    if (snapshot.exists()) return snapshot.val();
  } catch (e) {
    console.error("Feil ved lasting:", e);
  }
  return null;
}
