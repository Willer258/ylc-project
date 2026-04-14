/**
 * Setup a complete game test locally
 * Run: npx tsx scripts/setup-game-test.ts
 *
 * Creates:
 * 1. A game template with 2 phrases + hints
 * 2. 3 teams
 * 3. QR slots mapped to hints
 * 4. A game instance ready to play
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, addDoc, collection, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { config } from "dotenv";

config({ path: ".env.local" });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

const EVENT_ID = "event-default";
const TEMPLATE_ID = "game-test-1";

async function clearCollection(path: string) {
  const snap = await getDocs(collection(db, path));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, path, d.id));
  }
}

async function setup() {
  console.log("=== Setup Game Test ===\n");

  // 1. Clean up previous test data
  console.log("1. Nettoyage...");
  try {
    await deleteDoc(doc(db, "gameTemplates", TEMPLATE_ID));
    await deleteDoc(doc(db, "gameInstances", TEMPLATE_ID));
    await clearCollection(`gameProgress/${TEMPLATE_ID}/teams`);
    await clearCollection("qrSlots");
  } catch (e) {
    // Ignore if not exists
  }

  // 2. Create event if not exists
  console.log("2. Evenement...");
  await setDoc(doc(db, "events", EVENT_ID), {
    name: "Soiree YLC Test",
    status: "active",
    timelinePosition: "accueil",
    activeGameId: null,
    createdAt: serverTimestamp(),
  }, { merge: true });

  // 3. Create teams
  console.log("3. Equipes...");
  const teams = [
    { id: "team-alpha", name: "Les Lions" },
    { id: "team-beta", name: "Les Aigles" },
    { id: "team-gamma", name: "Les Flammes" },
  ];

  for (const team of teams) {
    await setDoc(doc(db, "events", EVENT_ID, "teams", team.id), {
      name: team.name,
      maxSize: 5,
      captainId: null,
      captainVoteOpen: false,
      createdAt: serverTimestamp(),
    });
  }
  console.log(`   ${teams.length} equipes creees`);

  // 4. Create game template with phrases + words + hints
  console.log("4. Template de jeu...");

  const template = {
    name: "Chasse Biblique — Test",
    description: "Template de test avec 2 versets et indices complets",
    isPublished: true,
    createdAt: serverTimestamp(),
    phrases: [
      {
        text: "Dieu est amour",
        reference: "1 Jean 4:8",
        orderIndex: 0,
        words: [
          {
            index: 0,
            value: "Dieu",
            letterCount: 4,
            hints: [
              { type: "anagram", content: { scrambled: "EIUD" } },
              { type: "emoji", content: { emojis: ["👑", "🌍", "✨", "🙏"] } },
            ],
          },
          {
            index: 1,
            value: "est",
            letterCount: 3,
            hints: [
              { type: "phrase", content: { text: "Verbe etre, 3e personne du singulier" } },
            ],
          },
          {
            index: 2,
            value: "amour",
            letterCount: 5,
            hints: [
              { type: "anagram", content: { scrambled: "RUOAM" } },
              { type: "emoji", content: { emojis: ["❤️", "💕", "🤗", "💒"] } },
              { type: "phrase", content: { text: "Le plus grand des sentiments, celui que Dieu donne sans condition" } },
            ],
          },
        ],
      },
      {
        text: "La foi deplace les montagnes",
        reference: "Matthieu 17:20",
        orderIndex: 1,
        words: [
          {
            index: 0,
            value: "La",
            letterCount: 2,
            hints: [
              { type: "phrase", content: { text: "Article defini feminin singulier" } },
            ],
          },
          {
            index: 1,
            value: "foi",
            letterCount: 3,
            hints: [
              { type: "anagram", content: { scrambled: "OIF" } },
              { type: "emoji", content: { emojis: ["🙏", "✝️", "💪", "👁️"] } },
            ],
          },
          {
            index: 2,
            value: "deplace",
            letterCount: 7,
            hints: [
              { type: "anagram", content: { scrambled: "EPCDEAL" } },
              { type: "phrase", content: { text: "Bouger quelque chose d'un endroit a un autre" } },
            ],
          },
          {
            index: 3,
            value: "les",
            letterCount: 3,
            hints: [
              { type: "phrase", content: { text: "Article defini pluriel" } },
            ],
          },
          {
            index: 4,
            value: "montagnes",
            letterCount: 9,
            hints: [
              { type: "anagram", content: { scrambled: "GOMATNENS" } },
              { type: "emoji", content: { emojis: ["⛰️", "🏔️", "🗻", "☁️"] } },
              { type: "phrase", content: { text: "Des sommets gigantesques qui touchent le ciel" } },
            ],
          },
        ],
      },
    ],
  };

  await setDoc(doc(db, "gameTemplates", TEMPLATE_ID), template);
  console.log(`   Template "${template.name}" cree avec ${template.phrases.length} phrases`);

  // 5. Create QR slots mapped to hints
  console.log("5. QR Codes...");
  const qrSlots = [
    { code: "QR-001", label: "Entree gauche", phraseIdx: 0, wordIdx: 0, hintType: "anagram" },
    { code: "QR-002", label: "Table 1", phraseIdx: 0, wordIdx: 0, hintType: "emoji" },
    { code: "QR-003", label: "Pilier central", phraseIdx: 0, wordIdx: 2, hintType: "anagram" },
    { code: "QR-004", label: "Scene", phraseIdx: 0, wordIdx: 2, hintType: "emoji" },
    { code: "QR-005", label: "Buffet", phraseIdx: 0, wordIdx: 2, hintType: "phrase" },
    { code: "QR-006", label: "Escalier", phraseIdx: 1, wordIdx: 1, hintType: "anagram" },
    { code: "QR-007", label: "Terrasse", phraseIdx: 1, wordIdx: 1, hintType: "emoji" },
    { code: "QR-008", label: "Couloir", phraseIdx: 1, wordIdx: 2, hintType: "anagram" },
    { code: "QR-009", label: "Jardin", phraseIdx: 1, wordIdx: 4, hintType: "anagram" },
    { code: "QR-010", label: "Fontaine", phraseIdx: 1, wordIdx: 4, hintType: "emoji" },
  ];

  for (const slot of qrSlots) {
    await setDoc(doc(db, "qrSlots", slot.code), {
      slotCode: slot.code,
      label: slot.label,
      currentGameId: TEMPLATE_ID,
      targetPhrase: slot.phraseIdx,
      targetWord: slot.wordIdx,
      hintType: slot.hintType,
      scannedBy: [],
      createdAt: serverTimestamp(),
    });
  }
  console.log(`   ${qrSlots.length} QR codes crees et mappes`);

  // 6. Create game instance (ready to start)
  console.log("6. Session de jeu...");
  const leaderboard = teams.map((t, i) => ({
    teamId: t.id,
    teamName: t.name,
    score: 0,
    completedWords: 0,
    rank: i + 1,
  }));

  await setDoc(doc(db, "gameInstances", TEMPLATE_ID), {
    templateId: TEMPLATE_ID,
    eventId: EVENT_ID,
    status: "active",
    startedAt: serverTimestamp(),
    leaderboard,
    config: {
      pointsBase: 100,
      speedBonus: [30, 20, 10],
      maxPenalty: 25,
      penaltyPerAttempt: 5,
    },
  });

  // Initialize progress for each team
  for (const team of teams) {
    await setDoc(doc(db, "gameProgress", TEMPLATE_ID, "teams", team.id), {
      score: 0,
      completedWords: 0,
      slots: {},
      lastActivityAt: serverTimestamp(),
    });
  }

  // 7. Activate game on event
  await setDoc(doc(db, "events", EVENT_ID), {
    activeGameId: TEMPLATE_ID,
  }, { merge: true });

  console.log("   Session active !");

  // === Summary ===
  console.log("\n=== PRET A TESTER ===\n");
  console.log("Phrases a deviner :");
  console.log('  1. "Dieu est amour" (1 Jean 4:8)');
  console.log('  2. "La foi deplace les montagnes" (Matthieu 17:20)');
  console.log("\nMots et reponses :");
  console.log("  Phrase 1 : Dieu | est | amour");
  console.log("  Phrase 2 : La | foi | deplace | les | montagnes");
  console.log("\nEquipes :");
  teams.forEach((t) => {
    console.log(`  ${t.name} → http://localhost:3001/join/${t.id}`);
  });
  console.log("\nQR codes (scan ou URL directe) :");
  qrSlots.forEach((s) => {
    console.log(`  ${s.code} (${s.label}) → http://localhost:3001/qr/${s.code}`);
  });
  console.log("\nAdmin : http://localhost:3001/admin/game/live");
  console.log("\n=== Bon test ! ===\n");

  process.exit(0);
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
