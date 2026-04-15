"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";
import { HINT_LABELS, HINT_ICONS, type Hint } from "@/lib/game-types";
import { motion } from "framer-motion";

const EVENT_ID = "event-default";

interface WordChoice {
  phraseIndex: number;
  wordIndex: number;
  value: string;
  letterCount: number;
  hints: Hint[];
  unlockedHints: string[];
}

export default function QRScanPage() {
  const params = useParams();
  const router = useRouter();
  const slotCode = (params.slotCode as string).toUpperCase();
  const { uuid, teamId } = useAuthContext();

  const [status, setStatus] = useState<"loading" | "choose" | "hint" | "already" | "nohints" | "error">("loading");
  const [words, setWords] = useState<WordChoice[]>([]);
  const [selectedHint, setSelectedHint] = useState<Hint | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordChoice | null>(null);
  const [error, setError] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    async function processQR() {
      try {
        if (!teamId) {
          setError("Rejoignez une equipe d'abord.");
          setStatus("error");
          return;
        }

        // 1. Find the QR slot
        let slotId: string | null = null;
        let slotData: Record<string, unknown> | null = null;

        const slotSnap = await getDoc(doc(db, "qrSlots", slotCode));
        if (slotSnap.exists()) {
          slotId = slotSnap.id;
          slotData = slotSnap.data();
        } else {
          const q = query(collection(db, "qrSlots"), where("slotCode", "==", slotCode));
          const results = await getDocs(q);
          if (!results.empty) {
            slotId = results.docs[0].id;
            slotData = results.docs[0].data();
          }
        }

        if (!slotId || !slotData) {
          setError("QR code invalide.");
          setStatus("error");
          return;
        }

        // 2. Check if already scanned by this team
        const scannedBy = (slotData.scannedBy as Array<{ teamId: string }>) || [];
        if (scannedBy.some((s) => s.teamId === teamId)) {
          setStatus("already");
          return;
        }

        // 3. Get active game
        const eventSnap = await getDoc(doc(db, "events", EVENT_ID));
        const activeGameId = eventSnap.data()?.activeGameId;
        if (!activeGameId) {
          setError("Aucun jeu en cours.");
          setStatus("error");
          return;
        }
        setGameId(activeGameId);

        // 4. Get game instance to find this team's phrase
        const instanceSnap = await getDoc(doc(db, "gameInstances", activeGameId));
        if (!instanceSnap.exists()) {
          setError("Jeu introuvable.");
          setStatus("error");
          return;
        }
        const teamPhrases = instanceSnap.data().teamPhrases || {};
        const myPhraseIndex = teamPhrases[teamId];
        if (myPhraseIndex == null) {
          setError("Votre equipe n'est pas dans ce jeu.");
          setStatus("error");
          return;
        }

        // 5. Get template to find words and hints
        const templateSnap = await getDoc(doc(db, "gameTemplates", activeGameId));
        if (!templateSnap.exists()) {
          setError("Template introuvable.");
          setStatus("error");
          return;
        }
        const phrases = templateSnap.data().phrases || [];
        const phrase = phrases[myPhraseIndex];
        if (!phrase) {
          setError("Phrase introuvable.");
          setStatus("error");
          return;
        }

        // 6. Get team progress to check which hints are already unlocked
        const progressSnap = await getDoc(doc(db, "gameProgress", activeGameId, "teams", teamId));
        const slots = progressSnap.data()?.slots || {};

        // 7. Build word choices — only words that have hints not yet fully unlocked
        const choices: WordChoice[] = [];
        (phrase.words || []).forEach((word: { value: string; hints: Hint[] }, wi: number) => {
          const wordKey = `word_${myPhraseIndex}_${wi}`;
          const slot = slots[wordKey] || {};
          if (slot.status === "completed") return; // Skip completed words

          const unlockedHints: string[] = slot.hintsUnlocked || [];
          const availableHints = (word.hints || []).filter((h: Hint) => !unlockedHints.includes(h.type));
          if (availableHints.length === 0) return; // All hints already unlocked

          choices.push({
            phraseIndex: myPhraseIndex,
            wordIndex: wi,
            value: word.value,
            letterCount: word.value.length,
            hints: availableHints,
            unlockedHints,
          });
        });

        if (choices.length === 0) {
          // Mark QR as scanned anyway
          await updateDoc(doc(db, "qrSlots", slotId), {
            scannedBy: arrayUnion({ teamId, userId: uuid, timestamp: new Date().toISOString() }),
          });
          setStatus("nohints");
          return;
        }

        // Record scan
        await updateDoc(doc(db, "qrSlots", slotId), {
          scannedBy: arrayUnion({ teamId, userId: uuid, timestamp: new Date().toISOString() }),
        });

        setWords(choices);
        setStatus("choose");
      } catch (err) {
        console.error("QR scan error:", err);
        setError("Erreur lors du scan.");
        setStatus("error");
      }
    }

    processQR();
  }, [slotCode, teamId, uuid]);

  async function handleChooseWord(word: WordChoice) {
    if (!gameId || !teamId) return;

    // Pick the first available hint for this word
    const hint = word.hints[0];
    if (!hint) return;

    // Unlock the hint in progress
    const wordKey = `word_${word.phraseIndex}_${word.wordIndex}`;
    const progressRef = doc(db, "gameProgress", gameId, "teams", teamId);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      const currentSlot = progressSnap.data()?.slots?.[wordKey] || {};
      const currentHintsUnlocked = currentSlot.hintsUnlocked || [];
      const currentHintsUsed = currentSlot.hintsUsed || 0;

      if (!currentHintsUnlocked.includes(hint.type)) {
        await updateDoc(progressRef, {
          [`slots.${wordKey}`]: {
            ...currentSlot,
            status: currentSlot.status || "active",
            attempts: currentSlot.attempts || 0,
            hintsUnlocked: [...currentHintsUnlocked, hint.type],
            hintsUsed: currentHintsUsed + 1,
          },
        });
      }
    }

    setSelectedHint(hint);
    setSelectedWord(word);
    setStatus("hint");

    // Auto-redirect after 4 seconds
    setTimeout(() => {
      window.location.href = `/jeu?highlight=${word.phraseIndex}_${word.wordIndex}`;
    }, 4000);
  }

  // === LOADING ===
  if (status === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-on-surface-variant">Traitement du QR code...</p>
        </div>
      </div>
    );
  }

  // === ERROR ===
  if (status === "error") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <span className="material-symbols-outlined text-5xl text-error block">error</span>
          <p className="text-on-surface font-bold text-lg">{error}</p>
          <button
            onClick={() => router.push("/jeu")}
            className="px-6 py-3 rounded-full gradient-cta text-on-primary font-bold"
          >
            Retour au jeu
          </button>
        </div>
      </div>
    );
  }

  // === ALREADY SCANNED ===
  if (status === "already") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 block">check_circle</span>
          <p className="text-on-surface font-bold text-lg">Deja scanne !</p>
          <p className="text-on-surface-variant">Votre equipe a deja utilise ce QR code.</p>
          <button
            onClick={() => router.push("/jeu")}
            className="px-6 py-3 rounded-full gradient-cta text-on-primary font-bold"
          >
            Retour au jeu
          </button>
        </div>
      </div>
    );
  }

  // === NO HINTS LEFT ===
  if (status === "nohints") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <span className="material-symbols-outlined text-5xl text-amber-500/40 block">lightbulb</span>
          <p className="text-on-surface font-bold text-lg">Tous les indices sont deja debloques !</p>
          <p className="text-on-surface-variant">Votre equipe a deja tous les indices disponibles.</p>
          <button
            onClick={() => router.push("/jeu")}
            className="px-6 py-3 rounded-full gradient-cta text-on-primary font-bold"
          >
            Retour au jeu
          </button>
        </div>
      </div>
    );
  }

  // === CHOOSE WORD ===
  if (status === "choose") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6">
        <motion.div
          className="w-full max-w-sm space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <motion.span
              className="material-symbols-outlined text-5xl text-primary block mb-3"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 360 }}
              transition={{ duration: 0.8 }}
            >
              lightbulb
            </motion.span>
            <h1 className="font-headline text-2xl font-extrabold text-primary">
              Indice disponible !
            </h1>
            <p className="text-on-surface-variant text-sm mt-2">
              Choisissez un mot pour debloquer un indice
            </p>
          </div>

          <div className="space-y-3">
            {words.map((word) => (
              <motion.button
                key={`${word.phraseIndex}_${word.wordIndex}`}
                onClick={() => handleChooseWord(word)}
                className="w-full bg-surface-container-lowest rounded-2xl p-5 editorial-shadow text-left hover:ring-2 hover:ring-primary/30 transition-all active:scale-[0.98]"
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex gap-[2px]">
                        {Array.from({ length: word.letterCount }).map((_, i) => (
                          <span
                            key={i}
                            className="w-3 h-4 rounded-sm bg-primary/15"
                          />
                        ))}
                      </span>
                      <span className="text-xs text-on-surface-variant/50">{word.letterCount} lettres</span>
                    </div>
                    <p className="text-xs text-on-surface-variant/40 mt-2">
                      {word.hints.length} indice{word.hints.length > 1 ? "s" : ""} disponible{word.hints.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary">arrow_forward</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // === HINT REVEALED ===
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-6">
      <motion.div
        className="w-full max-w-sm space-y-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="text-center">
          <motion.span
            className="material-symbols-outlined text-5xl text-primary block mb-3"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 0.8 }}
          >
            lightbulb
          </motion.span>
          <h1 className="font-headline text-2xl font-extrabold text-primary">
            Indice debloque !
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Mot de {selectedWord?.letterCount} lettres
          </p>
        </div>

        {selectedHint && <HintDisplay hint={selectedHint} />}

        <button
          onClick={() => router.push(`/jeu?highlight=${selectedWord?.phraseIndex}_${selectedWord?.wordIndex}`)}
          className="w-full py-4 rounded-full gradient-cta text-on-primary font-bold text-lg"
        >
          Retour au jeu
        </button>
      </motion.div>
    </div>
  );
}

function HintDisplay({ hint }: { hint: Hint }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 editorial-shadow">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">
          {HINT_ICONS[hint.type]}
        </span>
        <span className="text-sm font-bold text-on-surface-variant">
          {HINT_LABELS[hint.type]}
        </span>
      </div>

      {hint.type === "4images" && hint.content.images && (
        <div className="grid grid-cols-2 gap-2">
          {hint.content.images.map((url, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-container">
              {url ? (
                <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                  <span className="material-symbols-outlined text-3xl">image</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hint.type === "anagram" && (
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {(hint.content.scrambled || "").split("").map((letter, i) => (
              <motion.span
                key={i}
                className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-mono font-bold text-lg flex items-center justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {hint.type === "phrase" && (
        <div className="text-center">
          <p className="text-on-surface italic text-lg leading-relaxed">
            &ldquo;{hint.content.text}&rdquo;
          </p>
        </div>
      )}

      {hint.type === "emoji" && hint.content.emojis && (
        <div className="flex justify-center gap-3">
          {hint.content.emojis.map((emoji, i) => (
            <motion.span
              key={i}
              className="text-4xl"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.4, type: "spring" }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}
