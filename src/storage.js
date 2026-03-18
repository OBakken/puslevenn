/*──────────────────────────────────────────────
  STORAGE — Firebase Realtime Database
  
  Sett inn dine Firebase-verdier nedenfor.
  Se README.md for oppsett-instruksjoner.
──────────────────────────────────────────────*/
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

// ┌─────────────────────────────────────────┐
// │  SETT INN DINE FIREBASE-VERDIER HER:    │
// └─────────────────────────────────────────┘
const firebaseConfig = {
  apiKey: "AIzaSyBNKTXbUOM1InLDDg_MGPoODJpALK2vHCo",
  authDomain: "puslespill-ebd83.firebaseapp.com",
  databaseURL: "https://puslespill-ebd83-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "puslespill-ebd83",
  storageBucket: "puslespill-ebd83.firebasestorage.app",
  messagingSenderId: "34182673628",
  appId: "1:34182673628:web:8b151f0dc287f5ca3a7019"
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
  const id = genId();
  try {
    const database = getDb();
    await set(ref(database, `puzzles/${id}`), {
      ...data,
      createdAt: Date.now(),
    });
    return id;
  } catch (e) {
    console.error("Feil ved lagring:", e);
    return null;
  }
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
