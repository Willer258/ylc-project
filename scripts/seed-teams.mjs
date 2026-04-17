import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9vtnbecu0gFULYvfWsRfzj0ai12gq02I",
  authDomain: "ylc-app-7dcd7.firebaseapp.com",
  projectId: "ylc-app-7dcd7",
  storageBucket: "ylc-app-7dcd7.firebasestorage.app",
  messagingSenderId: "292034091617",
  appId: "1:292034091617:web:d50e273ebbae56b496e820",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EVENT_ID = "event-default";

const TEAM_NAMES = [
  "Les Flambeaux",
  "Les Colombes",
  "Les Ambassadeurs",
  "Les Semeurs",
  "Les Heritiers",
  "Les Rochers",
  "Les Phares",
  "Les Conquerants",
  "Les Vents de Pentecote",
  "Les Sentinelles",
  "Young Christian Staff",
];

async function run() {
  const teamsRef = collection(db, "events", EVENT_ID, "teams");

  // Clean existing teams first
  const existing = await getDocs(teamsRef);
  if (!existing.empty) {
    console.log(`Deleting ${existing.size} existing team(s)...`);
    for (const d of existing.docs) {
      await deleteDoc(doc(db, "events", EVENT_ID, "teams", d.id));
    }
  }

  // Create 10 fresh teams
  for (const name of TEAM_NAMES) {
    const ref = await addDoc(teamsRef, {
      name,
      assignedPhraseId: null,
      wordsFound: [],
      completed: false,
      completedAt: null,
      createdAt: serverTimestamp(),
    });
    console.log(`Created "${name}" (${ref.id})`);
  }

  console.log(`\n${TEAM_NAMES.length} equipes creees.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
