import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { config } from "dotenv";

config({ path: ".env.local" });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

async function main() {
  const snap = await getDocs(collection(db, "events", "event-default", "photos"));
  console.log(`Photos trouvees: ${snap.size}`);

  for (const d of snap.docs) {
    await deleteDoc(doc(db, "events", "event-default", "photos", d.id));
  }

  console.log("Toutes les photos ont ete supprimees.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
