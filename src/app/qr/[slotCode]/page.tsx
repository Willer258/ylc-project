"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";
import { HINT_LABELS, HINT_ICONS, type Hint } from "@/lib/game-types";
import { motion } from "framer-motion";

export default function QRScanPage() {
  const params = useParams();
  const router = useRouter();
  const slotCode = (params.slotCode as string).toUpperCase();
  const { uuid, teamId } = useAuthContext();

  const [status, setStatus] = useState<"loading" | "hint" | "already" | "error">("loading");
  const [hint, setHint] = useState<Hint | null>(null);
  const [wordValue, setWordValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function processQR() {
      try {
        // 1. Get QR slot
        const slotSnap = await getDoc(doc(db, "qrSlots", slotCode));
        if (!slotSnap.exists()) {
          // Try by slotCode field
          const { collection: coll, query, where, getDocs } = await import("firebase/firestore");
          const q = query(coll(db, "qrSlots"), where("slotCode", "==", slotCode));
          const results = await getDocs(q);
          if (results.empty) {
            setError("QR code invalide.");
            setStatus("error");
            return;
          }
          const slotDoc = results.docs[0];
          await processSlot(slotDoc.id, slotDoc.data());
          return;
        }
        await processSlot(slotSnap.id, slotSnap.data());
      } catch (err) {
        console.error("QR scan error:", err);
        setError("Erreur lors du scan.");
        setStatus("error");
      }
    }

    async function processSlot(slotId: string, slotData: Record<string, unknown>) {
      // Check if already scanned by this team
      const scannedBy = (slotData.scannedBy as Array<{ teamId: string }>) || [];
      if (teamId && scannedBy.some((s) => s.teamId === teamId)) {
        setStatus("already");
        return;
      }

      // Get the game template to find the hint
      const gameId = slotData.currentGameId as string;
      const phraseIndex = slotData.targetPhrase as number;
      const wordIndex = slotData.targetWord as number;
      const hintType = slotData.hintType as string;

      if (gameId == null || phraseIndex == null || wordIndex == null) {
        setError("Ce QR code n'est pas encore configure.");
        setStatus("error");
        return;
      }

      // Get template
      const templateSnap = await getDoc(doc(db, "gameTemplates", gameId));
      if (!templateSnap.exists()) {
        setError("Jeu introuvable.");
        setStatus("error");
        return;
      }

      const phrases = templateSnap.data().phrases || [];
      const phrase = phrases[phraseIndex];
      if (!phrase) {
        setError("Phrase introuvable.");
        setStatus("error");
        return;
      }

      const word = phrase.words?.[wordIndex];
      if (!word) {
        setError("Mot introuvable.");
        setStatus("error");
        return;
      }

      // Find the hint
      const matchedHint = word.hints?.find((h: Hint) => h.type === hintType) || word.hints?.[0];
      if (!matchedHint) {
        setError("Pas d'indice configure pour ce mot.");
        setStatus("error");
        return;
      }

      // Record scan
      if (teamId) {
        // Mark QR as scanned by this team
        await updateDoc(doc(db, "qrSlots", slotId), {
          scannedBy: arrayUnion({ teamId, userId: uuid, timestamp: new Date().toISOString() }),
        });

        // Update team progress — unlock hint
        const wordKey = `word_${phraseIndex}_${wordIndex}`;
        const progressRef = doc(db, "gameProgress", gameId, "teams", teamId);
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const currentSlot = progressSnap.data()?.slots?.[wordKey] || {};
          const currentHintsUnlocked = currentSlot.hintsUnlocked || [];
          const currentHintsUsed = currentSlot.hintsUsed || 0;

          // Only add if not already unlocked
          if (!currentHintsUnlocked.includes(hintType)) {
            await updateDoc(progressRef, {
              [`slots.${wordKey}`]: {
                ...currentSlot,
                status: currentSlot.status || "active",
                attempts: currentSlot.attempts || 0,
                hintsUnlocked: [...currentHintsUnlocked, hintType],
                hintsUsed: currentHintsUsed + 1,
              },
            });
          }
        } else {
          // Create progress doc if it doesn't exist
          const { setDoc } = await import("firebase/firestore");
          await setDoc(progressRef, {
            score: 0,
            completedWords: 0,
            slots: {
              [wordKey]: {
                status: "active",
                attempts: 0,
                hintsUnlocked: [hintType],
                hintsUsed: 1,
              },
            },
          });
        }
      }

      setHint(matchedHint);
      setWordValue(word.value);
      setStatus("hint");
    }

    processQR();
  }, [slotCode, teamId, uuid]);

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

  // Show hint
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
            Mot de {wordValue.length} lettres
          </p>
        </div>

        {/* Hint display */}
        <HintDisplay hint={hint!} />

        <button
          onClick={() => router.push("/jeu")}
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
