/**
 * Seed script for Firestore — run with:
 * npx tsx scripts/seed.ts
 *
 * Requires .env.local with Firebase config
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";
import { config } from "dotenv";

config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EVENT_ID = "event-default";

async function seed() {
  console.log("Seeding Firestore...");

  // 1. Create event
  await setDoc(doc(db, "events", EVENT_ID), {
    name: "Soiree YLC 2026",
    status: "upcoming",
    timelinePosition: "accueil",
    createdAt: new Date(),
  });
  console.log("  Event created");

  // 2. Create teams
  const teams = [
    { id: "team-1", name: "Les Explorateurs" },
    { id: "team-2", name: "Les Pionniers" },
    { id: "team-3", name: "Les Aventuriers" },
  ];

  for (const team of teams) {
    await setDoc(doc(db, "events", EVENT_ID, "teams", team.id), {
      name: team.name,
      maxSize: 5,
      captainId: null,
      captainVoteOpen: false,
      assignedPhraseId: null,
      wordsFound: [],
      completed: false,
      completedAt: null,
    });
  }
  console.log(`  ${teams.length} teams created`);

  // 3. Create phrases with words
  const phrases = [
    {
      id: "phrase-1",
      text: "Dieu est amour et sa grace suffit",
      words: ["Dieu", "est", "amour", "et", "sa", "grace", "suffit"],
    },
    {
      id: "phrase-2",
      text: "La foi deplace les montagnes",
      words: ["La", "foi", "deplace", "les", "montagnes"],
    },
  ];

  for (const phrase of phrases) {
    await setDoc(doc(db, "events", EVENT_ID, "phrases", phrase.id), {
      text: phrase.text,
      active: true,
      assignedTo: [],
    });

    for (let i = 0; i < phrase.words.length; i++) {
      const wordId = `${phrase.id}-word-${i}`;
      await setDoc(
        doc(db, "events", EVENT_ID, "phrases", phrase.id, "words", wordId),
        {
          text: phrase.words[i],
          position: i,
          qrCode: `ylc://word/${wordId}`,
        }
      );
    }
  }
  console.log(`  ${phrases.length} phrases created with words`);

  // 4. Assign phrases to teams
  await setDoc(
    doc(db, "events", EVENT_ID, "teams", "team-1"),
    { assignedPhraseId: "phrase-1" },
    { merge: true }
  );
  await setDoc(
    doc(db, "events", EVENT_ID, "teams", "team-2"),
    { assignedPhraseId: "phrase-2" },
    { merge: true }
  );
  console.log("  Phrases assigned to teams");

  // 5. Guide messages
  const guideMessages = [
    { id: "welcome", trigger: "welcome", message: "Bienvenue dans l'aventure ! Rejoins une equipe pour commencer.", priority: 1 },
    { id: "team_joined", trigger: "team_joined", message: "Ton equipe est prete ! Votez pour votre capitaine.", priority: 2 },
    { id: "captain_elected", trigger: "captain_elected", message: "C'est parti ! Explorez le lieu et scannez les QR codes que vous trouverez.", priority: 3 },
    { id: "first_word", trigger: "first_word_found", message: "Bravo ! Vous avez trouve votre premier mot. Continuez a chercher !", priority: 4 },
    { id: "halfway", trigger: "halfway", message: "Vous etes a mi-chemin ! La phrase commence a prendre forme...", priority: 5 },
    { id: "stuck", trigger: "stuck", message: "Indice : regardez pres des endroits ou la lumiere guide vos pas.", priority: 6 },
    { id: "last_word", trigger: "last_word", message: "Plus qu'un mot ! Vous y etes presque !", priority: 7 },
    { id: "completed", trigger: "completed", message: "Felicitations ! Vous avez dechiffre le message. Quelle belle verite !", priority: 8 },
  ];

  for (const msg of guideMessages) {
    await setDoc(doc(db, "guideMessages", msg.id), {
      trigger: msg.trigger,
      message: msg.message,
      priority: msg.priority,
    });
  }
  console.log(`  ${guideMessages.length} guide messages created`);

  console.log("\nSeed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
