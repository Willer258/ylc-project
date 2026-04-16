import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
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

/**
 * Build 4 Pollinations.ai image URLs for a given word/prompt.
 * Images generate lazily when the browser requests them (no cost upfront).
 */
function build4Images(prompt) {
  const encoded = encodeURIComponent(prompt);
  return [1, 2, 3, 4].map(
    (seed) =>
      `https://image.pollinations.ai/prompt/${encoded}?seed=${seed * 17 + 3}&width=512&height=512&nologo=true`
  );
}

/**
 * Decide if a word should get an image hint:
 * - Must have at least one existing hint (means it's a "key" word)
 * - Must not already have a 4images hint
 */
function shouldAddImageHint(word) {
  if (!word.hints || word.hints.length === 0) return false;
  if (word.hints.some((h) => h.type === "4images")) return false;
  if (word.letterCount < 3) return false;
  return true;
}

/**
 * Build a better prompt from the word and its existing hints.
 * Uses the phrase hint if available (it's more descriptive).
 */
function buildPrompt(word) {
  const phraseHint = word.hints.find((h) => h.type === "phrase");
  if (phraseHint && phraseHint.content.text) {
    // Use the descriptive phrase + the word for clarity
    return `${phraseHint.content.text}, ${word.value.toLowerCase()}, illustration`;
  }
  return `${word.value.toLowerCase()}, concept illustration`;
}

async function run() {
  const templatesSnap = await getDocs(collection(db, "gameTemplates"));
  console.log(`Found ${templatesSnap.size} template(s)\n`);

  for (const tDoc of templatesSnap.docs) {
    const data = tDoc.data();
    const name = data.name || "Sans nom";
    const phrases = data.phrases || [];

    let wordsUpdated = 0;
    const newPhrases = phrases.map((phrase) => ({
      ...phrase,
      words: phrase.words.map((word) => {
        if (!shouldAddImageHint(word)) return word;

        const prompt = buildPrompt(word);
        const images = build4Images(prompt);
        wordsUpdated++;

        return {
          ...word,
          hints: [
            ...word.hints,
            { type: "4images", content: { images } },
          ],
        };
      }),
    }));

    if (wordsUpdated === 0) {
      console.log(`"${name}": aucun mot eligible (skip)`);
      continue;
    }

    await updateDoc(doc(db, "gameTemplates", tDoc.id), {
      phrases: newPhrases,
    });
    console.log(`"${name}": ${wordsUpdated} mots decores avec indice 4images`);
  }

  console.log("\nTermine.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
