import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

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

function shuffleWord(word) {
  const letters = word.toUpperCase().split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const result = letters.join("");
  if (result === word.toUpperCase() && word.length > 1) return shuffleWord(word);
  return result;
}

function makeWord(value, hints) {
  const clean = value.replace(/[^a-zA-ZÀ-ÿ0-9'-]/g, "");
  return {
    index: 0, // will be set later
    value: clean.toUpperCase(),
    letterCount: clean.length,
    hints,
  };
}

const phrases = [
  {
    text: "Car Dieu a tant aime le monde",
    reference: "Jean 3:16",
    words: [
      makeWord("Car", [
        { type: "anagram", content: { scrambled: shuffleWord("Car") } },
        { type: "emoji", content: { emojis: ["🔗", "➡️", "💬"] } },
      ]),
      makeWord("Dieu", [
        { type: "phrase", content: { text: "Le Createur de toutes choses, le Tout-Puissant" } },
        { type: "emoji", content: { emojis: ["👑", "☁️", "✨", "🙏"] } },
      ]),
      makeWord("a", [
        { type: "anagram", content: { scrambled: "A" } },
      ]),
      makeWord("tant", [
        { type: "anagram", content: { scrambled: shuffleWord("tant") } },
        { type: "phrase", content: { text: "Tellement, enormement, a un tel point" } },
      ]),
      makeWord("aime", [
        { type: "emoji", content: { emojis: ["❤️", "💕", "🥰", "💗"] } },
        { type: "phrase", content: { text: "Sentiment profond d'affection et de tendresse" } },
      ]),
      makeWord("le", [
        { type: "anagram", content: { scrambled: "EL" } },
      ]),
      makeWord("monde", [
        { type: "emoji", content: { emojis: ["🌍", "🌎", "🌏", "👥"] } },
        { type: "phrase", content: { text: "La Terre entiere et tous ses habitants" } },
        { type: "anagram", content: { scrambled: shuffleWord("monde") } },
      ]),
    ],
  },
  {
    text: "Je suis le chemin la verite et la vie",
    reference: "Jean 14:6",
    words: [
      makeWord("Je", [
        { type: "anagram", content: { scrambled: "EJ" } },
      ]),
      makeWord("suis", [
        { type: "anagram", content: { scrambled: shuffleWord("suis") } },
        { type: "phrase", content: { text: "Verbe etre a la premiere personne" } },
      ]),
      makeWord("le", [
        { type: "anagram", content: { scrambled: "EL" } },
      ]),
      makeWord("chemin", [
        { type: "emoji", content: { emojis: ["🛤️", "👣", "🚶", "➡️"] } },
        { type: "phrase", content: { text: "Route, voie, sentier que l'on emprunte pour avancer" } },
        { type: "anagram", content: { scrambled: shuffleWord("chemin") } },
      ]),
      makeWord("la", [
        { type: "anagram", content: { scrambled: "AL" } },
      ]),
      makeWord("verite", [
        { type: "emoji", content: { emojis: ["✅", "💡", "⚖️", "🔍"] } },
        { type: "phrase", content: { text: "Ce qui est conforme a la realite, l'oppose du mensonge" } },
      ]),
      makeWord("et", [
        { type: "anagram", content: { scrambled: "TE" } },
      ]),
      makeWord("la", [
        { type: "anagram", content: { scrambled: "AL" } },
      ]),
      makeWord("vie", [
        { type: "emoji", content: { emojis: ["🌱", "💚", "🫀", "🌅"] } },
        { type: "phrase", content: { text: "L'existence, le souffle, ce qui anime un etre" } },
        { type: "anagram", content: { scrambled: shuffleWord("vie") } },
      ]),
    ],
  },
  {
    text: "L Eternel est mon berger je ne manquerai de rien",
    reference: "Psaume 23:1",
    words: [
      makeWord("L", []),
      makeWord("Eternel", [
        { type: "phrase", content: { text: "Nom donne a Dieu, celui qui n'a ni debut ni fin" } },
        { type: "emoji", content: { emojis: ["♾️", "👑", "🌟", "⏳"] } },
        { type: "anagram", content: { scrambled: shuffleWord("Eternel") } },
      ]),
      makeWord("est", [
        { type: "anagram", content: { scrambled: "SET" } },
      ]),
      makeWord("mon", [
        { type: "anagram", content: { scrambled: "NOM" } },
      ]),
      makeWord("berger", [
        { type: "emoji", content: { emojis: ["🐑", "🧑‍🌾", "🪝", "🌿"] } },
        { type: "phrase", content: { text: "Celui qui garde et guide les brebis dans les paturages" } },
        { type: "anagram", content: { scrambled: shuffleWord("berger") } },
      ]),
      makeWord("je", [
        { type: "anagram", content: { scrambled: "EJ" } },
      ]),
      makeWord("ne", [
        { type: "anagram", content: { scrambled: "EN" } },
      ]),
      makeWord("manquerai", [
        { type: "phrase", content: { text: "Ne pas avoir besoin, ne pas etre prive de quoi que ce soit" } },
        { type: "anagram", content: { scrambled: shuffleWord("manquerai") } },
      ]),
      makeWord("de", [
        { type: "anagram", content: { scrambled: "ED" } },
      ]),
      makeWord("rien", [
        { type: "emoji", content: { emojis: ["0️⃣", "🚫", "🤷", "💨"] } },
        { type: "anagram", content: { scrambled: shuffleWord("rien") } },
      ]),
    ],
  },
  {
    text: "La foi deplace les montagnes",
    reference: "Matthieu 17:20",
    words: [
      makeWord("La", [
        { type: "anagram", content: { scrambled: "AL" } },
      ]),
      makeWord("foi", [
        { type: "emoji", content: { emojis: ["🙏", "✝️", "💪", "💫"] } },
        { type: "phrase", content: { text: "Croyance profonde, confiance absolue en Dieu" } },
        { type: "anagram", content: { scrambled: shuffleWord("foi") } },
      ]),
      makeWord("deplace", [
        { type: "phrase", content: { text: "Bouger, faire changer de position, mouvoir" } },
        { type: "anagram", content: { scrambled: shuffleWord("deplace") } },
        { type: "emoji", content: { emojis: ["👉", "📦", "🔄", "💨"] } },
      ]),
      makeWord("les", [
        { type: "anagram", content: { scrambled: "SEL" } },
      ]),
      makeWord("montagnes", [
        { type: "emoji", content: { emojis: ["🏔️", "⛰️", "🗻", "🌄"] } },
        { type: "phrase", content: { text: "Grands reliefs de la Terre, sommets eleves" } },
        { type: "anagram", content: { scrambled: shuffleWord("montagnes") } },
      ]),
    ],
  },
  {
    text: "Aime ton prochain comme toi meme",
    reference: "Marc 12:31",
    words: [
      makeWord("Aime", [
        { type: "emoji", content: { emojis: ["❤️", "🤗", "💞", "😊"] } },
        { type: "anagram", content: { scrambled: shuffleWord("Aime") } },
      ]),
      makeWord("ton", [
        { type: "anagram", content: { scrambled: "NOT" } },
      ]),
      makeWord("prochain", [
        { type: "phrase", content: { text: "Celui qui est pres de toi, ton semblable, ton voisin" } },
        { type: "emoji", content: { emojis: ["🧑‍🤝‍🧑", "👫", "🤝", "👋"] } },
        { type: "anagram", content: { scrambled: shuffleWord("prochain") } },
      ]),
      makeWord("comme", [
        { type: "anagram", content: { scrambled: shuffleWord("comme") } },
        { type: "phrase", content: { text: "De la meme maniere, pareillement, a l'egal de" } },
      ]),
      makeWord("toi", [
        { type: "anagram", content: { scrambled: "OIT" } },
      ]),
      makeWord("meme", [
        { type: "anagram", content: { scrambled: shuffleWord("meme") } },
        { type: "emoji", content: { emojis: ["🪞", "👤", "🫵", "="] } },
      ]),
    ],
  },
  {
    text: "Je suis la lumiere du monde",
    reference: "Jean 8:12",
    words: [
      makeWord("Je", [
        { type: "anagram", content: { scrambled: "EJ" } },
      ]),
      makeWord("suis", [
        { type: "anagram", content: { scrambled: shuffleWord("suis") } },
      ]),
      makeWord("la", [
        { type: "anagram", content: { scrambled: "AL" } },
      ]),
      makeWord("lumiere", [
        { type: "emoji", content: { emojis: ["💡", "☀️", "🔦", "✨"] } },
        { type: "phrase", content: { text: "Ce qui eclaire, brille et chasse les tenebres" } },
        { type: "anagram", content: { scrambled: shuffleWord("lumiere") } },
      ]),
      makeWord("du", [
        { type: "anagram", content: { scrambled: "UD" } },
      ]),
      makeWord("monde", [
        { type: "emoji", content: { emojis: ["🌍", "🌎", "👥", "🏙️"] } },
        { type: "anagram", content: { scrambled: shuffleWord("monde") } },
      ]),
    ],
  },
  {
    text: "Tout est possible a celui qui croit",
    reference: "Marc 9:23",
    words: [
      makeWord("Tout", [
        { type: "anagram", content: { scrambled: shuffleWord("Tout") } },
        { type: "emoji", content: { emojis: ["💯", "🌐", "♾️"] } },
      ]),
      makeWord("est", [
        { type: "anagram", content: { scrambled: "SET" } },
      ]),
      makeWord("possible", [
        { type: "phrase", content: { text: "Realisable, faisable, qui peut se produire" } },
        { type: "emoji", content: { emojis: ["✅", "💪", "🚀", "🌈"] } },
        { type: "anagram", content: { scrambled: shuffleWord("possible") } },
      ]),
      makeWord("a", []),
      makeWord("celui", [
        { type: "anagram", content: { scrambled: shuffleWord("celui") } },
      ]),
      makeWord("qui", [
        { type: "anagram", content: { scrambled: "IQU" } },
      ]),
      makeWord("croit", [
        { type: "emoji", content: { emojis: ["🙏", "💫", "✝️", "❤️‍🔥"] } },
        { type: "phrase", content: { text: "Avoir la foi, faire confiance, etre convaincu" } },
        { type: "anagram", content: { scrambled: shuffleWord("croit") } },
      ]),
    ],
  },
  {
    text: "Demandez et vous recevrez",
    reference: "Matthieu 7:7",
    words: [
      makeWord("Demandez", [
        { type: "phrase", content: { text: "Formuler une requete, solliciter, prier pour obtenir" } },
        { type: "emoji", content: { emojis: ["🙋", "🗣️", "🙏", "❓"] } },
        { type: "anagram", content: { scrambled: shuffleWord("Demandez") } },
      ]),
      makeWord("et", [
        { type: "anagram", content: { scrambled: "TE" } },
      ]),
      makeWord("vous", [
        { type: "anagram", content: { scrambled: shuffleWord("vous") } },
      ]),
      makeWord("recevrez", [
        { type: "phrase", content: { text: "Obtenir, accepter ce qui est donne ou offert" } },
        { type: "emoji", content: { emojis: ["🎁", "📬", "🤲", "✅"] } },
        { type: "anagram", content: { scrambled: shuffleWord("recevrez") } },
      ]),
    ],
  },
  {
    text: "Heureux les artisans de paix",
    reference: "Matthieu 5:9",
    words: [
      makeWord("Heureux", [
        { type: "emoji", content: { emojis: ["😊", "🌟", "🎉", "💛"] } },
        { type: "phrase", content: { text: "Qui eprouve du bonheur, de la joie, beni" } },
        { type: "anagram", content: { scrambled: shuffleWord("Heureux") } },
      ]),
      makeWord("les", [
        { type: "anagram", content: { scrambled: "SEL" } },
      ]),
      makeWord("artisans", [
        { type: "phrase", content: { text: "Ceux qui fabriquent, creent, construisent avec leurs mains" } },
        { type: "emoji", content: { emojis: ["🛠️", "👷", "🤲", "🎨"] } },
        { type: "anagram", content: { scrambled: shuffleWord("artisans") } },
      ]),
      makeWord("de", [
        { type: "anagram", content: { scrambled: "ED" } },
      ]),
      makeWord("paix", [
        { type: "emoji", content: { emojis: ["☮️", "🕊️", "🤝", "🌿"] } },
        { type: "phrase", content: { text: "Absence de conflit, harmonie, tranquillite" } },
        { type: "anagram", content: { scrambled: shuffleWord("paix") } },
      ]),
    ],
  },
  {
    text: "Ne crains pas car je suis avec toi",
    reference: "Esaie 41:10",
    words: [
      makeWord("Ne", [
        { type: "anagram", content: { scrambled: "EN" } },
      ]),
      makeWord("crains", [
        { type: "emoji", content: { emojis: ["😰", "😱", "🫣", "⚡"] } },
        { type: "phrase", content: { text: "Avoir peur, redouter, apprehender un danger" } },
        { type: "anagram", content: { scrambled: shuffleWord("crains") } },
      ]),
      makeWord("pas", [
        { type: "anagram", content: { scrambled: "SAP" } },
      ]),
      makeWord("car", [
        { type: "anagram", content: { scrambled: "RAC" } },
      ]),
      makeWord("je", [
        { type: "anagram", content: { scrambled: "EJ" } },
      ]),
      makeWord("suis", [
        { type: "anagram", content: { scrambled: shuffleWord("suis") } },
      ]),
      makeWord("avec", [
        { type: "phrase", content: { text: "En compagnie de, ensemble, a cote de" } },
        { type: "emoji", content: { emojis: ["🤝", "👫", "➕", "🫂"] } },
        { type: "anagram", content: { scrambled: shuffleWord("avec") } },
      ]),
      makeWord("toi", [
        { type: "emoji", content: { emojis: ["🫵", "👤", "🪞"] } },
        { type: "anagram", content: { scrambled: "OIT" } },
      ]),
    ],
  },
];

// Fix word indices
const finalPhrases = phrases.map((p, pi) => ({
  text: p.text,
  reference: p.reference,
  orderIndex: pi,
  words: p.words.map((w, wi) => ({ ...w, index: wi })),
}));

async function run() {
  const templateRef = doc(db, "gameTemplates", "game-test-1");
  const snap = await getDoc(templateRef);
  if (!snap.exists()) {
    console.error("Template not found!");
    process.exit(1);
  }

  await updateDoc(templateRef, { phrases: finalPhrases });
  console.log(`Updated template with ${finalPhrases.length} phrases`);
  finalPhrases.forEach((p, i) => {
    const hintCount = p.words.reduce((s, w) => s + w.hints.length, 0);
    console.log(`  ${i + 1}. "${p.text}" (${p.reference}) — ${p.words.length} mots, ${hintCount} indices`);
  });
  process.exit(0);
}

run();
