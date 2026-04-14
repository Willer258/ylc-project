"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";
import { QrScanner } from "@/components/qr-scanner";
import { HINT_LABELS, HINT_ICONS, type Hint } from "@/lib/game-types";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ID = "event-default";

interface WordState {
  value: string;
  letterCount: number;
  index: number;
  phraseIndex: number;
  status: "locked" | "active" | "completed";
  attempts: number;
  hintsUnlocked: string[];
  hints: Hint[];
  pointsEarned?: number;
}

interface GameState {
  gameId: string | null;
  status: "waiting" | "active" | "paused" | "ended" | "nogame";
  phrases: Array<{ text: string; reference: string; words: WordState[] }>;
  score: number;
  completedWords: number;
  leaderboard: Array<{ teamId: string; teamName: string; score: number; rank: number }>;
}

export default function JeuPage() {
  const { uuid, teamId } = useAuthContext();
  const [game, setGame] = useState<GameState>({
    gameId: null,
    status: "nogame",
    phrases: [],
    score: 0,
    completedWords: 0,
    leaderboard: [],
  });
  const [activeWord, setActiveWord] = useState<WordState | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showHint, setShowHint] = useState<Hint | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load active game from event
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        const activeGameId = snap.data().activeGameId;
        if (activeGameId) {
          setGame((prev) => ({ ...prev, gameId: activeGameId }));
        } else {
          setGame((prev) => ({ ...prev, status: "nogame" }));
        }
      }
    });
    return unsub;
  }, []);

  // Load game instance (leaderboard + status)
  useEffect(() => {
    if (!game.gameId) return;
    const unsub = onSnapshot(doc(db, "gameInstances", game.gameId), (snap) => {
      if (snap.exists()) {
        setGame((prev) => ({
          ...prev,
          status: snap.data().status || "waiting",
          leaderboard: snap.data().leaderboard || [],
        }));
      }
    });
    return unsub;
  }, [game.gameId]);

  // Load template phrases
  useEffect(() => {
    if (!game.gameId) return;
    const unsub = onSnapshot(doc(db, "gameTemplates", game.gameId), (snap) => {
      if (snap.exists()) {
        const phrases = (snap.data().phrases || []).map((p: Record<string, unknown>, pi: number) => ({
          text: p.text as string,
          reference: p.reference as string,
          words: ((p.words as Array<Record<string, unknown>>) || []).map((w, wi: number) => ({
            value: "", // Hidden from client
            letterCount: w.letterCount as number,
            index: wi,
            phraseIndex: pi,
            status: "active" as const,
            attempts: 0,
            hintsUnlocked: [],
            hints: (w.hints as Hint[]) || [],
          })),
        }));
        setGame((prev) => ({ ...prev, phrases }));
      }
    });
    return unsub;
  }, [game.gameId]);

  // Load team progress
  useEffect(() => {
    if (!game.gameId || !teamId) return;
    const unsub = onSnapshot(
      doc(db, "gameProgress", game.gameId, "teams", teamId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setGame((prev) => {
            const phrases = prev.phrases.map((phrase, pi) => ({
              ...phrase,
              words: phrase.words.map((word, wi) => {
                const wordKey = `word_${pi}_${wi}`;
                const slot = data.slots?.[wordKey];
                if (slot) {
                  return {
                    ...word,
                    status: slot.status || "active",
                    attempts: slot.attempts || 0,
                    hintsUnlocked: slot.hintsUnlocked || [],
                    pointsEarned: slot.pointsEarned,
                    value: slot.status === "completed" ? (slot.completedWord || word.value) : "",
                  };
                }
                return word;
              }),
            }));
            return {
              ...prev,
              phrases,
              score: data.score || 0,
              completedWords: data.completedWords || 0,
            };
          });
        }
      }
    );
    return unsub;
  }, [game.gameId, teamId]);

  const handleGuess = useCallback(async () => {
    if (!activeWord || !guess.trim() || submitting || !game.gameId || !teamId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/game/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.gameId,
          teamId,
          phraseIndex: activeWord.phraseIndex,
          wordIndex: activeWord.index,
          guess: guess.trim(),
          userId: uuid,
        }),
      });

      const data = await res.json();
      if (data.correct) {
        setFeedback("correct");
        setTimeout(() => {
          setActiveWord(null);
          setGuess("");
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback("wrong");
        setGuess("");
        setTimeout(() => setFeedback(null), 800);
      }
    } catch (err) {
      console.error("Guess error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [activeWord, guess, submitting, game.gameId, teamId, uuid]);

  const handleScan = useCallback((data: string) => {
    setScanning(false);
    // Extract slot code from URL
    const match = data.match(/\/qr\/(.+)$/);
    if (match) {
      window.location.href = `/qr/${match[1]}`;
    } else {
      window.location.href = `/qr/${data}`;
    }
  }, []);

  const totalWords = game.phrases.reduce((sum, p) => sum + p.words.length, 0);

  // No game active
  if (game.status === "nogame") {
    return (
      <div className="px-6 pt-6 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 block mb-4">
            sports_esports
          </span>
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">
            Le jeu n&apos;a pas encore commence
          </h1>
          <p className="text-on-surface-variant">
            L&apos;administrateur va bientot lancer la partie. Restez connectes !
          </p>
        </div>
      </div>
    );
  }

  // Game paused
  if (game.status === "paused") {
    return (
      <div className="px-6 pt-6 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <motion.span
            className="material-symbols-outlined text-6xl text-primary/40 block mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            pause_circle
          </motion.span>
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">
            Jeu en pause
          </h1>
          <p className="text-on-surface-variant">
            L&apos;administrateur a mis le jeu en pause. Patientez...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 max-w-2xl mx-auto">
      {/* Header with score + leaderboard toggle */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-extrabold text-primary">
              Chasse au Tresor
            </h1>
            <p className="text-sm text-on-surface-variant">
              {game.completedWords}/{totalWords} mots trouves
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-primary/60">Score</p>
              <p className="font-headline font-bold text-primary text-lg">{game.score}</p>
            </div>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">
                leaderboard
              </span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-cta rounded-full"
            animate={{ width: totalWords > 0 ? `${(game.completedWords / totalWords) * 100}%` : "0%" }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Leaderboard dropdown */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            className="mx-6 mb-4 bg-surface-container-lowest rounded-2xl p-4 editorial-shadow"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
              Classement
            </p>
            {game.leaderboard.map((entry, i) => (
              <div
                key={entry.teamId}
                className={`flex items-center justify-between py-2 ${
                  entry.teamId === teamId ? "text-primary font-bold" : "text-on-surface-variant"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm w-6">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                  <span className="text-sm">{entry.teamName || entry.teamId}</span>
                </div>
                <span className="text-sm font-mono">{entry.score} pts</span>
              </div>
            ))}
            {game.leaderboard.length === 0 && (
              <p className="text-xs text-on-surface-variant/50 text-center">Aucun score encore.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phrases + Words */}
      <div className="px-6 space-y-6">
        {game.phrases.map((phrase, pi) => (
          <div key={pi} className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow">
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">
              {phrase.reference || `Phrase ${pi + 1}`}
            </p>

            {/* Word tiles */}
            <div className="flex flex-wrap gap-2 mt-3">
              {phrase.words.map((word, wi) => {
                const isCompleted = word.status === "completed";
                const isActive = activeWord?.phraseIndex === pi && activeWord?.index === wi;

                return (
                  <motion.button
                    key={wi}
                    onClick={() => {
                      if (!isCompleted) {
                        setActiveWord(word);
                        setGuess("");
                        setFeedback(null);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg font-mono text-sm transition-all ${
                      isCompleted
                        ? "bg-secondary/10 text-secondary font-bold"
                        : isActive
                        ? "bg-primary text-on-primary font-bold ring-2 ring-primary/30"
                        : "bg-surface-container-highest text-on-surface-variant/40"
                    }`}
                    whileTap={!isCompleted ? { scale: 0.95 } : {}}
                    layout
                  >
                    {isCompleted
                      ? word.value || "✓"
                      : Array(word.letterCount).fill("_").join(" ")}
                    {word.hintsUnlocked.length > 0 && !isCompleted && (
                      <span className="ml-1 text-[10px] text-amber-500">💡</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Active word — guess input */}
      <AnimatePresence>
        {activeWord && activeWord.status !== "completed" && (
          <motion.div
            className="fixed bottom-24 left-0 right-0 px-4 z-30"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className={`bg-surface-container-lowest rounded-2xl p-4 editorial-shadow border-2 transition-colors ${
              feedback === "correct" ? "border-secondary" : feedback === "wrong" ? "border-error" : "border-transparent"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-on-surface-variant">
                  Mot de <strong>{activeWord.letterCount}</strong> lettres
                  {activeWord.attempts > 0 && ` — ${activeWord.attempts} tentative${activeWord.attempts > 1 ? "s" : ""}`}
                </p>
                {/* Hints button */}
                {activeWord.hintsUnlocked.length > 0 && (
                  <button
                    onClick={() => {
                      const hintType = activeWord.hintsUnlocked[0];
                      const hint = activeWord.hints.find((h) => h.type === hintType);
                      if (hint) setShowHint(hint);
                    }}
                    className="text-xs text-amber-500 font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                    Voir indice ({activeWord.hintsUnlocked.length})
                  </button>
                )}
              </div>

              <motion.div
                className="flex gap-2"
                animate={feedback === "wrong" ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Entrez votre reponse..."
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3 text-on-surface font-mono text-lg placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                />
                <button
                  onClick={handleGuess}
                  disabled={!guess.trim() || submitting}
                  className="px-5 py-3 rounded-xl gradient-cta text-on-primary font-bold disabled:opacity-50"
                >
                  {submitting ? "..." : "✓"}
                </button>
              </motion.div>

              {feedback === "correct" && (
                <motion.p
                  className="text-center text-secondary font-bold mt-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  Bravo ! Mot trouve ! 🎉
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint modal */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHint(null)}
          >
            <div className="absolute inset-0 bg-on-surface/80" />
            <motion.div
              className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 editorial-shadow"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">{HINT_ICONS[showHint.type]}</span>
                  <span className="font-bold text-on-surface">{HINT_LABELS[showHint.type]}</span>
                </div>
                <button onClick={() => setShowHint(null)} className="text-on-surface-variant">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {showHint.type === "4images" && showHint.content.images && (
                <div className="grid grid-cols-2 gap-2">
                  {showHint.content.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                  ))}
                </div>
              )}
              {showHint.type === "anagram" && (
                <div className="flex flex-wrap justify-center gap-2 py-4">
                  {(showHint.content.scrambled || "").split("").map((l, i) => (
                    <span key={i} className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-mono font-bold text-lg flex items-center justify-center">
                      {l}
                    </span>
                  ))}
                </div>
              )}
              {showHint.type === "phrase" && (
                <p className="text-on-surface italic text-lg text-center py-4 leading-relaxed">
                  &ldquo;{showHint.content.text}&rdquo;
                </p>
              )}
              {showHint.type === "emoji" && showHint.content.emojis && (
                <div className="flex justify-center gap-3 py-4">
                  {showHint.content.emojis.map((e, i) => (
                    <span key={i} className="text-4xl">{e}</span>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — scan QR */}
      <motion.button
        onClick={() => setScanning(true)}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full gradient-cta text-on-primary shadow-2xl flex items-center justify-center z-20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
      </motion.button>

      {/* QR Scanner */}
      {scanning && (
        <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}
