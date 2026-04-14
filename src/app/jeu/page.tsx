"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";
import { QrScanner } from "@/components/qr-scanner";
import { HINT_LABELS, HINT_ICONS, type Hint } from "@/lib/game-types";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ID = "event-default";

interface WordState {
  index: number;
  phraseIndex: number;
  letterCount: number;
  status: "hidden" | "completed";
  value: string;
  attempts: number;
  hints: Hint[];
  hintsUnlocked: Hint[];
  pointsEarned?: number;
}

interface PhraseState {
  text: string;
  reference: string;
  words: WordState[];
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  score: number;
  completedWords: number;
  rank: number;
}

export default function JeuPage() {
  const { uuid, teamId, userName } = useAuthContext();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("nogame");
  const [phrases, setPhrases] = useState<PhraseState[]>([]);
  const [score, setScore] = useState(0);
  const [completedWords, setCompletedWords] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [selectedWord, setSelectedWord] = useState<WordState | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHint, setShowHint] = useState<Hint | null>(null);
  const [phraseComplete, setPhraseComplete] = useState(false);
  const [completedReference, setCompletedReference] = useState("");

  // Load active game
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        const id = snap.data().activeGameId;
        setGameId(id || null);
        if (!id) setGameStatus("nogame");
      }
    });
    return unsub;
  }, []);

  const [myPhraseIndex, setMyPhraseIndex] = useState<number | null>(null);

  // Load game instance (status + leaderboard + team phrase assignment)
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameInstances", gameId), (snap) => {
      if (snap.exists()) {
        setGameStatus(snap.data().status || "waiting");
        setLeaderboard(snap.data().leaderboard || []);
        // Get this team's assigned phrase index
        const teamPhrases = snap.data().teamPhrases || {};
        if (teamId && teamPhrases[teamId] != null) {
          setMyPhraseIndex(teamPhrases[teamId]);
        }
      }
    });
    return unsub;
  }, [gameId, teamId]);

  // Load template — only the phrase assigned to this team
  useEffect(() => {
    if (!gameId || myPhraseIndex === null) return;
    const unsub = onSnapshot(doc(db, "gameTemplates", gameId), (snap) => {
      if (snap.exists()) {
        const rawPhrases = snap.data().phrases || [];
        const pi = myPhraseIndex;
        const p = rawPhrases[pi];
        if (!p) return;

        setPhrases([{
          text: p.text as string,
          reference: p.reference as string || "",
          words: ((p.words as Array<Record<string, unknown>>) || []).map((w, wi: number) => ({
            index: wi,
            phraseIndex: pi,
            letterCount: (w.letterCount as number) || (w.value as string)?.length || 0,
            status: "hidden" as const,
            value: "",
            attempts: 0,
            hints: ((w.hints as Hint[]) || []),
            hintsUnlocked: [],
          })),
        }]);
      }
    });
    return unsub;
  }, [gameId, myPhraseIndex]);

  // Load team progress (real-time sync)
  useEffect(() => {
    if (!gameId || !teamId) return;
    const unsub = onSnapshot(
      doc(db, "gameProgress", gameId, "teams", teamId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setScore(data.score || 0);
        setCompletedWords(data.completedWords || 0);

        setPhrases((prev) => {
          let allComplete = true;
          const updated = prev.map((phrase) => ({
            ...phrase,
            words: phrase.words.map((word, wi) => {
              const key = `word_${word.phraseIndex}_${wi}`;
              const slot = data.slots?.[key];
              if (slot?.status === "completed") {
                return {
                  ...word,
                  status: "completed" as const,
                  value: slot.completedWord || "",
                  attempts: slot.attempts || 0,
                  pointsEarned: slot.pointsEarned,
                  hintsUnlocked: (slot.hintsUnlocked || []).map((type: string) =>
                    word.hints.find((h) => h.type === type)
                  ).filter(Boolean) as Hint[],
                };
              }
              allComplete = false;
              return {
                ...word,
                attempts: slot?.attempts || 0,
                hintsUnlocked: (slot?.hintsUnlocked || []).map((type: string) =>
                  word.hints.find((h) => h.type === type)
                ).filter(Boolean) as Hint[],
              };
            }),
          }));

          // Check phrase completion
          if (allComplete && prev.length > 0 && prev[0].words.length > 0) {
            const ref = prev[0]?.reference || "";
            setCompletedReference(ref);
            setPhraseComplete(true);
          }

          return updated;
        });
      }
    );
    return unsub;
  }, [gameId, teamId]);

  // Submit guess
  const handleGuess = useCallback(async () => {
    if (!selectedWord || !guess.trim() || submitting || !gameId || !teamId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/game/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          teamId,
          phraseIndex: selectedWord.phraseIndex,
          wordIndex: selectedWord.index,
          guess: guess.trim(),
          userId: uuid,
        }),
      });
      const data = await res.json();

      if (data.correct) {
        setFeedback("correct");
        setTimeout(() => {
          setSelectedWord(null);
          setGuess("");
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback("wrong");
        setGuess("");
        setTimeout(() => setFeedback(null), 600);
      }
    } catch {
      setGuess("");
    } finally {
      setSubmitting(false);
    }
  }, [selectedWord, guess, submitting, gameId, teamId, uuid]);

  // QR scan handler
  const handleScan = useCallback((data: string) => {
    setScanning(false);
    const match = data.match(/\/qr\/(.+)$/);
    window.location.href = match ? `/qr/${match[1]}` : `/qr/${data}`;
  }, []);

  const totalWords = phrases.reduce((s, p) => s + p.words.length, 0);
  const myRank = leaderboard.find((e) => e.teamId === teamId)?.rank;

  // === SCREENS ===

  // No game
  if (gameStatus === "nogame") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.span
            className="material-symbols-outlined text-6xl text-primary/20 block"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            sports_esports
          </motion.span>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            La chasse n&apos;a pas encore commence
          </h1>
          <p className="text-on-surface-variant text-sm">
            Restez connectes — l&apos;animateur va bientot lancer le jeu !
          </p>
        </motion.div>
      </div>
    );
  }

  // Paused
  if (gameStatus === "paused") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            className="material-symbols-outlined text-6xl text-primary/30 block"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            pause_circle
          </motion.span>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Jeu en pause</h1>
          <p className="text-on-surface-variant text-sm">L&apos;animateur a mis le jeu en pause.</p>
        </motion.div>
      </div>
    );
  }

  // Phrase complete — REVELATION
  if (phraseComplete) {
    const fullText = phrases[0]?.words.map((w) => w.value).join(" ") || "";
    return (
      <motion.div
        className="min-h-dvh flex items-center justify-center px-6 bg-gradient-to-b from-background to-primary/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center max-w-sm space-y-8">
          {/* Confetti */}
          <motion.div
            className="text-6xl"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            🎉
          </motion.div>

          <motion.h1
            className="font-headline text-2xl font-extrabold text-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Phrase Complete !
          </motion.h1>

          {/* Phrase reveal */}
          <motion.div
            className="bg-surface-container-lowest rounded-2xl p-6 editorial-shadow"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="font-headline text-xl font-bold text-on-surface leading-relaxed">
              &ldquo;{fullText}&rdquo;
            </p>
            {/* Reference reveal */}
            <motion.p
              className="text-primary font-bold mt-4 text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              — {completedReference}
            </motion.p>
          </motion.div>

          {/* Score */}
          <motion.div
            className="bg-primary/10 rounded-xl px-6 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <p className="text-sm text-primary/60">Score final</p>
            <p className="font-headline text-3xl font-extrabold text-primary">{score} pts</p>
          </motion.div>

          <motion.button
            onClick={() => setShowLeaderboard(true)}
            className="gradient-cta text-on-primary px-8 py-3 rounded-full font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            whileTap={{ scale: 0.95 }}
          >
            Voir le classement
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // === MAIN GAME SCREEN ===
  return (
    <motion.div
      className="pt-4 pb-36 max-w-lg mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <motion.div
        className="px-5 mb-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-xl font-extrabold text-primary">
              Chasse au Tresor
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {completedWords}/{totalWords} mots trouves
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Score badge */}
            <motion.div
              className="bg-primary/10 px-3 py-1.5 rounded-xl text-center"
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              <p className="text-[10px] text-primary/50 font-bold">SCORE</p>
              <p className="font-headline font-bold text-primary text-base leading-none">{score}</p>
            </motion.div>
            {/* Rank */}
            {myRank && (
              <div className="bg-surface-container px-2.5 py-1.5 rounded-xl text-center">
                <p className="text-[10px] text-on-surface-variant/50 font-bold">RANG</p>
                <p className="font-bold text-on-surface text-base leading-none">
                  {myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : `${myRank}e`}
                </p>
              </div>
            )}
            {/* Leaderboard toggle */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                leaderboard
              </span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-cta rounded-full"
            animate={{ width: totalWords > 0 ? `${(completedWords / totalWords) * 100}%` : "0%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Leaderboard dropdown */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            className="mx-5 mb-4 bg-surface-container-lowest rounded-2xl p-4 editorial-shadow"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
              Classement
            </p>
            {leaderboard.sort((a, b) => b.score - a.score).map((e, i) => (
              <div
                key={e.teamId}
                className={`flex items-center justify-between py-2 ${
                  e.teamId === teamId ? "text-primary font-bold" : "text-on-surface-variant"
                }`}
              >
                <span className="text-sm">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}{" "}
                  {e.teamName}{e.teamId === teamId ? " (vous)" : ""}
                </span>
                <span className="text-sm font-mono">{e.score} pts</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phrases */}
      <div className="px-5 space-y-6">
        {phrases.map((phrase, pi) => (
          <motion.div
            key={pi}
            className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pi * 0.15 }}
          >
            {/* Hidden reference indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary/30 text-lg">auto_stories</span>
              <span className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-widest">
                Verset mystere
              </span>
            </div>

            {/* Word tiles */}
            <div className="flex flex-wrap gap-2">
              {phrase.words.map((word, wi) => {
                const isCompleted = word.status === "completed";
                const isSelected = selectedWord?.phraseIndex === pi && selectedWord?.index === wi;
                const hasHints = word.hintsUnlocked.length > 0;

                return (
                  <motion.button
                    key={wi}
                    onClick={() => {
                      if (!isCompleted) {
                        setSelectedWord(word);
                        setGuess("");
                        setFeedback(null);
                      }
                    }}
                    disabled={isCompleted}
                    className={`relative rounded-xl px-1 py-2 transition-all ${
                      isCompleted
                        ? "bg-secondary/10"
                        : isSelected
                        ? "bg-primary/10 ring-2 ring-primary/40"
                        : "bg-surface-container-highest/60 hover:bg-surface-container-highest"
                    }`}
                    whileTap={!isCompleted ? { scale: 0.95 } : {}}
                    layout
                  >
                    {/* Hint indicator */}
                    {hasHints && !isCompleted && (
                      <motion.span
                        className="absolute -top-1.5 -right-1.5 text-xs"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        💡
                      </motion.span>
                    )}

                    {isCompleted ? (
                      <motion.span
                        className="font-headline font-bold text-secondary text-sm px-2"
                        initial={{ opacity: 0, scale: 0.5, rotateX: 90 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {word.value}
                      </motion.span>
                    ) : (
                      <span className="flex gap-[3px] px-1">
                        {Array.from({ length: word.letterCount }).map((_, li) => (
                          <motion.span
                            key={li}
                            className={`w-[18px] h-[22px] rounded-sm flex items-center justify-center text-[10px] font-mono ${
                              isSelected
                                ? "bg-primary/20 text-primary"
                                : "bg-surface-container text-on-surface-variant/30"
                            }`}
                            initial={false}
                            animate={isSelected ? { y: [0, -2, 0] } : {}}
                            transition={{ delay: li * 0.03, duration: 0.3 }}
                          >
                            _
                          </motion.span>
                        ))}
                      </span>
                    )}

                    {/* Points earned */}
                    {isCompleted && word.pointsEarned && (
                      <motion.span
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-secondary font-bold whitespace-nowrap"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        +{word.pointsEarned}
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Unlocked hints for selected word */}
            <AnimatePresence>
              {selectedWord && selectedWord.phraseIndex === pi && selectedWord.hintsUnlocked.length > 0 && (
                <motion.div
                  className="mt-4 space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-widest">
                    Indices debloques
                  </p>
                  {selectedWord.hintsUnlocked.map((hint, hi) => (
                    <motion.button
                      key={hi}
                      onClick={() => setShowHint(hint)}
                      className="w-full flex items-center gap-3 bg-primary/5 rounded-xl px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: hi * 0.1 }}
                    >
                      <span className="material-symbols-outlined text-primary text-lg">
                        {HINT_ICONS[hint.type]}
                      </span>
                      <span className="text-sm text-on-surface-variant font-medium">
                        {HINT_LABELS[hint.type]}
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant/30 ml-auto text-lg">
                        chevron_right
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Instruction banner (no word selected) */}
      <AnimatePresence>
        {!selectedWord && gameStatus === "active" && (
          <motion.div
            className="fixed bottom-24 left-4 right-4 z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-surface-container-lowest/95 backdrop-blur-lg rounded-2xl px-5 py-4 editorial-shadow text-center">
              <p className="text-sm text-on-surface-variant">
                <span className="font-bold text-primary">Touchez un mot</span> pour le deviner, ou{" "}
                <span className="font-bold text-primary">scannez un QR</span> pour un indice
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess input (word selected) */}
      <AnimatePresence>
        {selectedWord && selectedWord.status !== "completed" && (
          <motion.div
            className="fixed bottom-24 left-3 right-3 z-30"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div
              className={`bg-surface-container-lowest rounded-2xl p-4 editorial-shadow border-2 transition-colors ${
                feedback === "correct"
                  ? "border-secondary"
                  : feedback === "wrong"
                  ? "border-error"
                  : "border-transparent"
              }`}
            >
              {/* Word info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface-variant/50 uppercase">
                    {selectedWord.letterCount} lettres
                  </span>
                  {selectedWord.attempts > 0 && (
                    <span className="text-xs text-on-surface-variant/30">
                      {selectedWord.attempts} essai{selectedWord.attempts > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedWord(null); setGuess(""); }}
                  className="text-on-surface-variant/30 hover:text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Input + button */}
              <motion.div
                className="flex gap-2"
                animate={feedback === "wrong" ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
                transition={{ duration: 0.35 }}
              >
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Votre reponse..."
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3.5 text-on-surface font-headline font-bold text-base placeholder:text-on-surface-variant/25 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                />
                <motion.button
                  onClick={handleGuess}
                  disabled={!guess.trim() || submitting}
                  className="px-5 py-3.5 rounded-xl gradient-cta text-on-primary font-bold text-base disabled:opacity-40"
                  whileTap={{ scale: 0.93 }}
                >
                  {submitting ? "..." : "OK"}
                </motion.button>
              </motion.div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback === "correct" && (
                  <motion.p
                    className="text-center text-secondary font-bold text-sm mt-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Bravo ! ✨
                  </motion.p>
                )}
                {feedback === "wrong" && (
                  <motion.p
                    className="text-center text-error/70 text-xs mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Pas tout a fait... essaie encore !
                  </motion.p>
                )}
              </AnimatePresence>
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
            <div className="absolute inset-0 bg-on-surface/70 backdrop-blur-sm" />
            <motion.div
              className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-3xl overflow-hidden editorial-shadow"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hint header */}
              <div className="bg-primary/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">{HINT_ICONS[showHint.type]}</span>
                  <span className="font-bold text-on-surface">{HINT_LABELS[showHint.type]}</span>
                </div>
                <button onClick={() => setShowHint(null)} className="text-on-surface-variant/40">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Hint content */}
              <div className="p-5">
                {showHint.type === "4images" && showHint.content.images && (
                  <div className="grid grid-cols-2 gap-2">
                    {showHint.content.images.map((url, i) => (
                      <motion.div
                        key={i}
                        className="aspect-square rounded-xl overflow-hidden bg-surface-container"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                      >
                        {url ? (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                            <span className="material-symbols-outlined text-3xl">image</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {showHint.type === "anagram" && (
                  <div className="flex flex-wrap justify-center gap-2 py-6">
                    {(showHint.content.scrambled || "").split("").map((l, i) => (
                      <motion.span
                        key={i}
                        className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xl flex items-center justify-center"
                        initial={{ opacity: 0, rotateZ: 20 }}
                        animate={{ opacity: 1, rotateZ: [-5, 5, 0][i % 3] }}
                        transition={{ delay: i * 0.08, type: "spring" }}
                      >
                        {l}
                      </motion.span>
                    ))}
                  </div>
                )}

                {showHint.type === "phrase" && (
                  <div className="py-6 text-center">
                    <span className="material-symbols-outlined text-primary/20 text-3xl block mb-3">
                      format_quote
                    </span>
                    <p className="text-on-surface italic text-lg leading-relaxed">
                      &ldquo;{showHint.content.text}&rdquo;
                    </p>
                  </div>
                )}

                {showHint.type === "emoji" && showHint.content.emojis && (
                  <div className="flex justify-center gap-4 py-8">
                    {showHint.content.emojis.map((e, i) => (
                      <motion.span
                        key={i}
                        className="text-5xl"
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.35, type: "spring", stiffness: 300 }}
                      >
                        {e}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — QR scanner */}
      <motion.button
        onClick={() => setScanning(true)}
        className="fixed bottom-28 right-5 w-14 h-14 rounded-full gradient-cta text-on-primary shadow-2xl flex items-center justify-center z-20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.5 }}
      >
        <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
      </motion.button>

      {/* QR Scanner */}
      {scanning && <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />}

      {/* Leaderboard full modal */}
      <AnimatePresence>
        {showLeaderboard && phraseComplete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
          >
            <div className="absolute inset-0 bg-on-surface/70 backdrop-blur-sm" />
            <motion.div
              className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 editorial-shadow"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-headline text-xl font-bold text-center mb-6">Classement Final</h2>
              {leaderboard.sort((a, b) => b.score - a.score).map((e, i) => (
                <motion.div
                  key={e.teamId}
                  className={`flex items-center justify-between py-3 ${
                    i === 0 ? "text-primary" : "text-on-surface-variant"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="text-lg font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}{" "}
                    {e.teamName}
                  </span>
                  <span className="font-mono font-bold text-lg">{e.score}</span>
                </motion.div>
              ))}
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-full mt-6 py-3 rounded-full bg-surface-container text-on-surface-variant font-bold"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
