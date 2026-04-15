import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";

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

const timeline = [
  { time: "15h00 – 15h30", title: "Accueil & Installation" },
  { time: "15h30 – 15h50", title: "Priere & Mot d'ouverture" },
  { time: "15h50 – 16h20", title: "Cocktail + Presentation + Visite de stands + Networking" },
  { time: "16h20 – 17h00", title: "Quiz Culture Generale + Quiz Biblique + Devine qui c'est" },
  { time: "17h00 – 17h45", title: "Panel + Presentation du Reseau Pro" },
  { time: "17h45 – 18h00", title: "Animation + Jeux de table" },
  { time: "18h00 – 18h40", title: "Prestation + Defile" },
  { time: "18h40 – 19h10", title: "Jeux de saut + Jeu devinette des mots" },
  { time: "19h10 – 19h50", title: "Ouverture du Buffet" },
  { time: "19h50 – 20h20", title: "Jeu Tournoi + Jeu Alphabet t'en verser + Jeu Global" },
  { time: "20h20 – 20h50", title: "Concert" },
  { time: "20h50 – 21h00", title: "Mot de Fin" },
];

async function run() {
  const colRef = collection(db, "events", EVENT_ID, "timeline");

  // Clear existing timeline
  const existing = await getDocs(colRef);
  for (const d of existing.docs) {
    await deleteDoc(d.ref);
  }
  console.log(`Cleared ${existing.size} existing steps`);

  // Add new steps
  for (let i = 0; i < timeline.length; i++) {
    await addDoc(colRef, {
      title: timeline[i].title,
      time: timeline[i].time,
      order: i,
    });
    console.log(`  ${i + 1}. ${timeline[i].time} — ${timeline[i].title}`);
  }

  console.log(`\nAdded ${timeline.length} timeline steps`);
  process.exit(0);
}

run();
