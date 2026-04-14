/**
 * Setup a complete game test locally
 * Run: npx tsx scripts/setup-game-test.ts
 *
 * Creates:
 * - A game template with 3 phrases (1 per team)
 * - 3 teams, each assigned their own phrase
 * - QR slots mapped to hints
 * - A game instance ready to play
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
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
  try {
    const snap = await getDocs(collection(db, path));
    for (const d of snap.docs) await deleteDoc(doc(db, path, d.id));
  } catch {}
}

async function setup() {
  console.log("=== Setup Game Test ===\n");

  // 1. Clean up
  console.log("1. Nettoyage...");
  try {
    await deleteDoc(doc(db, "gameTemplates", TEMPLATE_ID));
    await deleteDoc(doc(db, "gameInstances", TEMPLATE_ID));
    await clearCollection(`gameProgress/${TEMPLATE_ID}/teams`);
    await clearCollection("qrSlots");
  } catch {}

  // 2. Event
  console.log("2. Evenement...");
  await setDoc(doc(db, "events", EVENT_ID), {
    name: "Soiree YLC Test",
    status: "active",
    timelinePosition: "accueil",
    activeGameId: null,
    createdAt: serverTimestamp(),
  }, { merge: true });

  // 3. Teams
  console.log("3. Equipes...");
  const teams = [
    { id: "team-alpha", name: "Les Lions", phraseIndex: 0 },
    { id: "team-beta", name: "Les Aigles", phraseIndex: 1 },
    { id: "team-gamma", name: "Les Flammes", phraseIndex: 2 },
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

  // 4. Template — 3 phrases (1 per team)
  console.log("4. Template de jeu...");

  const phrases = [
    {
      text: "Dieu est amour",
      reference: "1 Jean 4:8",
      orderIndex: 0,
      assignedTeam: "team-alpha",
      words: [
        {
          index: 0, value: "Dieu", letterCount: 4,
          hints: [
            { type: "anagram", content: { scrambled: "EIUD" } },
            { type: "emoji", content: { emojis: ["👑", "🌍", "✨", "🙏"] } },
          ],
        },
        {
          index: 1, value: "est", letterCount: 3,
          hints: [
            { type: "phrase", content: { text: "Verbe etre, 3e personne du singulier" } },
          ],
        },
        {
          index: 2, value: "amour", letterCount: 5,
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
      assignedTeam: "team-beta",
      words: [
        {
          index: 0, value: "La", letterCount: 2,
          hints: [
            { type: "phrase", content: { text: "Article defini feminin singulier" } },
          ],
        },
        {
          index: 1, value: "foi", letterCount: 3,
          hints: [
            { type: "anagram", content: { scrambled: "OIF" } },
            { type: "emoji", content: { emojis: ["🙏", "✝️", "💪", "👁️"] } },
          ],
        },
        {
          index: 2, value: "deplace", letterCount: 7,
          hints: [
            { type: "anagram", content: { scrambled: "EPCDEAL" } },
            { type: "phrase", content: { text: "Bouger quelque chose d'un endroit a un autre" } },
          ],
        },
        {
          index: 3, value: "les", letterCount: 3,
          hints: [
            { type: "phrase", content: { text: "Article defini pluriel" } },
          ],
        },
        {
          index: 4, value: "montagnes", letterCount: 9,
          hints: [
            { type: "anagram", content: { scrambled: "GOMATNENS" } },
            { type: "emoji", content: { emojis: ["⛰️", "🏔️", "🗻", "☁️"] } },
          ],
        },
      ],
    },
    {
      text: "Je suis la lumiere du monde",
      reference: "Jean 8:12",
      orderIndex: 2,
      assignedTeam: "team-gamma",
      words: [
        {
          index: 0, value: "Je", letterCount: 2,
          hints: [
            { type: "phrase", content: { text: "Pronom personnel, premiere personne" } },
          ],
        },
        {
          index: 1, value: "suis", letterCount: 4,
          hints: [
            { type: "anagram", content: { scrambled: "ISSU" } },
          ],
        },
        {
          index: 2, value: "la", letterCount: 2,
          hints: [
            { type: "phrase", content: { text: "Article defini feminin" } },
          ],
        },
        {
          index: 3, value: "lumiere", letterCount: 7,
          hints: [
            { type: "anagram", content: { scrambled: "IMELURE" } },
            { type: "emoji", content: { emojis: ["💡", "☀️", "🌟", "🔦"] } },
            { type: "phrase", content: { text: "Elle brille dans l'obscurite et guide les pas" } },
          ],
        },
        {
          index: 4, value: "du", letterCount: 2,
          hints: [
            { type: "phrase", content: { text: "Contraction de 'de le'" } },
          ],
        },
        {
          index: 5, value: "monde", letterCount: 5,
          hints: [
            { type: "anagram", content: { scrambled: "NOMED" } },
            { type: "emoji", content: { emojis: ["🌍", "🌎", "🌏", "🗺️"] } },
          ],
        },
      ],
    },
  ];

  await setDoc(doc(db, "gameTemplates", TEMPLATE_ID), {
    name: "Chasse Biblique — Test",
    description: "3 versets, 1 par equipe, avec indices",
    isPublished: true,
    createdAt: serverTimestamp(),
    phrases,
  });
  console.log(`   Template cree avec ${phrases.length} phrases`);

  // 5. QR Slots
  console.log("5. QR Codes...");
  const qrSlots = [
    // Team Alpha — "Dieu est amour"
    { code: "QR-001", label: "Entree gauche", phraseIdx: 0, wordIdx: 0, hintType: "anagram" },
    { code: "QR-002", label: "Table 1", phraseIdx: 0, wordIdx: 0, hintType: "emoji" },
    { code: "QR-003", label: "Pilier central", phraseIdx: 0, wordIdx: 2, hintType: "anagram" },
    { code: "QR-004", label: "Scene", phraseIdx: 0, wordIdx: 2, hintType: "emoji" },
    // Team Beta — "La foi deplace les montagnes"
    { code: "QR-005", label: "Buffet", phraseIdx: 1, wordIdx: 1, hintType: "anagram" },
    { code: "QR-006", label: "Escalier", phraseIdx: 1, wordIdx: 1, hintType: "emoji" },
    { code: "QR-007", label: "Terrasse", phraseIdx: 1, wordIdx: 4, hintType: "anagram" },
    { code: "QR-008", label: "Couloir", phraseIdx: 1, wordIdx: 4, hintType: "emoji" },
    // Team Gamma — "Je suis la lumiere du monde"
    { code: "QR-009", label: "Jardin", phraseIdx: 2, wordIdx: 3, hintType: "anagram" },
    { code: "QR-010", label: "Fontaine", phraseIdx: 2, wordIdx: 3, hintType: "emoji" },
    { code: "QR-011", label: "Parking", phraseIdx: 2, wordIdx: 5, hintType: "anagram" },
    { code: "QR-012", label: "Vestiaire", phraseIdx: 2, wordIdx: 5, hintType: "emoji" },
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
  console.log(`   ${qrSlots.length} QR codes crees`);

  // 6. Game instance
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
    // Team → phrase assignment
    teamPhrases: {
      "team-alpha": 0,
      "team-beta": 1,
      "team-gamma": 2,
    },
    config: {
      pointsBase: 100,
      noHintBonus: 50,
      completionBonus: 300,
      firstCompletionBonus: 500,
    },
  });

  // Initialize progress
  for (const team of teams) {
    await setDoc(doc(db, "gameProgress", TEMPLATE_ID, "teams", team.id), {
      score: 0,
      completedWords: 0,
      phraseIndex: team.phraseIndex,
      slots: {},
      lastActivityAt: serverTimestamp(),
    });
  }

  // Activate
  await setDoc(doc(db, "events", EVENT_ID), { activeGameId: TEMPLATE_ID }, { merge: true });

  console.log("   Session active !\n");

  // Summary
  console.log("=== PRET A TESTER ===\n");
  console.log("ASSIGNMENT :");
  teams.forEach((t) => {
    const p = phrases[t.phraseIndex];
    console.log(`  ${t.name} → "${p.text}" (${p.reference})`);
    console.log(`    Mots : ${p.words.map((w) => w.value).join(" | ")}`);
    console.log(`    Lien : http://localhost:3001/join/${t.id}`);
  });
  console.log("\nQR codes :");
  qrSlots.forEach((s) => {
    const p = phrases[s.phraseIdx];
    const w = p.words[s.wordIdx];
    console.log(`  ${s.code} → "${w.value}" (${s.hintType}) — http://localhost:3001/qr/${s.code}`);
  });
  console.log("\nAdmin : http://localhost:3001/admin/game/live\n");

  process.exit(0);
}

setup().catch((err) => { console.error("Failed:", err); process.exit(1); });
